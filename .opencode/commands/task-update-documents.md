---
description: Update governance documents after completing work
agent: main
subtask: false
---
Update project governance and documentation files to reflect what was just built.

Usage:
  /task-update-documents [summary of what changed]

User summary: $ARGUMENTS

1. Read memory.md.
2. Append a new row to ## Feature Log with:
   - Date: today (YYYY-MM-DD)
   - Summary: a one-line description of what was implemented
   - Category: the module area (Core / Auth / Security / UI / Data / DevOps / Governance)
   - Status: ✅
3. Check memory.md ## Active Task — if it's still populated and the work is done, prompt the user to run /task-end first.
4. Check if README.md has a feature list — if so, update it to reflect any new capabilities.
5. Verify the docs/ directory exists. If there are relevant files in docs/, update or create a changelog entry.
6. Confirm: "Documents updated. Feature log entry added: <summary>"
