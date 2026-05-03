Family Meal Planner V1

## How to use this spec

This is the public spec skeleton.
Private family context lives in
SPEC.local.md (gitignored).
Copy SPEC.local.example.md to
SPEC.local.md and fill in your
own details to make this your own.

## What I'm building

<!-- See SPEC.local.md -->

### Why (The problem this will solve)

<!-- See SPEC.local.md -->

---

### Week Boundaries
- Week runs Sunday to Saturday
- "This week" = Current Sunday as week-start date
- New week auto-starts on Sunday midnight

## Family Context

<!-- See SPEC.local.md -->

## Weekly schedule & morning constraints

<!-- See SPEC.local.md -->

### Critical breakfast rules

<!-- See SPEC.local.md -->

### Eat-Out Day
- Eat-out slot → "🍽️ Eating out"
  - Always Friday dinner
  - Only that one meal slot is replaced
  - Friday breakfast and lunch cook as normal
  - Friday dinner ingredients excluded 
    from shopping list

## Toddler weekend lunch
- Sat & Sun lunch cell shows adult meal 
  + toddler note in same cell:
<!-- See SPEC.local.md -->
- Toddler meal = same as adults unless 
  noted otherwise
- Toddler-friendly flag on meal = no 
  adjustments needed
- No fourth column needed

---

### Cuisine

<!-- See SPEC.local.md -->

### Favourite meals

<!-- See SPEC.local.md -->

### Protein focus rules (apply to every meal)
- Every meal must include at least one 
  protein source
- Protein sources: eggs, dal, legumes 
  (chana, rajma, moong), paneer, 
  curd/yogurt, peanuts, nuts
- Flag any meal with no clear protein 
  source with ⚠️

### Batch cooking opportunities

<!-- See SPEC.local.md -->

### Meal tags (apply to every meal)
- ⚡ Quick — under 15 mins
- 🌙 Make-ahead — can be cooked night before
- 🟢 Easy — suitable for weekends
- ⚠️ Needs time — flag if on a busy morning


---
### Meal plan output format

### Weekly grid (7 days)

| Day | Breakfast | Lunch (packed) | Dinner |
|-----|-----------|----------------|--------|
| Mon | ...       | ...            | ...    |
| Tue | ...       | ...            | ...    |
| Wed | ...       | ...            | ...    |
| Thu | ...       | ...            | ...    |
| Fri | ...       | ...            | ...    |
| Sat | ...       | Not packed, but cooked with optional Toddler meal | ...    |
| Sun | ...       | Not packed, but cooked with optional Toddler meal | ...    |

### Grid display rules
<!-- See SPEC.local.md -->
- Sat & Sun → mark as 🟢 Easy day
- Eat-out meal → show as "🍽️ Eating out" 
  (no cooking, one meal per week)
<!-- See SPEC.local.md -->
- Saturday: no eggs in any meal
<!-- See SPEC.local.md -->
- Any meal missing protein → show ⚠️
- Any Mon/Tue breakfast over 10 mins → show ⚠️
- 🟢 Easy counts as acceptable for 
  Mon/Tue mornings
- Only ⚠️ Needs time triggers a warning
- If meal is tagged 🌙 Make-ahead, it 
  counts as under 30 mins on the day
- Prep time the night before is not 
  counted against the cooking limit

## Meal plan editing

### How editing works
- Tap any empty or filled meal cell 
  to open the editor
- A bottom sheet slides up from 
  the bottom of the screen
- Bottom sheet shows:
  - Day + meal slot as title 
    e.g. "Monday · Breakfast"
  - Favourite meals list (18 from seed)
    shown as tappable chips
  - Text input below — pre-filled if 
    meal was picked from favourites
  - User can pick a favourite then 
    edit the text, or type freely
  - Tag toggles: ⚡ Quick, 🌙 Make-ahead,
    🟢 Easy, ⚠️ Needs time
  - Toddler note field 
    (shown on Sat/Sun lunch only)
  - Save button at bottom of sheet

### Saving behaviour
- Auto-save per cell when user 
  taps Save in bottom sheet
- Calls POST /api/meal-plan with 
  full week state
- Last write wins — no conflict handling
- On success: sheet closes, cell 
  updates immediately (optimistic UI)
- On error: sheet stays open, 
  show error message

### Validation at save time
- eggRuleViolated → show error in sheet,
  do not close
- proteinWarning → show ⚠️ in cell 
  after save (not a blocker)
- breakfastNeedsWarning → show ⚠️ 
  in cell after save (not a blocker)

### Empty cell appearance
- Shows a soft + icon in centre
- bg-surface-muted, border-dashed,
  border-border
- Tappable — full cell is the tap target

---

## Shopping list output

### View 1 — By meal (for planning)
Ingredients grouped under each meal:
<!-- See SPEC.local.md -->

### View 2 — By supermarket section (for shopping)
Same ingredients re-grouped by store section:

  🥦 Produce
  🥛 Dairy & Eggs
  🌾 Dry goods & Grains
  🫙 Pantry & Spices
  🧊 Frozen

### View 3 — Checklist (for use at store)
- Same as View 2 but each item is a checkbox
<!-- See SPEC.local.md -->
- Checked items move to bottom of list
- "Clear all checks" button for next week

### Shopping store note

<!-- See SPEC.local.md -->

---

## Acceptance criteria
(How I know V1 is done)

## Shopping list generation
- App auto-generates ingredients from 
  meal names
<!-- See SPEC.local.md -->

### Meal plan
- [ ] 7-day grid shows breakfast, lunch, dinner
- [ ] Every meal has a protein source or ⚠️ flag
- [ ] No eggs on Saturday
- [ ] Saturday & Sunday meals tagged 🟢 Easy
- [ ] Saturday & Sunday require under 
      30 mins cooking
- [ ] Mon & Tue breakfast is ⚡ or 🌙 
      or flagged ⚠️
<!-- See SPEC.local.md -->
- [ ] Friday dinner shows "🍽️ Eating out"

### Shopping list
- [ ] Appears in both meal-grouped 
      and supermarket-section views
- [ ] Checklist is checkable
<!-- See SPEC.local.md -->
- [ ] Checked items move to bottom
- [ ] "Clear all" resets for next week

### Ingredient display rules

<!-- See SPEC.local.md -->

- Units must match when summing
  (don't sum "2 cups" + "3 pieces")
- If units differ → keep as two separate 
  lines even in View 2



---

## API routes (backend)

```
## API routes (final for V1)

GET    /api/meal-plan              → load this week's plan
POST   /api/meal-plan              → save this week's plan
GET    /api/shopping-list          → load full shopping list
POST   /api/shopping-list/clear    → uncheck all items
PATCH  /api/shopping-list/:id      → toggle checked
PATCH  /api/shopping-list/:id/have     → toggle already have it
POST   /api/shopping-list/item     → add manual item
DELETE /api/shopping-list/:id → remove any item
                                (manual or auto-generated)
```

### Item flags (two separate states)
- ✅ Checked = bought at store today
  → moves to bottom of checklist
  → cleared every week via /clear
- 🏠 Already have = we stock this at home
  → always excluded from shopping list
  → NOT cleared on /clear (persists weekly)
  → visible in View 1 (by meal) as greyed out

### API field clarification
- PATCH /api/shopping-list/:id toggles 
  "checked" only
- PATCH /api/shopping-list/:id/have toggles 
  "already have it" only
- Two separate flags, two separate endpoints

---

## UI / Design

- Mobile first — primary use on phones
- See **DESIGN.md** for design intent
- See **design-tokens.css** for design tokens
- Bottom tab bar: Meals + Shopping
- Something we enjoy opening daily

## Tech stack
- Frontend: Next.js (App Router) + TypeScript 
  + Tailwind CSS
- Client data: SWR (meal plan + shopping list;
  shopping list uses ~60s polling per
  real-time checklist sync below)
- Backend: Next.js API Routes
- Database: SQLite via Prisma ORM
- Container: Docker + docker-compose
- Access: Tailscale (private home network)
- AI meal suggestions: Anthropic API 
  (V2 — not this weekend)
- Use Sequential Thinkning MCP


## Data that persists (SQLite)
- Weekly meal plan (7 days × 3 meals)
- Shopping list items + checked state
- Favourite meals list (for V2 suggestions)
- Last write wins — no conflict handling in V1
<!-- See SPEC.local.md -->
- No locking or merge needed for V1
- Already Have also must be persisted.

## Real-time checklist sync
- Poll every 60 seconds for checklist state
- No WebSockets needed in V1
- Good enough for shared shopping trips

### Trip Rule
- Trip day overrides everything including 
  eat-out
- If trip falls on Friday, eat-out is 
  consumed by the trip — no separate 
  eat-out that week
- Only one override per day maximum

### Timezone
- Timezone: America/Toronto (Eastern Time)
- Week rolls over Sunday midnight ET
- DST handled by system timezone setting


---

## Out of scope for V1
- User authentication
- Multi-week history
- Anthropic API / AI suggestions
- Nutrition or calorie tracking
- Recipe instructions (meal names only)
- Toddler-specific portion sizes
- Budget tracking
- Raspberry Pi deployment

---
## UI behaviour specification

### General mobile patterns
- All interactive elements minimum 
  44px tap target
- Bottom sheets for all editing 
  (never navigate away to edit)
- Auto-save per action — no 
  "save whole page" buttons
- Optimistic UI — update immediately,
  revert on error
- Loading: skeleton pulse, not spinner
- Empty states: soft prompt with 
  action button
- Error states: inline message 
  + retry button

### Shopping list page

#### Three views (tabs at top of page)
1. 📋 By Meal — ingredients under 
   each meal name
2. 🏪 By Section — grouped by 
   supermarket aisle
3. ✅ Checklist — same as By Section 
   but with checkboxes

#### Checklist behaviour
- Tap checkbox → checked immediately 
  (optimistic)
- Checked items fade to 60% opacity
- Checked items animate to bottom 
  of their section
- 🏠 Already have → greyed out, 
  no checkbox, stays in place
- Long press any item → context menu:
  - "Already have this" toggle
  - "Remove item"
- "Clear all checks" button in 
  top right — resets week
- Polling every 60 seconds so shared devices converge on checklist state (household wording in SPEC.local.md)

#### Add item flow
- Floating + button bottom right 
  (above tab bar)
- Tap → bottom sheet slides up
- Fields:
  - Item name (text input, required)
  - Quantity (text input, required)
  - Section (picker, required)
- Save → adds to list immediately
- Sheet closes on save

#### Section order in store
1. 🥦 Produce
2. 🥛 Dairy & Eggs
3. 🌾 Dry Goods & Grains
4. 🫙 Pantry & Spices
5. 🧊 Frozen

#### Empty state
- "No shopping list yet"
- "Generate from meal plan" button
  → calls POST /api/shopping-list/generate
  (add this route — reads current 
  week meal plan, generates ingredients)

### Navigation
- Bottom tab bar always visible
- Active tab: brand green + dot
- Inactive: muted
- Tab bar never scrolls away

### Week navigation (both pages)
- ← Previous week / Next week →
- Current week label centred
- Both pages stay in sync on 
  same week

### Page headers
- Meal plan: "This Week's Meals"
  + week label below
- Shopping: "Shopping List"
  + week label below
- Header sticks to top on scroll

### Toasts / feedback
- Saved successfully → 
  brief green toast, auto-dismiss 2s
- Error → red toast, stays until 
  dismissed
- Item checked → no toast 
  (action is self-evident)
- Item added → brief green toast

### Accepted criteria for UI
- [ ] All cells tappable on mobile
- [ ] Bottom sheet opens and closes 
      smoothly
- [ ] Egg rule blocks save with 
      clear message
- [ ] Checklist syncs between 
      two devices in ~60 seconds
- [ ] Add item appears in correct 
      section immediately
- [ ] Already have persists across 
      weekly clear
- [ ] Empty states shown correctly
- [ ] Loading skeletons shown on 
      first load
- [ ] No hardcoded colours anywhere
