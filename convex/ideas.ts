import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createIdea = mutation({
  args: {
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const title = args.title.trim();
    if (!title) {
      throw new Error("Idea title is required.");
    }

    const now = new Date().toISOString();

    return await ctx.db.insert("ideas", {
      title,
      rank: 0,
      createdAt: now,
    });
  },
});

export const listIdeas = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("ideas")
      .withIndex("by_createdAt")
      .order("desc")
      .collect();
  },
});
