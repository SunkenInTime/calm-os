import { mutation, query, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

const ISO_DATE_KEY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setHours(12, 0, 0, 0);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function normalizeDateKey(input: string): string {
  const trimmed = input.trim();
  if (!ISO_DATE_KEY_REGEX.test(trimmed)) {
    throw new Error("todayKey must be YYYY-MM-DD.");
  }
  return trimmed;
}

function normalizeDueDate(input: string | null | undefined): string | null {
  if (input === null || input === undefined) {
    return null;
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  if (ISO_DATE_KEY_REGEX.test(trimmed)) {
    return trimmed;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Due date must be a valid date.");
  }
  return toLocalDateKey(parsed);
}

function normalizeSessionLengthMinutes(
  input: number | undefined,
): number | undefined {
  if (input === undefined) {
    return undefined;
  }

  if (!Number.isInteger(input) || input < 1 || input > 480) {
    throw new Error("Session length must be an integer between 1 and 480.");
  }

  return input;
}

function dateKeyFromIso(isoString: string | undefined): string | null {
  if (!isoString) {
    return null;
  }

  const parsed = new Date(isoString);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return toLocalDateKey(parsed);
}

function getHorizonDateKeys(todayKeyInput: string) {
  const todayKey = normalizeDateKey(todayKeyInput);
  const todayDate = parseDateKey(todayKey);
  return {
    todayKey,
    tomorrowKey: toLocalDateKey(addDays(todayDate, 1)),
    dayAfterKey: toLocalDateKey(addDays(todayDate, 2)),
    yesterdayKey: toLocalDateKey(addDays(todayDate, -1)),
  };
}

function compareByCreatedAtDesc(
  a: { createdAt: string },
  b: { createdAt: string },
): number {
  return b.createdAt.localeCompare(a.createdAt);
}

async function removeTaskFromDailyCommitments(
  ctx: MutationCtx,
  dateKey: string,
  taskId: Id<"tasks">,
): Promise<void> {
  const daily = await ctx.db
    .query("daily")
    .withIndex("by_dateKey", (q) => q.eq("dateKey", dateKey))
    .unique();

  if (!daily) return;
  if (!daily.commitmentTaskIds.includes(taskId)) return;

  await ctx.db.patch(daily._id, {
    commitmentTaskIds: daily.commitmentTaskIds.filter((id) => id !== taskId),
    updatedAt: new Date().toISOString(),
  });
}

export const createTask = mutation({
  args: {
    title: v.string(),
    dueDate: v.optional(v.union(v.string(), v.null())),
    sessionLengthMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const title = args.title.trim();
    if (!title) {
      throw new Error("Task title is required.");
    }

    const now = new Date().toISOString();
    const dueDate = normalizeDueDate(args.dueDate ?? null);
    const sessionLengthMinutes = normalizeSessionLengthMinutes(
      args.sessionLengthMinutes,
    );

    return await ctx.db.insert("tasks", {
      title,
      dueDate,
      ...(sessionLengthMinutes !== undefined ? { sessionLengthMinutes } : {}),
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateTask = mutation({
  args: {
    taskId: v.id("tasks"),
    title: v.optional(v.string()),
    dueDate: v.optional(v.union(v.string(), v.null())),
    sessionLengthMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new Error("Task not found.");
    }

    const patch: {
      title?: string;
      dueDate?: string | null;
      sessionLengthMinutes?: number;
      updatedAt: string;
    } = { updatedAt: new Date().toISOString() };

    if (args.title !== undefined) {
      const title = args.title.trim();
      if (!title) {
        throw new Error("Task title is required.");
      }
      patch.title = title;
    }

    if (args.dueDate !== undefined) {
      patch.dueDate = normalizeDueDate(args.dueDate);
    }

    if (args.sessionLengthMinutes !== undefined) {
      patch.sessionLengthMinutes = normalizeSessionLengthMinutes(
        args.sessionLengthMinutes,
      );
    }

    await ctx.db.patch(args.taskId, patch);
  },
});

export const listActiveTasks = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("tasks")
      .withIndex("by_status_createdAt", (q) => q.eq("status", "active"))
      .order("desc")
      .collect();
  },
});

export const listUnscheduledTasks = query({
  args: {},
  handler: async (ctx) => {
    const activeTasks = await ctx.db
      .query("tasks")
      .withIndex("by_status_createdAt", (q) => q.eq("status", "active"))
      .order("desc")
      .collect();

    return activeTasks.filter((task) => task.dueDate === null);
  },
});

export const listHorizonTasks = query({
  args: {
    todayKey: v.string(),
  },
  handler: async (ctx, args) => {
    const { todayKey, tomorrowKey, dayAfterKey } = getHorizonDateKeys(
      args.todayKey,
    );
    const activeTasks = await ctx.db
      .query("tasks")
      .withIndex("by_status_createdAt", (q) => q.eq("status", "active"))
      .order("desc")
      .collect();

    const todayTasks: typeof activeTasks = [];
    const tomorrowTasks: typeof activeTasks = [];
    const dayAfterTasks: typeof activeTasks = [];

    for (const task of activeTasks) {
      if (task.dueDate === todayKey) {
        todayTasks.push(task);
      } else if (task.dueDate === tomorrowKey) {
        tomorrowTasks.push(task);
      } else if (task.dueDate === dayAfterKey) {
        dayAfterTasks.push(task);
      }
    }

    return {
      todayKey,
      tomorrowKey,
      dayAfterKey,
      todayTasks,
      tomorrowTasks,
      dayAfterTasks,
    };
  },
});

export const getPlannerSnapshot = query({
  args: {
    todayKey: v.string(),
  },
  handler: async (ctx, args) => {
    const { todayKey, tomorrowKey, dayAfterKey, yesterdayKey } =
      getHorizonDateKeys(args.todayKey);

    const activeTasks = await ctx.db
      .query("tasks")
      .withIndex("by_status_createdAt", (q) => q.eq("status", "active"))
      .order("desc")
      .collect();

    const doneTasks = await ctx.db
      .query("tasks")
      .withIndex("by_status_updatedAt", (q) => q.eq("status", "done"))
      .order("desc")
      .collect();

    const todayTasks: typeof activeTasks = [];
    const tomorrowTasks: typeof activeTasks = [];
    const dayAfterTasks: typeof activeTasks = [];
    const unscheduledTasks: typeof activeTasks = [];
    const laterTasks: typeof activeTasks = [];
    const priorTasks: typeof activeTasks = [];

    for (const task of activeTasks) {
      const dueDate = task.dueDate;
      if (dueDate === null) {
        unscheduledTasks.push(task);
      } else if (dueDate === todayKey) {
        todayTasks.push(task);
      } else if (dueDate === tomorrowKey) {
        tomorrowTasks.push(task);
      } else if (dueDate === dayAfterKey) {
        dayAfterTasks.push(task);
      } else if (dueDate < todayKey) {
        priorTasks.push(task);
      } else {
        laterTasks.push(task);
      }
    }

    unscheduledTasks.sort(compareByCreatedAtDesc);
    priorTasks.sort(compareByCreatedAtDesc);
    laterTasks.sort(compareByCreatedAtDesc);

    const yesterdayCompletedCount = doneTasks.reduce((count, task) => {
      const completedDateKey = dateKeyFromIso(task.completedAt);
      return completedDateKey === yesterdayKey ? count + 1 : count;
    }, 0);

    return {
      todayKey,
      tomorrowKey,
      dayAfterKey,
      yesterdayKey,
      todayTasks,
      tomorrowTasks,
      dayAfterTasks,
      unscheduledTasks,
      laterTasks,
      priorTasks,
      activeTasks,
      yesterdayCompletedCount,
    };
  },
});

export const markTaskDone = mutation({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new Error("Task not found.");
    }

    if (task.status === "done") {
      return;
    }

    await ctx.db.patch(args.taskId, {
      status: "done",
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  },
});

export const dropTask = mutation({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new Error("Task not found.");
    }

    if (task.status === "dropped") {
      return;
    }

    await ctx.db.patch(args.taskId, {
      status: "dropped",
      droppedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  },
});

export const setTaskDueDate = mutation({
  args: {
    taskId: v.id("tasks"),
    dueDate: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new Error("Task not found.");
    }

    const newDueDate = normalizeDueDate(args.dueDate);
    const todayKey = toLocalDateKey(new Date());

    await ctx.db.patch(args.taskId, {
      dueDate: newDueDate,
      updatedAt: new Date().toISOString(),
    });

    if (newDueDate !== todayKey) {
      await removeTaskFromDailyCommitments(ctx, todayKey, args.taskId);
    }
  },
});
