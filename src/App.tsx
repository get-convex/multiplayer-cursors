import { ChangeEvent, useCallback, useMemo, useRef, useState } from "react";
import {
  FLUSH_FREQUENCY,
  MIN_SAMPLE_DURATION,
  MAX_SERVER_BUFFER_AGE,
  SOFT_MAX_SERVER_BUFFER_AGE,
  SOFT_MIN_SERVER_BUFFER_AGE,
} from "./constants";
import { Cursor, OtherCursor } from "./Cursor";
import { SharedCursorProvider, useSharedCursors } from "./useSharedCursors";

function MultiplayerCursors() {
  const ref = useRef<HTMLDivElement>(null);
  const [knobs, onChange] = useKnobs();
  const { mine, others, onMove, currentPosition } = useSharedCursors(
    ref,
    knobs
  );
  const { color, fruit } = mine ?? {};
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
        {color && fruit && currentPosition && (
          <Cursor cursorStyle={{ color, fruit }} position={currentPosition} />
        )}
        {others?.map((p) => {
          return (
            <OtherCursor
              key={p._id}
              knobs={knobs}
              cursorStyle={p}
              positionId={p.positionId}
            />
          );
        }) ?? null}
      </div>
      <Sliders knobs={knobs} onChange={onChange} />
    </>
  );
}

export default function App() {
  return (
    <main>
      <h1>Multiplayer Cursors</h1>
      <SharedCursorProvider zone={"zoneA"}>
        <MultiplayerCursors />
      </SharedCursorProvider>
    </main>
  );
}

/**
 * Debug sliders to dial in values
 */

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

function useKnobs() {
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
  return [
    useMemo(
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
    ),
    useMemo(
      () => ({
        minServerBufferAgeSoftOnChange,
        maxServerBufferAgeSoftOnChange,
        maxServerBufferAgeHardOnChange,
        minSampleDurationOnChange,
        flushFrequencyOnChange,
      }),
      [
        minServerBufferAgeSoftOnChange,
        maxServerBufferAgeSoftOnChange,
        maxServerBufferAgeHardOnChange,
        minSampleDurationOnChange,
        flushFrequencyOnChange,
      ]
    ),
  ] as const;
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

function Sliders({
  knobs,
  onChange,
}: {
  knobs: ReturnType<typeof useKnobs>[0];
  onChange: ReturnType<typeof useKnobs>[1];
}) {
  return (
    <>
      <Slider
        value={knobs.minServerBufferAgeSoft}
        name={"Server buffer age min (soft)"}
        min={0}
        max={500}
        onChange={onChange.minServerBufferAgeSoftOnChange}
        key={"Server buffer age min (soft)"}
      />
      <Slider
        value={knobs.maxServerBufferAgeSoft}
        name={"Server buffer age max (soft)"}
        min={0}
        max={2000}
        onChange={onChange.maxServerBufferAgeSoftOnChange}
        key={"Server buffer age max (soft)"}
      />
      <Slider
        value={knobs.maxServerBufferAgeHard}
        name={"Server buffer age max (hard)"}
        min={0}
        max={2000}
        onChange={onChange.maxServerBufferAgeHardOnChange}
        key={"Server buffer age max (hard)"}
      />
      <Slider
        value={knobs.minSampleDuration}
        name={"Min sample duration"}
        min={0}
        max={16}
        onChange={onChange.minSampleDurationOnChange}
        key={"Min sample duration"}
      />
      <Slider
        value={knobs.flushFrequency}
        name={"Flush period"}
        min={0}
        max={2000}
        onChange={onChange.flushFrequencyOnChange}
        key={"Flush period"}
      />
    </>
  );
}
