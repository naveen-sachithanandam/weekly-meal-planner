# Spec: 001 — Weekly Meal Plan Grid

---

## Goals

### Primary goal
A household of 2 adults (with a toddler whose dietary needs
constrain the plan) can plan every meal for the coming week
in a single view — without switching screens, losing context,
or rebuilding the plan from scratch each week.

### Success criteria
1. A user can view the full 7-day grid for the current week in one
   screen load. The number and names of meal rows are driven by the
   household's active meal type configuration, not hardcoded. Each meal
   type row is labeled with its configured name (e.g. Breakfast, Lunch,
   Dinner) so the user can see which slot they are editing at a glance —
   either as a row title for the whole week or on every cell in that row.
2. A user can assign, change, or clear any meal slot with inline
   editing directly on the grid cell. Filled slots show explicit **Edit**
   and **Delete** controls on the tile (not only click-to-edit on the meal
   name). Delete clears the slot and returns it to the empty state.
3. Family rules are enforced at entry — a slot that violates a
   rule cannot be saved without an explicit override.
4. The plan persists across browser sessions and devices
   without data loss.
5. Weeks start on Sunday. The grid always renders Sunday as the
   first column. Week rollover happens at Sunday 00:00 home timezone.

---

## Anti-Goals

The following are explicitly out of scope for this feature:

1. **Full recipe management.** Meals have names and AI-suggested
   ingredient lists. They do not have cooking steps, timers,
   serving sizes, or nutritional data.

2. **Meal type configuration UI.** Managing meal types (adding, renaming,
   reordering, deleting) is handled in Feature 002 — Configuration Page.
   This feature only consumes the meal type configuration from the database.

3. **AI meal suggestions.** Ollama (local) suggests ingredients
   for a meal the user has named. It does not suggest what meal
   to cook. The planning decision stays with the user.

4. **Nutritional tracking.** No calorie counts, macros, or
   dietary scoring of any kind.

5. **Editable past days.** Any day before today (yesterday and
   earlier) is read-only. Today and all future days are editable.

6. **History beyond the previous week.** Grid supports:
   current week (editable), next week (editable, plan ahead),
   previous week (read-only, reference). Older history is out of scope.

7. **More than one household.** Single-household app. No
   multi-tenancy, no login, no accounts.

8. **Mobile-native experience.** Browser on home network only.
   Not optimised for small screens or installed as a PWA.

9. **Ollama blocking.** If Ollama is unavailable at meal entry
   time, the slot saves with an empty ingredient list.
   The meal plan never blocks on AI availability.

9. **Calendar integration.** Toddler home days are marked
   manually in the app. Google Calendar / iCal sync is a
   planned future feature, not in scope here.

---

## Personas

### Persona 1 — The Planner (primary user)
Plans the week's meals, usually on Sunday. Assigns meals to
slots, reviews Ollama-suggested ingredients, approves the
shopping list. Cares about speed — wants to finish weekly
planning in under 10 minutes. Has full edit access to today
and future days.

### Persona 2 — The Shopper (secondary user)
The other adult. Uses the shopping list during grocery runs.
May also update the meal plan mid-week when plans change.
Same edit access rules as the Planner.

### Persona 3 — The Toddler (household constraint, not a user)
Not an app user. Affects the meal plan as a constraint:
- Default schedule: daycare Monday–Friday, home Saturday–Sunday.
- Override: any day can be manually marked "toddler home"
  in advance (e.g. planned holidays, sick days).
- When toddler is home, lunch is a home meal and must be
  toddler-appropriate. Adults-only meals are not valid for
  that slot.
- What "toddler-appropriate" means is defined per household
  in spec.local.md (gitignored). The Planner decides and sets
  the flag — the app does not enforce it automatically.

---

## User Journeys

### Journey 1 — Planning the week
The Planner opens the app on Sunday. The grid shows the
current week with all empty slots. Row labels (Breakfast, Lunch,
Dinner, and any other active meal types) are visible so they can
scan down a meal type across the week. They work through each
day — typing a meal name into a slot and confirming it.
The slot saves immediately and shows a loading indicator
while Ollama generates ingredient suggestions in the
background. When ingredients are ready, the slot updates
in place. During confirmation, the app asks whether the
meal is toddler-appropriate. The Planner reviews and
approves or edits the ingredient list before moving on.

### Journey 2 — Changing a plan mid-week
It's Wednesday. The Planner taps **Edit** on Thursday's dinner tile,
changes the meal name, and confirms. The slot saves immediately.
Ollama re-runs for the new meal — the previous ingredient
list is discarded and replaced with fresh suggestions.
If plans change entirely, they tap **Delete**, confirm, and the tile
returns to empty with no meal or ingredients stored.
Monday and Tuesday slots are visible but locked — greyed
out, non-interactive, with no Edit or Delete controls.

### Journey 3 — Planning next week in advance
It's Friday. The Planner clicks the next week chevron on the weekly
date range display (e.g. `‹  May 10 – May 16  ›`). The grid renders
next week with all slots empty and editable. Returning to the current
week view, nothing has changed. Both weeks hold their state independently.

### Journey 4 — Marking a toddler home day
The Planner marks Monday next week as "toddler home" —
a planned daycare holiday. The grid updates Monday's
display rules to match a weekend day (no packed lunch
slot, toddler-appropriate constraint active). If Monday
already has meals planned, the system flags any slots
that may not be toddler-appropriate and prompts the
Planner to review them before saving the change.

---

## Acceptance Criteria

### AC-001 — Slot saves immediately on confirm
Given a meal slot is empty and today or a future day
When the user types a meal name and confirms
Then the slot displays the meal name immediately
And a loading indicator appears on the ingredient section
And the slot is persisted to the database before Ollama responds
And the app asks: "Is this meal toddler-appropriate?" as part
of the confirmation flow

### AC-002 — Ingredients populate asynchronously
Given a meal slot has just been saved with a meal name
When Ollama returns ingredient suggestions
Then the loading indicator is replaced with the ingredient list
And the user is prompted to review and approve or edit
And no other slot in the grid is blocked during this process

### AC-003 — Ollama unavailable — graceful degradation
Given a meal slot is being confirmed
When Ollama is unreachable or times out
Then the slot saves with the meal name and an empty ingredient list
And a message indicates that ingredients could not be generated
And the user can add ingredients manually or retry later

### AC-004 — Past days are read-only
Given any calendar day before today (yesterday and earlier)
When the user attempts to interact with any meal slot on that day
Then the slot is non-interactive and shows no edit controls
And no **Edit** or **Delete** actions are shown on the tile
And the meal name is displayed as read-only text
Note: today and all future days remain fully editable regardless
of time of day.

### AC-005 — Week navigation
Given the user is on any week view
When they click the prev or next chevron on the weekly date range display
Then the grid renders the correct 7-day window starting Sunday
And the navigated week retains its saved state
And previous week slots are all read-only
And the weekly date range label updates to reflect the new week (e.g. `‹  May 17 – May 23  ›`)
And the prev chevron is disabled when already on the oldest allowed week (previous week)
And the next chevron is disabled when already on the newest allowed week (next week)

### AC-006 — Toddler home day flagging
Given a future day already has meals planned
When the user marks that day as "toddler home"
Then the system checks each planned meal against toddler rules
And flags any slot where the meal may not be toddler-appropriate
And prompts the user to review before the day constraint is saved

### AC-007 — Week always starts Sunday
Given any week view is rendered
Then Sunday is always the first column
And the week boundary is Sunday 00:00 home timezone
And this applies to current week, next week, and previous week

### AC-008 — Meal edit triggers Ollama re-run
Given a meal slot already has a saved meal name and ingredients
When the user edits the meal name and confirms a new name
Then the previous ingredient list is discarded
And Ollama re-runs for the new meal name
And the slot follows the same async ingredient flow as AC-001/002

### AC-009 — Meal type name visible on every row
Given the meal plan grid is rendered for any week view
Then each row for an active meal type displays that type's configured
name (`MealTypeConfig.name`) as visible UI text — not only in test hooks
or aria labels
And the user can tell which meal type a slot belongs to without opening
the cell (e.g. a row-title column for the whole week, or the meal type
name shown on every slot in that row)
And the number of labeled rows matches the active meal types returned by
the meal plan API
And when meal types are renamed or reordered via Feature 002, row labels
and row order on the grid update on next load to match

Note: This criterion labels the **meal type** (Breakfast, Lunch, etc.).
The user-entered **meal name** (e.g. "Sambar rice") is shown inside each
slot per AC-001 and AC-004.

### AC-010 — Edit and Delete on filled meal tiles
Given a meal slot is filled on today or a future day
Then the tile shows visible **Edit** and **Delete** controls (buttons or
icon buttons with accessible labels)
And **Edit** opens the same inline form as adding a meal (meal name +
toddler-appropriate question) without requiring the user to discover
click-to-edit on the meal name alone
And **Delete** clears the slot via `DELETE /api/meal-slots/[id]`, removes
the meal and ingredients, and returns the tile to the empty "+ Add meal"
state after SWR revalidation
And **Delete** asks for confirmation before calling the API (e.g. "Remove
this meal?") so accidental taps do not clear plans
And past-day filled slots show neither **Edit** nor **Delete** (see AC-004)

Note: **Edit** on the ingredient list (approve, add, or change individual
ingredients) is separate from **Edit** on the meal tile, which changes the
meal name and toddler flag.

---

## Assumptions and Dependencies

### Assumptions
1. The app runs in a Docker container on a home Mac Mini, accessible
   over the local network. There is no internet dependency for core
   functionality. Ollama runs on the host (not in Docker) and is
   reached by the container via `host.docker.internal`. The SQLite
   database is persisted on a Docker named volume.

2. The database is SQLite via Prisma. It is always available
   when the app is running.

3. Meal types (e.g. Breakfast, Lunch, Dinner) are stored in the
   database as `MealTypeConfig` records, not hardcoded as an enum.
   On first run, three defaults are seeded: Breakfast (order 1),
   Lunch (order 2), Dinner (order 3). The household can add, rename,
   reorder, or remove meal types via Feature 002 — Configuration Page.
   This feature renders whatever active meal types the database contains.

5. The toddler's default schedule (daycare Mon–Fri, home
   Sat–Sun) is hardcoded in the rules engine. Day-level
   overrides are stored in the database.

6. "Toddler-appropriate" is a flag set by the user during
   meal confirmation. When a user confirms a meal name,
   the app asks: "Is this meal toddler-appropriate?" as
   part of the confirmation flow. The answer is stored
   with the meal slot. The app does not enforce this
   automatically — the Planner makes the call. What
   toddler-appropriate means for this household is defined
   in spec.local.md (gitignored).

7. Both users (Planner and Shopper) access the app from
   the same home network. No authentication is required.

8. The home timezone is set once in app configuration and
   is the single source of truth for "today" and all day
   boundary calculations. Device timezone is ignored.
   This ensures both users always see the same day state
   regardless of which device they are on.

9. Household cuisine for Ollama ingredient prompts is set via
   the optional `CUISINE_CONTEXT` environment variable (e.g.
   `South Indian or Maharashtrian`). When unset, prompts are
   cuisine-agnostic. Cuisine strings must not be hardcoded in
   application code.

### Dependencies
1. **Ollama** — local LLM for ingredient suggestions.
   Must be running on the home network. App degrades
   gracefully when unavailable (see AC-003).

2. **SQLite via Prisma** — persistence layer for meal
   plan, ingredients, toddler day overrides, and meal type configuration.

3. **Feature 002 — Configuration Page** — owns the CRUD UI for
   `MealTypeConfig` records. Feature 001 reads meal types from the DB
   but does not provide the UI to manage them.

4. **Feature 003 — Shopping List** — consumes the
   ingredient data produced by this feature. Ingredient
   approval in this feature feeds Feature 003 directly.
