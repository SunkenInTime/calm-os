import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createTask = mutation({
  args: {
    title: v.string(),
    dueDate: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const title = args.title.trim();
    if (!title) {
      throw new Error("Task title is required.");
    }

    const now = new Date().toISOString();
    const dueDate = args.dueDate ?? null;

    return await ctx.db.insert("tasks", {
      title,
      dueDate,
      status: "pending",
      createdAt: now,
    });
  },
});

export const listPendingTasks = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("tasks")
      .withIndex("by_status_createdAt", (q) => q.eq("status", "pending"))
      .order("desc")
      .collect();
  },
});

export const completeTask = mutation({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new Error("Task not found.");
    }

    await ctx.db.patch(args.taskId, { status: "done" });
  },
});

export const updateTaskDueDate = mutation({
  args: {
    taskId: v.id("tasks"),
    dueDate: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new Error("Task not found.");
    }

    await ctx.db.patch(args.taskId, { dueDate: args.dueDate });
  },
});
