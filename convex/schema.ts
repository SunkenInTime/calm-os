import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  tasks: defineTable({
    title: v.string(),
    dueDate: v.union(v.string(), v.null()),
    status: v.union(v.literal("pending"), v.literal("done"), v.literal("dropped")),
    createdAt: v.string(),
  }).index("by_status_createdAt", ["status", "createdAt"]),
  ideas: defineTable({
    title: v.string(),
    rank: v.number(),
    createdAt: v.string(),
  }).index("by_createdAt", ["createdAt"]),
});
