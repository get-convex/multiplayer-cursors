import { Cursor, OtherCursor } from "./Cursor";
import { SharedCursorProvider, useSharedCursors } from "./useSharedCursors";

function MultiplayerCursors() {
  const { mine, others, onMove, currentPosition } = useSharedCursors();
  const { color, fruit } = mine ?? {};
  return (
    <div
      style={{ height: "600px", border: "1px solid black", cursor: "none" }}
      onMouseMove={onMove}
    >
      {color && fruit && currentPosition && (
        <Cursor cursorStyle={{ color, fruit }} position={currentPosition} />
      )}
      {others?.map((p) => {
        return (
          <OtherCursor key={p._id} cursorStyle={p} positionId={p.positionId} />
        );
      }) ?? null}
    </div>
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
