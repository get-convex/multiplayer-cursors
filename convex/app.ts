import { v } from "convex/values";
import { query } from "./_generated/server";
import { FRUITS } from "./constants";
import { mutationWithSession, queryWithSession } from "./lib/sessions";
import { createEmptyPosition } from "./cursors";

// Does filtering client side so we can get better cache performance.
export const listCursors = query({
  args: { zone: v.string() },
  handler: async (ctx, args) => {
    const cursors = await ctx.db
      .query("cursors")
      .withIndex("zone_sessionId", (q) => q.eq("zone", args.zone))
      .collect();
    // Keep sessionIds private from other users to avoid impersonation.
    return cursors.map(({ sessionId, ...rest }) => rest);
  },
});

export const upsertCursor = mutationWithSession({
  args: {
    zone: v.string(),
  },
  handler: async (ctx, args) => {
    const { session } = ctx;
    const existing = await ctx.db
      .query("cursors")
      .withIndex("zone_sessionId", (q) =>
        q.eq("zone", args.zone).eq("sessionId", session._id)
      )
      .first();
    if (existing) {
      // TODO: validate that the position still exists.
      return existing;
    }
    const positionId = await createEmptyPosition(ctx);
    const cursorId = await ctx.db.insert("cursors", {
      positionId,
      sessionId: ctx.session._id,
      zone: args.zone,
      ...FRUITS[Math.floor(Math.random() * FRUITS.length)],
    });
    return (await ctx.db.get(cursorId))!;
  },
});
