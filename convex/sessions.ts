import { mutation } from "./_generated/server";
import { FRUITS } from "./constants";
import { queryWithSession } from "./lib/sessions";

/**
 * Creates a session and returns the id. For use with the SessionProvider on the
 * client.
 * Note: if you end up importing code from other modules that use sessions,
 * you'll likely want to move this code to avoid import cycles.
 */
export const create = mutation(async (ctx) => {
  const positionId = await ctx.db.insert("positions", {
    versionNumber: 0,
    serverTime: Date.now(),
  });
  const fruit = FRUITS[Math.floor(Math.random() * FRUITS.length)];
  return ctx.db.insert("sessions", { positionId, ...fruit });
});

// TODO: Do filtering client side so we can get better cache performance.
export const peerSessions = queryWithSession({
  args: {},
  handler: async (ctx, args) => {
    if (!ctx.session) {
      return [];
    }
    const sessions = await ctx.db.query("sessions").collect();
    return sessions.filter((s) => s._id !== ctx.session?._id);
  },
});
