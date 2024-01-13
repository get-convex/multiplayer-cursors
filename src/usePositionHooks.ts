import {
  MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useMutation, useQuery } from "convex/react";
import {
  FieldConfig,
  unpackSampleRecord,
  History,
  cursorFields,
} from "../convex/lib/historicalObject";
import {
  FunctionReference,
  GenericDataModel,
  TableNamesInDataModel,
} from "convex/server";
import { GenericId } from "convex/values";

export type Knobs = {
  // replay
  minServerBufferAgeSoft: number;
  maxServerBufferAgeSoft: number;
  maxServerBufferAgeHard: number;
  // record
  minSampleDuration: number;
  flushFrequency: number;
};

type PositionDoc = {
  current?: { x: number; y: number };
  serverTime: number;

  history?: {
    start: number;
    buffer: ArrayBuffer;
  };
};

export function makePositionHooks<
  DataModel extends GenericDataModel,
  TableName extends TableNamesInDataModel<DataModel>
>(
  loadPosition: FunctionReference<
    "query",
    "public",
    { positionId: GenericId<TableName> },
    // DocumentByName<DataModel, TableName>
    PositionDoc
  >,
  submitPositionBatch: FunctionReference<
    "mutation",
    "public",
    {
      positionId: GenericId<TableName>;
      batchDuration: number;
      operations: {
        versionNumber: number;
        batchTime: number;
        newPosition: {
          x: number;
          y: number;
        };
      }[];
    },
    GenericId<TableName>
  >,
  positionTableName: TableName
) {
  function useHistoricalTime(knobs: Knobs, currentState?: PositionDoc) {
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
      setHistoricalTime(timeManager.current.historicalServerTime(now, knobs));
      rafRef.current = requestAnimationFrame(updateTime);
    };
    useEffect(() => {
      rafRef.current = requestAnimationFrame(updateTime);
      return () => cancelAnimationFrame(rafRef.current!);
    }, []);
    return { historicalTime, timeManager: timeManager.current };
  }

  function usePositionReplay(knobs: Knobs, positionId: GenericId<TableName>) {
    const position = useQuery(loadPosition, { positionId });
    const { historicalTime } = useHistoricalTime(knobs, position);
    const historicalPosition = useHistoricalValue(
      cursorFields,
      historicalTime,
      position?.current,
      position?.history?.buffer
    );
    return historicalPosition;
  }
  type Batch = {
    start: number;
    operations: Array<{ x: number; y: number; dt: number }>;
  };
  // TODO: make this configurable
  function usePositionTracking(
    positionId: GenericId<TableName> | undefined,
    ref: React.RefObject<HTMLElement>,
    knobs: Knobs
    // onUpdatePositionId?: (id: GenericId<TableName>) => any
  ) {
    // const [positionId, setPositionId] = useState(initialPositionId);
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
    const applyOperations = useMutation(submitPositionBatch);
    useEffect(() => {
      const flush = () => {
        if (!positionId) return;
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
        applyOperations({
          batchDuration: duration,
          operations,
          positionId,
        }).then((newPositionId) => {
          // if (positionId !== newPositionId) {
          //   setPositionId(newPositionId);
          //   onUpdatePositionId && onUpdatePositionId(newPositionId);
          // }
        });
      };
      const interval = setInterval(flush, knobs.flushFrequency);
      return () => clearInterval(interval);
    }, [batch, knobs]);

    return { onMove, currentPosition, positionId };
  }

  return { usePositionReplay, usePositionTracking };
}

type ServerTimeInterval = {
  startTs: number;
  endTs: number;
};

class HistoricalTimeManager {
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

  historicalServerTime(clientNow: number, knobs: Knobs): number | undefined {
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
    if (bufferDuration < knobs.minServerBufferAgeSoft) {
      rate = 0.8;
    } else if (bufferDuration > knobs.maxServerBufferAgeSoft) {
      rate = 1.2;
    }
    let serverTs = Math.max(
      prevServerTs + (clientNow - prevClientTs) * rate,
      // Jump forward if we're too far behind.
      lastServerTs - knobs.maxServerBufferAgeHard
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
