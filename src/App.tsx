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
  const [minServerBufferAgeSoft, minServerBufferAgeSoftOnChange] = useSlider(
    SOFT_MIN_SERVER_BUFFER_AGE
  );
  const [maxServerBufferAgeSoft, maxServerBufferAgeSoftOnChange] = useSlider(
    SOFT_MAX_SERVER_BUFFER_AGE
  );
  const [maxServerBufferAgeHard, maxServerBufferAgeHardOnChange] = useSlider(
    MAX_SERVER_BUFFER_AGE
  );
  const [minSampleDuration, minSampleDurationOnChange] =
    useSlider(MIN_SAMPLE_DURATION);
  const [flushFrequency, flushFrequencyOnChange] = useSlider(FLUSH_FREQUENCY);
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
      <Slider
        value={minServerBufferAgeSoft}
        name={"Server buffer age min (soft)"}
        min={0}
        max={500}
        onChange={minServerBufferAgeSoftOnChange}
        key={"Server buffer age min (soft)"}
      />
      <Slider
        value={maxServerBufferAgeSoft}
        name={"Server buffer age max (soft)"}
        min={0}
        max={2000}
        onChange={maxServerBufferAgeSoftOnChange}
        key={"Server buffer age max (soft)"}
      />
      <Slider
        value={maxServerBufferAgeHard}
        name={"Server buffer age max (hard)"}
        min={0}
        max={2000}
        onChange={maxServerBufferAgeHardOnChange}
        key={"Server buffer age max (hard)"}
      />
      <Slider
        value={minSampleDuration}
        name={"Min sample duration"}
        min={0}
        max={16}
        onChange={minSampleDurationOnChange}
        key={"Min sample duration"}
      />
      <Slider
        value={flushFrequency}
        name={"Flush period"}
        min={0}
        max={2000}
        onChange={flushFrequencyOnChange}
        key={"Flush period"}
      />
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

function useSlider(initial: number) {
  const [value, setValue] = useState(initial);

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setValue(parseInt(event.target.value));
    },
    [setValue]
  );
  return [value, handleChange] as const;
}

function Slider(props: {
  name: string;
  value: number;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  min: number;
  max: number;
}) {
  return (
    <div
      style={{
        display: "flex",
      }}
    >
      <input type="range" {...props} />
      <p>
        {props.name}: {props.value}
      </p>
    </div>
  );
}
