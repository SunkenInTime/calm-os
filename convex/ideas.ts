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

    const activeIdeas = await ctx.db
      .query("ideas")
      .withIndex("by_status_rank", (q) => q.eq("status", "active"))
      .order("desc")
      .take(1);

    const nextRank = activeIdeas.length === 0 ? 1 : activeIdeas[0].rank + 1;
    const now = new Date().toISOString();

    return await ctx.db.insert("ideas", {
      title,
      rank: nextRank,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const listIdeas = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("ideas")
      .withIndex("by_status_rank", (q) => q.eq("status", "active"))
      .order("asc")
      .collect();
  },
});

export const moveIdea = mutation({
  args: {
    ideaId: v.id("ideas"),
    direction: v.union(v.literal("up"), v.literal("down")),
  },
  handler: async (ctx, args) => {
    const ideas = await ctx.db
      .query("ideas")
      .withIndex("by_status_rank", (q) => q.eq("status", "active"))
      .order("asc")
      .collect();

    const currentIndex = ideas.findIndex((idea) => idea._id === args.ideaId);
    if (currentIndex === -1) {
      throw new Error("Idea not found.");
    }

    const neighborIndex =
      args.direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (neighborIndex < 0 || neighborIndex >= ideas.length) {
      return;
    }

    const current = ideas[currentIndex];
    const neighbor = ideas[neighborIndex];
    const now = new Date().toISOString();

    await ctx.db.patch(current._id, {
      rank: neighbor.rank,
      updatedAt: now,
    });
    await ctx.db.patch(neighbor._id, {
      rank: current.rank,
      updatedAt: now,
    });
  },
});

export const archiveIdea = mutation({
  args: {
    ideaId: v.id("ideas"),
  },
  handler: async (ctx, args) => {
    const idea = await ctx.db.get(args.ideaId);
    if (!idea) {
      throw new Error("Idea not found.");
    }

    await ctx.db.patch(args.ideaId, {
      status: "archived",
      archivedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  },
});
