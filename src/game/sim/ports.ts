export type SoundName =
  | "shoot"
  | "hit"
  | "kill"
  | "build"
  | "upgrade"
  | "sell"
  | "wave"
  | "lose"
  | "life"
  | "clear";

/** Effect ports for a Watch. State changes stay on GameState. */
export interface WatchPorts {
  play(name: SoundName): void;
  notify(message: string): void;
}

export const silentPorts: WatchPorts = {
  play() {},
  notify() {},
};

export function createRecordingPorts(): {
  ports: WatchPorts;
  sounds: SoundName[];
  notes: string[];
} {
  const sounds: SoundName[] = [];
  const notes: string[] = [];
  return {
    sounds,
    notes,
    ports: {
      play(name) {
        sounds.push(name);
      },
      notify(message) {
        if (message) notes.push(message);
      },
    },
  };
}
