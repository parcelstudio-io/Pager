import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const CURRENT_FILE = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(CURRENT_FILE), "../..");
const WEB_ROOT = path.join(REPO_ROOT, "tools/device-simulator");
const SDP_LIMIT_BYTES = 128 * 1024;

const STATIC_ASSETS = Object.freeze({
  "/": ["index.html", "text/html; charset=utf-8"],
  "/index.html": ["index.html", "text/html; charset=utf-8"],
  "/app.js": ["app.js", "text/javascript; charset=utf-8"],
  "/state.js": ["state.js", "text/javascript; charset=utf-8"],
  "/caption-pacer.js": ["caption-pacer.js", "text/javascript; charset=utf-8"],
  "/caption-motion.js": ["caption-motion.js", "text/javascript; charset=utf-8"],
  "/media.js": ["media.js", "text/javascript; charset=utf-8"],
  "/styles.css": ["styles.css", "text/css; charset=utf-8"],
});

export function loadLocalEnv(env = process.env, filename = path.join(REPO_ROOT, ".env")) {
  if (!existsSync(filename)) return env;

  for (const rawLine of readFileSync(filename, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separator = line.indexOf("=");
    if (separator <= 0) continue;

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (env[key] === undefined) env[key] = value;
  }

  return env;
}

export function hasUsableApiKey(env = process.env) {
  const key = env.OPENAI_API_KEY?.trim();
  return Boolean(key && key !== "replace_me" && key !== "your_api_key_here");
}

export function buildSessionConfig(env = process.env) {
  return {
    type: "realtime",
    model: env.OPENAI_REALTIME_MODEL || "gpt-realtime-2.1-mini",
    output_modalities: ["audio"],
    tools: [],
    instructions:
      "You are Mochi, a warm and concise voice companion. Speak naturally in short responses. " +
      "Let the user interrupt you, acknowledge corrections without fuss, and do not use markdown.",
    audio: {
      input: {
        turn_detection: {
          type: "semantic_vad",
          eagerness: "auto",
          create_response: true,
          interrupt_response: true,
        },
      },
      output: {
        voice: env.OPENAI_REALTIME_VOICE || "marin",
      },
    },
  };
}

export function staticAssetForPath(urlPath) {
  return STATIC_ASSETS[urlPath] || null;
}

function securityHeaders(contentType) {
  return {
    "Content-Type": contentType,
    "Cache-Control": "no-store",
    "Content-Security-Policy":
      "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; " +
      "media-src 'self' blob:; frame-ancestors 'none'",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
  };
}

function sendJson(response, status, payload) {
  response.writeHead(status, securityHeaders("application/json; charset=utf-8"));
  response.end(JSON.stringify(payload));
}

async function readSdp(request) {
  let size = 0;
  const chunks = [];

  for await (const chunk of request) {
    size += chunk.length;
    if (size > SDP_LIMIT_BYTES) {
      const error = new Error("SDP payload is too large");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString("utf8");
}

async function serveStatic(response, urlPath) {
  const asset = staticAssetForPath(urlPath);
  if (!asset) return false;

  const [filename, contentType] = asset;
  const content = await readFile(path.join(WEB_ROOT, filename));
  response.writeHead(200, securityHeaders(contentType));
  response.end(content);
  return true;
}

function hasAllowedOrigin(request) {
  const origin = request.headers.origin;
  const host = request.headers.host;
  if (!origin || !host) return false;

  try {
    const originUrl = new URL(origin);
    const hostUrl = new URL(`http://${host}`);
    const isLoopback = ["localhost", "127.0.0.1"].includes(hostUrl.hostname);
    return (
      isLoopback &&
      originUrl.protocol === "http:" &&
      originUrl.host === hostUrl.host
    );
  } catch {
    return false;
  }
}

async function createRealtimeSession(request, response, env, fetchImpl) {
  if (!hasAllowedOrigin(request)) {
    sendJson(response, 403, { error: "Cross-origin session setup is not allowed." });
    return;
  }

  if (!hasUsableApiKey(env)) {
    sendJson(response, 503, {
      error: "Set OPENAI_API_KEY in .env before starting a live session.",
    });
    return;
  }

  if (!request.headers["content-type"]?.startsWith("application/sdp")) {
    sendJson(response, 415, { error: "Expected an application/sdp request." });
    return;
  }

  const sdp = await readSdp(request);
  if (!sdp.trim()) {
    sendJson(response, 400, { error: "The SDP offer is empty." });
    return;
  }

  const form = new FormData();
  form.set("sdp", sdp);
  form.set("session", JSON.stringify(buildSessionConfig(env)));

  const headers = {
    Authorization: `Bearer ${env.OPENAI_API_KEY.trim()}`,
  };
  if (env.OPENAI_SAFETY_IDENTIFIER) {
    headers["OpenAI-Safety-Identifier"] = env.OPENAI_SAFETY_IDENTIFIER;
  }

  const upstreamController = new AbortController();
  let clientDisconnected = false;
  let setupTimedOut = false;
  const abortForDisconnect = () => {
    if (response.writableEnded) return;
    clientDisconnected = true;
    upstreamController.abort();
  };
  const setupTimeout = setTimeout(() => {
    setupTimedOut = true;
    upstreamController.abort();
  }, 30_000);

  request.once("aborted", abortForDisconnect);
  response.once("close", abortForDisconnect);

  let upstream;
  let answer;
  try {
    upstream = await fetchImpl("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      headers,
      body: form,
      signal: upstreamController.signal,
    });
    answer = await upstream.text();
  } catch (error) {
    if (clientDisconnected || response.destroyed) return;
    if (setupTimedOut) {
      sendJson(response, 504, { error: "OpenAI session setup timed out." });
      return;
    }
    throw error;
  } finally {
    clearTimeout(setupTimeout);
    request.off("aborted", abortForDisconnect);
    response.off("close", abortForDisconnect);
  }

  if (response.destroyed) return;
  if (!upstream.ok) {
    console.error("Realtime session setup failed", {
      status: upstream.status,
      requestId: upstream.headers.get("openai-request-id") || undefined,
    });
    sendJson(response, 502, {
      error: `OpenAI session setup failed with status ${upstream.status}.`,
    });
    return;
  }

  response.writeHead(200, securityHeaders("application/sdp"));
  response.end(answer);
}

export function createPrototypeServer(env = process.env, { fetchImpl = fetch } = {}) {
  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url || "/", "http://localhost");

      if (request.method === "GET" && url.pathname === "/health") {
        sendJson(response, 200, {
          status: "ok",
          configured: hasUsableApiKey(env),
          model: buildSessionConfig(env).model,
        });
        return;
      }

      if (request.method === "POST" && url.pathname === "/session") {
        await createRealtimeSession(request, response, env, fetchImpl);
        return;
      }

      if (request.method === "GET" && (await serveStatic(response, url.pathname))) {
        return;
      }

      sendJson(response, 404, { error: "Not found" });
    } catch (error) {
      const status = error.statusCode || 500;
      if (status >= 500) console.error("Prototype server error", error.message);
      if (!response.headersSent) {
        sendJson(response, status, {
          error: status === 413 ? error.message : "Prototype server request failed.",
        });
      } else {
        response.end();
      }
    }
  });
}

export function startServer(env = process.env) {
  loadLocalEnv(env);
  const requestedPort = Number.parseInt(env.PORT || "3000", 10);
  const port = Number.isInteger(requestedPort) && requestedPort > 0 && requestedPort < 65536
    ? requestedPort
    : 3000;

  const server = createPrototypeServer(env);
  server.listen(port, "127.0.0.1", () => {
    console.log(`Mochi V1 is ready at http://localhost:${port}`);
    if (!hasUsableApiKey(env)) {
      console.log("Add OPENAI_API_KEY to .env before pressing Start listening.");
    }
  });
  return server;
}

const invokedDirectly = process.argv[1]
  ? import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
  : false;

if (invokedDirectly) startServer();
