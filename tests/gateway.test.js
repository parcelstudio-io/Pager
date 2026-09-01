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

async function withServer(env, fetchImpl, run, serverOptions = {}) {
  const server = createPrototypeServer(env, { fetchImpl, ...serverOptions });
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
  assert.equal(config.tools.length, 1);
  assert.equal(config.tools[0].name, "set_pager_emotion");
  assert.equal(config.tools[0].parameters.properties.emotion.enum.includes("happy"), true);
  assert.equal(config.tools[0].parameters.properties.emotion.enum.length >= 25, true);
  assert.deepEqual(config.audio.input.turn_detection, {
    type: "semantic_vad",
    eagerness: "auto",
    create_response: true,
    interrupt_response: true,
  });
  assert.equal(config.audio.output.voice, "marin");
  assert.equal(config.instructions.startsWith("You are a companion named Mochi"), true);
  assert.match(config.instructions, /Reconstructed past conversation history/);
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

test("gateway alone selects private prompt context for the Realtime session", async () => {
  let forwardedSession;
  let contextCalls = 0;
  const fakeFetch = async (_url, options) => {
    forwardedSession = JSON.parse(options.body.get("session"));
    return new Response("v=0\r\nanswer", { status: 200 });
  };

  await withServer(
    { OPENAI_API_KEY: "sk-test", MOCHI_COMPANION_NAME: "Mochi" },
    fakeFetch,
    async (baseUrl) => {
      const response = await fetch(`${baseUrl}/session`, {
        method: "POST",
        headers: { "Content-Type": "application/sdp", Origin: baseUrl },
        body: "v=0\r\n${user_context_json}\r\nuntrusted-browser-prompt",
      });
      assert.equal(response.status, 200);
    },
    {
      getPromptContext: async () => {
        contextCalls += 1;
        return {
          user: {
            status: "available",
            facts: [{
              label: "preferred name",
              value: "Jae",
              source: "confirmed",
              purpose: "addressing the user",
            }],
          },
        };
      },
    },
  );

  assert.equal(contextCalls, 1);
  assert.match(forwardedSession.instructions, /preferred name/);
  assert.match(forwardedSession.instructions, /"value": "Jae"/);
  assert.equal(forwardedSession.instructions.includes("untrusted-browser-prompt"), false);
  assert.equal(forwardedSession.instructions.includes("${user_context_json}"), false);
});

test("broker rejects cross-origin and malformed session requests", async () => {
  let upstreamCalls = 0;
  let contextCalls = 0;
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
  }, {
    getPromptContext: async () => {
      contextCalls += 1;
      return {};
    },
  });

  assert.equal(upstreamCalls, 0);
  assert.equal(contextCalls, 0);
});

test("prompt-context failures are generic and never reach OpenAI", async () => {
  let upstreamCalls = 0;
  const originalConsoleError = console.error;
  console.error = () => {};
  try {
    await withServer(
      { OPENAI_API_KEY: "sk-test" },
      async () => {
        upstreamCalls += 1;
        return new Response("unused");
      },
      async (baseUrl) => {
        const response = await fetch(`${baseUrl}/session`, {
          method: "POST",
          headers: { "Content-Type": "application/sdp", Origin: baseUrl },
          body: "v=0",
        });
        assert.equal(response.status, 500);
        const body = await response.text();
        assert.equal(body.includes("private-context-value"), false);
        assert.match(body, /Prototype server request failed/);
      },
      {
        getPromptContext: async () => {
          const error = new Error("private-context-value");
          error.statusCode = 413;
          throw error;
        },
      },
    );
  } finally {
    console.error = originalConsoleError;
  }
  assert.equal(upstreamCalls, 0);
});

test("the setup deadline also bounds server-side context retrieval", async () => {
  let upstreamCalls = 0;
  let contextSignal;
  await withServer(
    { OPENAI_API_KEY: "sk-test" },
    async () => {
      upstreamCalls += 1;
      return new Response("unused");
    },
    async (baseUrl) => {
      const response = await fetch(`${baseUrl}/session`, {
        method: "POST",
        headers: { "Content-Type": "application/sdp", Origin: baseUrl },
        body: "v=0",
      });
      assert.equal(response.status, 504);
      assert.match(await response.text(), /Realtime session setup timed out/);
    },
    {
      setupTimeoutMs: 20,
      getPromptContext: async ({ signal }) => {
        contextSignal = signal;
        return new Promise(() => {});
      },
    },
  );
  assert.equal(contextSignal.aborted, true);
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
  assert.deepEqual(staticAssetForPath("/expression-director.js"), [
    "expression-director.js",
    "text/javascript; charset=utf-8",
  ]);
  assert.deepEqual(staticAssetForPath("/emotion-contract.js"), [
    "emotion-contract.js",
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

    const promptAttempt = await fetch(`${baseUrl}/prompt/mochi-realtime.ftl`);
    assert.equal(promptAttempt.status, 404);
    assert.equal((await promptAttempt.text()).includes("You are a companion"), false);
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
    "expression-director.js",
    "emotion-contract.js",
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
  const captionViewportRule = styles.match(
    /\.caption-viewport \{([\s\S]*?)\n\}/,
  )?.[1] || "";

  assert.equal((html.match(/<button\b/g) || []).length, 1);
  assert.ok(html.indexOf('class="face"') < html.indexOf('id="caption-viewport"'));
  assert.equal(html.includes('class="mouth"'), false);
  assert.equal((html.match(/class="eye-rig /g) || []).length, 2);
  assert.equal((html.match(/class="pupil"/g) || []).length, 2);
  assert.equal((html.match(/class="eye-motion"/g) || []).length, 2);
  assert.equal((html.match(/class="eye-life"/g) || []).length, 2);
  assert.equal(html.includes('data-expression="neutral"'), true);
  assert.equal(html.includes('data-mood="calm"'), true);
  assert.equal(html.includes('data-rest-gaze="center"'), true);
  assert.equal(html.includes('data-gaze-motion="center"'), true);
  assert.equal(html.includes('id="battery-status"'), true);
  assert.equal(html.includes('role="status"'), true);
  assert.equal(styles.includes(".mouth"), false);
  assert.equal(styles.includes("--caption-height: 58px"), true);
  assert.equal(styles.includes("--caption-font-size: clamp(20px, 5vw, 24px)"), true);
  assert.equal(captionRule.includes("transition"), false);
  assert.equal(captionRule.includes("text-align: left"), true);
  assert.equal(captionViewportRule.includes("background:"), false);
  assert.equal(captionViewportRule.includes("border:"), false);
  assert.equal(html.includes("Captions appear here"), false);
  assert.equal(styles.includes(".caption-empty"), false);
  assert.equal(styles.includes("will-change: transform"), true);
  assert.equal(contents[4].includes("DEFAULT_CAPTION_SPEED_PX_PER_SECOND = 60"), true);
  assert.equal(styles.includes(".pupil"), true);
  assert.equal(styles.includes("background: var(--cream)"), true);
  assert.equal(styles.includes("@keyframes whole-eye-roll-clockwise"), true);
  assert.equal(styles.includes("@keyframes whole-eye-upper-right"), true);
  assert.equal(styles.includes("@keyframes whole-eye-lower-left"), true);
  assert.equal(styles.includes("@keyframes pupil-upper-right"), true);
  assert.equal(styles.includes("@keyframes pupil-lower-left"), true);
  assert.equal(styles.includes("@keyframes think-eye-saccades"), true);
  assert.equal(styles.includes("@keyframes aperture-look-up"), true);
  assert.equal(styles.includes("@keyframes aperture-look-down"), true);
  assert.equal(styles.includes("@keyframes aperture-roll-clockwise"), true);
  assert.equal(styles.includes("@keyframes eye-life-calm"), true);
  assert.equal(styles.includes("@keyframes eye-life-positive"), true);
  assert.equal(styles.includes("animation: speak-eyes"), false);
  assert.equal(styles.includes("animation: duplex-eyes"), false);
  const clockwiseRoll = styles.match(
    /@keyframes whole-eye-roll-clockwise \{([\s\S]*?)\n\}/,
  )?.[1] || "";
  assert.match(clockwiseRoll, /10%, 20%/);
  assert.match(clockwiseRoll, /23%, 34%/);
  assert.match(clockwiseRoll, /97%, 100%/);
  assert.equal(styles.includes('[data-gaze-motion="look-down"]'), true);
  assert.equal(styles.includes('[data-gaze-motion="center"]'), true);
  assert.equal(styles.includes('[data-energy="critical"][data-charging="true"]'), true);
  assert.equal(app.includes("new ExpressionDirector"), true);
  assert.equal(
    app.includes('import { ExpressionDirector } from "./expression-director.js"'),
    false,
  );
  assert.equal(app.includes('import("./expression-director.js")'), true);
  assert.ok(
    app.indexOf('button.addEventListener("click"') <
      app.lastIndexOf("initializeFaceController();"),
  );
  assert.equal(app.includes("createGuardedOptionalController"), true);
  assert.match(
    app,
    /onUnavailable: \(errorName\)[\s\S]*?faceController = "unavailable"[\s\S]*?name: errorName/,
  );
  assert.match(app, /function interruptCaption\(\)[\s\S]*?captionMotion\.freeze\(\)/);
  assert.equal(app.includes("button.dataset.indicator = view.indicator"), true);
  assert.match(app, /pagehide[\s\S]*stopSession\(\)/);
  assert.equal(styles.includes('[data-indicator="amber"]'), true);
  assert.equal(styles.includes('[data-indicator="cyan"]'), true);
  assert.equal(styles.includes("data-live"), false);
  assert.equal(contents.join("\n").includes("OPENAI_API_KEY"), false);
});
