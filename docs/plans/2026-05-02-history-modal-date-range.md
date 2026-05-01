# History Modal Date Range Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a date-range selector to the control page history modal so users can filter history by inclusive start/end dates alongside the existing hour presets.

**Architecture:** Keep the existing hour-based server fetch flow intact for preset buttons. Add a separate date-range mode in the modal that fetches full history with `hours=0` and filters `metrics` and event lists on the client using a shared helper so the chart and event sections stay in sync.

**Tech Stack:** React 18, Vite, plain CSS, built-in `node:test`

---

### Task 1: Plan and regression harness

**Files:**
- Create: `docs/plans/2026-05-02-history-modal-date-range.md`
- Create: `src/components/__tests__/historyDateRange.test.js`
- Create: `src/components/historyDateRange.js`

**Step 1: Write the failing test**

Create a `node:test` file that expects a helper to:
- include timestamps from the start day at `00:00:00`
- include timestamps through the end day at `23:59:59.999`
- filter each history collection consistently

**Step 2: Run test to verify it fails**

Run: `node --test src/components/__tests__/historyDateRange.test.js`
Expected: FAIL because the helper module or expected exports do not exist yet.

**Step 3: Write minimal implementation**

Create a small helper module for:
- formatting date labels
- normalizing start/end boundaries
- filtering the history payload collections by timestamp

**Step 4: Run test to verify it passes**

Run: `node --test src/components/__tests__/historyDateRange.test.js`
Expected: PASS

### Task 2: Wire modal state and controls

**Files:**
- Modify: `src/components/HistoryModal.jsx`
- Modify: `src/API.js`

**Step 1: Add range-mode state**

Track:
- current preset hours
- whether a date range is active
- raw `startDate` / `endDate`
- whether the calendar popover is open

**Step 2: Update fetch behavior**

When presets are active, keep calling `API.getHistory(headers, module.id, hours)`.
When a valid date range is active, call `API.getHistory(headers, module.id, 0)`.

**Step 3: Apply shared filtering**

Pass the fetched payload through the helper when a valid date range is active so:
- chart points use filtered `metrics`
- reference-line events use filtered event arrays
- field and event tabs share the same filtered data

**Step 4: Reset interactions**

Preset button click clears the range mode.
Applying a date range clears preset active styling.

### Task 3: Add modal UI and styling

**Files:**
- Modify: `src/components/HistoryModal.jsx`
- Modify: `src/CSS/HistoryModal.css`

**Step 1: Add range trigger UI**

Insert a button to the left of `전체 / 12h / 24h / 48h / 72h`.
Display:
- placeholder before selection
- `YYYY.MM.DD ~ YYYY.MM.DD` after selection

**Step 2: Add date input popover**

Use browser-native `input[type="date"]` controls for start and end dates plus apply/reset actions.

**Step 3: Keep UX safe**

Disable apply until both dates exist and `start <= end`.
Show the filter as inclusive whole-day behavior.

**Step 4: Style for existing visual language**

Keep sizing and colors consistent with existing history modal controls.

### Task 4: Verify

**Files:**
- Verify: `src/components/__tests__/historyDateRange.test.js`
- Verify: `src/components/HistoryModal.jsx`
- Verify: `src/CSS/HistoryModal.css`

**Step 1: Run focused regression test**

Run: `node --test src/components/__tests__/historyDateRange.test.js`
Expected: PASS

**Step 2: Run production build**

Run: `npm run build`
Expected: exit code 0

**Step 3: Manual checklist**

Confirm from code inspection:
- range button sits left of preset buttons
- presets clear range mode
- range mode uses inclusive day boundaries
- chart and event sections read the same filtered collections
