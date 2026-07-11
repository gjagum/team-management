---
description: Close the active developer session — records handover notes, merge readiness, and releases file locks.
agent: main
---

Close the active developer session using the **aitivity-ledger** MCP tools.

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

**Format:** `[handover notes] [--merge] [--credits N] [--blockers <text>]`

- **handover notes** — free text for the next developer. Everything that isn't a flag.
- `--merge` — mark the session as ready to merge into main.
- `--credits N` — credits consumed this session (number).
- `--blockers <text>` — any blockers to record.

**If no arguments were provided**, ask the user for a brief handover note. Do not close the session until you have at least a one-line summary of what was done.

## Steps

1. **Identify the developer.**
   Run `git config user.name`.

2. **Find the open session.**
   Call `aitivity-ledger_session_list` with `status: "open"`. Filter for sessions where `developer_name` matches the git user name.
   - If **none found**: respond `No active session to close.` and stop.
   - If **multiple found**: list them (session number, module, branch) and ask the user which to close.

3. **Parse arguments.**
   - Extract `--merge` (boolean flag), `--credits N` (number), and `--blockers <text>` (string until the next flag or end).
   - Everything remaining after removing flags is the handover note.

4. **Close the session.**
   Call `aitivity-ledger_session_end` with:
   - `session_id` — from the matched session
   - `status` — `"closed"`
   - `handover_notes` — the handover text
   - `ready_to_merge` — `true` if `--merge` was present, otherwise `false`
   - `credits_used` — the `--credits` value if present (otherwise omit)
   - `blockers` — the `--blockers` text if present (otherwise omit)

   Note: `session_end` automatically releases all file locks owned by this session.

5. **Report back.**
   One-line confirmation: `Session #N closed. Merge: <YES/NO>. Credits: <N>. File locks released.`
   If `--merge` was set, include the merge reason from the handover notes.

## Rules

- Do not write to `memory.md`, `COMPLETION_REPORT.md`, or any governance markdown file — all state lives in the aitivity-ledger.
- Do not manually call `lock_release` — `session_end` handles lock cleanup automatically.
