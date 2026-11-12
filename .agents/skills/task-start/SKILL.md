---
name: task-start
description: Records the developer's activity plan and targeted module for this project. Use whenever the user says "start a task", "task-start", "record my activity plan", "/task-start", or wants to log what they're about to work on. Also covers companion commands "/task-current" or "what am I working on" (show active task), "/task-done" or "mark task done" (finish the active task), and "/task-log" or "show task history" (display past tasks). Trigger it any time the user references task-start, task-done, task-current, or task-log — even without the slash.
---

# Task Start

This skill tracks what the developer is currently working on in this repo: an **activity plan** plus the **targeted module** (file or directory). State lives in the project's `memory.md` so it persists across sessions and sits next to the existing Feature Log.

There are four commands:

| Command                  | Purpose                                             |
| ------------------------ | --------------------------------------------------- |
| `/task-start <plan> \| <module>` | Begin a new task; replaces the current active task. |
| `/task-current`          | Show the active task.                               |
| `/task-done [note]`      | Finish the active task and log it.                  |
| `/task-log`              | Show the task history table.                        |

## When to Use This Skill

Trigger this skill when the user:

- Types `/task-start`, `/task-current`, `/task-done`, or `/task-log`.
- Says "start a task", "I'm starting work on X", "record my activity plan", or "log what I'm doing".
- Asks "what am I working on?" or "what's the current task?".
- Says "mark task done", "I finished the task", or "task complete".
- Asks to "show task history" or "what have I worked on?".

## Storage Convention

All state is in **`memory.md`** at the repo root. This skill owns two sections that live immediately after the existing `## Feature Log` table:

1. `## Active Task` — a single task block, overwritten on each `/task-start`.
2. `## Task Log` — an append-only history table, appended to by `/task-done` (and by `/task-start` when superseding an unfinished task).

Never modify anything above these sections — the top `> For the AI` instruction line, `## Architecture & Conventions`, and `## Feature Log` must stay byte-for-byte identical.

### `## Active Task` format

```markdown
## Active Task

- **Started:** 2026-07-02
- **Activity plan:** Add CSV export to the leave report
- **Targeted module:** backend/src/routes/leaves.ts
```

### `## Task Log` format

```markdown
## Task Log

| Started    | Done       | Targeted module               | Activity plan                  | Note      |
| ---------- | ---------- | ----------------------------- | ------------------------------ | --------- |
| 2026-07-02 | 2026-07-02 | backend/src/routes/leaves.ts  | Add CSV export to leave report |           |
```

`Note` is optional; leave it empty when `/task-done` is called with no note. For superseded-but-unfinished tasks moved over by `/task-start`, set the Note to `abandoned (superseded)`.

## Inline Argument Format

`/task-start` parses the module and plan from the user's invocation text. Two accepted forms:

- **Pipe separator (preferred):** `/task-start <plan> | <module>`
- **At separator:** `/task-start <plan> @ <module>`

In both forms the **plan comes first**, the module second.

The **module** is a path within this repo (omit a leading `team-management/`). Typical examples:

- `backend/src/routes/leaves.ts`
- `frontend/src/pages/Teams.tsx`
- `backend/prisma/schema.prisma`

### Examples

```
/task-start Add CSV export to the leave report | backend/src/routes/leaves.ts
/task-start Refactor Teams page sidebar @ frontend/src/pages/Teams.tsx
/task-start Wire up audit logging for leave approvals | backend/src/routes/leaves.ts
```

**No arguments:** If the user invokes `/task-start` with no arguments, ask one brief clarifying question requesting the plan and module (do not write anything to `memory.md` until you have both).

## Command Behaviors

Read `memory.md` before every edit so you operate on current content. Use precise targeted edits — never rewrite the whole file.

### `/task-start <plan> | <module>`

1. Read `memory.md`.
2. If a `## Active Task` section already exists and contains a task (i.e. the block is populated, not empty):
   - Move that task into `## Task Log` as a new row: `Started` = the existing Started date, `Done` = today, `Targeted module` and `Activity plan` from the existing block, `Note` = `abandoned (superseded)`. This avoids silently losing a task that was never marked done.
3. Overwrite (or create) the `## Active Task` section with today's date (use the current date, YYYY-MM-DD), the parsed plan, and the parsed module.
4. Confirm to the user with a one-line summary: `Active task started: <plan> (→ <module>)`.

### `/task-current`

1. Read `memory.md`.
2. If `## Active Task` is present and populated, display it formatted as the three-bullet block.
3. If absent or empty, respond: `No active task. Start one with \`/task-start <plan> | <module>\`.`

### `/task-done [note]`

1. Read `memory.md`.
2. If there is no populated `## Active Task`, respond: `No active task to mark done.` and stop.
3. Append a new row to `## Task Log`: `Started` = the active task's Started date, `Done` = today, `Targeted module` and `Activity plan` from the active task, `Note` = the user's optional note (empty if none).
4. Clear `## Active Task` — leave the header and an empty body (or remove the block so the section is empty); keep the section header present so future runs have a stable anchor.
5. Confirm: `Task done and logged: <plan>`.

### `/task-log`

1. Read `memory.md`.
2. Display the `## Task Log` table. If the section is missing or empty, respond: `No tasks logged yet.`

## Editing Rules

- **Always Read `memory.md` before editing** — the file may have changed in the session.
- Use targeted string edits against the exact section text; never rewrite the whole file.
- Preserve every line above `## Active Task` exactly (the instruction line, Architecture & Conventions, Feature Log).
- If `## Active Task` or `## Task Log` does not yet exist, create them in this order immediately after the Feature Log table: `## Active Task` first, then `## Task Log`.
- Use the current date for `Started`/`Done` fields, formatted `YYYY-MM-DD`.

## Worked Example

**Before** (`memory.md` tail, no task sections yet):

```markdown
| — | Docker Compose single-container deployment | DevOps | ✅ |
```

**User runs:** `/task-start Add CSV export to the leave report | backend/src/routes/leaves.ts`

**After:**

```markdown
| — | Docker Compose single-container deployment | DevOps | ✅ |

## Active Task

- **Started:** 2026-07-02
- **Activity plan:** Add CSV export to the leave report
- **Targeted module:** backend/src/routes/leaves.ts

## Task Log

| Started | Done | Targeted module | Activity plan | Note |
| ------- | ---- | --------------- | ------------- | ---- |
```

**User later runs:** `/task-done shipped behind a feature flag`

**After `/task-done`:**

```markdown
## Active Task


## Task Log

| Started    | Done       | Targeted module              | Activity plan                  | Note                    |
| ---------- | ---------- | ---------------------------- | ------------------------------ | ----------------------- |
| 2026-07-02 | 2026-07-02 | backend/src/routes/leaves.ts | Add CSV export to leave report | shipped behind a flag   |
```
