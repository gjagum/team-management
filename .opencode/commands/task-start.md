---
description: Start a new tracked task with plan and module
agent: main
subtask: false
---
Use the task-start skill to record a new active task.

Arguments format (pipe-separated):
  /task-start <plan> | <module>

Where:
  <plan>   = brief description of what you're doing
  <module> = file or directory path (omit leading team-management/)

Examples:
  /task-start Add CSV export to leave report | backend/src/routes/leaves.ts
  /task-start Refactor Teams page sidebar @ frontend/src/pages/Teams.tsx

User invocation: $ARGUMENTS

1. Read memory.md.
2. Parse the plan and module from the invocation text. Accept pipe (|) or at (@) as separator.
3. If an Active Task already exists and is populated, move it to the Task Log with Note = "abandoned (superseded)".
4. Write the new Active Task block with today's date (YYYY-MM-DD), the parsed plan, and the parsed module.
5. Confirm: "Active task started: <plan> (→ <module>)"
