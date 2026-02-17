
You are building:

- Horizontal layout
- Tailwind styling
- Task creation
- Convex persistence
- 3-day filtering (basic)
- Unscheduled section
- Nothing else



---

# 1️⃣ Layout Structure (Horizontal)

You want horizontal width. Good.

Think of the main screen as:

Sidebar (Ideas) | Main 3-Day View

### Layout Concept

Full window:

- `flex`
- `h-screen`
- `w-screen`
- Dark neutral background (calm tone)

### Left Panel (Ideas Tab Placeholder)
- Fixed width (e.g., w-80)
- Vertical column
- Header: “Ideas”
- Empty list for now

### Right Panel (Main Area)
- `flex-1`
- Padding
- Horizontal sections inside

---

## Inside Main Area (Horizontal 3-Day Layout)

Instead of stacking days vertically,
lay them out horizontally:

Today | Tomorrow | Day After | Unscheduled

Each column:

- `flex-1`
- `min-w-[300px]`
- `rounded-xl`
- Subtle background contrast
- Padding inside
- Scrollable internally

This makes it feel like a calm command center,
not a long vertical doom scroll.

---

# 2️⃣ Tailwind Setup (Minimal)

Install Tailwind.

Use:

- bg-neutral-50 (very soft gray)

- NOT pure white everywhere

Pure white is harsh.

Soft neutral feels calmer.
- No bright colors
- No reds
- No urgency visuals



Calm > vibrant.

Do not design brand identity.
Just clean structure.

---

# 3️⃣ Task Model (Already Defined)

Task:
- id
- title
- dueDate (nullable)
- status
- createdAt

No extra fields.

---

# 4️⃣ Base Task Flow (Core Tonight)

### Add Task UI

Top right corner:
Small “+ Task” button.

Click → modal or inline input.

Fields:
- Title (required)
- Due date (optional)

Submit → Convex mutation.

That’s it.

No priority.
No tags.
No scheduling wizard.

---

# 5️⃣ Filtering Logic (Basic Version)

When rendering:

Split tasks into 4 arrays:

- todayTasks
- tomorrowTasks
- dayAfterTasks
- unscheduledTasks

Rules:

If status !== "pending" → ignore for now.

If dueDate is:
- Today → today column
- Tomorrow → tomorrow column
- Day after → dayAfter column
- null → unscheduled column
- Anything else → do not render (for now)

Important:
Use local date normalization.
Compare by date only, not time.

---

# 6️⃣ Column Behavior

Each column:

Header:
- Title
- Task count in small text

Body:
- Vertical stack
- Simple task card:
  - Title
  - Due date (small, subtle)
  - No checkboxes yet (optional tonight)

Cards:
- bg-neutral-800
- rounded-lg
- px-3 py-2
- hover: slightly brighter

No animations.
No drag and drop.
No complexity.

---

# 7️⃣ Unscheduled Column Rules

- Always visible
- Sorted by createdAt descending (newest first)
- No auto movement
- No logic beyond display


---

# 9️⃣ Visual Goal

When you finish tonight,
opening the app should feel like:

A clean 4-column calm dashboard.

No clutter.
No overwhelm.
No hidden inbox.

Just:

Today | Tomorrow | Day After | Unscheduled

Horizontally aligned.





