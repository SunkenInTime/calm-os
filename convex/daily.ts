import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";

const DATE_KEY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function dayDifference(currentDateKey: string, previousDateKey: string): number {
  const currentTime = parseDateKey(currentDateKey).getTime();
  const previousTime = parseDateKey(previousDateKey).getTime();
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.max(0, Math.floor((currentTime - previousTime) / msPerDay));
}

function normalizeDateKey(input: string): string {
  const trimmed = input.trim();
  if (!DATE_KEY_REGEX.test(trimmed)) {
    throw new Error("dateKey must be YYYY-MM-DD.");
  }
  return trimmed;
}

async function getDailyByDateKey(
  ctx: QueryCtx | MutationCtx,
  dateKey: string,
) {
  return await ctx.db
    .query("daily")
    .withIndex("by_dateKey", (q) => q.eq("dateKey", dateKey))
    .unique();
}

async function ensureDailyByDateKey(
  ctx: MutationCtx,
  dateKey: string,
) {
  const existing = await getDailyByDateKey(ctx, dateKey);
  if (existing) {
    return existing;
  }

  const now = new Date().toISOString();
  const dailyId = await ctx.db.insert("daily", {
    dateKey,
    commitmentTaskIds: [],
    updatedAt: now,
  });
  return await ctx.db.get(dailyId);
}

export const getTodayDaily = query({
  args: {
    todayKey: v.string(),
  },
  handler: async (ctx, args) => {
    const todayKey = normalizeDateKey(args.todayKey);
    const daily = await getDailyByDateKey(ctx, todayKey);
    return { todayKey, daily };
  },
});

export const getTodayDailyModel = query({
  args: {
    todayKey: v.string(),
  },
  handler: async (ctx, args) => {
    const todayKey = normalizeDateKey(args.todayKey);
    const daily = await getDailyByDateKey(ctx, todayKey);
    const commitmentTasks = [];

    if (daily) {
      for (const taskId of daily.commitmentTaskIds) {
        const task = await ctx.db.get(taskId);
        if (task) {
          commitmentTasks.push(task);
        }
      }
    }

    return { todayKey, daily, commitmentTasks };
  },
});

export const getDailyForDate = query({
  args: {
    dateKey: v.string(),
  },
  handler: async (ctx, args) => {
    const dateKey = normalizeDateKey(args.dateKey);
    return await getDailyByDateKey(ctx, dateKey);
  },
});

export const setCommitmentsForDate = mutation({
  args: {
    dateKey: v.string(),
    taskIds: v.array(v.id("tasks")),
  },
  handler: async (ctx, args) => {
    const dateKey = normalizeDateKey(args.dateKey);
    const uniqueTaskIds = Array.from(new Set(args.taskIds));

    for (const taskId of uniqueTaskIds) {
      const task = await ctx.db.get(taskId);
      if (!task) {
        throw new Error("Task not found.");
      }
      if (task.status !== "active") {
        throw new Error("Only active tasks can be committed.");
      }
    }

    const daily = await ensureDailyByDateKey(ctx, dateKey);
    if (!daily) {
      throw new Error("Could not create daily record.");
    }

    await ctx.db.patch(daily._id, {
      commitmentTaskIds: uniqueTaskIds,
      updatedAt: new Date().toISOString(),
    });
  },
});

export const addCommitmentForDate = mutation({
  args: {
    dateKey: v.string(),
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const dateKey = normalizeDateKey(args.dateKey);
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new Error("Task not found.");
    }
    if (task.status !== "active") {
      throw new Error("Only active tasks can be committed.");
    }

    const daily = await ensureDailyByDateKey(ctx, dateKey);
    if (!daily) {
      throw new Error("Could not create daily record.");
    }

    if (daily.commitmentTaskIds.includes(args.taskId)) {
      return;
    }

    await ctx.db.patch(daily._id, {
      commitmentTaskIds: [...daily.commitmentTaskIds, args.taskId],
      updatedAt: new Date().toISOString(),
    });
  },
});

export const removeCommitmentForDate = mutation({
  args: {
    dateKey: v.string(),
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const dateKey = normalizeDateKey(args.dateKey);
    const daily = await ensureDailyByDateKey(ctx, dateKey);
    if (!daily) {
      throw new Error("Could not create daily record.");
    }

    await ctx.db.patch(daily._id, {
      commitmentTaskIds: daily.commitmentTaskIds.filter((id) => id !== args.taskId),
      updatedAt: new Date().toISOString(),
    });
  },
});

export const markRitualCompleted = mutation({
  args: {
    dateKey: v.string(),
    ritual: v.union(v.literal("morning"), v.literal("evening"), v.literal("reset")),
  },
  handler: async (ctx, args) => {
    const dateKey = normalizeDateKey(args.dateKey);
    const daily = await ensureDailyByDateKey(ctx, dateKey);
    if (!daily) {
      throw new Error("Could not create daily record.");
    }

    const now = new Date().toISOString();
    const patch: {
      morningCompletedAt?: string;
      eveningCompletedAt?: string;
      resetCompletedAt?: string;
      updatedAt: string;
    } = { updatedAt: now };

    if (args.ritual === "morning") {
      patch.morningCompletedAt = now;
    } else if (args.ritual === "evening") {
      patch.eveningCompletedAt = now;
    } else {
      patch.resetCompletedAt = now;
    }

    await ctx.db.patch(daily._id, patch);
  },
});

export const getReentryStatus = query({
  args: {
    todayKey: v.string(),
  },
  handler: async (ctx, args) => {
    const todayKey = normalizeDateKey(args.todayKey);
    const dailyDocs = await ctx.db
      .query("daily")
      .withIndex("by_dateKey")
      .order("desc")
      .collect();

    const todayDaily = dailyDocs.find((doc) => doc.dateKey === todayKey) ?? null;
    if (todayDaily?.eveningCompletedAt) {
      return {
        todayKey,
        daysSinceLastEvening: 0,
        shouldShowResetBanner: false,
      };
    }

    const lastEveningDoc =
      dailyDocs.find((doc) => Boolean(doc.eveningCompletedAt)) ?? null;
    if (!lastEveningDoc) {
      return {
        todayKey,
        daysSinceLastEvening: null,
        shouldShowResetBanner: false,
      };
    }

    const daysSinceLastEvening = dayDifference(todayKey, lastEveningDoc.dateKey);
    return {
      todayKey,
      daysSinceLastEvening,
      shouldShowResetBanner: daysSinceLastEvening >= 2,
    };
  },
});
