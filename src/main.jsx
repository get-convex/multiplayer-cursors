import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { SessionProvider } from "./useServerSession";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

ReactDOM.createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ConvexProvider client={convex}>
      <SessionProvider waitForSessionId>
        <App />
      </SessionProvider>
    </ConvexProvider>
  </StrictMode>
);
