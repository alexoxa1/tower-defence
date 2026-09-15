import { Flame, Spiral } from "@phosphor-icons/react";

function riftTitle(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("pause")) return "Hold Fast";
  if (m.includes("resume")) return "Watch Resumed";
  if (m.includes("mute") || m.includes("audio")) return "Signal";
  if (m.includes("scout")) return "Scout";
  if (m.includes("new watch") || m.includes("new game") || m.includes("reset")) {
    return "New Watch";
  }
  if (m.includes("incoming") || m.includes("cleared")) {
    return "Rift Storm Brewing";
  }
  if (m.includes("upgrade")) return "Forge Spark";
  if (m.includes("sell")) return "Refund";
  if (m.includes("build") || m.includes("built") || m.includes("tower") || m.includes("defense")) {
    return "Armory";
  }
  return "Citadel";
}

export function Toast({ message }: { message: string | null }) {
  return (
    <div
      className={`toast${message ? " show" : ""}`}
      role="status"
      aria-live="polite"
    >
      {message ? (
        <>
          <Flame size={22} weight="fill" className="toast-mark" aria-hidden="true" />
          <div className="toast-copy">
            <p className="toast-title">{riftTitle(message)}</p>
            <p className="toast-body">{message}</p>
          </div>
          <Spiral size={28} weight="bold" className="toast-vortex" aria-hidden="true" />
        </>
      ) : null}
    </div>
  );
}
