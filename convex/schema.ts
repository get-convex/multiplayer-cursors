import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { position, serverTime } from "./types";

export default defineSchema({
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

  cursors: defineTable({
    positionId: v.id("positions"),
    sessionId: v.id("sessions"),
    zone: v.string(),
    fruit: v.string(),
    color: v.object({
      default: v.string(),
      dim: v.string(),
    }),
  }).index("zone_sessionId", ["zone", "sessionId"]),

  sessions: defineTable({}),
});
