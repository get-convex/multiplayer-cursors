import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { position, serverTime } from "./types";

export default defineSchema({
  // TODO: Add metadata.
  positions: defineTable({
    versionNumber: v.number(),
    current: v.optional(position),
    serverTime,

    history: v.optional(
      v.object({
        start: serverTime,
        buffer: v.bytes(),
      })
    ),
  }),

  sessions: defineTable({
    fruit: v.string(),
    color: v.object({
      default: v.string(),
      dim: v.string(),
    }),
    positionId: v.id("positions"),
  }),
});
