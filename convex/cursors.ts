import { v } from "convex/values";
import { cursorFields } from "./constants";
import { HistoricalObject } from "./lib/historicalObject";
import { mutationWithSession, queryWithSession } from "./lib/withSession";
import { batchTime, position } from "./types";

export const cursorStyle = queryWithSession({
  args: {},
  handler: (ctx) => {
    if (!ctx.session) {
      return null;
    }
    const { color, fruit } = ctx.session;
    return { color, fruit };
  },
});

const operation = v.object({
  // Time relative to the start of the batch.
  batchTime,
  versionNumber: v.number(),
  newPosition: position,
});

export const applyOperations = mutationWithSession({
  args: {
    batchDuration: v.number(),
    operations: v.array(operation),
  },
  handler: async (ctx, args) => {
    if (!ctx.session || !ctx.session.positionId) {
      return;
    }
    const { positionId } = ctx.session;
    const position = await ctx.db.get(positionId);
    if (!position) {
      throw new Error("Position not found");
    }
    const lastEnd = position.history.end;

    const now = Date.now();
    const start = Math.max(now - args.batchDuration, position.history.end);
    const end = Math.min(start + args.batchDuration, now);
    const batchScaling = (end - start) / args.batchDuration;

    const history = HistoricalObject.unpack(
      cursorFields,
      position.history.buffer,
      position.current
    );

    let versionNumber = position.versionNumber;
    for (const operation of args.operations) {
      if (operation.versionNumber < versionNumber) {
        throw new Error(
          `Version numbers out of order: ${operation.versionNumber} < ${versionNumber}`
        );
      }
      versionNumber = operation.versionNumber;
      const serverTime = start + batchScaling * operation.batchTime;
      history.update(serverTime, operation.newPosition);
    }
    history.trimBefore(start);
    await ctx.db.replace(positionId, {
      versionNumber,
      current: history.data,
      history: {
        start,
        end,
        buffer: history.pack(),
      },
    });
  },
});
