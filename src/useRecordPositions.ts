import { api } from "../convex/_generated/api";
import { MouseEvent, useCallback, useEffect, useRef, useState } from "react";
import { useSessionMutation } from "./useServerSession";
import { MIN_SAMPLE_DURATION, FLUSH_FREQUENCY } from "./constants";

type Batch = {
  start: number;
  operations: Array<{ x: number; y: number; dt: number }>;
};
export function useRecordPositions() {
  const [currentPosition, setCurrentPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const batch = useRef<Batch>({ start: Date.now(), operations: [] });

  const onMove = useCallback(
    (e: MouseEvent) => {
      batch.current.operations.push({
        x: e.clientX,
        y: e.clientY,
        dt: Date.now() - batch.current.start,
      });
      setCurrentPosition({ x: e.clientX, y: e.clientY });
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
        if (last && operation.dt - last.batchTime < MIN_SAMPLE_DURATION) {
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
    const interval = setInterval(flush, FLUSH_FREQUENCY);
    return () => clearInterval(interval);
  }, [batch]);

  return { onMove, currentPosition };
}
