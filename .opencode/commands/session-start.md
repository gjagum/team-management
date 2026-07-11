---
description: Open a developer session in the aitivity-ledger — records your plan, module, and branch before you start coding.
agent: main
---

Open a new developer session using the **aitivity-ledger** MCP tools.

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

**Format:** `<plan> | <module> [| <branch>]`

- **plan** — what you intend to work on this session. Use commas to create multiple checklist items.
- **module** — the feature area or primary file path (e.g. `backend/src/routes/leaves.ts`, `frontend/src/pages/Dashboard.tsx`).
- **branch** *(optional)* — the git branch. If omitted, use the current branch from `git branch --show-current`.

**If no arguments were provided**, ask the user for the plan and module before proceeding. Do not call any MCP tool until you have both.

## Steps

1. **Identify the developer.**
   Run `git config user.name` to get the developer name, and `git config user.email` to extract a GitHub username (the part before `@`). Use the name as `developer_name`; use the handle as `github_user` if the email looks like a GitHub account.

2. **Ensure the developer exists** in the ledger.
   Call `aitivity-ledger_developer_ensure` with the `name` (and `github_user` if available).

3. **Check for existing open sessions.**
   Call `aitivity-ledger_session_list` with `status: "open"`. If the developer already has an open session, warn the user and ask whether to close it first (via `/session-end`) or proceed with a second session. Do not silently open a duplicate.

4. **Parse the arguments.**
   Split on `|`: first segment = plan, second = module, third = branch (optional). If branch is omitted, use the current git branch. Split the plan on commas into a trimmed array of checklist items.

5. **Open the session.**
   Call `aitivity-ledger_session_start` with:
   - `developer_name` — the git user name
   - `module` — the parsed module
   - `branch` — the parsed or detected branch
   - `plan` — the plan array
   - `github_user` — if available

6. **Optional: claim file locks.**
   If the module is a specific file path and the user wants to lock it before coding, call `aitivity-ledger_lock_check` first to see if it's already locked by someone else. If clear, call `aitivity-ledger_lock_claim` with the file path, developer name, branch, and category `OWNED`. Only do this if the plan implies exclusive ownership of that file — for shared files use category `SHARED` and note the coordination intent.

7. **Report back.**
   One-line confirmation: `Session #N opened: <module> on <branch> — <plan item count> tasks in plan.` Include any lock claims or warnings.

## Rules

- Do not write to `memory.md`, `FILE_OWNERSHIP.md`, or any governance markdown file — all state lives in the aitivity-ledger.
- Do not write feature code during this command. This is a governance/setup step only.
