import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  tasks: defineTable({
    title: v.string(),
    dueDate: v.union(v.string(), v.null()),
    status: v.union(v.literal("active"), v.literal("done"), v.literal("dropped")),
    createdAt: v.string(),
    updatedAt: v.string(),
    completedAt: v.optional(v.string()),
    droppedAt: v.optional(v.string()),
  })
    .index("by_status_createdAt", ["status", "createdAt"])
    .index("by_status_dueDate", ["status", "dueDate"])
    .index("by_status_updatedAt", ["status", "updatedAt"]),
  ideas: defineTable({
    title: v.string(),
    rank: v.number(),
    status: v.union(v.literal("active"), v.literal("archived")),
    createdAt: v.string(),
    updatedAt: v.string(),
    archivedAt: v.optional(v.string()),
  })
    .index("by_status_rank", ["status", "rank"])
    .index("by_status_updatedAt", ["status", "updatedAt"]),
  daily: defineTable({
    dateKey: v.string(),
    commitmentTaskIds: v.array(v.id("tasks")),
    morningCompletedAt: v.optional(v.string()),
    eveningCompletedAt: v.optional(v.string()),
    resetCompletedAt: v.optional(v.string()),
    updatedAt: v.string(),
  }).index("by_dateKey", ["dateKey"]),
});
