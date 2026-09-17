import { Diamond, Heart, Pulse, Skull, Waves } from "@phosphor-icons/react";
import type { UiSnapshot } from "../game/types";
import { formatNumber } from "../game/utils/format";

function formatWave(wave: number, campaignWaves: number): string {
  return `${String(Math.max(0, wave)).padStart(2, "0")} / ${String(campaignWaves).padStart(2, "0")}`;
}

export function StatsPanel({ snapshot }: { snapshot: UiSnapshot }) {
  const lowLives = snapshot.lives <= 5;
  const onRoad = snapshot.enemiesCount;
  const inbound = snapshot.enemiesLeftToSpawn;
  const pressureFull = `${onRoad} active · ${inbound} in`;
  const pressureCompact = inbound > 0 ? `${onRoad} active · ${inbound} in` : `${onRoad} active`;
  return (
    <section className="hud-tr" aria-label="Watch stats">
      <div className="stat" aria-label="Gold">
        <Diamond size={16} weight="bold" color="var(--filament)" aria-hidden="true" />
        <div>
          <span className="stat-label">Gold</span>
          <strong translate="no" aria-live="polite">
            {formatNumber(snapshot.gold)}
          </strong>
        </div>
      </div>
      <div
        className={`stat${lowLives ? " danger" : ""}`}
        aria-label={lowLives ? "Lives, critical" : "Lives"}
      >
        <Heart
          size={16}
          weight="bold"
          color={lowLives ? "var(--danger)" : "var(--muted)"}
          aria-hidden="true"
        />
        <div>
          <span className="stat-label">
            Lives{lowLives ? " · Critical" : ""}
          </span>
          <strong translate="no" aria-live="polite">
            {snapshot.lives}
          </strong>
        </div>
      </div>
      <div className="stat stat-wave" aria-label={snapshot.waveName}>
        <Waves size={16} weight="bold" color="var(--filament)" aria-hidden="true" />
        <div>
          <span className="stat-label">{snapshot.waveName}</span>
          <strong translate="no" aria-live="polite">
            {formatWave(snapshot.wave, snapshot.campaignWaves)}
          </strong>
        </div>
      </div>
      <div
        className="stat wave-pressure"
        aria-label={`${snapshot.enemiesCount} enemies active, ${snapshot.enemiesLeftToSpawn} arrivals remaining`}
      >
        <Pulse size={16} weight="bold" color="var(--slow)" aria-hidden="true" />
        <div>
          <span className="stat-label">Pressure</span>
          <strong translate="no" aria-live="polite">
            <span className="pressure-full">{pressureFull}</span>
            <span className="pressure-compact">{pressureCompact}</span>
          </strong>
        </div>
      </div>
      <div className="stat stat-score" aria-label="Score">
        <Skull size={16} weight="bold" color="var(--filament)" aria-hidden="true" />
        <div>
          <span className="stat-label">Score</span>
          <strong translate="no">{formatNumber(snapshot.score)}</strong>
        </div>
      </div>
    </section>
  );
}
