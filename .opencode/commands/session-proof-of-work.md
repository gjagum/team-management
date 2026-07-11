---
description: Record proof of work for a requirement — links a file path and function to a REQ-ID with an execution trace.
agent: main
---

Record proof of work for a requirement using the **aitivity-ledger** MCP tools.

## Pre-flight: Verify MCP connectivity

Call `aitivity-ledger_developer_list` first. This lightweight read-only call confirms the MCP server is connected.

- **Success** → continue with the steps below.
- **Failure or tool not found** → respond with the message below and **stop — do not proceed**:

  > **aitivity-ledger MCP is not connected.**
  >
  > This command requires the `aitivity-ledger` MCP server (tools prefixed `aitivity-ledger_*`). Add it to your config, then restart opencode:
  >
  > **Option A** — `opencode.json` (project or `~/.config/opencode/opencode.json`):
  > ```json
  > "mcp": {
  >   "aitivity-ledger": {
  >     "type": "remote",
  >     "url": "<AITIVITY_LEDGER_URL>",
  >     "headers": { "Authorization": "Bearer <AITIVITY_LEDGER_TOKEN>" }
  >   }
  > }
  > ```
  >
  > **Option B** — `~/.config/opencode/mcp-servers.json`:
  > ```json
  > "aitivity-ledger": {
  >   "command": "npx",
  >   "args": ["-y", "@aitivity/ledger-mcp"],
  >   "env": { "AITIVITY_LEDGER_URL": "<URL>", "AITIVITY_LEDGER_TOKEN": "<TOKEN>" }
  > }
  > ```
  >
  > Check with your team lead or the aitivity-ledger docs for the correct URL and credentials.

## Arguments

$ARGUMENTS

**Format:** `<REQ-ID> | <description> | <proof file> [| <proof function>] [| <proof trace>]`

- **REQ-ID** — e.g. `REQ-001-001`. If the requirement doesn't exist yet, it will be created.
- **description** — what the requirement is about.
- **proof file** — the file path that satisfies the requirement.
- **proof function** *(optional)* — the specific function or component name.
- **proof trace** *(optional)* — a brief execution trace or verification step (e.g. "Called from POST /api/leaves → generateCsv() → streams response with Content-Type text/csv").

**If no arguments provided**, ask the user for at minimum the REQ-ID and proof file before proceeding.

## Steps

1. **Find the active session.**
   Run `git config user.name`. Call `aitivity-ledger_session_list` with `status: "open"` and filter for sessions matching the developer name.
   - If **no open session**: respond `No active session. Start one with /session-start first.` and stop.

2. **Parse the arguments.**
   Split on `|`:
   - `$1` → REQ-ID (required)
   - `$2` → description (required)
   - `$3` → proof file (required)
   - `$4` → proof function (optional)
   - `$5` → proof trace (optional)

3. **Upsert the requirement with proof.**
   Call `aitivity-ledger_req_upsert` with:
   - `session_id` — the active session ID
   - `req_id` — the parsed REQ-ID
   - `description` — the parsed description
   - `status` — `"complete"` (proof of work implies the requirement is satisfied)
   - `proof_file` — the parsed file path
   - `proof_function` — the parsed function name (if provided)
   - `proof_trace` — the parsed trace (if provided)

4. **Report back.**
   One-line confirmation: `Proof of work recorded: <REQ-ID> → <proof file> [<proof function>].`

## Rules

- Do not write to `COMPLETION_REPORT.md` or any governance markdown file — all proof of work lives in the aitivity-ledger.
- Only set status to `"complete"` when proof is provided. If the user is deferring, ask and set status to `"deferred"` instead.
