# Scrum/task journal

This folder is an evidence-oriented build log rather than ceremony for its own sake.

## Path and numbering

```text
scrum/YYYYMMDD/task_NNNN/
```

- The date is the local start date of the task.
- `NNNN` is repository-wide and monotonically increasing; never reuse or renumber an ID.
- `README.md` states the outcome, scope, gates, and links.
- `daily_plan.md` is the intended sequence. Add `daily_log.md` when work begins and record actual dates, measurements, receipts, deviations, and evidence.
- Put large logs, photographs, traces, and test exports in an `evidence/` subdirectory when they exist.
- Close with `retrospective.md` and create new ADRs for decisions that changed. Do not rewrite the original plan to match history.

A “project day” is one focused engineering session, not necessarily a consecutive calendar day. Supplier shipping pauses do not consume project days. When a gate fails, add an explicit remediation task rather than purchasing the next stage anyway.

