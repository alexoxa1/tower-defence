# Citadel Watch — Google Stitch HUD prompt package

Paste-ready prompts for [Google Stitch](https://stitch.withgoogle.com/). One Stitch generation is one screen. This package describes a **new React HUD** over the existing Three.js board. Every control, stat, and term is grounded in current code. No invented Watch features.

---

## 1. How to use with Stitch

Stitch renders **one screen per prompt**. Choose **Web** or **Mobile** in the tool before you paste.

1. Create a Stitch project. Paste **§3 Master Brief** once as project / design-system context (if the field is short, paste **§4 Primary direction** instead).
2. For each screen below, set Web (1440×900 landscape) or Mobile (390×844 portrait), then paste that screen’s fenced prompt. **Do not** rely on Stitch remembering the Master Brief: every Screen Prompt repeats a 3–5 line style block and the exact copy for that state.
3. After a first pass, use **§7 Refinement** prompts as follow-ups on the selected screen.
4. Stitch may cap prompt length. Each Screen Prompt is written to land around **1,200–2,000 characters**. If a paste is truncated, keep the style block + layout zones + exact labels; drop the “not shown” list last.

Generate Web and Mobile as **separate** pastes even when the state is the same. Do not ask Stitch for a responsive spec inside one image.

---

## 2. Assumptions and scope

**In scope (new art direction only):** React HUD chrome, overlays, auth screens, and how those sit on phone portrait vs desktop landscape.

**Out of scope (do not redesign, do not invent):** Three.js board, Road, flora, tower meshes, ghost/range rings as simulation, gold/lives/Wave rules, Armory roster, keyboard bindings, placement legality.

**Screenshot vs this repo (do not silently pick):**

| Seen in attached screenshots | In current source |
| --- | --- |
| Full-height right “command rack”, glass midnight HUD | Yes — `ShopPanel` + `ControlsPanel` + `SelectionPanel` in `.ui-panel` (`App.tsx`, `app.css`) |
| Status chip `PAUSED` / `RESUME`, `NEXT` / `START WAVE 6` | Partial — `Header` paints one word (`HOLD` / `NEXT` / `WAVE` / `PAUSED` / `RIFT`); the verb is `aria-label` only |
| Top cluster Gold / Lives / wave name / Score | Yes — `StatsPanel` |
| Label **PRESSURE** `4 active · 0 in` | **No component.** Data exists: `UiSnapshot.enemiesCount` + `enemiesLeftToSpawn` |
| Right-rail **CURRENT ORDER** | **No component.** Phase is `Header` status + `paused` / `waveActive` / `canStartWave` |
| Phone: HUD collapsed, `SHOW HUD`, `SIGN OUT` bottom-right | Yes — `hudHidden` in `App.tsx`; compact sign-out in `auth.css` |

**Interpretation used here:** Pressure is HUD copy for those two counters, not a new sim rule. “Current order” is not a separate surface; phase lives on the primary status / Start Wave control. Combo (`UiSnapshot.combo`) stays board floating text (`combat.ts`); do not add a Combo widget. Escape feedback is also board floating text — `resolveEscape` never calls `notify`, so Stitch must not invent an Escape toast. Layout pick is Settings, not a pre-Watch map screen. Auth is email + password **sign-in only** (no sign-up UI). Pause has **no modal** — only the status control + toast `Paused.` Rift Broken is the only blocking Watch overlay besides Settings, How to play, and the board menu.

**Ghost and range rings** are drawn by `WorldRenderer` from `placementPreview`. Stitch still paints them on the board so the HUD composition is honest; the HUD must not own those rings.

---

## 3. Master Brief

### Product

Citadel Watch is a short arcade Watch: defend the citadel along one Road. Enemies walk from In to Out. Towers sit on open Board ground. The 3D isometric Board is always the hero. HUD is edge chrome. HUD must never cover the Road, In, or Out.

**Audience:** Short sessions. Desktop = mouse + keyboard. Phone = one-handed portrait, coarse pointer, thumb-zone primary action.

### Canonical vocabulary (use these words; never the avoid-list)

| Term | Meaning |
| --- | --- |
| **Watch** | One play from a fresh Board until Rift Broken or Reset. Not “game / run / match”. |
| **Board** | Playable ground around the Road. Not “map / grid / tile”. |
| **Road** | Fixed lane from In to Out. Not “path / lane / track”. |
| **In** | Portal at the start of the Road. Not “spawn / entrance”. |
| **Out** | Portal at the end of the Road. Not “exit / leak / base”. |
| **Citadel** | What the Watch defends. No body on the Board. Not “core / HQ”. |
| **Armory** | Catalog of tower types. Not “shop / store”. |
| **Tower** | Placed defense: type, Level, point. Not “turret / building”. |
| **Scout** | Stance with no tower type selected. Not “pan mode”. |
| **Hex Gun** | Fast, short-range tower. |
| **Mortar Post** | Splash tower. |
| **Rail Sniper** | Long-range tower; Slow on hit. |
| **Ward Beacon** | Support. Nearby towers gain Range. |
| **Frost Lantern** | Slow aura. Does not fire. |
| **Level** | Tower rank 1–10. Not “tier / star”. |
| **Enemy** | Hostile on the Road. Kinds: Creep, Runner, Brute, Swarm, Warden, Shade, Colossus, Overlord. |
| **Escape** | Enemy reaches Out alive. Spends one or more Lives (Colossus 2, Overlord 3). Not “leak”. |
| **Range** | Targeting distance. Not “radius / aura” as a noun for Range. |
| **Slow** | Timed speed penalty. Not “freeze / stun”. |
| **Splash** | Mortar Post blast. Not “AoE”. |
| **Gold** | Watch currency. Not “money / coins”. |
| **Lives** | Citadel endurance. Not “HP”. |
| **Reward** | Gold for a kill. |
| **Clear bonus** | Gold when a Wave has no enemies left and none left to arrive. |
| **Spent** | Gold in one tower (place + upgrades). |
| **Refund** | Gold returned on sell (portion of Spent). |
| **Score** | Points from kills, Combo, Clear bonuses. Not currency. Not “XP”. |
| **Wave** | Named assault. Not “round / stage”. |
| **Campaign** | First twenty named Waves. |
| **Hold** | Idle name before Wave 1. Not a pause. |
| **Layout** | Named Road plan. HUD shows the name, not waypoints. Not “map select”. |
| **Rift Broken** | Lost Watch; Lives reached zero. Not “game over / Fallen”. |
| **Speed** | How fast the Watch runs, 1x–5x. Not “timescale”. |
| **Pressure** | HUD-only: enemies on the Road + still to arrive. Not in `CONTEXT.md`; derived from `enemiesCount` and `enemiesLeftToSpawn`. |

Wave names (Campaign 1–20): Rift Drip, Split Pack, Ash Gnats, Iron Line, Warden Gate, Shade Drift, Bolt Choir, Basalt Guard, Rift Storm, Twin Colossi, Night Harvest, Siege March, Crimson Tide, Crown Guard, Overlord, Ember Choir, Glass Tide, Ash Crown, Night Fold, Rift Crown. After 20, names reuse with ` +N`.

Layouts: **Serpentine** (default), **Switchback**, **Oxbow**. Picking one starts a new Watch.

### What is on screen

Always: full-bleed 3D isometric Board (ash ground, ember Road, In / Out portals, flora). HUD is a thin **L-frame** on the edges. No full-height opaque sidebar. No centered stat island that sits on the Road.

### Information architecture

**Priority 1 — combat-critical (always visible unless HUD hidden)**

- Primary status control: `HOLD` + Start wave | `NEXT` + Start next wave | `WAVE` + Pause | `PAUSED` + Resume | `RIFT` (disabled).
- Gold, Lives (danger when ≤ 5), Wave name + `WW / 20`, Pressure `{n} on Road · {m} inbound`, Score.
- Toast (bottom-left, 1.6s): Wave start, Clear bonus, place/upgrade/sell, pause, mute, layout, reset. **Escape has no toast** — board floating text (`-1 life` / `-{n} lives`) plus Lives readout.

**Priority 2 — tactical**

- Armory: Scout + five towers with cost and blurb; selected / unaffordable states.
- Speed 1x 2x 3x 4x 5x.
- Selected plate: Scout hint, or Place hint, or one tower (Damage / Range / Fire Rate, Upgrade, Sell), or linked multi (`Upgrade All` / `Sell All`).
- Board ghost + Range ring when `interactionMode === "build"` or relocating (3D; Stitch still draws them).

**Priority 3 — meta**

- Hide/Show HUD (`H`).
- Settings: Mute / Unmute, Reduce Motion / Motion On, Road plan (Serpentine / Switchback / Oxbow) with confirm, Reset with confirm, Close.
- How to play dialog.
- Sign out (email on desktop; button only on compact).
- Board menu (right-click / long-press ~450ms).
- Zoom − / home / + (pinch and wheel also exist; `+`/`−` keys do **not**).

**Not a HUD widget:** Combo, kills (except Rift Broken), waypoints, projectile stats, aura numbers, starting-gold editor.

### Watch states (HUD)

| State | Snapshot flags | Player can |
| --- | --- | --- |
| Auth loading | (no snapshot) | Wait. Mark: `Citadel Watch`. |
| Sign-in | (no snapshot) | Email, password, `Enter the Watch`. |
| Config missing | (no snapshot) | Message only. Not a play screen. |
| Hold, Scout | `wave === 0`, `interactionMode === "scout"`, `canStartWave` | Pan, pick Armory, Start wave. |
| Hold/Next, build armed | `selectedBuildType` set, `interactionMode === "build"` | Aim ghost, place or pan. |
| Tower selected | `interactionMode === "tower"` | Relocate, upgrade, sell. |
| Linked multi | `interactionMode === "multi"` | Upgrade All, Sell All. |
| Wave live | `waveActive` | Pause, Speed, Armory, relocate. Cannot start another Wave. |
| Paused | `paused` | Resume, still use HUD. Sim frozen. |
| Rift Broken | `gameOver` | Modal: Score, Waves cleared, Kills, `New Watch`. |
| HUD hidden | React `hudHidden` | Status + Show HUD; phone also Sign out. Board still plays. |

### Interaction model (real)

**Mouse, Scout:** drag empty ground pans; tap under slop selects / deselects. Wheel zooms. Click empty ground does not place.

**Mouse, build:** click empty ground places; drag empty ground pans (pan-first). Ghost + Range follow hover.

**Touch, Scout:** one-finger drag pans; tap ≤16px slop still taps. Two fingers: pinch zoom, midpoint pan.

**Touch, build:** drag aims ghost; lift places. Camera does not steal that drag. Two fingers cancel a pending place.

**Tower:** tap selects. Relocate after travel past threshold (16 logical mouse, 48 coarse). Relocate costs **no Gold**. Upgrade chevron on the 3D tower is **mouse only**; touch upgrades from the selected plate.

**Long-press ~450ms** or right-click: board menu. **Ctrl/Cmd-click:** link/unlink towers.

**Keyboard** (`HudCommands.handleKeyDown` + `App` `H`): `Space` pause; `Esc` close menu or clear selection; `[` / `]` Speed; `U` upgrade selected; `M` mute; `Home` reset view; `WASD` / arrows pan 48px; `1` Hex Gun, `2` Mortar Post, `3` Rail Sniper, `4` Ward Beacon, `5` Frost Lantern; `V` or `0` Scout; `H` hide HUD. Inputs in text fields are ignored.

### Starting numbers (Hold)

Gold **500**. Lives **20**. Wave **0** (title **Hold**). Score **0**. Speed **1x**. Campaign **20**. Max Level **10**. Default Layout **Serpentine**.

### Armory (exact)

| Key | Name | Cost | Blurb | Swatch |
| --- | --- | --- | --- | --- |
| Scout | Scout | — | Drag to pan · No build (touch: Drag / pinch · No build) | muted hand |
| `basic` | Hex Gun | 100 | Fast fire · Short range | `#ff6a1a` |
| `cannon` | Mortar Post | 210 | Splash around the impact | `#2ee6c5` |
| `sniper` | Rail Sniper | 280 | Long range · Applies Slow | `#d8fff6` |
| `beacon` | Ward Beacon | 180 | Aura · Extra Range nearby | `#e8a54b` |
| `lantern` | Frost Lantern | 160 | Aura · Slows the Road | `#7dcea0` |

Unaffordable rows are disabled (not hidden). Example Hex Gun Level 1: Damage **18**, Range **130**, Fire Rate **1.85**. Upgrade Level 2 costs **78**. Sell Refund **65** (65% of Spent). Max Level label: `Max Level`. Too poor: `Need {upgradeCost}`.

### New art direction (primary)

See **§4**. Master Brief uses **Filament Plate**.

### Typography

- Display / status / section titles: **Big Shoulders Display** ExtraBold, uppercase, tracking 0.08–0.14em.
- Labels: **Barlow Condensed** Medium, uppercase, tracking 0.12em.
- Numbers (Gold, Lives, Score, costs, Speed): **Azeret Mono** 600, `tabular-nums`.
- Help / auth body: Barlow Condensed Regular, sentence case, 14–16px.
- No Inter. No Syne (current). No emoji chrome.

### Colour roles

| Role | Hex | Use |
| --- | --- | --- |
| Soot plate | `#16140f` @ 92% | HUD fill. **No blur.** |
| Parchment ink | `#f2ece0` | Primary text |
| Dust muted | `#9a9386` | Blurbs, inactive Speed |
| Filament | `#f0b429` | Gold, Start Wave, active Speed, focus ring |
| Filament ink | `#1a1404` | Text on filament |
| Danger | `#d4453a` | Lives ≤ 5, sell, Rift Broken, auth error |
| Slow / Frost | `#7dcea0` | Frost Lantern, Slow |
| Ward / Aura | `#e8a54b` | Ward Beacon |
| Hex Gun | `#ff6a1a` | Swatch only |
| Mortar | `#2ee6c5` | Swatch only |
| Rail | `#d8fff6` | Swatch only |
| Hairline | `#3d3930` | 1px rules |
| Board fog (behind HUD) | `#14151a` | Not a HUD fill |

Semantic colour **always** pairs with a glyph + text. Do not use colour alone.

### Motion

120ms opacity or 4px translate on toast, Speed, primary button. Ghost/range belong to the board. `reducedMotion` or `prefers-reduced-motion`: no transition, solid `#121212` plates, no sheen. No pulse on Pressure.

### Accessibility

WCAG AA contrast on soot. Focus: 2px filament ring, offset 2px. Touch targets **44×44px** on coarse pointers. Hover styles only for `(hover: hover) and (pointer: fine)`. Safe-area: `max(12px, env(safe-area-inset-*))`. Skip link `Skip to board`. `aria-live` on Gold, Lives, Wave, toast. Disabled Armory stays in tab order but `disabled`. Sell and Reset require a second confirm within 2.2s (`Confirm Sell`, `Confirm Reset`, `Confirm` on Layout).

### Responsive

| Breakpoint | Chrome |
| --- | --- |
| Phone portrait ≤ 480px | Board full viewport. Status + Show HUD top. Start Wave in **bottom-right thumb zone** (56px tall). Armory is a **bottom sheet** with 56px peek (Scout + selected name + cost). Stats as a single top hairline ruler, not four cards. Sign out bottom-left. Speed in the expanded sheet. Selected plate in the sheet, not a side column. |
| Compact (existing product rule: ≤720px wide **or** ≤540px tall) | Same stacking idea as phone: no 320px sidebar. Landscape phone must not keep a side rack. |
| Tablet | L-frame: stats top-right as a ruler; Armory a 200px **edge strip** (not full-height glass wall); Start Wave top-left. |
| Desktop ≥ 1024px (artboard 1440×900) | L-frame. Armory max **220px** translucent strip, right **or** left edge, **not** 320px opaque. Selected plate bottom-right, ~240×280, only when a tower is selected or Armory is armed. Speed as five ticks under Armory or on the bottom edge. Account: email + Sign out, top-center is allowed only as a **tiny** 28px chip — prefer top-right after Score. |

### Do not

- Generic dashboard, Bootstrap cards, Inter, purple glow, emoji, gradient-blob glassmorphism, heavy `backdrop-filter`.
- Full-height opaque side panels that eat the Board.
- Centered stat pills over the Road.
- Invent towers, Waves, stats, Combo HUD, chat, inventory, minimap, joystick, tilt-to-pan, sign-up, social, shop.
- Cover In, Out, or the Road with chrome.
- Use avoid-list words (map, shop, turret, game over, leak, spawn, HP, …).
- Copy the current Syne + orange-glass command board.

---

## 4. Art direction

### Primary — Filament Plate (use this)

The HUD is a **surveyor’s instrument** bolted to two corners of a living Board. Matte soot plates, 1px engraved hairlines, almost no radius (0–2px). Whitespace is the gap that keeps the Road visible. Every chip is a readout or a command; nothing is decoration.

- **Type:** Big Shoulders Display (titles/status) + Barlow Condensed (labels) + Azeret Mono (numbers). Tight tracking on titles; mono for Gold `500`, Lives `20`, Wave `05 / 20`, Score `14,802`.
- **Palette:** soot `#16140f`, parchment `#f2ece0`, filament `#f0b429`, danger `#d4453a`. Tower swatches keep Hex `#ff6a1a`, Mortar `#2ee6c5`, Rail `#d8fff6`, Ward `#e8a54b`, Frost `#7dcea0`.
- **Shape:** L-frame, not a card stack. Status is a **bezel**: small phase word over a large verb (`HOLD` / `Start wave`). Armory is a **type list** with 8px swatches, not product cards. Speed is five equal ticks, active = filament fill + dark ink.
- **Elevation:** none. Separation = hairline + 8% fill. No drop shadows larger than 12px at 30% black.
- **Icons:** 1.5px geometric stroke (eye, gear, question, minus, home, plus, diamond Gold, heart Lives). Never filled candy icons. Never icon-only for Gold/Lives/Pressure.
- **Mood:** arcade instrument, dusk field kit, not SaaS analytics.

### Alternative A — Paper Watch (A/B)

Warm **briefing sheet** over the dark Board. Plates are `#e8dfc8` at 94% opacity, ink `#1c1712`, filament becomes **stamp red** `#b42318` for Start Wave and danger, Gold is **olive** `#3f5c2a`. Type: **Fraunces** 700 for titles (optical size 48–72), **IBM Plex Sans** only for body if Fraunces is too soft — prefer **Source Serif 4** + **Azeret Mono**. Radius 0. Rules are 0.75px ink. Feels like a printed Watch order laid on the citadel. Risk: light plates must never wash out the Road; keep them on edges, 200px max.

### Alternative B — Harbor Radar (A/B)

Cool **radar console**. Ground `#0b1014`, ink `#d7e6ee`, accent **signal cyan** `#3dd6f5`, danger `#ff5a4a`, Gold `#f0c14b`. Type: **Oxanium** 700 titles + **Share Tech Mono** numbers. 1px cyan ticks along the top edge like a range scale. Armory rows sit on a 180px right strip with a vertical `ARMORY` spine. No scanline gimmick, no Matrix rain. Mood: harbor watch, not cyberpunk poster. Keep tower swatches unchanged so 3D bodies still match.

---

## 5. Screen Prompts

Each fenced block is one Stitch paste. Repeat the style block; do not assume memory of §3.

Shared style line (already inlined):

> Filament Plate. Soot `#16140f` 92%, no blur, no glass. Hairline 1px `#3d3930`. Radius 0–2px. Big Shoulders Display ExtraBold uppercase. Barlow Condensed labels. Azeret Mono tabular numbers. Ink `#f2ece0`, muted `#9a9386`, filament `#f0b429` on `#1a1404`, danger `#d4453a`. Board is the hero; HUD is edge chrome; never cover the Road, In, or Out. WCAG AA. 44px touch on mobile.

### 5.1 Sign-in — Web 1440×900

```
STYLE: Filament Plate HUD. Matte soot #16140f at 92% opacity, NO backdrop-blur, NO glassmorphism. Hairline 1px #3d3930. Corner radius 0–2px. Titles: Big Shoulders Display ExtraBold, uppercase, tracking 0.08em. Labels: Barlow Condensed Medium, uppercase, tracking 0.12em. Fields/numbers: Azeret Mono. Ink #f2ece0, muted #9a9386, filament gold #f0b429, filament ink #1a1404, danger #d4453a. WCAG AA contrast. Focus = 2px filament ring.

SCREEN: Citadel Watch email/password sign-in. Artboard Web 1440×900 landscape. Full-bleed still of the 3D isometric Board: cool ash ground, dark ember Road from labeled IN portal toward OUT, pines and crystals. Dim the Board 40%. No Watch HUD, no Gold, no Armory.

LAYOUT: Asymmetric left plate, width ~400px, top-aligned to 18% from left, vertically centered. Not a centered SaaS card. Kicker (filament, 10px, 0.22em): CITADEL WATCH. Title: WATCH ACCESS. Subtitle: Sign in to command the citadel.

FIELDS: label EMAIL + email input (autoComplete email). Label PASSWORD + password input (current-password). Idle, no error. Primary button full width, filament fill, dark ink, uppercase: ENTER THE WATCH.

NOT SHOWN: Sign up, OAuth, skip, Remember me, HUD chrome, Sign out, Armory, Gold, Lives.
```

### 5.2 Sign-in — Mobile 390×844

```
STYLE: Filament Plate instrument HUD for Citadel Watch. Matte soot #16140f at 92% opacity. NO backdrop-blur, NO glassmorphism, NO gradient blobs. Hairline 1px #3d3930. Radius 0-2px. Type: Big Shoulders Display ExtraBold uppercase titles; Barlow Condensed Medium uppercase labels; Azeret Mono 600 tabular numbers. Ink #f2ece0, muted #9a9386, filament #f0b429 on #1a1404, danger #d4453a. Tower swatches: Hex Gun #ff6a1a, Mortar Post #2ee6c5, Rail Sniper #d8fff6, Ward Beacon #e8a54b, Frost Lantern #7dcea0. 3D isometric ash Board is the hero. HUD is edge chrome only. Never cover the Road, IN, or OUT. WCAG AA. Focus 2px filament ring. Mobile targets 44px with safe-area insets.
VOCAB: Watch, Board, Road, In, Out, Citadel, Armory, Scout, Wave, Hold, Gold, Lives, Score, Speed, Pressure, Rift Broken. NEVER shop, turret, map, game over, leak, spawn, HP.
BANS: Inter, purple, emoji chrome, 320px opaque sidebar, centered stat pills on the Road, invented towers or stats.

SCREEN: Citadel Watch sign-in. Artboard Mobile 390×844 portrait. Top 42% is the isometric Board still (IN portal + ember Road). Bottom soot plate from ~44% to safe-area bottom, hairline on the top edge of the plate.

COPY: kicker CITADEL WATCH. Title WATCH ACCESS. Sub Sign in to command the citadel. EMAIL field. PASSWORD field. Error alert in a danger-outline plate: Invalid login credentials. Primary 44px button ENTER THE WATCH (or SIGNING IN… if submitting — this frame shows the error, button enabled).

NOT SHOWN: Sign up, Show HUD, Sign out, Armory, skipAuth, social login, centered floating card over a solid black void.
```

### 5.3 Auth splash — Web 1440×900

```
STYLE: Filament Plate instrument HUD for Citadel Watch. Matte soot #16140f at 92% opacity. NO backdrop-blur, NO glassmorphism, NO gradient blobs. Hairline 1px #3d3930. Radius 0-2px. Type: Big Shoulders Display ExtraBold uppercase titles; Barlow Condensed Medium uppercase labels; Azeret Mono 600 tabular numbers. Ink #f2ece0, muted #9a9386, filament #f0b429 on #1a1404, danger #d4453a. Tower swatches: Hex Gun #ff6a1a, Mortar Post #2ee6c5, Rail Sniper #d8fff6, Ward Beacon #e8a54b, Frost Lantern #7dcea0. 3D isometric ash Board is the hero. HUD is edge chrome only. Never cover the Road, IN, or OUT. WCAG AA. Focus 2px filament ring. Mobile targets 44px with safe-area insets.
VOCAB: Watch, Board, Road, In, Out, Citadel, Armory, Scout, Wave, Hold, Gold, Lives, Score, Speed, Pressure, Rift Broken. NEVER shop, turret, map, game over, leak, spawn, HP.
BANS: Inter, purple, emoji chrome, 320px opaque sidebar, centered stat pills on the Road, invented towers or stats.

SCREEN: Session loading before the Watch. Artboard 1440×900. Board fog #14151a only. Centered wordmark CITADEL WATCH, letter-spacing 0.28em, filament, no subtitle, no progress bar.

NOT SHOWN: form, HUD, Armory, spinner candy, logo mark other than the word.
```

### 5.4 In-Watch — Hold, Scout, idle — Web 1440×900

```
STYLE: Filament Plate. Soot #16140f 92%, no blur, no glass. Hairline 1px #3d3930. Radius 0–2px. Big Shoulders Display ExtraBold + Barlow Condensed + Azeret Mono tabular. Ink #f2ece0, muted #9a9386, filament #f0b429, danger #d4453a. 3D isometric Board fills the frame; HUD is an L-frame on edges. Never cover the Road. WCAG AA.

SCREEN: Citadel Watch, desktop 1440×900 landscape. State Hold. Scout (no tower type armed, nothing selected). Layout Serpentine. Fresh Watch numbers: Gold 500, Lives 20, wave title HOLD, 00 / 20, Pressure 0 on Road · 0 inbound, Score 0, Speed 1x.

BOARD: ash ground, ember Road IN→OUT labeled, flora, rocks. No ghost, no Range ring.

TOP-LEFT bezel: 11px HOLD over 28px START WAVE (filament outline). Under it a vertical 44×38 tool spine: Hide HUD, Settings, How to play, Zoom out, Reset view, Zoom in.

TOP-RIGHT hairline ruler (not centered pills): diamond Gold 500, heart Lives 20, HOLD 00 / 20, Pressure 0 on Road · 0 inbound, Score 0. Tiny account chip after Score: neo_user@example.com + SIGN OUT.

RIGHT edge strip max 220px, 92% soot, NOT a 320px opaque wall: section ARMORY. Scout selected, hand swatch, blurb Drag to pan · No build. Then Hex Gun 100 Fast fire · Short range swatch #ff6a1a; Mortar Post 210 Splash around the impact #2ee6c5; Rail Sniper 280 Long range · Applies Slow #d8fff6; Ward Beacon 180 Aura · Extra Range nearby #e8a54b; Frost Lantern 160 Aura · Slows the Road #7dcea0. SPEED ticks 1x (active filament) 2x 3x 4x 5x.

BOTTOM-RIGHT selected plate ~240px: title SELECTED, SCOUT, tag MOVE. Hint: Drag the board to pan. Pick a tower in the Armory to build.

NOT SHOWN: Upgrade, Sell, toast, modal, ghost, title CURRENT ORDER, glass sidebar, Combo meter.
```

### 5.5 In-Watch — Hold, Scout — Mobile 390×844

```
STYLE: Filament Plate instrument HUD for Citadel Watch. Matte soot #16140f at 92% opacity. NO backdrop-blur, NO glassmorphism, NO gradient blobs. Hairline 1px #3d3930. Radius 0-2px. Type: Big Shoulders Display ExtraBold uppercase titles; Barlow Condensed Medium uppercase labels; Azeret Mono 600 tabular numbers. Ink #f2ece0, muted #9a9386, filament #f0b429 on #1a1404, danger #d4453a. Tower swatches: Hex Gun #ff6a1a, Mortar Post #2ee6c5, Rail Sniper #d8fff6, Ward Beacon #e8a54b, Frost Lantern #7dcea0. 3D isometric ash Board is the hero. HUD is edge chrome only. Never cover the Road, IN, or OUT. WCAG AA. Focus 2px filament ring. Mobile targets 44px with safe-area insets.
VOCAB: Watch, Board, Road, In, Out, Citadel, Armory, Scout, Wave, Hold, Gold, Lives, Score, Speed, Pressure, Rift Broken. NEVER shop, turret, map, game over, leak, spawn, HP.
BANS: Inter, purple, emoji chrome, 320px opaque sidebar, centered stat pills on the Road, invented towers or stats.

SCREEN: Phone portrait 390×844. Hold. Scout. Gold 500, Lives 20, HOLD 00 / 20, Pressure 0 on Road · 0 inbound, Score 0.

BOARD full bleed, Road and IN visible.

TOP hairline ruler (one row, truncated ok): 500 · 20 · HOLD 00/20 · 0 on Road. TOP-LEFT bezel HOLD + START WAVE. TOP-RIGHT: Hide HUD, Settings only (zoom lives in sheet or as +/− if space).

BOTTOM-RIGHT thumb zone: 56px filament START WAVE. BOTTOM sheet peek 56px: ARMORY · Scout · No build. BOTTOM-LEFT: SIGN OUT, no email.

NOT SHOWN: full Armory list (peek only), Speed row, long Selected essay, 320px side panel, email, glass.
```

### 5.6 Armory armed, ghost + Range — Web 1440×900

```
STYLE: Filament Plate instrument HUD for Citadel Watch. Matte soot #16140f at 92% opacity. NO backdrop-blur, NO glassmorphism, NO gradient blobs. Hairline 1px #3d3930. Radius 0-2px. Type: Big Shoulders Display ExtraBold uppercase titles; Barlow Condensed Medium uppercase labels; Azeret Mono 600 tabular numbers. Ink #f2ece0, muted #9a9386, filament #f0b429 on #1a1404, danger #d4453a. Tower swatches: Hex Gun #ff6a1a, Mortar Post #2ee6c5, Rail Sniper #d8fff6, Ward Beacon #e8a54b, Frost Lantern #7dcea0. 3D isometric ash Board is the hero. HUD is edge chrome only. Never cover the Road, IN, or OUT. WCAG AA. Focus 2px filament ring. Mobile targets 44px with safe-area insets.
VOCAB: Watch, Board, Road, In, Out, Citadel, Armory, Scout, Wave, Hold, Gold, Lives, Score, Speed, Pressure, Rift Broken. NEVER shop, turret, map, game over, leak, spawn, HP.
BANS: Inter, purple, emoji chrome, 320px opaque sidebar, centered stat pills on the Road, invented towers or stats.

SCREEN: Desktop 1440×900. After Campaign Wave 5 cleared. canStartWave true. Hex Gun armed (interactionMode build). Gold 388, Lives 20, wave name Warden Gate, 05 / 20, Pressure 0 on Road · 0 inbound, Score 14,802, Speed 3x. All Armory costs affordable.

BOARD: orange Range ring + Hex Gun ghost on empty ground BESIDE the Road, not on it. IN visible.

TOP-LEFT: 11px NEXT over 28px START NEXT WAVE. Tool spine as in Hold.

RIGHT ARMORY 220px: Scout idle. Hex Gun 100 SELECTED (filament hairline). Mortar Post 210, Rail Sniper 280, Ward Beacon 180, Frost Lantern 160 with real blurbs.

BOTTOM-RIGHT selected plate: Hex Gun isometric portrait, HEX GUN, tag PLACE. Hint: Click empty ground to place. Drag empty ground to pan. No Damage/Range/Fire Rate yet (not placed).

NOT SHOWN: Upgrade, Sell, pause overlay, toast, CURRENT ORDER, full-height opaque rack.
```

### 5.7 Armory armed, ghost — Mobile 390×844

```
STYLE: Filament Plate instrument HUD for Citadel Watch. Matte soot #16140f at 92% opacity. NO backdrop-blur, NO glassmorphism, NO gradient blobs. Hairline 1px #3d3930. Radius 0-2px. Type: Big Shoulders Display ExtraBold uppercase titles; Barlow Condensed Medium uppercase labels; Azeret Mono 600 tabular numbers. Ink #f2ece0, muted #9a9386, filament #f0b429 on #1a1404, danger #d4453a. Tower swatches: Hex Gun #ff6a1a, Mortar Post #2ee6c5, Rail Sniper #d8fff6, Ward Beacon #e8a54b, Frost Lantern #7dcea0. 3D isometric ash Board is the hero. HUD is edge chrome only. Never cover the Road, IN, or OUT. WCAG AA. Focus 2px filament ring. Mobile targets 44px with safe-area insets.
VOCAB: Watch, Board, Road, In, Out, Citadel, Armory, Scout, Wave, Hold, Gold, Lives, Score, Speed, Pressure, Rift Broken. NEVER shop, turret, map, game over, leak, spawn, HP.
BANS: Inter, purple, emoji chrome, 320px opaque sidebar, centered stat pills on the Road, invented towers or stats.

SCREEN: Phone 390×844. Hex Gun armed. Ghost + Range ring on empty ground. Gold 388, Lives 20, NEXT, about to start Wave 6. Score 14,802. Speed 3x.

TOP: small NEXT, large START WAVE 6 (primary). Gear Settings. Optional Hide HUD.

BOTTOM SHEET expanded ~42% height, 56px drag handle, safe-area pad. ARMORY: Scout; Hex Gun 100 SELECTED Fast fire · Short range; Mortar Post 210; Rail Sniper 280; Ward Beacon 180; Frost Lantern 160. SPEED 1x 2x 3x(active) 4x 5x. Hint: Drag to aim the ghost. Lift to place. Two fingers pan and pinch-zoom.

Keep a 56px filament START WAVE 6 in the thumb zone, not lost inside sheet scroll.

NOT SHOWN: desktop sidebar, email, Upgrade/Sell, mouse-only copy.
```

### 5.8 Tower selected — Web 1440×900

```
STYLE: Filament Plate instrument HUD for Citadel Watch. Matte soot #16140f at 92% opacity. NO backdrop-blur, NO glassmorphism, NO gradient blobs. Hairline 1px #3d3930. Radius 0-2px. Type: Big Shoulders Display ExtraBold uppercase titles; Barlow Condensed Medium uppercase labels; Azeret Mono 600 tabular numbers. Ink #f2ece0, muted #9a9386, filament #f0b429 on #1a1404, danger #d4453a. Tower swatches: Hex Gun #ff6a1a, Mortar Post #2ee6c5, Rail Sniper #d8fff6, Ward Beacon #e8a54b, Frost Lantern #7dcea0. 3D isometric ash Board is the hero. HUD is edge chrome only. Never cover the Road, IN, or OUT. WCAG AA. Focus 2px filament ring. Mobile targets 44px with safe-area insets.
VOCAB: Watch, Board, Road, In, Out, Citadel, Armory, Scout, Wave, Hold, Gold, Lives, Score, Speed, Pressure, Rift Broken. NEVER shop, turret, map, game over, leak, spawn, HP.
BANS: Inter, purple, emoji chrome, 320px opaque sidebar, centered stat pills on the Road, invented towers or stats.

SCREEN: Desktop 1440×900. One Hex Gun selected on the Board, Level 1, interactionMode tower. Gold 388, Lives 20, Warden Gate 05 / 20, Pressure 0 on Road · 0 inbound. Score 14,802. Speed 3x. NEXT + START NEXT WAVE.

BOARD: Range ring around the selected Hex Gun. No place-ghost.

ARMORY: Scout not pressed. Hex Gun row not in Place mode.

BOTTOM-RIGHT selected plate: portrait, HEX GUN, LEVEL 1. Hint: Drag to relocate. Click empty ground to pan. Stats rows with glyphs: DAMAGE 18, RANGE 130, FIRE RATE 1.85. Primary UPGRADE LEVEL 2 with cost 78 and caret. Danger-outline SELL 65 (not yet Confirm Sell).

NOT SHOWN: Confirm Sell, multi list, modal, 3D upgrade chevron as the only upgrade control.
```

### 5.9 Tower selected — Mobile 390×844

```
STYLE: Filament Plate instrument HUD for Citadel Watch. Matte soot #16140f at 92% opacity. NO backdrop-blur, NO glassmorphism, NO gradient blobs. Hairline 1px #3d3930. Radius 0-2px. Type: Big Shoulders Display ExtraBold uppercase titles; Barlow Condensed Medium uppercase labels; Azeret Mono 600 tabular numbers. Ink #f2ece0, muted #9a9386, filament #f0b429 on #1a1404, danger #d4453a. Tower swatches: Hex Gun #ff6a1a, Mortar Post #2ee6c5, Rail Sniper #d8fff6, Ward Beacon #e8a54b, Frost Lantern #7dcea0. 3D isometric ash Board is the hero. HUD is edge chrome only. Never cover the Road, IN, or OUT. WCAG AA. Focus 2px filament ring. Mobile targets 44px with safe-area insets.
VOCAB: Watch, Board, Road, In, Out, Citadel, Armory, Scout, Wave, Hold, Gold, Lives, Score, Speed, Pressure, Rift Broken. NEVER shop, turret, map, game over, leak, spawn, HP.
BANS: Inter, purple, emoji chrome, 320px opaque sidebar, centered stat pills on the Road, invented towers or stats.

SCREEN: Phone 390×844. Hex Gun Level 1 selected. Range ring on Board. Gold 388 Lives 20.

TOP: NEXT + START WAVE 6, stats ruler, Hide HUD.

SHEET expanded: HEX GUN LEVEL 1. DAMAGE 18, RANGE 130, FIRE RATE 1.85. UPGRADE LEVEL 2 · 78 (44px). SELL 65 (44px). Hint: Drag to relocate. Drag empty ground to pan. Upgrade from the rack, not the tiny chevron.

NOT SHOWN: Confirm Sell, mouse-only chevron as sole upgrade, desktop 220px strip, email.
```

### 5.10 Wave live, Pressure, toast — Web 1440×900

```
STYLE: Filament Plate instrument HUD for Citadel Watch. Matte soot #16140f at 92% opacity. NO backdrop-blur, NO glassmorphism, NO gradient blobs. Hairline 1px #3d3930. Radius 0-2px. Type: Big Shoulders Display ExtraBold uppercase titles; Barlow Condensed Medium uppercase labels; Azeret Mono 600 tabular numbers. Ink #f2ece0, muted #9a9386, filament #f0b429 on #1a1404, danger #d4453a. Tower swatches: Hex Gun #ff6a1a, Mortar Post #2ee6c5, Rail Sniper #d8fff6, Ward Beacon #e8a54b, Frost Lantern #7dcea0. 3D isometric ash Board is the hero. HUD is edge chrome only. Never cover the Road, IN, or OUT. WCAG AA. Focus 2px filament ring. Mobile targets 44px with safe-area insets.
VOCAB: Watch, Board, Road, In, Out, Citadel, Armory, Scout, Wave, Hold, Gold, Lives, Score, Speed, Pressure, Rift Broken. NEVER shop, turret, map, game over, leak, spawn, HP.
BANS: Inter, purple, emoji chrome, 320px opaque sidebar, centered stat pills on the Road, invented towers or stats.

SCREEN: Desktop 1440×900. Wave live. waveActive true. canStartWave false. Name Warden Gate 05 / 20. Gold 388, Lives 19 (Escape just spent 1; not yet danger, danger only ≤5). Pressure 4 on Road · 0 inbound. Score 14,802. Speed 3x. Scout or a placed tower selected.

BOARD: four enemies walking the ember Road, towers firing. One Range ring. IN and OUT unobstructed. One enemy at OUT with floating text -1 life (Escape feedback; there is no Escape toast in code).

TOP-LEFT bezel: 11px WAVE over 28px PAUSE. Tools spine.

TOP-RIGHT ruler includes Pressure 4 on Road · 0 inbound and Lives 19.

BOTTOM-LEFT toast (one only, Wave start still fading): title RIFT STORM BREWING, body Warden Gate · Wave 5. Boss incoming. Do not invent an Escape toast.

RIGHT: Armory + SPEED 3x active. Start Wave control is Pause, not Start.

NOT SHOWN: Rift Broken modal, enabled Start Wave, pause dimmer, CURRENT ORDER, Combo HUD, glass sidebar.
```

### 5.11 Wave live + toast — Mobile 390×844

```
STYLE: Filament Plate instrument HUD for Citadel Watch. Matte soot #16140f at 92% opacity. NO backdrop-blur, NO glassmorphism, NO gradient blobs. Hairline 1px #3d3930. Radius 0-2px. Type: Big Shoulders Display ExtraBold uppercase titles; Barlow Condensed Medium uppercase labels; Azeret Mono 600 tabular numbers. Ink #f2ece0, muted #9a9386, filament #f0b429 on #1a1404, danger #d4453a. Tower swatches: Hex Gun #ff6a1a, Mortar Post #2ee6c5, Rail Sniper #d8fff6, Ward Beacon #e8a54b, Frost Lantern #7dcea0. 3D isometric ash Board is the hero. HUD is edge chrome only. Never cover the Road, IN, or OUT. WCAG AA. Focus 2px filament ring. Mobile targets 44px with safe-area insets.
VOCAB: Watch, Board, Road, In, Out, Citadel, Armory, Scout, Wave, Hold, Gold, Lives, Score, Speed, Pressure, Rift Broken. NEVER shop, turret, map, game over, leak, spawn, HP.
BANS: Inter, purple, emoji chrome, 320px opaque sidebar, centered stat pills on the Road, invented towers or stats.

SCREEN: Phone 390×844, HUD expanded. Wave live Warden Gate 05 / 20. Pressure 4 on Road · 0 inbound. Lives 19 after an Escape. Speed 3x. Board floating text -1 life at Out. Do not invent an Escape toast.

TOP-LEFT: WAVE + PAUSE (44px). Ruler shows Pressure. No Start Wave.

BOARD: enemies on Road. Sheet peek 56px ARMORY. Toast above peek: title RIFT STORM BREWING, body Warden Gate · Wave 5. Boss incoming. SIGN OUT must not cover the Road.

NOT SHOWN: Hold copy, Rift Broken, second toast, full-height rack, email.
```

### 5.12 Paused — Web 1440×900

```
STYLE: Filament Plate instrument HUD for Citadel Watch. Matte soot #16140f at 92% opacity. NO backdrop-blur, NO glassmorphism, NO gradient blobs. Hairline 1px #3d3930. Radius 0-2px. Type: Big Shoulders Display ExtraBold uppercase titles; Barlow Condensed Medium uppercase labels; Azeret Mono 600 tabular numbers. Ink #f2ece0, muted #9a9386, filament #f0b429 on #1a1404, danger #d4453a. Tower swatches: Hex Gun #ff6a1a, Mortar Post #2ee6c5, Rail Sniper #d8fff6, Ward Beacon #e8a54b, Frost Lantern #7dcea0. 3D isometric ash Board is the hero. HUD is edge chrome only. Never cover the Road, IN, or OUT. WCAG AA. Focus 2px filament ring. Mobile targets 44px with safe-area insets.
VOCAB: Watch, Board, Road, In, Out, Citadel, Armory, Scout, Wave, Hold, Gold, Lives, Score, Speed, Pressure, Rift Broken. NEVER shop, turret, map, game over, leak, spawn, HP.
BANS: Inter, purple, emoji chrome, 320px opaque sidebar, centered stat pills on the Road, invented towers or stats.

SCREEN: Desktop 1440×900. paused true, not gameOver. Hex Gun still selected. Gold 388, Lives 20, Warden Gate 05 / 20, Pressure 4 on Road · 0 inbound, Score 14,802, Speed 3x still shown.

TOP-LEFT bezel: 11px PAUSED over 28px RESUME (filament). Armory usable. SPEED visible.

BOTTOM-LEFT toast: title HOLD FAST, body Paused.

NO full-screen dimmer, NO center play glyph, NO pause modal.

NOT SHOWN: Rift Broken, Confirm Reset, Start Wave as the verb.
```

### 5.13 Paused — Mobile 390×844

```
STYLE: Filament Plate instrument HUD for Citadel Watch. Matte soot #16140f at 92% opacity. NO backdrop-blur, NO glassmorphism, NO gradient blobs. Hairline 1px #3d3930. Radius 0-2px. Type: Big Shoulders Display ExtraBold uppercase titles; Barlow Condensed Medium uppercase labels; Azeret Mono 600 tabular numbers. Ink #f2ece0, muted #9a9386, filament #f0b429 on #1a1404, danger #d4453a. Tower swatches: Hex Gun #ff6a1a, Mortar Post #2ee6c5, Rail Sniper #d8fff6, Ward Beacon #e8a54b, Frost Lantern #7dcea0. 3D isometric ash Board is the hero. HUD is edge chrome only. Never cover the Road, IN, or OUT. WCAG AA. Focus 2px filament ring. Mobile targets 44px with safe-area insets.
VOCAB: Watch, Board, Road, In, Out, Citadel, Armory, Scout, Wave, Hold, Gold, Lives, Score, Speed, Pressure, Rift Broken. NEVER shop, turret, map, game over, leak, spawn, HP.
BANS: Inter, purple, emoji chrome, 320px opaque sidebar, centered stat pills on the Road, invented towers or stats.

SCREEN: Phone 390×844. PAUSED / RESUME bezel top-left min 44px. Toast Paused. Sheet peek. SIGN OUT in a corner off the Road. Speed not required on this peek frame.

NOT SHOWN: pause modal, grey overlay, Start Wave, email, glass.
```

### 5.14 Rift Broken — Web 1440×900

```
STYLE: Filament Plate instrument HUD for Citadel Watch. Matte soot #16140f at 92% opacity. NO backdrop-blur, NO glassmorphism, NO gradient blobs. Hairline 1px #3d3930. Radius 0-2px. Type: Big Shoulders Display ExtraBold uppercase titles; Barlow Condensed Medium uppercase labels; Azeret Mono 600 tabular numbers. Ink #f2ece0, muted #9a9386, filament #f0b429 on #1a1404, danger #d4453a. Tower swatches: Hex Gun #ff6a1a, Mortar Post #2ee6c5, Rail Sniper #d8fff6, Ward Beacon #e8a54b, Frost Lantern #7dcea0. 3D isometric ash Board is the hero. HUD is edge chrome only. Never cover the Road, IN, or OUT. WCAG AA. Focus 2px filament ring. Mobile targets 44px with safe-area insets.
VOCAB: Watch, Board, Road, In, Out, Citadel, Armory, Scout, Wave, Hold, Gold, Lives, Score, Speed, Pressure, Rift Broken. NEVER shop, turret, map, game over, leak, spawn, HP.
BANS: Inter, purple, emoji chrome, 320px opaque sidebar, centered stat pills on the Road, invented towers or stats.

SCREEN: Desktop 1440×900. gameOver. Board visible behind at 30% dim. Status bezel RIFT disabled.

CENTER dialog ~520px, not full-bleed: title RIFT BROKEN. One line: Score 14,802 · Waves 4 · Kills 36 (Waves = max(0, wave−1); died during wave 5 → 4). Primary button NEW WATCH.

NOT SHOWN: Continue, ads, leaderboard, shop, HP, Game Over wording, extra buttons.
```

### 5.15 Rift Broken — Mobile 390×844

```
STYLE: Filament Plate instrument HUD for Citadel Watch. Matte soot #16140f at 92% opacity. NO backdrop-blur, NO glassmorphism, NO gradient blobs. Hairline 1px #3d3930. Radius 0-2px. Type: Big Shoulders Display ExtraBold uppercase titles; Barlow Condensed Medium uppercase labels; Azeret Mono 600 tabular numbers. Ink #f2ece0, muted #9a9386, filament #f0b429 on #1a1404, danger #d4453a. Tower swatches: Hex Gun #ff6a1a, Mortar Post #2ee6c5, Rail Sniper #d8fff6, Ward Beacon #e8a54b, Frost Lantern #7dcea0. 3D isometric ash Board is the hero. HUD is edge chrome only. Never cover the Road, IN, or OUT. WCAG AA. Focus 2px filament ring. Mobile targets 44px with safe-area insets.
VOCAB: Watch, Board, Road, In, Out, Citadel, Armory, Scout, Wave, Hold, Gold, Lives, Score, Speed, Pressure, Rift Broken. NEVER shop, turret, map, game over, leak, spawn, HP.
BANS: Inter, purple, emoji chrome, 320px opaque sidebar, centered stat pills on the Road, invented towers or stats.

SCREEN: Phone 390×844. Dialog width calc(100% − 32px). Title RIFT BROKEN. Score 14,802 · Waves 4 · Kills 36. NEW WATCH 44px. Board peeks around the plate.

NOT SHOWN: Sign out overlapping the button, Continue, shop, extra stats (Combo, Gold).
```

### 5.16 Phone — HUD collapsed 390×844

```
STYLE: Filament Plate instrument HUD for Citadel Watch. Matte soot #16140f at 92% opacity. NO backdrop-blur, NO glassmorphism, NO gradient blobs. Hairline 1px #3d3930. Radius 0-2px. Type: Big Shoulders Display ExtraBold uppercase titles; Barlow Condensed Medium uppercase labels; Azeret Mono 600 tabular numbers. Ink #f2ece0, muted #9a9386, filament #f0b429 on #1a1404, danger #d4453a. Tower swatches: Hex Gun #ff6a1a, Mortar Post #2ee6c5, Rail Sniper #d8fff6, Ward Beacon #e8a54b, Frost Lantern #7dcea0. 3D isometric ash Board is the hero. HUD is edge chrome only. Never cover the Road, IN, or OUT. WCAG AA. Focus 2px filament ring. Mobile targets 44px with safe-area insets.
VOCAB: Watch, Board, Road, In, Out, Citadel, Armory, Scout, Wave, Hold, Gold, Lives, Score, Speed, Pressure, Rift Broken. NEVER shop, turret, map, game over, leak, spawn, HP.
BANS: Inter, purple, emoji chrome, 320px opaque sidebar, centered stat pills on the Road, invented towers or stats.

SCREEN: Phone portrait, hudHidden true, canStartWave after Wave 5. TOP-LEFT: NEXT + START WAVE 6. Beside it SHOW HUD pill (eye-slash + Show HUD). BOTTOM-RIGHT: SIGN OUT 44px. No Armory, no Speed, no stats ruler, no email, no tool spine.

Road, IN, placed towers fully visible.

NOT SHOWN: Settings gear, zoom cluster, Selected plate, Armory peek, CURRENT ORDER.
```

### 5.17 Phone — HUD expanded, Armory sheet 390×844

```
STYLE: Filament Plate instrument HUD for Citadel Watch. Matte soot #16140f at 92% opacity. NO backdrop-blur, NO glassmorphism, NO gradient blobs. Hairline 1px #3d3930. Radius 0-2px. Type: Big Shoulders Display ExtraBold uppercase titles; Barlow Condensed Medium uppercase labels; Azeret Mono 600 tabular numbers. Ink #f2ece0, muted #9a9386, filament #f0b429 on #1a1404, danger #d4453a. Tower swatches: Hex Gun #ff6a1a, Mortar Post #2ee6c5, Rail Sniper #d8fff6, Ward Beacon #e8a54b, Frost Lantern #7dcea0. 3D isometric ash Board is the hero. HUD is edge chrome only. Never cover the Road, IN, or OUT. WCAG AA. Focus 2px filament ring. Mobile targets 44px with safe-area insets.
VOCAB: Watch, Board, Road, In, Out, Citadel, Armory, Scout, Wave, Hold, Gold, Lives, Score, Speed, Pressure, Rift Broken. NEVER shop, turret, map, game over, leak, spawn, HP.
BANS: Inter, purple, emoji chrome, 320px opaque sidebar, centered stat pills on the Road, invented towers or stats.

SCREEN: Phone 390×844 expanded. Hold or Next. Scout. Gold 500 Lives 20.

TOP: ruler + HOLD/NEXT control + Hide HUD + Settings in one wrap row.

BOTTOM SHEET 40–42% height, 56px peek handle: ARMORY Scout + Hex Gun 100 + Mortar Post 210 + Rail Sniper 280 + Ward Beacon 180 + Frost Lantern 160 with blurbs; SPEED 1x–5x; SELECTED Scout MOVE hint (coarse): Drag to pan. Pinch or tap + / − to zoom. Pick a tower in the Armory to build.

Persistent thumb START WAVE 56px, not inside scrolling sheet.

NOT SHOWN: 320px side rack, glass blur, desktop email, hover-only states.
```

### 5.18 Settings — Web 1440×900

```
STYLE: Filament Plate instrument HUD for Citadel Watch. Matte soot #16140f at 92% opacity. NO backdrop-blur, NO glassmorphism, NO gradient blobs. Hairline 1px #3d3930. Radius 0-2px. Type: Big Shoulders Display ExtraBold uppercase titles; Barlow Condensed Medium uppercase labels; Azeret Mono 600 tabular numbers. Ink #f2ece0, muted #9a9386, filament #f0b429 on #1a1404, danger #d4453a. Tower swatches: Hex Gun #ff6a1a, Mortar Post #2ee6c5, Rail Sniper #d8fff6, Ward Beacon #e8a54b, Frost Lantern #7dcea0. 3D isometric ash Board is the hero. HUD is edge chrome only. Never cover the Road, IN, or OUT. WCAG AA. Focus 2px filament ring. Mobile targets 44px with safe-area insets.
VOCAB: Watch, Board, Road, In, Out, Citadel, Armory, Scout, Wave, Hold, Gold, Lives, Score, Speed, Pressure, Rift Broken. NEVER shop, turret, map, game over, leak, spawn, HP.
BANS: Inter, purple, emoji chrome, 320px opaque sidebar, centered stat pills on the Road, invented towers or stats.

SCREEN: Desktop modal over the Board. Title SETTINGS. MUTE (speaker) or UNMUTE. REDUCE MOTION or MOTION ON. Label: Road plan. Starts a new Watch. Ticks: Serpentine (active), Switchback, Oxbow. Danger RESET. CLOSE. This frame idle — not Confirm / Confirm Reset.

NOT SHOWN: volume slider, quality, key rebind, waypoint preview, map thumbnail, extra Layouts.
```

### 5.19 How to play — Web 1440×900

```
STYLE: Filament Plate instrument HUD for Citadel Watch. Matte soot #16140f at 92% opacity. NO backdrop-blur, NO glassmorphism, NO gradient blobs. Hairline 1px #3d3930. Radius 0-2px. Type: Big Shoulders Display ExtraBold uppercase titles; Barlow Condensed Medium uppercase labels; Azeret Mono 600 tabular numbers. Ink #f2ece0, muted #9a9386, filament #f0b429 on #1a1404, danger #d4453a. Tower swatches: Hex Gun #ff6a1a, Mortar Post #2ee6c5, Rail Sniper #d8fff6, Ward Beacon #e8a54b, Frost Lantern #7dcea0. 3D isometric ash Board is the hero. HUD is edge chrome only. Never cover the Road, IN, or OUT. WCAG AA. Focus 2px filament ring. Mobile targets 44px with safe-area insets.
VOCAB: Watch, Board, Road, In, Out, Citadel, Armory, Scout, Wave, Hold, Gold, Lives, Score, Speed, Pressure, Rift Broken. NEVER shop, turret, map, game over, leak, spawn, HP.
BANS: Inter, purple, emoji chrome, 320px opaque sidebar, centered stat pills on the Road, invented towers or stats.

SCREEN: Modal HOW TO PLAY over Board. Exact facts: Place from the Armory. Mouse: click empty ground to place, drag empty ground to pan, scroll to zoom. Phone: drag to aim the ghost, lift to place, two fingers pan and pinch-zoom. Use + / − / home on the board if pinch is awkward. Tap a tower to select. Drag it to relocate. Upgrade and sell from the command rack. Pick Scout in the Armory to pan without placing. Keyboard: V Scout, 1 to 5 Armory, WASD pan, Home reset view, H hide HUD, Ctrl+click to link towers, right-click or long-press for the board menu, Speed [ ], mute M, pause Space, upgrade U, clear Esc. Button CLOSE.

NOT SHOWN: carousel tutorial, video, extra keys that do not exist.
```

### 5.20 Board menu — tower — Web 1440×900

```
STYLE: Filament Plate instrument HUD for Citadel Watch. Matte soot #16140f at 92% opacity. NO backdrop-blur, NO glassmorphism, NO gradient blobs. Hairline 1px #3d3930. Radius 0-2px. Type: Big Shoulders Display ExtraBold uppercase titles; Barlow Condensed Medium uppercase labels; Azeret Mono 600 tabular numbers. Ink #f2ece0, muted #9a9386, filament #f0b429 on #1a1404, danger #d4453a. Tower swatches: Hex Gun #ff6a1a, Mortar Post #2ee6c5, Rail Sniper #d8fff6, Ward Beacon #e8a54b, Frost Lantern #7dcea0. 3D isometric ash Board is the hero. HUD is edge chrome only. Never cover the Road, IN, or OUT. WCAG AA. Focus 2px filament ring. Mobile targets 44px with safe-area insets.
VOCAB: Watch, Board, Road, In, Out, Citadel, Armory, Scout, Wave, Hold, Gold, Lives, Score, Speed, Pressure, Rift Broken. NEVER shop, turret, map, game over, leak, spawn, HP.
BANS: Inter, purple, emoji chrome, 320px opaque sidebar, centered stat pills on the Road, invented towers or stats.

SCREEN: Desktop. Right-click / long-press menu anchored near a Hex Gun. Items: Upgrade · 78; Sell · 65 (danger); separator; Link; Deselect. Backdrop click dismisses. HUD + Board remain.

NOT SHOWN: Build Hex Gun list, Confirm Sell (unarmed), Max Level unless at Level 10.
```

### 5.21 Board menu — ground — Web 1440×900

```
STYLE: Filament Plate instrument HUD for Citadel Watch. Matte soot #16140f at 92% opacity. NO backdrop-blur, NO glassmorphism, NO gradient blobs. Hairline 1px #3d3930. Radius 0-2px. Type: Big Shoulders Display ExtraBold uppercase titles; Barlow Condensed Medium uppercase labels; Azeret Mono 600 tabular numbers. Ink #f2ece0, muted #9a9386, filament #f0b429 on #1a1404, danger #d4453a. Tower swatches: Hex Gun #ff6a1a, Mortar Post #2ee6c5, Rail Sniper #d8fff6, Ward Beacon #e8a54b, Frost Lantern #7dcea0. 3D isometric ash Board is the hero. HUD is edge chrome only. Never cover the Road, IN, or OUT. WCAG AA. Focus 2px filament ring. Mobile targets 44px with safe-area insets.
VOCAB: Watch, Board, Road, In, Out, Citadel, Armory, Scout, Wave, Hold, Gold, Lives, Score, Speed, Pressure, Rift Broken. NEVER shop, turret, map, game over, leak, spawn, HP.
BANS: Inter, purple, emoji chrome, 320px opaque sidebar, centered stat pills on the Road, invented towers or stats.

SCREEN: Desktop empty-ground menu. Gold example 100 so only Hex Gun is affordable. Items: Build Hex Gun · 100; Build Mortar Post · 210 (disabled); Build Rail Sniper · 280 (disabled); Build Ward Beacon · 180 (disabled); Build Frost Lantern · 160 (disabled); separator; Scout; Reset View; Hide HUD.

NOT SHOWN: Upgrade, Sell, Link.
```

### 5.22 Linked towers — Web 1440×900

```
STYLE: Filament Plate instrument HUD for Citadel Watch. Matte soot #16140f at 92% opacity. NO backdrop-blur, NO glassmorphism, NO gradient blobs. Hairline 1px #3d3930. Radius 0-2px. Type: Big Shoulders Display ExtraBold uppercase titles; Barlow Condensed Medium uppercase labels; Azeret Mono 600 tabular numbers. Ink #f2ece0, muted #9a9386, filament #f0b429 on #1a1404, danger #d4453a. Tower swatches: Hex Gun #ff6a1a, Mortar Post #2ee6c5, Rail Sniper #d8fff6, Ward Beacon #e8a54b, Frost Lantern #7dcea0. 3D isometric ash Board is the hero. HUD is edge chrome only. Never cover the Road, IN, or OUT. WCAG AA. Focus 2px filament ring. Mobile targets 44px with safe-area insets.
VOCAB: Watch, Board, Road, In, Out, Citadel, Armory, Scout, Wave, Hold, Gold, Lives, Score, Speed, Pressure, Rift Broken. NEVER shop, turret, map, game over, leak, spawn, HP.
BANS: Inter, purple, emoji chrome, 320px opaque sidebar, centered stat pills on the Road, invented towers or stats.

SCREEN: Desktop. interactionMode multi. Two linked towers. Selected plate: 2 TOWERS, tag LINKED. List Hex Gun Lv. 1 and Frost Lantern Lv. 1. UPGRADE ALL with summed upgradeCost of those that canUpgrade. SELL ALL with summed Refund. No single Damage/Range/Fire Rate block.

NOT SHOWN: unit portrait, Scout-only hint, Place tag.
```

Optional extra auth frames (skip unless needed): error already in 5.2; config-needed title CONFIGURATION NEEDED with `VITE_SUPABASE_URL` is a developer wall, not a play screen.

---

## 6. Component spec appendix

Map Stitch output 1:1 onto existing React adapters. Props come from `UiSnapshot` + `HudCommands` unless noted.

| Component | File | Props / states to skin |
| --- | --- | --- |
| Header | `src/components/Header.tsx` | Phase label `HOLD`/`NEXT`/`WAVE`/`PAUSED`/`RIFT`; action Start wave / Start next wave / Pause / Resume / Rift Broken (disabled). Tools: Hide/Show HUD, Settings, How to play, zoomOut, resetView, zoomIn. `hudHidden` shows Show HUD pill, hides tools. |
| Settings dialog | same | `muted`, `reducedMotion`, `layouts[]`, `layoutId`; confirm Layout; confirm Reset; `selectLayout`, `toggleMute`, `setReducedMotion`, `resetGame`. |
| How to play | same | Static copy in Header. Close. |
| StatsPanel | `src/components/StatsPanel.tsx` | `gold`, `lives` (+ `danger` if ≤5), `waveName`, `wave`/`campaignWaves` as `05 / 20`, `score`. **Add Pressure** from `enemiesCount` + `enemiesLeftToSpawn` (new chrome, same snapshot). |
| ShopPanel (Armory) | `src/components/ShopPanel.tsx` | Scout (`selectBuildType(null)`), `ARMORY_ORDER` rows, `canAffordBuild[type]`, selected when `interactionMode === "build"` && type match. Fine vs coarse blurbs. |
| ControlsPanel | `src/components/ControlsPanel.tsx` | `SPEED_OPTIONS` 1–5, `speed`, `setSpeed`. |
| SelectionPanel | `src/components/SelectionPanel.tsx` | Empty+Scout; empty+buildType Place; one `TowerSummary`; multi linked. Upgrade labels; sell confirm 2.2s. |
| Toast | `src/components/Toast.tsx` | `toast` string; title from `riftTitle()` heuristics. |
| GameOverOverlay | `src/components/GameOverOverlay.tsx` | `gameOver`; Score, Waves `max(0,wave-1)`, Kills; `resetGame` → New Watch. |
| QuickMenu | `src/components/QuickMenu.tsx` | Tower vs ground items as §5.20–5.21. |
| SignOutControl | `src/auth/SignOutControl.tsx` | Email + Sign out; compact hides email. |
| LoginScreen | `src/auth/LoginScreen.tsx` | Email, password, error, submitting “Signing in…”, “Enter the Watch”. |
| AuthGate splash / config | `src/auth/AuthGate.tsx` | Splash mark; config message. |
| GameCanvas | `src/components/GameCanvas.tsx` | Not chrome. Cursors: scout grab, build crosshair, pan grabbing. |
| App shell | `src/App.tsx` | `hudHidden`, skip link, command rack vs L-frame (layout change later). |

**Armory affordability:** enabled / selected / disabled-unaffordable. **Sell:** idle `Sell {refund}` → `Confirm Sell`. **Layout:** current pressed; armed `Confirm`. **Status:** cannot start when `!canStartWave` (Wave live or enemies remain) except Pause/Resume.

---

## 7. Refinement prompt snippets

Paste onto the selected Stitch screen:

1. Make the Armory a bottom sheet with a 56px peek; do not use a side column.
2. Increase contrast of the Gold counter to WCAG AA on soot; keep Azeret Mono tabular.
3. Show the reduced-motion variant: solid `#121212` plates, no sheen, no toast slide.
4. Pull all chrome off the Road; In and Out portals must be fully visible.
5. Status bezel: 11px phase word over 28px verb; filament outline, no glass.
6. Unaffordable Armory rows stay visible at 42% opacity, not removed.
7. Pressure format exactly `{n} on Road · {m} inbound` with a glyph plus text.
8. Thumb-zone: 56px filament START WAVE, bottom-right, above the sheet peek.
9. Replace drop shadows with 1px hairlines; radius 0.
10. Sell control uses danger outline, not a red fill brick; confirm state says CONFIRM SELL.
11. Hide the email on this mobile frame; keep SIGN OUT at 44px.
12. Linked selection: list names and Levels only; UPGRADE ALL + SELL ALL, no portrait.

---

## 8. Verification checklist

| Item | Source |
| --- | --- |
| Vocabulary | `CONTEXT.md` |
| HUD/3D/sim seams | `docs/ARCHITECTURE.md`, `AGENTS.md` |
| Touch / compact / skipAuth | `docs/design/touch-and-small-screens.md` |
| Relocate no Gold; Layout in Settings | `docs/design/watch-expansion.md`, ADR note in Header |
| `UiSnapshot` fields | `src/game/types.ts` `UiSnapshot` |
| Snapshot builder | `src/game/hud/snapshot.ts` `buildUiSnapshot` |
| Commands + `BoardInput` | `src/game/hud/commands.ts` `HudCommands` |
| Keyboard | `GameEngine.handleKeyDown`; `H` in `App.tsx` |
| Armory names/costs/blurbs | `src/game/config/armory.ts` `ARMORY`, `ARMORY_ORDER` |
| Base stats / Speed / start Gold Lives / max Level / Campaign | `src/game/constants.ts` |
| Hold initial state | `src/game/state/createInitialState.ts` |
| Upgrade cost / Refund 65% | `getUpgradeCost`, `towerToSummary` in `upgrade.ts` / `towerStats.ts` |
| Wave names, `getWaveTitle` | `src/game/config/waves.ts` |
| `canStartWave` / start toast / Clear bonus toast | `src/game/systems/waves.ts` |
| Layouts Serpentine Switchback Oxbow | `src/game/config/layouts.ts` |
| Place / pan / pinch / long-press | `screenPointer.ts`, `pointer.ts`, `preview.ts` |
| Place errors / `{name} built.` | `placement.ts` |
| Escape / Rift Broken | `combat.ts` `resolveEscape`, `breakRift` |
| Header status + dialogs | `Header.tsx` `statusLabel` `statusAction` |
| Stats | `StatsPanel.tsx` (Pressure **not** rendered today) |
| Armory UI | `ShopPanel.tsx` |
| Speed UI | `ControlsPanel.tsx` |
| Selected / multi | `SelectionPanel.tsx` |
| Toast titles | `Toast.tsx` `riftTitle` |
| Rift Broken overlay | `GameOverOverlay.tsx` |
| Board menu | `QuickMenu.tsx` `menuItems` |
| HUD hide | `App.tsx` `hudHidden` |
| Auth | `LoginScreen.tsx`, `AuthGate.tsx`, `SignOutControl.tsx` |
| Tokens (current, to leave) | `src/styles/tokens.css` Syne / IBM Plex Mono / glass |
| Compact CSS | `src/styles/app.css` `@media (max-width: 720px), (max-height: 540px)` |
| Combo not in HUD | `UiSnapshot.combo` vs no component usage |
| Escape has no toast | `combat.ts` `resolveEscape` — floating text only |
| CURRENT ORDER not in HUD | no symbol; screenshot-only |
| Ghost/range | `PlacementPreview` + `WorldRenderer` (not React) |

**Stitch must not add:** sign-up, joystick, minimap, Combo meter, inventory, extra towers, waypoint editor, “game over” wording, shop, HP bars on the HUD.
