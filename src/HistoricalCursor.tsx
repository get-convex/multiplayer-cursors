import { Cursor } from "./Cursor";
import { Doc, Id } from "../convex/_generated/dataModel";
import {
  SOFT_MIN_SERVER_BUFFER_AGE,
  SOFT_MAX_SERVER_BUFFER_AGE,
  MAX_SERVER_BUFFER_AGE,
} from "./constants";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import {
  FieldConfig,
  unpackSampleRecord,
  History,
} from "../convex/lib/historicalObject";
import { cursorFields } from "../convex/constants";

export function HistoricalCursor(props: {
  cursorStyle: { color: { default: string; dim: string }; fruit: string };
  positionId: Id<"positions">;
}) {
  const position = useQuery(api.cursors.loadPosition, {
    positionId: props.positionId,
  });
  const { historicalTime, timeManager } = useHistoricalTime(position);
  const historicalPosition = useHistoricalValue(
    cursorFields,
    historicalTime,
    position?.current,
    position?.history?.buffer
  );

  if (!historicalPosition) {
    return;
  }
  return (
    <Cursor
      cursorStyle={props.cursorStyle}
      x={historicalPosition.x}
      y={historicalPosition.y}
    />
  );
}

function useHistoricalTime(currentState?: Doc<"positions">) {
  const timeManager = useRef(new HistoricalTimeManager());
  const rafRef = useRef<number>();
  const [historicalTime, setHistoricalTime] = useState<number | undefined>(
    undefined
  );
  if (currentState && currentState.history) {
    const interval = {
      startTs: currentState.history.start,
      endTs: currentState.serverTime,
    };
    timeManager.current.receive(interval);
  }
  const updateTime = (performanceNow: number) => {
    // We don't need sub-millisecond precision for interpolation, so just use `Date.now()`.
    const now = Date.now();
    setHistoricalTime(timeManager.current.historicalServerTime(now));
    rafRef.current = requestAnimationFrame(updateTime);
  };
  useEffect(() => {
    rafRef.current = requestAnimationFrame(updateTime);
    return () => cancelAnimationFrame(rafRef.current!);
  }, []);
  return { historicalTime, timeManager: timeManager.current };
}

type ServerTimeInterval = {
  startTs: number;
  endTs: number;
};

export class HistoricalTimeManager {
  intervals: Array<ServerTimeInterval> = [];
  prevClientTs?: number;
  prevServerTs?: number;
  totalDuration: number = 0;

  receive(interval: ServerTimeInterval) {
    const latest = this.intervals[this.intervals.length - 1];
    if (latest) {
      if (latest.endTs === interval.endTs) {
        return;
      }
      if (latest.endTs > interval.endTs) {
        throw new Error(`Received out-of-order interval`);
      }
    }
    this.intervals.push(interval);
    this.totalDuration += interval.endTs - interval.startTs;
  }

  historicalServerTime(clientNow: number): number | undefined {
    if (this.intervals.length == 0) {
      return undefined;
    }
    if (clientNow === this.prevClientTs) {
      return this.prevServerTs;
    }
    // If this is our first time simulating, start at the beginning of the buffer.
    const prevClientTs = this.prevClientTs ?? clientNow;
    const prevServerTs = this.prevServerTs ?? this.intervals[0].startTs;
    const lastServerTs = this.intervals[this.intervals.length - 1].endTs;

    // Simple rate adjustment: run time at 1.2 speed if we're more than 1s behind and
    // 0.8 speed if we only have 100ms of buffer left. A more sophisticated approach
    // would be to continuously adjust the rate based on the size of the buffer.
    const bufferDuration = lastServerTs - prevServerTs;
    let rate = 1;
    if (bufferDuration < SOFT_MIN_SERVER_BUFFER_AGE) {
      rate = 0.8;
    } else if (bufferDuration > SOFT_MAX_SERVER_BUFFER_AGE) {
      rate = 1.2;
    }
    let serverTs = Math.max(
      prevServerTs + (clientNow - prevClientTs) * rate,
      // Jump forward if we're too far behind.
      lastServerTs - MAX_SERVER_BUFFER_AGE
    );

    let chosen = null;
    for (let i = 0; i < this.intervals.length; i++) {
      const snapshot = this.intervals[i];
      // We're past this snapshot, continue to the next one.
      if (snapshot.endTs < serverTs) {
        continue;
      }
      // We're cleanly within this snapshot.
      if (serverTs >= snapshot.startTs) {
        chosen = i;
        break;
      }
      // We've gone past the desired timestamp, which implies a gap in our server state.
      // Jump time forward to the beginning of this snapshot.
      if (serverTs < snapshot.startTs) {
        serverTs = snapshot.startTs;
        chosen = i;
      }
    }
    if (chosen === null) {
      serverTs = this.intervals.at(-1)!.endTs;
      chosen = this.intervals.length - 1;
    }
    // Time only moves forward, so we can trim all of the snapshots before our chosen one.
    const toTrim = Math.max(chosen - 1, 0);
    if (toTrim > 0) {
      for (const snapshot of this.intervals.slice(0, toTrim)) {
        this.totalDuration -= snapshot.endTs - snapshot.startTs;
      }
      this.intervals = this.intervals.slice(toTrim);
    }

    this.prevClientTs = clientNow;
    this.prevServerTs = serverTs;

    return serverTs;
  }

  bufferHealth(): number {
    if (!this.intervals.length) {
      return 0;
    }
    const lastServerTs = this.prevServerTs ?? this.intervals[0].startTs;
    return this.intervals[this.intervals.length - 1].endTs - lastServerTs;
  }

  clockSkew(): number {
    if (!this.prevClientTs || !this.prevServerTs) {
      return 0;
    }
    return this.prevClientTs - this.prevServerTs;
  }
}

export function useHistoricalValue<T extends Record<string, number>>(
  fields: FieldConfig,
  historicalTime: number | undefined,
  value: T | undefined,
  history: ArrayBuffer | undefined
): T | undefined {
  const manager = useRef(new HistoryManager());
  const sampleRecord: Record<string, History> | undefined = useMemo(() => {
    if (!value || !history) {
      return undefined;
    }
    if (!(history instanceof ArrayBuffer)) {
      throw new Error(`Expected ArrayBuffer, found ${typeof history}`);
    }
    return unpackSampleRecord(fields, history);
  }, [value && history]);
  if (sampleRecord) {
    manager.current.receive(sampleRecord);
  }
  if (value === undefined) {
    return undefined;
  }
  if (!historicalTime) {
    return value;
  }
  const historicalFields = manager.current.query(historicalTime);
  return { ...value, ...historicalFields };
}

class HistoryManager {
  histories: Record<string, History[]> = {};

  receive(sampleRecord: Record<string, History>) {
    for (const [fieldName, history] of Object.entries(sampleRecord)) {
      let histories = this.histories[fieldName];
      if (!histories) {
        histories = [];
        this.histories[fieldName] = histories;
      }
      if (histories[histories.length - 1] == history) {
        continue;
      }
      histories.push(history);
    }
  }

  query(historicalTime: number): Record<string, number> {
    const result: Record<string, number> = {};
    for (const [fieldName, histories] of Object.entries(this.histories)) {
      if (histories.length == 0) {
        continue;
      }
      let foundIndex = null;
      let currentValue = histories[0].initialValue;
      for (let i = 0; i < histories.length; i++) {
        const history = histories[i];
        for (const sample of history.samples) {
          if (sample.time > historicalTime) {
            foundIndex = i;
            break;
          }
          currentValue = sample.value;
        }
        if (foundIndex !== null) {
          break;
        }
      }
      if (foundIndex !== null) {
        this.histories[fieldName] = histories.slice(foundIndex);
      }
      result[fieldName] = currentValue;
    }
    return result;
  }
}
