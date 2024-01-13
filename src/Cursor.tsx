import { Id } from "../convex/_generated/dataModel";
import { Knobs } from "./usePositionHooks";
import { usePositionReplay } from "./useSharedCursors";

export function OtherCursor(props: {
  cursorStyle: { color: { default: string; dim: string }; fruit: string };
  positionId: Id<"positions">;
  knobs: Knobs;
}) {
  const position = usePositionReplay(props.knobs, props.positionId);
  if (position === undefined) return null;
  return <Cursor cursorStyle={props.cursorStyle} position={position} />;
}

export function Cursor(props: {
  cursorStyle: { color: { default: string; dim: string }; fruit: string };
  position: { x: number; y: number };
}) {
  const { color } = props.cursorStyle;
  const { x, y } = props.position;
  return (
    <div
      style={{
        left: x,
        top: y,
        width: 52,
        height: 52,
        position: "absolute",
        fontSize: 28,
        userSelect: "none",
        background: color.dim,
        boxShadow: `inset 0px 0px 0px 2px ${color.default}, 0px 8px 16px rgba(0,0,0,0.4)`,
        borderRadius: "50%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {props.cursorStyle.fruit}
      <svg
        style={{
          position: "absolute",
          top: -2,
          left: -2,
          transform: "rotate(90deg)",
        }}
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M2 12H9.17157C10.9534 12 11.8457 9.84572 10.5858 8.58579L3.41421 1.41421C2.15428 0.154281 0 1.04662 0 2.82843V10C0 11.1046 0.89543 12 2 12Z"
          fill={color.default}
        />
      </svg>
    </div>
  );
}
