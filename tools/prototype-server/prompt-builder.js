import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PAGER_EXPRESSION_PROMPT_CONFIG } from "../../config/pager-expression.js";

const CURRENT_FILE = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(CURRENT_FILE), "../..");
export const DEFAULT_PROMPT_TEMPLATE_PATH = path.join(
  REPO_ROOT,
  "prompt/mochi-realtime.ftl",
);

const PLACEHOLDERS = Object.freeze([
  "companion_name",
  "pager_expression_config_json",
  "user_context_json",
  "past_conversation_history_json",
  "retrieved_search_context_json",
  "device_context_json",
]);
const PLACEHOLDER_SET = new Set(PLACEHOLDERS);
const MAX_FINAL_PROMPT_BYTES = 24 * 1024;

const HISTORY_STATUSES = new Set(["available", "not_authorized", "unavailable"]);
const USER_STATUSES = new Set(["available", "not_authorized", "unavailable"]);
const RETRIEVAL_STATUSES = new Set(["available", "not_requested", "unavailable"]);
const FACT_SOURCES = new Set(["confirmed", "derived"]);
const HISTORY_ROLES = new Set(["user", "assistant"]);
const CONNECTIVITY_VALUES = new Set(["offline", "connecting", "online", "unknown"]);

function promptError(message) {
  const error = new Error(message);
  error.code = "INVALID_PROMPT_CONTEXT";
  return error;
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function requireObject(value, label) {
  if (!isPlainObject(value)) throw promptError(`${label} must be a plain object`);
  return value;
}

function allowKeys(value, allowed, label) {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) throw promptError(`${label}.${key} is not allowed`);
  }
}

function requireText(value, label, maxLength, { optional = false } = {}) {
  if (optional && value === undefined) return undefined;
  if (typeof value !== "string") throw promptError(`${label} must be text`);
  const text = value.trim();
  if (!text && !optional) throw promptError(`${label} cannot be empty`);
  if (text.length > maxLength) throw promptError(`${label} is too long`);
  return text;
}

function requireBoolean(value, label, fallback = false) {
  if (value === undefined) return fallback;
  if (typeof value !== "boolean") throw promptError(`${label} must be true or false`);
  return value;
}

function requireStatus(value, allowed, fallback, label) {
  const status = value === undefined ? fallback : value;
  if (!allowed.has(status)) throw promptError(`${label} has an invalid status`);
  return status;
}

function rejectCredentialLikeContent(text) {
  const patterns = [
    /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{16,}\b/,
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
    /\bOPENAI_API_KEY\s*=/i,
    /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/i,
    /\b(?:password|passwd|passphrase|api[ _-]?key|access[ _-]?token|refresh[ _-]?token|client[ _-]?secret|wi-?fi[ _-]?password|sim[ _-]?pin)\b\s*(?:is|:|=)\s*\S+/i,
    /(?:[?&]|\\u0026)(?:token|access_token|refresh_token|api_key|key|signature|sig|password|secret|auth)=/i,
  ];
  if (patterns.some((pattern) => pattern.test(text))) {
    throw promptError("Prompt context appears to contain a credential");
  }
}

function normalizeHistory(value = {}) {
  const history = requireObject(value, "history");
  allowKeys(history, ["status", "turns"], "history");
  const status = requireStatus(history.status, HISTORY_STATUSES, "unavailable", "history");
  const turns = history.turns === undefined ? [] : history.turns;
  if (!Array.isArray(turns)) throw promptError("history.turns must be a list");

  const normalizedTurns = Array.from(turns.slice(-8), (candidate, index) => {
    const turn = requireObject(candidate, `history.turns[${index}]`);
    allowKeys(turn, ["role", "text", "interrupted"], `history.turns[${index}]`);
    if (!HISTORY_ROLES.has(turn.role)) {
      throw promptError(`history.turns[${index}].role is invalid`);
    }
    return {
      role: turn.role,
      text: requireText(turn.text, `history.turns[${index}].text`, 800),
      interrupted: requireBoolean(
        turn.interrupted,
        `history.turns[${index}].interrupted`,
      ),
    };
  });
  if (status !== "available" && normalizedTurns.length) {
    throw promptError("history turns require available status");
  }

  return { status, turns: normalizedTurns };
}

function normalizeUser(value = {}) {
  const user = requireObject(value, "user");
  allowKeys(user, ["status", "facts"], "user");
  const status = requireStatus(user.status, USER_STATUSES, "unavailable", "user");
  const facts = user.facts === undefined ? [] : user.facts;
  if (!Array.isArray(facts)) throw promptError("user.facts must be a list");
  if (facts.length > 16) throw promptError("user.facts has too many items");

  const normalized = {
    status,
    facts: Array.from(facts, (candidate, index) => {
      const fact = requireObject(candidate, `user.facts[${index}]`);
      allowKeys(fact, ["label", "value", "source", "purpose"], `user.facts[${index}]`);
      if (!FACT_SOURCES.has(fact.source)) {
        throw promptError(`user.facts[${index}].source is invalid`);
      }
      const label = requireText(fact.label, `user.facts[${index}].label`, 80);
      if (
        /\b(?:password|passphrase|api[ _-]?key|access[ _-]?token|refresh[ _-]?token|client[ _-]?secret|sim[ _-]?pin)\b/i.test(label)
      ) {
        throw promptError(`user.facts[${index}] has a sensitive label`);
      }
      return {
        label,
        value: requireText(fact.value, `user.facts[${index}].value`, 256),
        source: fact.source,
        purpose: requireText(
          fact.purpose,
          `user.facts[${index}].purpose`,
          160,
          { optional: true },
        ) || "personalization",
      };
    }),
  };
  if (status !== "available" && normalized.facts.length) {
    throw promptError("user facts require available status");
  }
  return normalized;
}

function optionalUrl(value, label) {
  if (value === undefined) return undefined;
  const text = requireText(value, label, 1_000);
  let url;
  try {
    url = new URL(text);
  } catch {
    throw promptError(`${label} must be a URL`);
  }
  if (!new Set(["http:", "https:"]).has(url.protocol)) {
    throw promptError(`${label} must use http or https`);
  }
  // Search URLs are provenance hints, not navigation instructions. Strip
  // userinfo, signed query values, and fragments before they enter a prompt.
  url.username = "";
  url.password = "";
  url.search = "";
  url.hash = "";
  return url.href;
}

function normalizeRetrieval(value = {}) {
  const retrieval = requireObject(value, "retrieval");
  allowKeys(retrieval, ["status", "results"], "retrieval");
  const status = requireStatus(
    retrieval.status,
    RETRIEVAL_STATUSES,
    "not_requested",
    "retrieval",
  );
  const results = retrieval.results === undefined ? [] : retrieval.results;
  if (!Array.isArray(results)) throw promptError("retrieval.results must be a list");
  if (results.length > 6) throw promptError("retrieval.results has too many items");

  const normalized = {
    status,
    results: Array.from(results, (candidate, index) => {
      const result = requireObject(candidate, `retrieval.results[${index}]`);
      allowKeys(
        result,
        ["sourceId", "title", "url", "excerpt", "publishedAt", "retrievedAt"],
        `retrieval.results[${index}]`,
      );
      return {
        sourceId: requireText(result.sourceId, `retrieval.results[${index}].sourceId`, 120),
        title: requireText(result.title, `retrieval.results[${index}].title`, 240),
        url: optionalUrl(result.url, `retrieval.results[${index}].url`),
        excerpt: requireText(result.excerpt, `retrieval.results[${index}].excerpt`, 800),
        publishedAt: requireText(
          result.publishedAt,
          `retrieval.results[${index}].publishedAt`,
          40,
          { optional: true },
        ),
        retrievedAt: requireText(
          result.retrievedAt,
          `retrieval.results[${index}].retrievedAt`,
          40,
          { optional: true },
        ),
      };
    }),
  };
  if (status !== "available" && normalized.results.length) {
    throw promptError("retrieval results require available status");
  }
  return normalized;
}

function normalizeReportedStatus(value = {}) {
  const status = requireObject(value, "device.reportedStatus");
  allowKeys(
    status,
    ["batteryPercent", "charging", "connectivity", "listening", "powerSource"],
    "device.reportedStatus",
  );
  const normalized = {};
  if (status.batteryPercent !== undefined) {
    if (
      !Number.isFinite(status.batteryPercent) ||
      status.batteryPercent < 0 ||
      status.batteryPercent > 100
    ) {
      throw promptError("device.reportedStatus.batteryPercent must be between 0 and 100");
    }
    normalized.batteryPercent = status.batteryPercent;
  }
  if (status.charging !== undefined) {
    normalized.charging = requireBoolean(status.charging, "device.reportedStatus.charging");
  }
  if (status.connectivity !== undefined) {
    if (!CONNECTIVITY_VALUES.has(status.connectivity)) {
      throw promptError("device.reportedStatus.connectivity is invalid");
    }
    normalized.connectivity = status.connectivity;
  }
  if (status.listening !== undefined) {
    normalized.listening = requireBoolean(status.listening, "device.reportedStatus.listening");
  }
  if (status.powerSource !== undefined) {
    normalized.powerSource = requireText(
      status.powerSource,
      "device.reportedStatus.powerSource",
      40,
    );
  }
  return normalized;
}

function normalizeDevice(value = {}) {
  const device = requireObject(value, "device");
  allowKeys(
    device,
    ["surface", "locale", "timeZone", "capabilities", "reportedStatus"],
    "device",
  );
  const capabilities = device.capabilities === undefined
    ? ["full_duplex_audio", "sliding_captions", "eyes_only_face"]
    : device.capabilities;
  if (!Array.isArray(capabilities) || capabilities.length > 16) {
    throw promptError("device.capabilities must be a list of at most 16 items");
  }

  const normalized = {
    surface: device.surface === undefined
      ? "browser_simulator"
      : requireText(device.surface, "device.surface", 80),
    locale: device.locale === undefined
      ? "unknown"
      : requireText(device.locale, "device.locale", 40),
    timeZone: device.timeZone === undefined
      ? "unknown"
      : requireText(device.timeZone, "device.timeZone", 80),
    capabilities: Array.from(capabilities, (item, index) => (
      requireText(item, `device.capabilities[${index}]`, 80)
    )),
    reportedStatus: normalizeReportedStatus(device.reportedStatus || {}),
  };
  if (Buffer.byteLength(JSON.stringify(normalized), "utf8") > 2_048) {
    throw promptError("device context is too large");
  }
  return normalized;
}

function normalizeCompanionName(value = "Mochi") {
  if (typeof value !== "string") throw promptError("companionName must be text");
  const name = value.trim();
  if (!/^[\p{L}\p{N}][\p{L}\p{N} _'-]{0,39}$/u.test(name)) {
    throw promptError("companionName contains unsupported characters");
  }
  return name;
}

function jsonForPrompt(value) {
  return JSON.stringify(value, null, 2).replace(/[<>&\u2028\u2029]/g, (character) => {
    const code = character.codePointAt(0).toString(16).padStart(4, "0");
    return `\\u${code}`;
  });
}

export function loadPromptTemplate(filename = DEFAULT_PROMPT_TEMPLATE_PATH) {
  return readFileSync(filename, "utf8");
}

export function compilePromptTemplate(templateText) {
  if (typeof templateText !== "string") throw promptError("Prompt template must be text");
  if (templateText.startsWith("\uFEFF")) throw promptError("Prompt template cannot contain a BOM");
  if (!templateText.startsWith("You are a companion")) {
    throw promptError('Prompt template must begin with "You are a companion"');
  }
  if (templateText.includes("<#") || templateText.includes("[#")) {
    throw promptError("FreeMarker directives are not supported by this renderer");
  }

  const counts = new Map();
  const syntax = templateText.match(/\$\{[^}]*\}/g) || [];
  for (const token of syntax) {
    const match = token.match(/^\$\{([a-z_][a-z0-9_]*)\}$/);
    if (!match || !PLACEHOLDER_SET.has(match[1])) {
      throw promptError(`Unsupported prompt placeholder: ${token}`);
    }
    counts.set(match[1], (counts.get(match[1]) || 0) + 1);
  }
  for (const name of PLACEHOLDERS) {
    if (counts.get(name) !== 1) {
      throw promptError(`Prompt template must contain ${name} exactly once`);
    }
  }
  const withoutKnownPlaceholders = templateText.replace(
    /\$\{([a-z_][a-z0-9_]*)\}/g,
    "",
  );
  if (withoutKnownPlaceholders.includes("${")) {
    throw promptError("Prompt template contains incomplete placeholder syntax");
  }

  return Object.freeze({ templateText });
}

export function renderRealtimeInstructions(compiledTemplate, promptContext = {}) {
  if (
    typeof compiledTemplate !== "string" &&
    (!compiledTemplate || typeof compiledTemplate.templateText !== "string")
  ) {
    throw promptError("A compiled prompt template is required");
  }
  const compiled = compilePromptTemplate(
    typeof compiledTemplate === "string"
      ? compiledTemplate
      : compiledTemplate.templateText,
  );

  const context = requireObject(promptContext, "promptContext");
  allowKeys(context, ["companionName", "history", "user", "retrieval", "device"], "promptContext");
  const values = {
    companion_name: normalizeCompanionName(context.companionName),
    pager_expression_config_json: jsonForPrompt(PAGER_EXPRESSION_PROMPT_CONFIG),
    user_context_json: jsonForPrompt(normalizeUser(context.user || {})),
    past_conversation_history_json: jsonForPrompt(normalizeHistory(context.history || {})),
    retrieved_search_context_json: jsonForPrompt(normalizeRetrieval(context.retrieval || {})),
    device_context_json: jsonForPrompt(normalizeDevice(context.device || {})),
  };
  rejectCredentialLikeContent(Object.values(values).join("\n"));

  const rendered = compiled.templateText.replace(
    /\$\{([a-z_][a-z0-9_]*)\}/g,
    (_token, name) => values[name],
  );
  if (Buffer.byteLength(rendered, "utf8") > MAX_FINAL_PROMPT_BYTES) {
    throw promptError("Rendered prompt is too large");
  }
  return rendered;
}

let cachedDefaultTemplate = null;

export function buildCompanionPrompt(promptContext = {}, { templateText } = {}) {
  let compiled;
  if (templateText === undefined) {
    if (!cachedDefaultTemplate) {
      cachedDefaultTemplate = compilePromptTemplate(loadPromptTemplate());
    }
    compiled = cachedDefaultTemplate;
  } else {
    compiled = compilePromptTemplate(templateText);
  }
  return renderRealtimeInstructions(compiled, promptContext);
}
