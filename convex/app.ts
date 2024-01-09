import { v } from "convex/values";
import { query } from "./_generated/server";
import { FRUITS } from "./constants";
import { mutationWithSession, queryWithSession } from "./lib/sessions";
import { createEmptyPosition } from "./cursors";

// Does filtering client side so we can get better cache performance.
export const otherCursors = query({
  args: { zone: v.string() },
  handler: async (ctx, args) => {
    const cursors = await ctx.db
      .query("cursors")
      .withIndex("zone|sessionId", (q) => q.eq("zone", args.zone))
      .collect();
    // Keep sessionIds private from other users to avoid impersonation.
    return cursors.map(({ sessionId, ...rest }) => rest);
  },
});

export const createCursor = mutationWithSession({
  args: {
    zone: v.string(),
  },
  handler: async (ctx, args) => {
    const positionId = await createEmptyPosition(ctx);
    const cursorId = await ctx.db.insert("cursors", {
      positionId,
      sessionId: ctx.session._id,
      zone: args.zone,
      ...FRUITS[Math.floor(Math.random() * FRUITS.length)],
    });
    return cursorId;
  },
});

export const myData = queryWithSession({
  args: { zone: v.string() },
  handler: async (ctx, args) => {
    const { session } = ctx;
    if (!session) {
      // could throw here since the client waits for a session before rendering.
      return null;
    }
    const cursor = await ctx.db
      .query("cursors")
      .withIndex("zone|sessionId", (q) =>
        q.eq("zone", args.zone).eq("sessionId", session._id)
      )
      .first();
    if (!cursor) {
      return null;
    }
    const { color, fruit, positionId } = cursor;
    return { color, fruit, positionId };
  },
});
