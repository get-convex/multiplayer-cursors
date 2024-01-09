import { v } from "convex/values";
import { query } from "../_generated/server";
import { FRUITS } from "../constants";
import { makePositionTrackingServerFunctions } from "./positionTracking";
import { mutationWithSession } from "./sessions";
import {
  GenericDataModel,
  GenericMutationCtx,
  GenericQueryCtx,
  MutationBuilder,
  RegisteredMutation,
  TableNamesInDataModel,
  ValidatedFunction,
} from "convex/server";
import { customMutation } from "convex-helpers/server/customFunctions";

export function makeCursorServerFunctions<
  DataModel extends GenericDataModel,
  TableName extends TableNamesInDataModel<DataModel>,
  Ctx extends GenericMutationCtx<DataModel>,
  Id extends string
>(
  customMutation: (
    func: ValidatedFunction<Ctx, any, any>
  ) => RegisteredMutation<"public", any, any>,
  lookupId: (ctx: Ctx) => Id | Promise<Id>,
  getMetadata: (ctx: GenericQueryCtx<DataModel>, id: Id) => {} | Promise<{}>,
  tableName: TableName
) {
  // TODO
}
export const { createEmptyPosition, submitPositionBatch, loadPosition } =
  makePositionTrackingServerFunctions("positions"); // Does filtering client side so we can get better cache performance.

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
