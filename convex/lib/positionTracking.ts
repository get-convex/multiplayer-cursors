import { GenericId } from "convex/values";
import { batchTime } from "../types";
import { GenericDataModel, TableNamesInDataModel } from "convex/server";
import { v } from "convex/values";
import { cursorFields, HistoricalObject } from "./historicalObject";
import { position } from "../types";
import {
  GenericMutationCtx,
  MutationBuilder,
  QueryBuilder,
  mutationGeneric,
  queryGeneric,
} from "convex/server";
import { DataModel } from "../_generated/dataModel";

// Start of library-like code
const operation = v.object({
  // Time relative to the start of the batch.
  batchTime,
  versionNumber: v.number(),
  newPosition: position,
});
type TableName = "positions";
export function makePositionTrackingServerFunctions(
  // <
  // DataModel extends GenericDataModel,
  // TableName extends TableNamesInDataModel<DataModel>
  // >
  tableName: TableName
  // onCreate: (
  //   ctx: GenericMutationCtx<DataModel>,
  //   positionId: GenericId<TableName>
  // ) => any
) {
  const createEmptyPosition = (ctx: GenericMutationCtx<DataModel>) => {
    return ctx.db.insert(tableName, {
      versionNumber: 0,
      serverTime: Date.now(),
    });
  };
  const submitPositionBatch = (
    mutationGeneric as MutationBuilder<DataModel, "public">
  )({
    args: {
      positionId: v.optional(v.id(tableName)),
      batchDuration: v.number(),
      operations: v.array(operation),
    },
    handler: async (ctx, args) => {
      const existing = args.positionId && (await ctx.db.get(args.positionId));
      const positionId = existing
        ? existing._id
        : await ctx.db.insert(tableName, {
            versionNumber: 0,
            serverTime: Date.now(),
          });
      const position = existing ?? (await ctx.db.get(positionId))!;

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
      await ctx.db.patch(positionId, {
        versionNumber,
        current: history.data,
        serverTime: end,
        history: buffer && {
          start,
          buffer,
        },
      });
      return positionId;
    },
  });

  const loadPosition = (queryGeneric as QueryBuilder<DataModel, "public">)({
    args: { positionId: v.id(tableName) },
    handler: async (ctx, args) => {
      const position = await ctx.db.get(args.positionId);
      if (!position) {
        throw new Error("Position not found");
      }
      return position;
    },
  });
  return { createEmptyPosition, submitPositionBatch, loadPosition };
}
