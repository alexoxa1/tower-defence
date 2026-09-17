import { Hand } from "@phosphor-icons/react";
import { ARMORY, ARMORY_ORDER } from "../game/config/armory";
import type { HudCommands } from "../game/hud/commands";
import type { UiSnapshot } from "../game/types";
import { formatNumber } from "../game/utils/format";

export function ShopPanel({
  snapshot,
  actions,
}: {
  snapshot: UiSnapshot;
  actions: HudCommands | null;
}) {
  const scouting = snapshot.interactionMode === "scout";

  return (
    <section className="armory" aria-label="Armory">
      <p className="section-title">Armory</p>
      <button
        type="button"
        className={`tower-card${scouting ? " selected" : ""}`}
        aria-pressed={scouting}
        aria-label="Scout. Drag the board to pan."
        onClick={() => actions?.selectBuildType(null)}
      >
        <span className="swatch scout-swatch" aria-hidden="true">
          <Hand size={11} weight="bold" />
        </span>
        <span className="tower-copy">
          <span className="tower-name">Scout</span>
          <span className="tower-blurb hint-fine">Drag to pan · No build</span>
          <span className="tower-blurb hint-coarse">Drag / pinch · No build</span>
        </span>
      </button>
      {ARMORY_ORDER.map((type) => {
        const item = ARMORY[type];
        const selected =
          snapshot.interactionMode === "build" &&
          snapshot.selectedBuildType === type;
        const unavailable = !snapshot.canAffordBuild[type];
        const deficit = Math.max(0, item.cost - snapshot.gold);
        return (
          <button
            key={type}
            type="button"
            className={`tower-card${selected ? " selected" : ""}${unavailable ? " unavailable" : ""}`}
            aria-pressed={selected}
            aria-label={`${item.name}, ${formatNumber(item.cost)} Gold. ${item.blurb}.${unavailable ? ` Need ${formatNumber(deficit)} more Gold.` : ""}`}
            onClick={() => actions?.selectBuildType(type)}
          >
            <span
              className="swatch"
              style={{ background: item.swatch }}
              aria-hidden="true"
            />
            <span className="tower-copy">
              <span className="tower-name">{item.name}</span>
              <span className="tower-blurb">{item.blurb}</span>
            </span>
            <span className="price" translate="no">
              {formatNumber(item.cost)}
            </span>
          </button>
        );
      })}
    </section>
  );
}
