import { v } from "convex/values";
import { cursorFields } from "./constants";
import { HistoricalObject } from "./lib/historicalObject";
import { mutationWithSession, queryWithSession } from "./lib/sessions";
import { batchTime, position } from "./types";
import { query } from "./_generated/server";

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

    const now = Date.now();
    const startLowerBound = now - args.batchDuration;
    const start = position.history
      ? Math.max(startLowerBound, position.serverTime)
      : startLowerBound;
    const end = Math.min(start + args.batchDuration, now);
    const batchScaling = (end - start) / args.batchDuration;

    const current = position.current ?? { x: 0, y: 0 };
    const history = new HistoricalObject(cursorFields, current);

    let versionNumber = position.versionNumber;
    for (const operation of args.operations) {
      // TODO: Use version numbers when we want to implement optimistic updates.
      // if (operation.versionNumber < versionNumber) {
      //   throw new Error(
      //     `Version numbers out of order: ${operation.versionNumber} < ${versionNumber}`
      //   );
      // }
      versionNumber = operation.versionNumber;
      const serverTime = start + batchScaling * operation.batchTime;
      history.update(serverTime, operation.newPosition);
    }
    const buffer = history.pack() ?? undefined;
    buffer &&
      console.log(
        `Flushing ${args.operations.length} ops in ${(
          buffer.byteLength / 1024
        ).toFixed(2)}KiB`
      );
    await ctx.db.replace(positionId, {
      versionNumber,
      current: history.data,
      serverTime: end,
      history: buffer && {
        start,
        buffer,
      },
    });
  },
});

export const loadPosition = query({
  args: { positionId: v.id("positions") },
  handler: async (ctx, args) => {
    const position = await ctx.db.get(args.positionId);
    if (!position) {
      throw new Error("Position not found");
    }
    return position;
  },
});
