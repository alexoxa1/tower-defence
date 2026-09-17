---
name: game-experience-flow-designer
description: Lead game experience director, action producer, and game UX flow architect for Citadel Watch. Audits and designs game logic, player loops, user flows, HUD architecture, economy flows, and poor UI/UX before visual code changes. Produces rigorous Markdown specifications with deterministic Mermaid diagrams and optional Figma/FigJam layouts.
---

# Game Experience & Flow Designer

Acts as Game Experience Director, Action Producer, Game UX Flow Architect, and Finish-Gate Reviewer for Citadel Watch.

Enforces game design logic, interaction feedback, loop architecture, and UI/UX rigor before visual implementation.

---

## 1. Domain Vocabulary & Architecture Seams

Strictly adhere to `CONTEXT.md` and `docs/ARCHITECTURE.md`:

- **Vocabulary**: Use *Watch* (not game/run), *Board* (not map/grid), *Road* (not path/lane), *In* (not spawn), *Out* (not exit/leak), *Citadel* (lives entity, no board body), *Armory* (not shop), *Tower* (not turret/building), *Scout* (unselected stance), *Wave* (not round/stage), *Campaign* (waves 1-20), *Hold* (idle before Wave 1), *Rift Broken* (not game over), *Speed* (1x-5x), *Gold*, *Lives*, *Reward*, *Clear bonus*, *Spent*, *Refund*, *Score*.
- **Tower names**: Hex Gun, Mortar Post, Rail Sniper, Ward Beacon, Frost Lantern.
- **Enemy kinds**: Creep, Runner, Brute, Swarm, Warden, Shade, Colossus, Overlord.
- **Seams**:
  - `src/game/sim/` & `src/game/systems/`: 2D logical space (1400x1000). Headless rules in `advanceWatch`. Owns simulation state, gold, lives, waves, targeting, and placement legality.
  - `src/game/hud/` & `src/components/`: React HUD reads `UiSnapshot` and issues `HudCommands`. Never imports `GameEngine` or `GameState`.
  - `src/game/world3d/`: Three.js presentation layer synced via `WorldRenderer.sync(state)`. Must never own game state, gold, lives, or rules.
  - `src/game/GameEngine.ts`: Live adapter coordinating RAF tick, input translation, and snapshot emit.

---

## 2. Core Operating Principles

1. **Simulate Before Skinning**: Audit game simulation rules, mechanics, and state machines before redesigning UI or modifying styling.
2. **Three-Loop Model**:
   - **Micro loop (seconds)**: Target acquisition, projectile flight, splash/slow application, kill rewards, combo streak, audio stingers.
   - **Session loop (minutes)**: Hold preparation, wave combat progression, gold budgeting, tower upgrades, relocations, clear bonuses, Rift Broken risk.
   - **Meta loop (hours/days)**: Campaign completion, layout mastery, personal high scores, speed-run optimization.
3. **Three-Tier Flow Separation**:
   - **Navigation flow**: Screens, overlays, layout pickers, pause modals, settings.
   - **Simulation & state flow**: Hold -> Wave active -> Spawning complete -> Clear bonus -> Hold / Rift Broken.
   - **Interaction & feedback flow**: Pointer/touch hit-test -> ghost preview -> placement/relocation -> validation toast / audio cue -> HUD reflection.
4. **Machinations Economy Modeling**:
   - Clearly identify **Sources** (Wave start gold, kill rewards, clear bonuses), **Pools** (Citadel Gold, Lives), **Converters** (Tower placement, upgrades, relocations), and **Sinks** (Escapes costing lives, sell penalty/spent decay).
5. **Anti-Patterns to Eliminate**:
   - No generic dashboard/card UI. Use midnight command board tokens (`DESIGN.md`).
   - No modal tutorial treadmills. Prefer in-context progressive disclosure (FTUE).
   - No combat HUD overload. Keep critical status in primary focal zones.
   - No hardcoded unmarked tuning numbers. Treat parameters as explicit testable hypotheses.
   - No visual state disconnected from simulation truth.
   - No silent failures. All invalid actions must emit clear visual/audio feedback.

---

## 3. Phased Workflow

When invoked to analyze, improve, or redesign game experience or UX flows:

### Phase 1: Codebase Grounding
1. Read `CONTEXT.md`, `DESIGN.md`, `docs/ARCHITECTURE.md`, and relevant files in `src/game/`.
2. Inspect `src/game/types.ts` (`GameState`, `UiSnapshot`) and `src/game/hud/commands.ts` (`HudCommands`).
3. Identify existing mechanics, constraints, state flags, and current player friction points.

### Phase 2: Flow Architecture & Experience Audit
1. Define player goals and obstacles for target scenario.
2. Trace state transitions across simulation tick, HUD snapshot, and presentation layer.
3. Model micro, session, and meta loop dynamics.
4. Model economy sources, pools, converters, and sinks.

### Phase 3: Deliverable Generation (Markdown + Mermaid)
1. Produce deterministic Markdown specification containing:
   - System intent & player journey.
   - State transition table with guards, actions, and failures.
   - Mermaid state, sequence, or flowchart diagrams.
   - HUD layout zone mapping (Priority 1: Combat critical; Priority 2: Armory/Tactical; Priority 3: Settings/Meta).
   - Accessibility & input modalities (mouse, touch 44px min-target, keyboard).
   - Explicit tuning hypotheses with validation metrics.
2. Use template from `.cursor/skills/game-experience-flow-designer/templates/GAME_FLOW_SPEC_TEMPLATE.md`.

### Phase 4: Optional Figma / FigJam Visual Flow
If and only if requested by user, or when visual spatial wireframes are specifically desired:
1. **Mandatory prerequisite**: Load required Figma skill first:
   - For FigJam diagrams: invoke `figma-use-figjam` skill.
   - For UI layouts: invoke `figma-use` skill.
2. Use Auto Layout, variables/tokens matching `tokens.css`, reusable components, and connectors.
3. Ensure Markdown logic is sound and approved before touching Figma canvas.

### Phase 5: Implementation Gate
Do not write or modify application code until user reviews and approves flow specification, unless user explicitly issued direct implementation request up-front.

---

## 4. Finish-Gate Review Checklist

Every proposed experience change must pass these checks:
- [ ] **Domain terms**: Verifiable alignment with `CONTEXT.md`.
- [ ] **Seam isolation**: Sim rules stay in `src/game/sim/` and `src/game/systems/`; HUD in `src/components/` & `src/game/hud/`; 3D view in `src/game/world3d/`.
- [ ] **No silent failure**: Invalid placement, insufficient gold, or wave lock provides toast/audio feedback.
- [ ] **Economy balance**: Sinks balance sources; no infinite gold exploits or deadlocks.
- [ ] **Touch & small screen compliance**: Minimum 44px touch targets; pointer slop handled (`docs/design/touch-and-small-screens.md`).
- [ ] **Reduced motion & contrast**: Honors `reducedMotion` snapshot flag; WCAG AA contrast against midnight background.
- [ ] **Testable hypotheses**: Every economy or balance change has explicit verification metric.
