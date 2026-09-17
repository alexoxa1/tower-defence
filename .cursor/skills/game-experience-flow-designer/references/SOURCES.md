# Primary Sources & Methodological References

This document records the foundational game design, UX architecture, systems modeling, and accessibility sources synthesized for the **Game Experience & Flow Designer** skill.

---

## 1. Game Design & Systems Dynamics

- **Mechanics, Dynamics, Aesthetics (MDA) Framework**:
  - *Citation*: Robin Hunicke, Marc LeBlanc, Robert Zubek (2004). *MDA: A Formal Approach to Game Design and Game Research*.
  - *Source*: [Northwestern University MDA Archive](https://users.cs.northwestern.edu/~hunicke/MDA.pdf)
  - *Application*: Enforces separation between designer-authored rules (Mechanics), real-time runtime behavior (Dynamics), and resultant player experience (Aesthetics). Ensures simulation changes are reasoned about before visual skinning.

- **Loops and Arcs in Game Design**:
  - *Citation*: Daniel Cook (2012). *Loops and Arcs*.
  - *Source*: [Lost Garden](https://lostgarden.com/2012/04/30/loops-and-arcs/)
  - *Application*: Establishes the three-tier temporal loop model: Micro loops (sub-second to seconds: targeting, audio/visual punch, combo chains), Session loops (minutes: wave planning, economy management, upgrade trade-offs), and Meta loops (hours: campaign mastery, layout optimization).

- **Machinations Framework for Game Economies**:
  - *Citation*: Joris Dormans (2008). *The Designer's Notebook: Machinations - A New Way to Design Game Mechanics*.
  - *Source*: [Game Developer / Designer's Notebook](https://www.gamedeveloper.com/design/the-designer-s-notebook-machinations-a-new-way-to-design-game-mechanics)
  - *Application*: Strict classification of economy elements into Sources, Pools, Converters, and Sinks to prevent inflation, death spirals, or soft-locks.

---

## 2. Agent Roles & Multi-Disciplinary Design Governance

- **Agency Agents Architecture & Specialized Personas**:
  - *Citation*: Mike Sitarzewski et al. (2024). *Agency Agents Framework*.
  - *Source*: [agency-agents-app repository](https://github.com/msitarzewski/agency-agents-app)
  - *Specialized Role Modules*:
    - [Game Designer Persona](https://github.com/msitarzewski/agency-agents/blob/main/game-development/game-designer.md): Responsible for rules, balance hypotheses, reward cadence, and systemic player motivation.
    - [UX Architect Persona](https://github.com/msitarzewski/agency-agents/blob/main/design/design-ux-architect.md): Responsible for state navigation, progressive disclosure, interaction matrices, and cognitive load management.
    - [UI Finish-Gate Reviewer Persona](https://github.com/msitarzewski/agency-agents/blob/main/design/design-ui-finish-gate-reviewer.md): Enforces ruthless pre-implementation quality gates, eliminating generic dashboard tropes, ungrounded numbers, and silent failures.
  - *Application*: Blended into a single autonomous skill workflow balancing systemic game balance with ergonomic UX execution.

---

## 3. Interaction Ergonomics & Accessibility

- **Game Accessibility Guidelines**:
  - *Citation*: The Game Accessibility Guidelines Collaborative (IGDA GA-SIG et al.).
  - *Source*: [Game Accessibility Guidelines - Basic](https://gameaccessibilityguidelines.com/basic/)
  - *Application*: Enforces non-visual audio/haptic cues for critical state changes, high-contrast HUD elements, colorblind-safe tower and enemy markers, and strict reduced-motion toggles.

- **Touch & Mobile Ergonomics**:
  - *Source*: Internal repository specification `docs/design/touch-and-small-screens.md`.
  - *Application*: Minimum 44px tap targets, disambiguation between camera pan and tower selection/relocation gestures, zero hover-dependent mechanics.
