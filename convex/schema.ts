import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { position, serverTime } from "./types";

export default defineSchema({
  // TODO: Add metadata.
  positions: defineTable({
    versionNumber: v.number(),
    current: position,

    history: v.object({
      start: serverTime,
      end: serverTime,
      buffer: v.union(v.bytes(), v.null()),
    }),
  }),

  sessions: defineTable({
    fruit: v.string(),
    color: v.object({
      default: v.string(),
      dim: v.string(),
    }),
    positionId: v.optional(v.id("positions")),
  }),
});
