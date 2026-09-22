# ClashFree Permissions Matrix

These rules are **requirements for later backend enforcement**. Phase 0 documents them and uses them to label preview navigation. The frontend preview does not authenticate users or call a permissions API.

Capabilities:

- `view` — see a screen or dataset.
- `edit` — create, update or delete scheduling data in scope.
- `submitRequest` — raise a scheduling or change request for administrator review.
- `reportDisruption` — report room unavailability, maintenance, or lecturer unavailability.
- `generate` — run the timetable solver.
- `approveRepair` — accept a repair option after comparison.
- `publish` — make a timetable version the active published schedule.

## Role × capability

| Capability | Administrator | Coordinator | Lecturer | Facilities | Student |
| --- | --- | --- | --- | --- | --- |
| view | University-wide | Own department | Personal teaching schedule | Rooms and facility impact | Personal class schedule |
| edit | University-wide academic data, constraints, users | Department courses, cohorts, assignments, local constraints | Availability and scheduling preferences | Rooms, availability, status, maintenance | None |
| submitRequest | Approves others’ requests | Yes (room changes, extra classes, reassignment) | Yes (timetable change requests) | No (reports disruptions instead) | No |
| reportDisruption | Can record any disruption | No | Lecturer unavailability | Room closures and maintenance | No |
| generate | Yes, university-wide | Yes, own department only | No | No | No |
| approveRepair | Yes, any open disruption | Yes, disruptions that affect their department | No | No | No |
| publish | Yes | No | No | No | No |

## Scope rules

- **Department-level access (coordinator):** a coordinator may view and edit only courses, cohorts, assignments, lecturer availability summaries and constraints that belong to their department. They may review departmental conflicts and the departmental timetable. They may generate a timetable and approve a repair only for their own department. Meetings outside that department stay pinned to the published timetable. They cannot publish.
- **Personal schedule access (lecturer):** a lecturer sees assigned courses and their own teaching timetable. They do not see other lecturers’ full schedules except where a shared class requires it later. Unavailability reports become disruptions for the administrator.
- **Personal schedule access (student):** a student sees registered-course times, today’s schedule and changes that affect those courses. Students are read-only.
- **Facilities:** the facilities manager supplies trusted room-status data and can see which classes a room disruption affects. They cannot regenerate or publish timetables.
- **Unauthenticated:** authentication screens only. No scheduling data.

## Screen-level notes

- Administrator **Generate Timetable**, **Repair Timetable**, **Repair Comparison**, **Change Review** and **Publish Timetable** require `generate`, `approveRepair` and/or `publish` as documented on each inventory record.
- Coordinator **Scheduling Requests** and **Change Requests** require `submitRequest`.
- Lecturer **Report Unavailability** requires `reportDisruption`.
- Facilities **Report Disruption** requires `reportDisruption`.
- Student screens are `view` only.

The machine-readable assignment for every screen lives in `frontend/src/config/pageInventory.ts`.
