import "@fontsource/barlow-condensed/500.css";
import "@fontsource/barlow-condensed/600.css";
import "@fontsource/barlow-condensed/700.css";
import "@fontsource/barlow-condensed/800.css";
import "@fontsource/azeret-mono/400.css";
import "@fontsource/azeret-mono/500.css";
import "@fontsource/azeret-mono/600.css";
import "@fontsource/azeret-mono/700.css";
/* Package exports `./*` → `./*.css`; the .css suffix would resolve as 800.css.css. */
// @ts-expect-error no weight subpath types in this fontsource package
import "@fontsource/big-shoulders-display/800";
// @ts-expect-error no weight subpath types in this fontsource package
import "@fontsource/big-shoulders-display/900";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { AuthGate } from "./auth/AuthGate";
import { AuthProvider } from "./auth/AuthProvider";
import "./styles/tokens.css";
import "./styles/auth.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <AuthGate>
        <App />
      </AuthGate>
    </AuthProvider>
  </StrictMode>,
);
