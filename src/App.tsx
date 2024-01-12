import { api } from "../convex/_generated/api";
import {
  ChangeEvent,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { SessionContext, useSessionQuery } from "./useServerSession";
import { Cursor } from "./Cursor";
import { useRecordPositions } from "./useRecordPositions";
import { HistoricalCursor } from "./HistoricalCursor";
import {
  FLUSH_FREQUENCY,
  MAX_SERVER_BUFFER_AGE,
  MIN_SAMPLE_DURATION,
  SOFT_MAX_SERVER_BUFFER_AGE,
  SOFT_MIN_SERVER_BUFFER_AGE,
} from "./constants";

function MultiplayerCursors() {
  const cursorStyle = useSessionQuery(api.cursors.cursorStyle);
  const peers = useSessionQuery(api.sessions.peerSessions) ?? [];
  const ref = useRef<HTMLDivElement>(null);
  const [minServerBufferAgeSoft, MinSoftSlider] = useSlider(
    "Server buffer age min (soft)",
    SOFT_MIN_SERVER_BUFFER_AGE,
    0,
    500
  );
  const [maxServerBufferAgeSoft, MaxSoftSlider] = useSlider(
    "Server buffer age max (soft)",
    SOFT_MAX_SERVER_BUFFER_AGE,
    0,
    2000
  );
  const [maxServerBufferAgeHard, MaxHardSlider] = useSlider(
    "Server buffer age max (hard)",
    MAX_SERVER_BUFFER_AGE,
    0,
    2000
  );
  const [minSampleDuration, MinSampleSlider] = useSlider(
    "Min sample duration",
    MIN_SAMPLE_DURATION,
    0,
    16
  );
  const [flushFrequency, FlushFreqSlider] = useSlider(
    "Flush period",
    FLUSH_FREQUENCY,
    0,
    2000
  );
  const knobs = useMemo(
    () => ({
      minServerBufferAgeSoft,
      maxServerBufferAgeSoft,
      maxServerBufferAgeHard,
      minSampleDuration,
      flushFrequency,
    }),
    [
      minServerBufferAgeSoft,
      maxServerBufferAgeSoft,
      maxServerBufferAgeHard,
      minSampleDuration,
      flushFrequency,
    ]
  );
  const { onMove, currentPosition } = useRecordPositions(ref, knobs);
  return (
    <>
      <div
        ref={ref}
        style={{
          height: "600px",
          position: "relative",
          border: "1px solid black",
          overflow: "hidden",
          cursor: "none",
        }}
        onMouseMove={onMove}
      >
        {peers.map((p) => {
          return (
            <HistoricalCursor
              key={p._id}
              knobs={knobs}
              cursorStyle={p}
              positionId={p.positionId}
            />
          );
        })}
        {cursorStyle && currentPosition && (
          <Cursor cursorStyle={cursorStyle} {...currentPosition} />
        )}
      </div>
      {MinSoftSlider}
      {MaxSoftSlider}
      {MaxHardSlider}
      {MinSampleSlider}
      {FlushFreqSlider}
    </>
  );
}

export default function App() {
  const sessionId = useContext(SessionContext);
  return (
    <main>
      <h1>Multiplayer Cursors</h1>
      {sessionId && <MultiplayerCursors />}
    </main>
  );
}

function useSlider(name: string, initial: number, min: number, max: number) {
  const [value, setValue] = useState(initial);

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setValue(parseInt(event.target.value));
    },
    [setValue]
  );

  return [
    value,
    <div
      style={{
        display: "flex",
      }}
    >
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={handleChange}
      />
      <p>
        {name}: {value}
      </p>
    </div>,
  ] as const;
}
