import { api } from "../convex/_generated/api";
import { useContext } from "react";
import { SessionContext, useSessionQuery } from "./useServerSession";
import { Cursor } from "./Cursor";
import { useRecordPositions } from "./useRecordPositions";
import { HistoricalCursor } from "./HistoricalCursor";

function MultiplayerCursors() {
  const cursorStyle = useSessionQuery(api.cursors.cursorStyle);
  const { onMove, currentPosition } = useRecordPositions();
  const peers = useSessionQuery(api.sessions.peerSessions) ?? [];
  return (
    <div
      style={{ height: "600px", border: "1px solid black", cursor: "none" }}
      onMouseMove={onMove}
    >
      {cursorStyle && currentPosition && (
        <Cursor cursorStyle={cursorStyle} {...currentPosition} />
      )}
      {peers.map((p) => {
        return (
          <HistoricalCursor
            key={p._id}
            cursorStyle={p}
            positionId={p.positionId}
          />
        );
      })}
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
