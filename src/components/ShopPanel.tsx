import { Circle, Hand } from "@phosphor-icons/react";
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
        aria-label="Scout. Drag the board. Key V"
        onClick={() => actions?.selectBuildType(null)}
      >
        <span className="swatch scout-swatch" aria-hidden="true">
          <Hand size={11} weight="bold" />
        </span>
        <span className="tower-copy">
          <span className="tower-name">Scout</span>
          <span className="tower-blurb">Drag to pan • No build</span>
        </span>
      </button>
      {ARMORY_ORDER.map((type, index) => {
        const item = ARMORY[type];
        const selected =
          snapshot.interactionMode === "build" &&
          snapshot.selectedBuildType === type;
        const disabled = !snapshot.canAffordBuild[type];
        return (
          <button
            key={type}
            type="button"
            className={`tower-card${selected ? " selected" : ""}`}
            disabled={disabled}
            aria-pressed={selected}
        aria-label={`${item.name}, ${formatNumber(item.cost)} gold. ${item.blurb}. Key ${index + 1}`}
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
            <span className="price" style={{ color: item.swatch }} translate="no">
              {formatNumber(item.cost)}
              <Circle size={11} weight="fill" aria-hidden="true" />
            </span>
          </button>
        );
      })}
    </section>
  );
}
