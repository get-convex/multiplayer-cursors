import { CURSOR_SIZE } from "./constants";

export function Cursor(props: {
  cursorStyle: { color: { default: string; dim: string }; fruit: string };
  x: number;
  y: number;
}) {
  const { color } = props.cursorStyle;
  return (
    <div
      style={{
        left: props.x,
        top: props.y,
        width: CURSOR_SIZE,
        height: CURSOR_SIZE,
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
