import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

function normalizeReferenceUrl(value?: string): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("Reference URL must be a valid URL.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Reference URL must start with http:// or https://");
  }

  return parsed.toString();
}

export const createIdea = mutation({
  args: {
    title: v.string(),
    referenceUrl: v.optional(v.string()),
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
    const referenceUrl = normalizeReferenceUrl(args.referenceUrl);

    return await ctx.db.insert("ideas", {
      title,
      referenceUrl,
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

export const reorderIdea = mutation({
  args: {
    ideaId: v.id("ideas"),
    targetIndex: v.number(),
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

    const maxIndex = Math.max(ideas.length - 1, 0);
    const targetIndex = Math.max(0, Math.min(Math.floor(args.targetIndex), maxIndex));
    if (targetIndex === currentIndex) {
      return;
    }

    const reordered = [...ideas];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    const now = new Date().toISOString();
    for (let index = 0; index < reordered.length; index += 1) {
      const idea = reordered[index];
      const nextRank = index + 1;
      if (idea.rank === nextRank && idea._id !== moved._id) {
        continue;
      }
      await ctx.db.patch(idea._id, {
        rank: nextRank,
        updatedAt: now,
      });
    }
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
