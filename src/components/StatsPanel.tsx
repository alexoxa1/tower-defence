import { Diamond, Heart, Skull, Waves } from "@phosphor-icons/react";
import type { UiSnapshot } from "../game/types";
import { formatNumber } from "../game/utils/format";

function formatWave(wave: number, campaignWaves: number): string {
  return `${String(Math.max(0, wave)).padStart(2, "0")} / ${String(campaignWaves).padStart(2, "0")}`;
}

export function StatsPanel({ snapshot }: { snapshot: UiSnapshot }) {
  const lowLives = snapshot.lives <= 5;
  return (
    <section className="hud-tr" aria-label="Watch stats">
      <div className="stat">
        <Diamond size={16} weight="bold" color="var(--accent)" aria-hidden="true" />
        <div>
          <span className="stat-label">Gold</span>
          <strong translate="no" aria-live="polite">
            {formatNumber(snapshot.gold)}
          </strong>
        </div>
      </div>
      <div className={`stat${lowLives ? " danger" : ""}`}>
        <Heart size={16} weight="fill" color="var(--teal)" aria-hidden="true" />
        <div>
          <span className="stat-label">Lives</span>
          <strong translate="no" aria-live="polite">
            {snapshot.lives}
          </strong>
        </div>
      </div>
      <div className="stat">
        <Waves size={16} weight="bold" color="var(--accent)" aria-hidden="true" />
        <div>
          <span className="stat-label">{snapshot.waveName}</span>
          <strong translate="no" aria-live="polite">
            {formatWave(snapshot.wave, snapshot.campaignWaves)}
          </strong>
        </div>
      </div>
      <div className="stat">
        <Skull size={16} weight="bold" color="var(--accent)" aria-hidden="true" />
        <div>
          <span className="stat-label">Score</span>
          <strong translate="no">{formatNumber(snapshot.score)}</strong>
        </div>
      </div>
    </section>
  );
}
