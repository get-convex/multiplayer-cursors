import { api } from "../convex/_generated/api";
import { useContext, useRef } from "react";
import { SessionContext, useSessionQuery } from "./useServerSession";
import { Cursor } from "./Cursor";
import { useRecordPositions } from "./useRecordPositions";
import { HistoricalCursor } from "./HistoricalCursor";

function MultiplayerCursors() {
  const cursorStyle = useSessionQuery(api.cursors.cursorStyle);
  const peers = useSessionQuery(api.sessions.peerSessions) ?? [];
  const ref = useRef<HTMLDivElement>(null);
  const { onMove, currentPosition } = useRecordPositions(ref);
  return (
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
            cursorStyle={p}
            positionId={p.positionId}
          />
        );
      })}
      {cursorStyle && currentPosition && (
        <Cursor cursorStyle={cursorStyle} {...currentPosition} />
      )}
    </div>
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
