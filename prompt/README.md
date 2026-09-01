# Mochi Realtime prompt

`mochi-realtime.ftl` is the version-controlled system-instruction template used when the gateway creates a Realtime session. It intentionally uses only FreeMarker's scalar `${name}` placeholder shape. The local Node.js renderer does not implement conditionals, lists, directives, method calls, or recursive evaluation.

Context is selected and rendered on the trusted server. The browser sends only SDP and cannot supply prompt text. History retention, retained-history context, structured memory, and search permission are separate product choices; unavailable or unauthorized context must stay explicitly unavailable. The small renderer rejects several recognizable credential shapes and sanitizes retrieval URLs, but it is not a general secret classifier—the production selector/redactor must exclude arbitrary secrets before calling it. Realtime session events may echo instructions to the connected client, so server-only secrets never belong in any context block.

The prompt also requires a `set_pager_emotion` function call before spoken answers. This is the structured equivalent of a `pager_emotion: happy` prefix, but it stays outside audio and caption text. The browser accepts only the shared allowlist and bounded duration; the function cannot control capture, power, battery, connectivity, or status indicators.
