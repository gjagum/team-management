---
description: Wrap up or close a developer session — records handover notes, and (after merge to develop) releases file locks.
agent: main
---

Manage the end of a developer session using the **aitivity-ledger** MCP tools.

This command has **two phases**:

| Phase | Trigger | What happens | Locks |
|-------|---------|--------------|-------|
| **Wrap-up** | `/session-end <notes>` | Records handover notes, marks ready-to-merge | Stay active |
| **Close** | `/session-end --merged <notes>` | Verifies merge to develop, closes session | Released |

Locks are only released **after** the branch is merged into the development branch. This prevents another developer from grabbing a file while your changes are still unreviewed.

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

**Format:** `[handover notes] [--merged] [--credits N] [--blockers <text>]`

- **handover notes** — free text for the next developer. Everything that isn't a flag.
- `--merged` — signals the branch has been merged into the development branch. Triggers **Close** phase (session_end + lock release).
- `--credits N` — credits consumed this session (number).
- `--blockers <text>` — any blockers to record.

**If no arguments were provided**, ask the user for a brief handover note before proceeding.

## Steps

1. **Identify the developer.**
   Run `git config user.name`.

2. **Find the open session.**
   Call `aitivity-ledger_session_list` with `status: "open"`. Filter for sessions where `developer_name` matches the git user name.
   - If **none found**: respond `No active session to close.` and stop.
   - If **multiple found**: list them (session number, module, branch) and ask the user which one.

3. **Determine the phase** from `$ARGUMENTS`:
   - If `--merged` is **present** → go to **Phase B: Close**.
   - If `--merged` is **absent** → go to **Phase A: Wrap-up**.

---

### Phase A — Wrap-up (no `--merged`)

Locks stay active. The session stays open.

4a. **Parse remaining arguments.**
   Extract `--credits N` and `--blockers <text>` if present. Everything else is the handover note.

5a. **Update the session** (do NOT close it).
   Call `aitivity-ledger_session_update` with:
   - `session_id` — from the matched session
   - `handover_notes` — the handover text
   - `ready_to_merge` — `true` (the developer is wrapping up)
   - `credits_used` — the `--credits` value if present (otherwise omit)
   - `blockers` — the `--blockers` text if present (otherwise omit)

6a. **Report back.**
   ```
   Session #N updated. Ready to merge.
   Locks are still ACTIVE — they will be released after merge.
   Run: /session-end --merged <brief note>
   ```

---

### Phase B — Close (with `--merged`)

Releases locks via `session_end`. Requires the branch to be merged into the development branch first.

4b. **Verify the merge.**
   Run `git branch --show-current` to get the current branch, then verify it has been merged:
   ```bash
   git branch --merged develop
   ```
   (Also try `origin/develop` if `develop` doesn't exist locally.)
   - If the branch appears in the merged list → proceed to step 5b.
   - If **NOT merged**: respond:
     ```
     Branch <branch> has not been merged into develop yet.
     Locks will stay active until merge is complete.
     Merge first, then re-run: /session-end --merged
     ```
     Stop — do not close the session.

5b. **Parse remaining arguments.**
   Extract `--credits N` and `--blockers <text>` if present. Everything else is the handover note.

6b. **Close the session.**
   Call `aitivity-ledger_session_end` with:
   - `session_id` — from the matched session
   - `status` — `"closed"`
   - `handover_notes` — the handover text
   - `ready_to_merge` — `true`
   - `credits_used` — the `--credits` value if present (otherwise omit)
   - `blockers` — the `--blockers` text if present (otherwise omit)

   `session_end` automatically releases all file locks owned by this session.

7b. **Report back.**
   ```
   Session #N closed. Merged to develop. Locks released.
   Credits: <N>. Ready to merge: YES.
   ```

## Rules

- **Never call `session_end` without `--merged`** — it releases locks prematurely.
- In Phase A, use `session_update` only — the session stays open and locks stay active.
- In Phase B, verify the git merge before calling `session_end`. If the branch is not merged, stop and tell the user.
- Do not write to `memory.md`, `COMPLETION_REPORT.md`, or any governance markdown file — all state lives in the aitivity-ledger.
