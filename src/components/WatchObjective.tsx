import { ARMORY } from "../game/config/armory";
import type { UiSnapshot } from "../game/types";
import { formatNumber } from "../game/utils/format";

export type ObjectiveMessage = {
  tone: "standard" | "success" | "danger";
  text: string;
};

export function objectiveMessage(
  snapshot: UiSnapshot,
): ObjectiveMessage | null {
  if (snapshot.gameOver || snapshot.campaignComplete) return null;

  const buildType = snapshot.selectedBuildType;
  if (buildType && !snapshot.canAffordBuild[buildType]) {
    const deficit = ARMORY[buildType].cost - snapshot.gold;
    return {
      tone: "danger",
      text: `Need ${formatNumber(deficit)} more Gold for ${ARMORY[buildType].name}.`,
    };
  }

  if (snapshot.placementFeedback.visible) {
    return snapshot.placementFeedback.ok
      ? {
          tone: "success",
          text: "Legal point. Click or lift to place the Tower.",
        }
      : {
          tone: "danger",
          text: snapshot.placementFeedback.reason,
        };
  }

  if (snapshot.phase === "paused") {
    return { tone: "standard", text: "Watch paused." };
  }

  if (snapshot.phase === "hold" && snapshot.towerCount === 0) {
    return {
      tone: "standard",
      text: "Defend the Citadel. Select a Tower, then place it beside the Road.",
    };
  }

  if (snapshot.phase === "inter-wave") {
    const bonus =
      snapshot.lastClearBonus > 0
        ? ` Clear bonus: ${formatNumber(snapshot.lastClearBonus)} Gold.`
        : "";
    return {
      tone: "success",
      text: `${snapshot.waveName} cleared.${bonus} Start Wave ${snapshot.wave + 1}.`,
    };
  }

  if (snapshot.phase === "hold") {
    return {
      tone: "success",
      text: `Tower ready. Start Wave 1${snapshot.nextWaveName ? ` · ${snapshot.nextWaveName}` : ""}.`,
    };
  }

  if (snapshot.lastEscape) {
    const noun = snapshot.lastEscape.livesCost === 1 ? "Life" : "Lives";
    return {
      tone: "danger",
      text: `Escape at Out spent ${snapshot.lastEscape.livesCost} ${noun}. ${snapshot.lastEscape.remainingLives} Lives remain.`,
    };
  }

  if (snapshot.wave === 1 && snapshot.kills > 0) {
    return {
      tone: "success",
      text: "Kill confirmed. Enemy kills pay Reward in Gold.",
    };
  }

  if (snapshot.enemiesLeftToSpawn > 0) {
    return {
      tone: "standard",
      text: `${snapshot.enemiesLeftToSpawn} arrivals remain at In.`,
    };
  }

  if (snapshot.waveActive) {
    return {
      tone: "standard",
      text: "No more arrivals. Clear the enemies still on the Road.",
    };
  }

  return null;
}

export function WatchObjective({ snapshot }: { snapshot: UiSnapshot }) {
  const message = objectiveMessage(snapshot);
  if (!message) return null;

  return (
    <section
      className={`watch-objective is-${message.tone}`}
      aria-label="Current objective"
      aria-live="polite"
      aria-atomic="true"
    >
      <p className="section-title">Current order</p>
      <p>{message.text}</p>
    </section>
  );
}
