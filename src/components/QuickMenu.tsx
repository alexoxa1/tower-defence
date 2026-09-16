import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import { ARMORY, ARMORY_ORDER } from "../game/config/armory";
import type { HudCommands } from "../game/hud/commands";
import type { UiSnapshot } from "../game/types";
import { formatNumber } from "../game/utils/format";

export function QuickMenu({
  snapshot,
  actions,
  hudHidden,
  onToggleHud,
  canvasRef,
}: {
  snapshot: UiSnapshot;
  actions: HudCommands | null;
  hudHidden: boolean;
  onToggleHud: () => void;
  canvasRef: RefObject<HTMLCanvasElement | null>;
}) {
  const menu = snapshot.quickMenu;
  const menuRef = useRef<HTMLDivElement>(null);
  const [confirmSell, setConfirmSell] = useState(false);
  const menuKey = menu
    ? `${menu.x},${menu.y},${menu.target.kind},${
        menu.target.kind === "tower"
          ? menu.target.towerId
          : `${menu.target.point.x},${menu.target.point.y}`
      }`
    : "";

  useEffect(() => {
    setConfirmSell(false);
  }, [menuKey]);

  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el || !menu) return;
    const pad = 12;
    const place = (x: number, y: number) => {
      const rect = el.getBoundingClientRect();
      let left = x;
      let top = y;
      if (left + rect.width > window.innerWidth - pad) {
        left = Math.max(pad, window.innerWidth - rect.width - pad);
      }
      if (top + rect.height > window.innerHeight - pad) {
        top = Math.max(pad, window.innerHeight - rect.height - pad);
      }
      if (left < pad) left = pad;
      if (top < pad) top = pad;
      el.style.left = `${left}px`;
      el.style.top = `${top}px`;
    };
    place(menu.x, menu.y);
    place(parseFloat(el.style.left) || menu.x, parseFloat(el.style.top) || menu.y);
    const first = el.querySelector<HTMLButtonElement>(
      '[role="menuitem"]:not([aria-disabled="true"]):not(:disabled)',
    );
    first?.focus();
  }, [menuKey]);

  useEffect(() => {
    if (!menu) return;
    return () => {
      canvasRef.current?.focus();
    };
  }, [menu, canvasRef]);

  if (!menu || !actions) return null;

  const close = () => {
    actions.closeQuickMenu();
    canvasRef.current?.focus();
  };

  const items = menuItems({
    snapshot,
    menu,
    hudHidden,
    confirmSell,
  });

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')];
    const enabled = buttons.filter((btn) => btn.getAttribute("aria-disabled") !== "true");
    const current = document.activeElement;
    const from = enabled.findIndex((btn) => btn === current);
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close();
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      event.stopPropagation();
      if (enabled.length === 0) return;
      const delta = event.key === "ArrowDown" ? 1 : -1;
      const next = from < 0 ? 0 : (from + delta + enabled.length) % enabled.length;
      enabled[next]?.focus();
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      event.stopPropagation();
      enabled[0]?.focus();
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      event.stopPropagation();
      enabled[enabled.length - 1]?.focus();
      return;
    }
    if (event.key === "Tab") {
      event.preventDefault();
      event.stopPropagation();
      close();
    }
  };

  return (
    <>
      <button
        type="button"
        className="quick-menu-backdrop"
        aria-label="Dismiss menu"
        onClick={close}
      />
      <div
        ref={menuRef}
        className="quick-menu"
        role="menu"
        aria-label="Board menu"
        tabIndex={-1}
        style={{ left: menu.x, top: menu.y }}
        onKeyDown={onKeyDown}
      >
        {items.map((item) =>
          item.kind === "sep" ? (
            <div key={item.id} className="quick-menu-sep" role="separator" />
          ) : (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              className={`quick-menu-item${item.danger ? " is-danger" : ""}`}
              aria-disabled={item.disabled ? "true" : undefined}
              disabled={item.disabled}
              onClick={() => {
                if (item.disabled) return;
                item.run({
                  actions,
                  close,
                  onToggleHud,
                  armSell: () => setConfirmSell(true),
                });
              }}
            >
              <span className="quick-menu-label">{item.label}</span>
              {item.detail ? (
                <span className="quick-menu-detail" translate="no">
                  {item.detail}
                </span>
              ) : (
                <span className="quick-menu-detail" />
              )}
            </button>
          ),
        )}
      </div>
    </>
  );
}

type MenuItem =
  | { kind: "sep"; id: string }
  | {
      kind: "item";
      id: string;
      label: string;
      detail?: string;
      disabled?: boolean;
      danger?: boolean;
      run: (ctx: {
        actions: HudCommands;
        close: () => void;
        onToggleHud: () => void;
        armSell: () => void;
      }) => void;
    };

function menuItems(args: {
  snapshot: UiSnapshot;
  menu: NonNullable<UiSnapshot["quickMenu"]>;
  hudHidden: boolean;
  confirmSell: boolean;
}): MenuItem[] {
  const { snapshot, menu, hudHidden, confirmSell } = args;
  if (menu.target.kind === "tower") {
    const tower = menu.target.tower;
    const linked = snapshot.selectedTowers.some((item) => item.id === tower.id);
    return [
      {
        kind: "item",
        id: "upgrade",
        label: tower.atMaxLevel ? "Max Level" : "Upgrade",
        detail: tower.atMaxLevel ? undefined : formatNumber(tower.upgradeCost),
        disabled: !tower.canUpgrade,
        run: ({ actions }) => actions.upgradeTower(tower.id),
      },
      {
        kind: "item",
        id: "sell",
        label: confirmSell ? "Confirm Sell" : "Sell",
        detail: formatNumber(tower.refund),
        danger: true,
        run: ({ actions, armSell }) => {
          if (!confirmSell) {
            armSell();
            return;
          }
          actions.sellTower(tower.id);
        },
      },
      { kind: "sep", id: "sep-tower" },
      {
        kind: "item",
        id: "link",
        label: linked ? "Unlink" : "Link",
        run: ({ actions }) => actions.toggleTowerLink(tower.id),
      },
      {
        kind: "item",
        id: "deselect",
        label: "Deselect",
        run: ({ actions }) => actions.clearSelection(),
      },
    ];
  }

  const point = menu.target.point;
  const buildItems: MenuItem[] = ARMORY_ORDER.map((type) => {
    const item = ARMORY[type];
    return {
      kind: "item" as const,
      id: `build-${type}`,
      label: `Build ${item.name}`,
      detail: formatNumber(item.cost),
      disabled: !snapshot.canAffordBuild[type],
      run: ({ actions }) => actions.buildTowerAt(type, point),
    };
  });
  return [
    ...buildItems,
    { kind: "sep", id: "sep-ground" },
    {
      kind: "item",
      id: "scout",
      label: "Scout",
      run: ({ actions }) => actions.selectBuildType(null),
    },
    {
      kind: "item",
      id: "reset",
      label: "Reset View",
      run: ({ actions }) => actions.resetView(),
    },
    {
      kind: "item",
      id: "hud",
      label: hudHidden ? "Show HUD" : "Hide HUD",
      run: ({ close, onToggleHud }) => {
        onToggleHud();
        close();
      },
    },
  ];
}
