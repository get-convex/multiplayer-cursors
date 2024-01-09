import { makePositionTrackingServerFunctions } from "./lib/positionTracking";

export const { createEmptyPosition, submitPositionBatch, loadPosition } =
  makePositionTrackingServerFunctions("positions");
