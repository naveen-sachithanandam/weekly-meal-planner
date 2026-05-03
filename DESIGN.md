# Design specification — Family Meal Planner V1

Design intent and component behaviour. This document does not prescribe implementation code or literal colour values; those live in the token file the UX team maintains separately.

---

## Product personality

A family app: warm, approachable, and calm. It is not a productivity tool and not clinical. Using it should feel like opening a favourite recipe book or a trusted kitchen notebook—not scanning a spreadsheet or a work backlog.

---

## Audience

- **Primary:** Two parents on mobile phones, often one-handed, often in the kitchen or on the go.
- **Typical split:** One person checks and edits meals; the other checks items off the shopping list (sometimes the same person, sometimes not).
- **Cadence:** Opened daily. Interactions should feel effortless: few taps, clear feedback, no hunting for the next action.

---

## Colour intent (no hex values)

- **Primary (forest green):** Natural, grounded green—used for primary actions, active navigation, links, and positive confirmations (saved, added, done).
- **Background:** Warm off-white, not pure white—eases eye strain in the evening and keeps the app from feeling like a blank document.
- **Surface:** Clean white for cards, sheets, and input areas so content stays readable and scannable against the warm base.
- **Earth / amber accent:** Used sparingly—for batch-cook hints, secondary highlights, and moments that should feel “kitchen warm” rather than “brand loud.”
- **Warning:** Warm orange (not harsh red)—protein gaps, rush-morning flags, and gentle nudges should read as “heads up,” not alarm.
- **Text:** Warm dark brown family (not pure black)—softer contrast on warm backgrounds and less fatigue than high-contrast black on off-white.

---

## Typography intent

- **One family throughout**—a single, readable sans-serif stack end to end.
- **Body:** Comfortable at arm’s length on a phone; line length and size tuned for quick reading, not dense tables.
- **Meal names:** Easy to scan down a vertical list; hierarchy should make “what are we eating?” obvious at a glance without shouting.

---

## Spacing and layout

- **Viewport:** Mobile-first; content column feels like a phone app (narrow max width, centred on larger screens).
- **Touch:** Generous tap targets—interactive rows and controls should meet or exceed common minimum touch heights so gloved or rushed taps still land.
- **Density:** Comfortable padding; this is not an information-dense dashboard. Breathing room between sections and cards.
- **Cards:** Soft shadows and rounded corners so surfaces feel layered and approachable, not flat and severe.
- **Overall:** Nothing should feel cramped or “packed for a desktop spreadsheet.”

---

## Navigation

- **Bottom tab bar** with exactly two destinations: **Meals** and **Shopping**—mirrors how the family thinks about the two main jobs.
- **Feel:** Native-mobile patterns—fixed bar, clear active state, no competing top nav.
- **Active tab:** Unmistakable at a glance (colour and/or a small indicator).
- **Safe areas:** Respect device safe-area insets (e.g. home indicator on notched phones) so tabs are always reachable and labels are not clipped.

---

## Component behaviour

### Meal grid

- **Structure:** Seven rows (Sunday through Saturday), three columns (Breakfast, Lunch, Dinner).
- **Cell content:** Meal name plus compact tags (quick, make-ahead, etc.) as specified in product rules.
- **Warnings:** Protein and similar flags visible and legible but visually soft—inform, don’t scold.
- **Trip days:** Entire day visually de-emphasised (greyed or muted) so “we’re not cooking this day” is obvious.
- **Friday eat-out dinner:** That single cell reads as a deliberate exception—distinct from a normal meal cell and from trip mode.
- **Toddler note:** Shown under the adult meal text in the same cell, subtle typography—present when needed, never competing with the main line.
- **Weekend rows:** Slightly softer or more relaxed treatment than weekday rows so Saturday/Sunday feel like a different rhythm.

### Shopping checklist

- **Checkboxes:** Large, easy targets; clear hit area beyond the glyph alone.
- **Checked (bought today):** Visually fades and sorts toward the bottom so “still to buy” stays at the top of attention.
- **Already have:** Items stay in the list but read as inactive / greyed—not removed, so pantry state stays honest.
- **Sections:** Aisle or section headers clearly separate groups so scanning the list matches how you walk a store.
- **Add item:** Lightweight flow—few fields, obvious success, easy to dismiss or continue.

### Warnings and flags

- **Protein warning:** Soft orange treatment—noticeable, not alarming.
- **Egg rule violation (when surfaced in UI):** Warm red, clear copy—rules are firm but the tone stays human, not punitive.
- **Rush morning flag:** Subtle—communicates constraint without inducing anxiety.

---

## What this app should never feel like

- A work dashboard or status board.
- A calorie or macro tracker.
- A medical or clinical compliance app.
- Overwhelming, guilt-inducing, or “you’re doing it wrong” in tone.

---

## Motion and animation

- Bottom sheets animate up on open,
  down on close — feels native, 
  not jarring
- Use --transition-base (200ms ease)
  for most transitions
- Checked items fade then slide down —
  satisfying, not distracting
- Skeleton loaders pulse gently —
  warm grey, not harsh white flash
- Toast notifications slide in from 
  bottom — brief, calm, auto-dismiss

## Empty states

- Warm, encouraging tone — never 
  "No data found"
- Use a simple illustration or 
  large emoji as anchor
- Soft action button below — 
  brand green, not urgent
- Examples:
  "Nothing planned yet this week 🥘"
  "Your list is empty 🛒"

## Bottom sheet design

- Drag handle at top centre —
  small rounded pill, --color-border
- Rounded top corners only --radius-xl
- White surface --color-surface
- Content padding --space-4 sides
- Title bold, centered
- Action button full width at bottom
- Safe area inset respected

## Toast notifications

- Appear above tab bar
- Rounded pill shape --radius-full
- Success: --color-brand background,
  white text
- Error: --color-error background,
  white text
- Max width 280px, centered
- Auto-dismiss after 2 seconds 
  (error toasts stay until dismissed)

## Floating action button (+ Add item)

- Circle, 56px diameter
- --color-brand background
- White + icon
- --shadow-lg
- Fixed, above tab bar right side
- Subtle scale on tap (0.95)

## Loading skeletons

- Match the shape of real content
- --color-surface-muted background
- Gentle pulse animation
- Never show spinner — skeletons 
  feel more native on mobile

## Checked item treatment

- Opacity drops to 60%
- Text gets strikethrough
- Animates to bottom of section
- Feels satisfying not punishing —
  crossing off a list is a small win

## Already have treatment

- No checkbox shown
- Text: --text-muted colour
- Small 🏠 icon prefix
- Never moves — stays in section
- Visually quieter than 
  unchecked items

*Maintained with product spec (`SPEC.md`; private overlay `SPEC.local.md` when used locally). Token implementation is defined separately for engineering handoff.*
