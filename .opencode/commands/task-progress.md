---
description: Update active task with a progress note
agent: main
subtask: false
---
Record a progress update on the current active task in memory.md.

Usage:
  /task-progress <what happened, blockers, next steps, etc.>

User update: $ARGUMENTS

1. Read memory.md.
2. If there is no populated Active Task, respond "No active task. Start one with /task-start <plan> | <module>" and stop.
3. Append a new bullet under the Active Task block:
   - **Progress (YYYY-MM-DD):** <user's update>
4. If the Active Task block already has a Progress section, append to it chronologically.
5. Confirm: "Progress noted for active task: <plan>"

Example Active Task after updates:

## Active Task

- **Started:** 2026-07-04
- **Activity plan:** Add CSV export to leave report
- **Targeted module:** backend/src/routes/leaves.ts
- **Progress (2026-07-04):** Wrote the generator function, starting on route handler
- **Progress (2026-07-05):** Blocked — need clarification on date format. Route handler done.
