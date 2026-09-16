import type { BoardHit } from "./boardHit";
import type { PointerOptions } from "./pointer";
import type { InteractionMode, Point } from "../types";

export const TAP_SLOP_MOUSE_PX = 4;
export const TAP_SLOP_PEN_PX = 10;
export const TAP_SLOP_TOUCH_PX = 16;

export function isCoarsePointer(pointerType: string | undefined): boolean {
  return pointerType === "touch" || pointerType === "pen";
}

export function tapSlopPx(pointerType: string | undefined): number {
  if (pointerType === "touch") return TAP_SLOP_TOUCH_PX;
  if (pointerType === "pen") return TAP_SLOP_PEN_PX;
  return TAP_SLOP_MOUSE_PX;
}

export function emptyGroundMode(args: {
  pointerType?: string;
  interactionMode: InteractionMode;
  button: number;
  altKey?: boolean;
  shiftKey?: boolean;
}): "pan-first" | "aim-place" {
  if (args.button === 1 || args.button === 2) return "pan-first";
  if (args.button === 0 && (args.altKey === true || args.shiftKey === true)) {
    return "pan-first";
  }
  if (isCoarsePointer(args.pointerType) && args.interactionMode === "build") {
    return "aim-place";
  }
  return "pan-first";
}

export function pinchZoomFactor(prevDistance: number, nextDistance: number): number {
  if (prevDistance <= 0 || nextDistance <= 0) return 1;
  return prevDistance / nextDistance;
}

export function movementExceedsSlop(dx: number, dy: number, slop: number): boolean {
  return Math.hypot(dx, dy) > slop;
}

export const LONG_PRESS_MS = 450;

export interface ScreenPointerHost {
  interactionMode(): InteractionMode;
  hit(clientX: number, clientY: number): BoardHit;
  toLogical(clientX: number, clientY: number): Point | null;
  pan(dxPx: number, dyPx: number): void;
  zoomByFactor(factor: number): void;
  upgradeTower(towerId: string): void;
  pointerDown(point: Point, options: PointerOptions): void;
  pointerMove(point: Point): void;
  pointerUp(point: Point): void;
  cancelDrag(): void;
  openQuickMenu(clientX: number, clientY: number): void;
  closeQuickMenu(): void;
}

type Session =
  | { kind: "idle" }
  | {
      kind: "pan";
      pointerId: number;
      x: number;
      y: number;
      button: number;
      moved: boolean;
      suppressClick: boolean;
      slop: number;
      pointerType?: string;
      ctrlKey: boolean;
      metaKey: boolean;
    }
  | { kind: "aim"; pointerId: number; pointerType?: string; skipPlace: boolean; originX: number; originY: number }
  | { kind: "board"; pointerId: number; originX: number; originY: number; pointerType?: string }
  | {
      kind: "pinch";
      idA: number;
      idB: number;
      distance: number;
      midX: number;
      midY: number;
    };

function boardOptions(options: PointerOptions | undefined): PointerOptions {
  return {
    button: options?.button ?? 0,
    ctrlKey: options?.ctrlKey ?? false,
    metaKey: options?.metaKey ?? false,
    altKey: options?.altKey,
    shiftKey: options?.shiftKey,
    pointerType: options?.pointerType,
    pointerId: options?.pointerId,
  };
}

export class ScreenPointerHub {
  private session: Session = { kind: "idle" };
  private pointers = new Map<number, { x: number; y: number }>();
  private longPressTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly host: ScreenPointerHost) {}

  isPanning(): boolean {
    if (this.session.kind === "pinch") return true;
    return (
      this.session.kind === "pan" &&
      (this.session.moved || this.session.suppressClick)
    );
  }

  handle(
    phase: "down" | "move" | "up",
    clientX: number,
    clientY: number,
    options?: PointerOptions,
  ): void {
    const pointerId = options?.pointerId ?? 1;
    if (phase === "down") this.onDown(clientX, clientY, pointerId, options);
    else if (phase === "move") this.onMove(clientX, clientY, pointerId);
    else this.onUp(clientX, clientY, pointerId);
  }

  private onDown(
    clientX: number,
    clientY: number,
    pointerId: number,
    options: PointerOptions | undefined,
  ): void {
    this.pointers.set(pointerId, { x: clientX, y: clientY });

    if (this.pointers.size >= 2) {
      this.clearLongPress();
      this.beginPinch();
      return;
    }

    const button = options?.button ?? 0;
    if (
      button === 1 ||
      button === 2 ||
      options?.altKey === true ||
      options?.shiftKey === true
    ) {
      this.startPan(pointerId, clientX, clientY, options, button);
      this.armLongPress(options?.pointerType);
      return;
    }

    if (button !== 0) return;

    const hit = this.normalizeHit(this.host.hit(clientX, clientY), options?.pointerType, clientX, clientY);

    if (hit.kind === "upgrade") {
      this.host.upgradeTower(hit.towerId);
      this.pointers.delete(pointerId);
      return;
    }

    if (hit.kind === "tower") {
      this.host.pointerDown(hit.point, boardOptions(options));
      this.session = {
        kind: "board",
        pointerId,
        originX: clientX,
        originY: clientY,
        pointerType: options?.pointerType,
      };
      this.armLongPress(options?.pointerType);
      return;
    }

    const mode = emptyGroundMode({
      pointerType: options?.pointerType,
      interactionMode: this.host.interactionMode(),
      button,
      altKey: options?.altKey,
      shiftKey: options?.shiftKey,
    });

    if (mode === "aim-place") {
      this.session = {
        kind: "aim",
        pointerId,
        pointerType: options?.pointerType,
        skipPlace: false,
        originX: clientX,
        originY: clientY,
      };
      const point =
        hit.kind === "ground" ? hit.point : this.host.toLogical(clientX, clientY);
      if (point) this.host.pointerMove(point);
      this.armLongPress(options?.pointerType);
      return;
    }

    this.startPan(pointerId, clientX, clientY, options, button);
    this.armLongPress(options?.pointerType);
  }

  private onMove(clientX: number, clientY: number, pointerId: number): void {
    if (this.pointers.has(pointerId)) {
      this.pointers.set(pointerId, { x: clientX, y: clientY });
    }

    if (this.session.kind === "pinch") {
      const a = this.pointers.get(this.session.idA);
      const b = this.pointers.get(this.session.idB);
      if (!a || !b) return;
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      const midX = (a.x + b.x) / 2;
      const midY = (a.y + b.y) / 2;
      const factor = pinchZoomFactor(this.session.distance, distance);
      if (factor !== 1) this.host.zoomByFactor(factor);
      this.host.pan(midX - this.session.midX, midY - this.session.midY);
      this.session = { ...this.session, distance, midX, midY };
      return;
    }

    if (this.session.kind === "pan" && this.session.pointerId === pointerId) {
      const dx = clientX - this.session.x;
      const dy = clientY - this.session.y;
      if (this.session.moved || this.session.suppressClick) {
        this.host.pan(dx, dy);
        this.session.x = clientX;
        this.session.y = clientY;
        this.session.moved = true;
        return;
      }
      if (movementExceedsSlop(dx, dy, this.session.slop)) {
        this.clearLongPress();
        this.host.closeQuickMenu();
        this.session.moved = true;
        this.host.pan(dx, dy);
        this.session.x = clientX;
        this.session.y = clientY;
      }
      return;
    }

    if (
      (this.session.kind === "aim" || this.session.kind === "board") &&
      this.session.pointerId === pointerId
    ) {
      if (this.longPressTimer !== null) {
        const slop = tapSlopPx(this.session.pointerType);
        if (
          movementExceedsSlop(
            clientX - this.session.originX,
            clientY - this.session.originY,
            slop,
          )
        ) {
          this.clearLongPress();
        }
      }
      const point = this.host.toLogical(clientX, clientY);
      if (point) this.host.pointerMove(point);
      else this.host.pointerMove({ x: -999, y: -999 });
      return;
    }

    if (this.session.kind === "idle") {
      const point = this.host.toLogical(clientX, clientY);
      this.host.pointerMove(point ?? { x: -999, y: -999 });
    }
  }

  private onUp(clientX: number, clientY: number, pointerId: number): void {
    this.pointers.delete(pointerId);
    this.clearLongPress();

    if (this.session.kind === "pinch") {
      if (this.pointers.size >= 2) {
        this.beginPinch();
        return;
      }
      if (this.pointers.size === 1) {
        const [id, pos] = [...this.pointers.entries()][0];
        this.session = {
          kind: "pan",
          pointerId: id,
          x: pos.x,
          y: pos.y,
          button: 0,
          moved: true,
          suppressClick: true,
          slop: TAP_SLOP_TOUCH_PX,
          ctrlKey: false,
          metaKey: false,
        };
        return;
      }
      this.session = { kind: "idle" };
      return;
    }

    if (this.session.kind === "pan" && this.session.pointerId === pointerId) {
      const session = this.session;
      this.session = { kind: "idle" };
      if (!session.moved && !session.suppressClick) {
        if (session.button === 2) {
          this.host.openQuickMenu(clientX, clientY);
          return;
        }
        this.dispatchTap(clientX, clientY, session);
      }
      return;
    }

    if (this.session.kind === "aim" && this.session.pointerId === pointerId) {
      const pointerType = this.session.pointerType;
      const skipPlace = this.session.skipPlace;
      this.session = { kind: "idle" };
      if (skipPlace) {
        this.host.pointerMove({ x: -999, y: -999 });
        return;
      }
      const point = this.resolvePoint(clientX, clientY);
      if (point) {
        this.host.pointerDown(point, {
          button: 0,
          ctrlKey: false,
          metaKey: false,
          pointerType,
        });
        this.host.pointerUp(point);
      }
      return;
    }

    if (this.session.kind === "board" && this.session.pointerId === pointerId) {
      this.session = { kind: "idle" };
      const point = this.resolvePoint(clientX, clientY);
      if (point) this.host.pointerUp(point);
    }
  }

  private startPan(
    pointerId: number,
    clientX: number,
    clientY: number,
    options: PointerOptions | undefined,
    button: number,
  ): void {
    this.session = {
      kind: "pan",
      pointerId,
      x: clientX,
      y: clientY,
      button,
      moved: false,
      suppressClick: false,
      slop: tapSlopPx(options?.pointerType),
      pointerType: options?.pointerType,
      ctrlKey: options?.ctrlKey ?? false,
      metaKey: options?.metaKey ?? false,
    };
  }

  private armLongPress(pointerType: string | undefined): void {
    this.clearLongPress();
    if (!isCoarsePointer(pointerType)) return;
    const sessionKind = this.session.kind;
    const pointerId =
      sessionKind === "pan" || sessionKind === "aim" || sessionKind === "board"
        ? this.session.pointerId
        : null;
    if (pointerId === null) return;
    this.longPressTimer = setTimeout(() => {
      this.longPressTimer = null;
      const pos = this.pointers.get(pointerId);
      if (!pos) return;
      if (this.session.kind === "idle" || this.session.kind === "pinch") return;
      this.host.openQuickMenu(pos.x, pos.y);
      if (this.session.kind === "pan") this.session.suppressClick = true;
      if (this.session.kind === "aim") this.session.skipPlace = true;
    }, LONG_PRESS_MS);
  }

  private clearLongPress(): void {
    if (this.longPressTimer === null) return;
    clearTimeout(this.longPressTimer);
    this.longPressTimer = null;
  }

  private beginPinch(): void {
    this.clearLongPress();
    this.host.closeQuickMenu();
    if (this.session.kind === "aim") {
      this.host.pointerMove({ x: -999, y: -999 });
    } else if (this.session.kind === "board") {
      this.host.cancelDrag();
    }
    const ids = [...this.pointers.keys()];
    const a = this.pointers.get(ids[0]);
    const b = this.pointers.get(ids[1]);
    if (!a || !b) return;
    this.session = {
      kind: "pinch",
      idA: ids[0],
      idB: ids[1],
      distance: Math.hypot(a.x - b.x, a.y - b.y),
      midX: (a.x + b.x) / 2,
      midY: (a.y + b.y) / 2,
    };
  }

  private dispatchTap(
    clientX: number,
    clientY: number,
    session: Extract<Session, { kind: "pan" }>,
  ): void {
    const hit = this.normalizeHit(
      this.host.hit(clientX, clientY),
      session.pointerType,
      clientX,
      clientY,
    );
    const options: PointerOptions = {
      button: session.button,
      ctrlKey: session.ctrlKey,
      metaKey: session.metaKey,
      pointerType: session.pointerType,
    };
    if (hit.kind === "upgrade") {
      this.host.upgradeTower(hit.towerId);
      return;
    }
    if (hit.kind === "tower") {
      this.host.pointerDown(hit.point, options);
      this.host.pointerUp(hit.point);
      return;
    }
    const point =
      hit.kind === "ground" ? hit.point : this.host.toLogical(clientX, clientY);
    if (!point) return;
    this.host.pointerDown(point, options);
    this.host.pointerUp(point);
  }

  private normalizeHit(
    hit: BoardHit,
    pointerType: string | undefined,
    clientX: number,
    clientY: number,
  ): BoardHit {
    if (!(isCoarsePointer(pointerType) && hit.kind === "upgrade")) return hit;
    const point = this.host.toLogical(clientX, clientY) ?? { x: 0, y: 0 };
    return { kind: "tower", towerId: hit.towerId, point };
  }

  private resolvePoint(clientX: number, clientY: number): Point | null {
    const hit = this.host.hit(clientX, clientY);
    if (hit.kind === "ground" || hit.kind === "tower") return hit.point;
    return this.host.toLogical(clientX, clientY);
  }
}
