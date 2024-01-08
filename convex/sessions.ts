import { mutation } from "./_generated/server";
import { FRUITS } from "./constants";

/**
 * Creates a session and returns the id. For use with the SessionProvider on the
 * client.
 * Note: if you end up importing code from other modules that use sessions,
 * you'll likely want to move this code to avoid import cycles.
 */
export const create = mutation(async (ctx) => {
  const fruit = FRUITS[Math.floor(Math.random() * FRUITS.length)];
  return ctx.db.insert("sessions", fruit);
});
