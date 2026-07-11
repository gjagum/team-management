---
description: Record files modified in the active session — tracks added, modified, or deleted files with ownership category.
agent: main
---

Record files modified during the active session using the **aitivity-ledger** MCP tools.

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

**Format:** `<file path>:<change type>:<category> [, <file path>:<change type>:<category> ...]`

- **file path** — the file touched this session.
- **change type** — `added`, `modified`, or `deleted`.
- **category** — `OWNED`, `SHARED`, `CORE`, or `READ_ONLY`.

**Shorthand:** You may omit change type and category — defaults are `modified` and `OWNED`.

**Examples:**
```
backend/src/services/csv.ts:modified:OWNED, backend/src/routes/leaves.ts:modified:OWNED
frontend/src/pages/Dashboard.tsx:added:OWNED
backend/prisma/schema.prisma:modified:SHARED
```

**If no arguments provided**, auto-detect from git:
1. Run `git diff --name-status HEAD` and `git status --short` to list changed files.
2. Map git status codes: `A` → added, `M` → modified, `D` → deleted, `??` → added (untracked).
3. Show the detected list and ask the user to confirm before recording.

## Steps

1. **Find the active session.**
   Run `git config user.name`. Call `aitivity-ledger_session_list` with `status: "open"` and filter for sessions matching the developer name.
   - If **no open session**: respond `No active session. Start one with /session-start first.` and stop.

2. **Parse or detect files.**
   - If arguments provided: split on `,`, then split each entry on `:` for path, change type, category.
   - If no arguments: auto-detect from git (see above). Ask for confirmation.

3. **Record each file.**
   For each file, call `aitivity-ledger_session_file_add` with:
   - `session_id` — the active session ID
   - `path` — the file path
   - `change_type` — `added`, `modified`, or `deleted`
   - `category` — `OWNED`, `SHARED`, `CORE`, or `READ_ONLY`

4. **Report back.**
   Summary table:

   | Path | Change | Category |
   |------|--------|----------|
   | ...  | ...    | ...      |

   Include the session number in the confirmation: `Recorded N files in Session #M.`

## Rules

- Do not write to `MEMORY_REPORT.md`, `API_REPORT.md`, or any governance markdown file — all file tracking lives in the aitivity-ledger.
- For SHARED or CORE files, remind the user to coordinate with other developers (check `lock_list` for existing locks).
