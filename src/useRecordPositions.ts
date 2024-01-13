import { api } from "../convex/_generated/api";
import { MouseEvent, useCallback, useEffect, useRef, useState } from "react";
import { useSessionMutation } from "./useServerSession";

type Batch = {
  start: number;
  operations: Array<{ x: number; y: number; dt: number }>;
};
export type Knobs = {
  minSampleDuration: number;
  flushFrequency: number;
};
export function useRecordPositions(
  ref: React.RefObject<HTMLElement>,
  knobs: Knobs
) {
  const [currentPosition, setCurrentPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const batch = useRef<Batch>({ start: Date.now(), operations: [] });

  const onMove = useCallback(
    (e: MouseEvent) => {
      const { x: parentX, y: parentY } = ref.current!.getBoundingClientRect();
      const x = e.clientX - parentX;
      const y = e.clientY - parentY;
      batch.current.operations.push({
        x,
        y,
        dt: Date.now() - batch.current.start,
      });
      setCurrentPosition({ x, y });
    },
    [setCurrentPosition]
  );
  // TODO: Memoize within useSessionMutation.
  const applyOperations = useSessionMutation(api.cursors.applyOperations);
  useEffect(() => {
    const flush = () => {
      const now = Date.now();
      const buffer = batch.current;
      batch.current = { start: now, operations: [] };
      if (buffer.operations.length === 0) {
        return;
      }
      const operations = [];
      for (const operation of buffer.operations) {
        const last = operations[operations.length - 1];
        if (last && operation.dt - last.batchTime < knobs.minSampleDuration) {
          continue;
        }
        operations.push({
          batchTime: operation.dt,
          versionNumber: 1,
          newPosition: { x: operation.x, y: operation.y },
        });
      }
      const duration = now - buffer.start;
      applyOperations({ batchDuration: duration, operations });
    };
    const interval = setInterval(flush, knobs.flushFrequency);
    return () => clearInterval(interval);
  }, [batch, knobs]);

  return { onMove, currentPosition };
}
