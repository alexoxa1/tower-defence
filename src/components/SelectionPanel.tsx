import { useState } from "react";
import { CaretUp, Crosshair, Diamond, Lightning } from "@phosphor-icons/react";
import { ARMORY } from "../game/config/armory";
import type { HudCommands } from "../game/hud/commands";
import type { TowerType, UiSnapshot } from "../game/types";
import { formatNumber } from "../game/utils/format";

function UnitPortrait({ type }: { type: TowerType }) {
  const swatch = ARMORY[type].swatch;
  return (
    <div className="unit-portrait" style={{ ["--swatch" as string]: swatch }} aria-hidden="true">
      <span className={`iso-turret iso-${type}`} />
    </div>
  );
}

function UpgradeBar({
  label,
  cost,
  disabled,
  onClick,
}: {
  label: string;
  cost?: number;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" className="upgrade-bar" disabled={disabled} onClick={onClick}>
      <span className="upgrade-label">{label}</span>
      {cost !== undefined ? (
        <span className="upgrade-cost" translate="no">
          {formatNumber(cost)}
        </span>
      ) : (
        <span className="upgrade-cost" />
      )}
      <span className="upgrade-chevron" aria-hidden="true">
        <CaretUp size={16} weight="bold" />
      </span>
    </button>
  );
}

export function SelectionPanel({
  snapshot,
  actions,
}: {
  snapshot: UiSnapshot;
  actions: HudCommands | null;
}) {
  const selected = snapshot.selectedTowers;
  const buildType = snapshot.selectedBuildType;
  const [confirmSell, setConfirmSell] = useState<string | null>(null);

  if (selected.length === 0) {
    if (!buildType) {
      return (
        <section className="selected-panel" aria-label="Scout">
          <p className="section-title">Selected</p>
          <div className="selected-name">
            <span>Scout</span>
            <span className="level-tag">Move</span>
          </div>
          <p className="selected-hint hint-fine">
            Drag the board to pan. Pick a tower in the Armory to build.
          </p>
          <p className="selected-hint hint-coarse">
            Drag to pan. Pinch or tap + / − to zoom. Pick a tower in the Armory to
            build.
          </p>
        </section>
      );
    }
    const buildMeta = ARMORY[buildType];
    return (
      <section className="selected-panel" aria-label="Selected">
        <p className="section-title">Selected</p>
        <UnitPortrait type={buildType} />
        <div className="selected-name">
          <span>{buildMeta.name}</span>
          <span className="level-tag">Place</span>
        </div>
        <p className="selected-hint hint-fine">
          Click empty ground to place. Drag empty ground to pan.
        </p>
        <p className="selected-hint hint-coarse">
          Drag to aim the ghost. Lift to place. Two fingers pan and pinch-zoom.
        </p>
      </section>
    );
  }

  if (selected.length === 1) {
    const tower = selected[0];
    const meta = ARMORY[tower.type];
    const nextLevel = tower.level + 1;
    const sellArmed = confirmSell === tower.id;
    return (
      <section className="selected-panel" aria-label="Selected">
        <p className="section-title">Selected</p>
        <UnitPortrait type={tower.type} />
        <div className="selected-name">
          <span>{meta.name}</span>
          <span className="level-tag">Level {tower.level}</span>
        </div>
        <p className="selected-hint hint-fine">
          Drag to relocate. Click empty ground to pan.
        </p>
        <p className="selected-hint hint-coarse">
          Drag to relocate. Drag empty ground to pan. Upgrade from the rack, not
          the tiny chevron.
        </p>
        <ul className="selected-stats">
          <li>
            <Crosshair size={13} weight="bold" aria-hidden="true" />
            Damage <strong translate="no">{tower.damage}</strong>
          </li>
          <li>
            <Diamond size={13} weight="bold" aria-hidden="true" />
            Range <strong translate="no">{tower.range}</strong>
          </li>
          <li>
            <Lightning size={13} weight="bold" aria-hidden="true" />
            Fire Rate <strong translate="no">{tower.fireRate.toFixed(2)}</strong>
          </li>
        </ul>
        <div className="upgrade-row">
          <UpgradeBar
            label={
              tower.canUpgrade
                ? `Upgrade Level ${nextLevel}`
                : tower.atMaxLevel
                  ? "Max Level"
                  : `Need ${formatNumber(tower.upgradeCost)}`
            }
            cost={tower.canUpgrade ? tower.upgradeCost : undefined}
            disabled={!tower.canUpgrade}
            onClick={() => actions?.upgradeTower(tower.id)}
          />
          <button
            type="button"
            className="action danger sell-btn"
            onClick={() => {
              if (!sellArmed) {
                setConfirmSell(tower.id);
                window.setTimeout(() => setConfirmSell(null), 2200);
                return;
              }
              setConfirmSell(null);
              actions?.sellTower(tower.id);
            }}
            aria-label={
              sellArmed
                ? `Confirm sell ${meta.name} for ${formatNumber(tower.refund)} gold`
                : `Sell ${meta.name} for ${formatNumber(tower.refund)} gold`
            }
          >
            {sellArmed ? "Confirm Sell" : `Sell ${formatNumber(tower.refund)}`}
          </button>
        </div>
      </section>
    );
  }

  const bulkCost = selected.reduce(
    (sum, t) => (t.canUpgrade ? sum + t.upgradeCost : sum),
    0,
  );
  const canUpgradeAny = selected.some((t) => t.canUpgrade);
  const totalRefund = selected.reduce((sum, t) => sum + t.refund, 0);
  const sellArmed = confirmSell === "all";

  return (
    <section className="selected-panel" aria-label="Multi selection">
      <p className="section-title">Selected</p>
      <div className="selected-name">
        <span>{selected.length} Towers</span>
        <span className="level-tag">Linked</span>
      </div>
      <ul className="multi-list">
        {selected.map((t) => (
          <li key={t.id}>
            {ARMORY[t.type].name} Lv.&nbsp;{t.level}
          </li>
        ))}
      </ul>
      <div className="upgrade-row">
        <UpgradeBar
          label="Upgrade All"
          cost={canUpgradeAny ? bulkCost : undefined}
          disabled={!canUpgradeAny}
          onClick={() => actions?.upgradeSelected()}
        />
        <button
          type="button"
          className="action danger sell-btn"
          onClick={() => {
            if (!sellArmed) {
              setConfirmSell("all");
              window.setTimeout(() => setConfirmSell(null), 2200);
              return;
            }
            setConfirmSell(null);
            actions?.sellSelected();
          }}
          aria-label={
            sellArmed
              ? `Confirm sell all selected towers for ${formatNumber(totalRefund)} gold`
              : `Sell all selected towers for ${formatNumber(totalRefund)} gold`
          }
        >
          {sellArmed ? "Confirm Sell All" : `Sell All ${formatNumber(totalRefund)}`}
        </button>
      </div>
    </section>
  );
}
