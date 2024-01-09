import React, { useEffect } from "react";
import { api } from "../convex/_generated/api";
import { Doc, Id } from "../convex/_generated/dataModel";
import { useSessionId, useSessionMutation } from "./useServerSession";
import { useQuery } from "convex/react";
import { makePositionHooks } from "./usePositionHooks";

export const { usePositionReplay, usePositionTracking } = makePositionHooks(
  api.cursors.loadPosition,
  api.cursors.submitPositionBatch,
  "positions"
);

const SharedCursorContext = React.createContext<{
  zone: string;
  cursor?: Doc<"cursors">;
} | null>(null);

export const SharedCursorProvider: React.FC<{
  zone: string;
  children?: React.ReactNode;
}> = ({ zone, children }) => {
  const upsertCursor = useSessionMutation(api.app.upsertCursor);
  const [cursor, setCursor] = React.useState<Doc<"cursors"> | undefined>();
  useEffect(() => {
    if (cursor === undefined) {
      upsertCursor({ zone }).then(setCursor);
    }
  }, [cursor, upsertCursor, zone]);

  return React.createElement(
    SharedCursorContext.Provider,
    { value: { zone, cursor } },
    children
  );
};

export function useSharedCursors() {
  const context = React.useContext(SharedCursorContext);
  if (context === null) {
    throw new Error(
      "useSharedCursor must be used within a SharedCursorProvider"
    );
  }
  const sessionId = useSessionId();
  if (sessionId === undefined) {
    throw new Error("useSharedCursor must be used within a SessionProvider");
  }
  const { zone, cursor } = context;
  const cursors = useQuery(api.app.listCursors, { zone });
  const mine = cursors?.find((c) => c._id === cursor?._id);
  const others = cursors?.filter((c) => c._id !== cursor?._id);
  const { onMove, currentPosition } = usePositionTracking(mine?.positionId);

  return { mine, others, onMove, currentPosition } as const;
}
