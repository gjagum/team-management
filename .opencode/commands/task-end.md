---
description: Mark the active task as done and log it
agent: main
subtask: false
---
Use the task-start skill to finish the current active task.

Usage:
  /task-end [optional note about what was done or why it ended]

User note: $ARGUMENTS

1. Read memory.md.
2. If there is no populated Active Task, respond "No active task to mark done." and stop.
3. Append a new row to the Task Log: Started = the active task's Started date, Done = today (YYYY-MM-DD), Targeted module and Activity plan from the active task, Note = the user's optional note (empty if none).
4. Clear the Active Task block (keep the header, leave the body empty).
5. Confirm: "Task done and logged: <plan>"
