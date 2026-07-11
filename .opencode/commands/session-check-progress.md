---
description: Show the current developer session — active session details, plan checklist, related tasks, and file locks.
agent: main
---

Display the current developer session state using the **aitivity-ledger** MCP tools.

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

No arguments needed — shows the current developer's open session(s). If a session number (e.g. `4`) is provided, show that specific session instead.

## Steps

1. **Identify the developer.**
   Run `git config user.name`.

2. **If a session number was provided** as the argument, call `aitivity-ledger_session_get` with that number and skip to step 4.

3. **Find open sessions.**
   Call `aitivity-ledger_session_list` with `status: "open"`. Filter for sessions where `developer_name` matches the git user name.
   - If **none found**: respond `No active session. Start one with /session-start.` and stop.

4. **Display session details** for each matched session:
   - Session `#N` — `module` on `branch`
   - Started date
   - **Plan checklist** — each item from the `plan` array
   - Credits used (if any), ready to merge (if set)
   - Blockers (if any)
   - Handover notes (if any)

5. **List related tasks.**
   Call `aitivity-ledger_task_list` with `agent` set to the developer name. Summarize by status:
   - **Done** — count + summaries
   - **In progress** — count + summaries
   - **Blocked** — count + blocker descriptions
   - **Pending** — count

6. **List active file locks.**
   Call `aitivity-ledger_lock_list`. Show any locks owned by this developer or on this branch. Note any locks owned by **other** developers that might conflict with the current module.

## Rules

- Do not write to any file — this is read-only.
- Present results in compact tables, not paragraphs.
