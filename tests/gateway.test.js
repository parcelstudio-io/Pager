import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import { request as httpRequest } from "node:http";
import path from "node:path";

import {
  buildSessionConfig,
  createPrototypeServer,
  hasUsableApiKey,
  staticAssetForPath,
} from "../tools/prototype-server/server.js";

async function withServer(env, fetchImpl, run) {
  const server = createPrototypeServer(env, { fetchImpl });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();

  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

async function rawPost(baseUrl, headers, body = "v=0") {
  const target = new URL(baseUrl);
  return new Promise((resolve, reject) => {
    const request = httpRequest({
      hostname: target.hostname,
      port: target.port,
      path: "/session",
      method: "POST",
      headers: {
        "Content-Type": "application/sdp",
        "Content-Length": Buffer.byteLength(body),
        ...headers,
      },
    }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => resolve({
        status: response.statusCode,
        body: Buffer.concat(chunks).toString("utf8"),
      }));
    });
    request.on("error", reject);
    request.end(body);
  });
}

test("session configuration is fixed server-side for full-duplex audio", () => {
  const config = buildSessionConfig({});
  assert.equal(config.type, "realtime");
  assert.equal(config.model, "gpt-realtime-2.1-mini");
  assert.deepEqual(config.output_modalities, ["audio"]);
  assert.deepEqual(config.tools, []);
  assert.deepEqual(config.audio.input.turn_detection, {
    type: "semantic_vad",
    eagerness: "auto",
    create_response: true,
    interrupt_response: true,
  });
  assert.equal(config.audio.output.voice, "marin");
  assert.equal(JSON.stringify(config).includes("OPENAI_API_KEY"), false);
});

test("placeholder API keys are rejected", () => {
  assert.equal(hasUsableApiKey({}), false);
  assert.equal(hasUsableApiKey({ OPENAI_API_KEY: "replace_me" }), false);
  assert.equal(hasUsableApiKey({ OPENAI_API_KEY: "sk-test-only" }), true);
});

test("broker forwards authorization upstream and returns only SDP", async () => {
  const calls = [];
  const fakeFetch = async (url, options) => {
    calls.push({ url, options });
    return new Response("v=0\r\nmock-answer", {
      status: 200,
      headers: { "content-type": "application/sdp" },
    });
  };
  const env = {
    OPENAI_API_KEY: "test-key-not-real",
    OPENAI_REALTIME_MODEL: "gpt-realtime-2.1-mini",
  };

  await withServer(env, fakeFetch, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/sdp",
        Origin: baseUrl,
      },
      body: "v=0\r\nmock-offer",
    });
    assert.equal(response.status, 200);
    const body = await response.text();
    assert.equal(body, "v=0\r\nmock-answer");
    assert.equal(body.includes(env.OPENAI_API_KEY), false);
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://api.openai.com/v1/realtime/calls");
  assert.equal(calls[0].options.headers.Authorization, `Bearer ${env.OPENAI_API_KEY}`);
  const forwardedSession = JSON.parse(calls[0].options.body.get("session"));
  assert.equal(forwardedSession.model, "gpt-realtime-2.1-mini");
  assert.equal(calls[0].options.body.get("sdp"), "v=0\r\nmock-offer");
});

test("broker rejects cross-origin and malformed session requests", async () => {
  let upstreamCalls = 0;
  const fakeFetch = async () => {
    upstreamCalls += 1;
    return new Response("unused");
  };

  await withServer({ OPENAI_API_KEY: "sk-test" }, fakeFetch, async (baseUrl) => {
    const crossOrigin = await fetch(`${baseUrl}/session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/sdp",
        Origin: "https://malicious.example",
      },
      body: "v=0",
    });
    assert.equal(crossOrigin.status, 403);

    const wrongType = await fetch(`${baseUrl}/session`, {
      method: "POST",
      headers: { "Content-Type": "text/plain", Origin: baseUrl },
      body: "v=0",
    });
    assert.equal(wrongType.status, 415);

    const empty = await fetch(`${baseUrl}/session`, {
      method: "POST",
      headers: { "Content-Type": "application/sdp", Origin: baseUrl },
      body: "",
    });
    assert.equal(empty.status, 400);

    const oversized = await fetch(`${baseUrl}/session`, {
      method: "POST",
      headers: { "Content-Type": "application/sdp", Origin: baseUrl },
      body: "x".repeat(128 * 1024 + 1),
    });
    assert.equal(oversized.status, 413);
  });

  assert.equal(upstreamCalls, 0);
});

test("session endpoint rejects missing origins and DNS-rebinding hosts", async () => {
  let upstreamCalls = 0;
  const fakeFetch = async () => {
    upstreamCalls += 1;
    return new Response("should-not-run");
  };

  await withServer({ OPENAI_API_KEY: "sk-test" }, fakeFetch, async (baseUrl) => {
    const missingOrigin = await rawPost(baseUrl, {
      Host: new URL(baseUrl).host,
    });
    assert.equal(missingOrigin.status, 403);

    const rebound = await rawPost(baseUrl, {
      Host: "attacker.example",
      Origin: "http://attacker.example",
    });
    assert.equal(rebound.status, 403);
  });

  assert.equal(upstreamCalls, 0);
});

test("broker aborts upstream session setup when its browser disconnects", async () => {
  let markStarted;
  let markAborted;
  const started = new Promise((resolve) => { markStarted = resolve; });
  const aborted = new Promise((resolve) => { markAborted = resolve; });
  const fakeFetch = async (_url, options) => {
    markStarted();
    return new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => {
        markAborted();
        reject(new DOMException("Aborted", "AbortError"));
      }, { once: true });
    });
  };

  await withServer({ OPENAI_API_KEY: "sk-test" }, fakeFetch, async (baseUrl) => {
    const target = new URL(baseUrl);
    const request = httpRequest({
      hostname: target.hostname,
      port: target.port,
      path: "/session",
      method: "POST",
      headers: {
        "Content-Type": "application/sdp",
        "Content-Length": 3,
        Origin: baseUrl,
      },
    });
    request.on("error", () => {
      // Destroying this request is the behavior under test.
    });
    request.end("v=0");

    await started;
    request.destroy();
    await Promise.race([
      aborted,
      new Promise((_, reject) => setTimeout(
        () => reject(new Error("upstream setup was not aborted")),
        1_000,
      )),
    ]);
  });
});

test("static server exposes only the simulator allowlist", async () => {
  assert.deepEqual(staticAssetForPath("/"), ["index.html", "text/html; charset=utf-8"]);
  assert.deepEqual(staticAssetForPath("/caption-motion.js"), [
    "caption-motion.js",
    "text/javascript; charset=utf-8",
  ]);
  assert.equal(staticAssetForPath("/.env"), null);
  assert.equal(staticAssetForPath("/../.env"), null);

  await withServer({}, async () => new Response("unused"), async (baseUrl) => {
    const page = await fetch(`${baseUrl}/`);
    assert.equal(page.status, 200);
    assert.match(
      page.headers.get("content-security-policy") || "",
      /frame-ancestors 'none'/,
    );
    assert.equal((await page.text()).includes("Start listening"), true);

    const envAttempt = await fetch(`${baseUrl}/.env`);
    assert.equal(envAttempt.status, 404);
    assert.equal((await envAttempt.text()).includes("OPENAI_API_KEY"), false);
  });
});

test("browser assets contain one control and no provider credential name", async () => {
  const root = path.resolve("tools/device-simulator");
  const filenames = [
    "index.html",
    "app.js",
    "state.js",
    "caption-pacer.js",
    "caption-motion.js",
    "media.js",
    "styles.css",
  ];
  const contents = await Promise.all(
    filenames.map((filename) => readFile(path.join(root, filename), "utf8")),
  );
  const html = contents[0];
  const app = contents[1];
  const styles = contents.at(-1);
  const captionRule = styles.match(/\.caption \{([\s\S]*?)\n\}/)?.[1] || "";

  assert.equal((html.match(/<button\b/g) || []).length, 1);
  assert.ok(html.indexOf('class="face"') < html.indexOf('id="caption-viewport"'));
  assert.equal(html.includes('class="mouth"'), false);
  assert.equal(styles.includes(".mouth"), false);
  assert.equal(styles.includes("--caption-height: 58px"), true);
  assert.equal(styles.includes("--caption-font-size: clamp(20px, 5vw, 24px)"), true);
  assert.equal(captionRule.includes("transition"), false);
  assert.equal(captionRule.includes("text-align: left"), true);
  assert.match(styles, /\.caption-empty \{[\s\S]*?text-align: center;/);
  assert.equal(styles.includes("will-change: transform"), true);
  assert.equal(contents[4].includes("DEFAULT_CAPTION_SPEED_PX_PER_SECOND = 60"), true);
  assert.match(app, /function interruptCaption\(\)[\s\S]*?captionMotion\.freeze\(\)/);
  assert.equal(app.includes("button.dataset.indicator = view.indicator"), true);
  assert.match(app, /pagehide[\s\S]*stopSession\(\)/);
  assert.equal(styles.includes('[data-indicator="amber"]'), true);
  assert.equal(styles.includes('[data-indicator="cyan"]'), true);
  assert.equal(styles.includes("data-live"), false);
  assert.equal(contents.join("\n").includes("OPENAI_API_KEY"), false);
});
