// --- Component ---
"use client";

// Tool Wheel by Louis Studios.
// 220 more hand-made React components at https://studios.lou15.com/?ref=21st-code

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/shared/i18n/I18nProvider";
import "@/features/auth/styles/taskdoor-wheel.css";

/** One tool on the wheel. */
export interface ToolWheelItem {
  /** Name of the tool, read out to screen readers when it comes to the front. */
  label: string;
  /** Solid icon as SVG path data drawn in a 24 x 24 box (even-odd fill). Leave out for a plain dot. */
  path?: string;
}

export interface ToolWheelProps {
  /** Tools riding the wheel, in order. Nine or more keeps every visible slot unique. */
  items?: ToolWheelItem[];
  /** Controlled index of the tool resting in the bottom slot. Autoplay stops while this is set. */
  active?: number;
  /** Starting index when uncontrolled. */
  defaultActive?: number;
  /** Called with the new index whenever a tool settles into the bottom slot. */
  onActiveChange?: (index: number) => void;
  /** Step the wheel on its own when uncontrolled. */
  autoplay?: boolean;
  /** Pause the entire timeline, including the travelling signal. */
  paused?: boolean;
  /** Seconds between steps; the signal loops once per step. */
  interval?: number;
  /** Hold the wheel still while a mouse rests over it. */
  pauseOnHover?: boolean;
  /** Small caps label above the title, between two accent squares. Empty hides it. */
  eyebrow?: string;
  /** Serif headline. Empty hides it. */
  title?: string;
  /** Supporting line under the title. Empty hides it. */
  subtitle?: string;
  /** SVG path data for the hub mark, drawn in the `markViewBox` box. */
  markPath?: string;
  /** View box of `markPath` as "minX minY width height". */
  markViewBox?: string;
  /** Page background behind the section. */
  background?: string;
  /** Fill of the tool discs and the hub. */
  surface?: string;
  /** Subtle surface lighting and deeper shadows for the dark palette. */
  surfaceLighting?: boolean;
  /** Ink for icons, the headline and the eyebrow. */
  color?: string;
  /** Colour of the subtitle and the eyebrow brackets. */
  mutedColor?: string;
  /** Hub mark and eyebrow squares. */
  accent?: string;
  /** The travelling signal and the code glyphs around the bottom slot. */
  signal?: string;
  /** Hairlines: the wheel, the connector and the section frame. */
  lineColor?: string;
  /** Draw the hairline frame around the section. */
  frame?: boolean;
  /** Font stack for the headline. */
  font?: string;
  /** Font stack for the eyebrow and the subtitle. */
  uiFont?: string;
  /** Font stack for the code glyphs. */
  monoFont?: string;
  /** Class on the root element. */
  className?: string;
  /** Inline style merged onto the root element. */
  style?: React.CSSProperties;
}

const TASKDOOR_MARK = "M8 45.5V4.5A2.5 2.5 0 0 1 11.273 2.122L24.476 6.412A1.2 1.2 0 0 1 25.305 7.554V42.446A1.2 1.2 0 0 1 24.476 43.588L11.273 47.878A2.5 2.5 0 0 1 8 45.5Z";

const DEFAULT_ITEMS: ToolWheelItem[] = [
  { label: "文档", path: "M6 2.5h8.2l5.3 5.3V20a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 20V4A1.5 1.5 0 0 1 6 2.5Zm7.4 1.9v4.5h4.5ZM8 12.2V14h8v-1.8Zm0 3.9v1.8h5.6v-1.8Z" },
  { label: "讨论", path: "M4 4h16a1.5 1.5 0 0 1 1.5 1.5v10.4A1.5 1.5 0 0 1 20 17.4h-9.1L6.1 21.2v-3.8H4a1.5 1.5 0 0 1-1.5-1.5V5.5A1.5 1.5 0 0 1 4 4Zm3.9 5.4a1.45 1.45 0 1 0 0 2.9a1.45 1.45 0 1 0 0-2.9Zm4.1 0a1.45 1.45 0 1 0 0 2.9a1.45 1.45 0 1 0 0-2.9Zm4.1 0a1.45 1.45 0 1 0 0 2.9a1.45 1.45 0 1 0 0-2.9Z" },
  { label: "代码", path: "M12 1.5a10.5 10.5 0 1 0 0 21a10.5 10.5 0 1 0 0-21Zm-2.3 6.6 1.3 1.3L8.4 12l2.6 2.6-1.3 1.3L5.8 12Zm4.6 0L18.2 12l-3.9 3.9-1.3-1.3 2.6-2.6-2.6-2.6Z" },
  { label: "沟通", path: "M3.5 4.8h17A1.5 1.5 0 0 1 22 6.3v11.4a1.5 1.5 0 0 1-1.5 1.5h-17A1.5 1.5 0 0 1 2 17.7V6.3a1.5 1.5 0 0 1 1.5-1.5Zm.8 2.4v1.7l7.7 5 7.7-5V7.2L12 12.2Z" },
  { label: "AI 产出", path: "M12 1.5Q13.3 10.7 22.5 12Q13.3 13.3 12 22.5Q10.7 13.3 1.5 12Q10.7 10.7 12 1.5Z" },
  { label: "资料", path: "M7.2 19.5a5.1 5.1 0 0 1-.9-10.1A6.4 6.4 0 0 1 18.4 8.7a5.4 5.4 0 0 1-.9 10.8Z" },
  { label: "执行成果", path: "M13.6 1.5 4 13.6h6.6L9.4 22.5 20 9.7h-6.7Z" },
  { label: "计划", path: "M7 2h2.1v2h5.8V2H17v2h2.5A1.5 1.5 0 0 1 21 5.5v14a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19.5v-14A1.5 1.5 0 0 1 4.5 4H7Zm-2 7.2V19h14V9.2Zm2 2.2h3.2v3.2H7Z" },
  { label: "文件", path: "M3.5 4h6.1l2.1 2.6h8.8A1.5 1.5 0 0 1 22 8.1v10.4a1.5 1.5 0 0 1-1.5 1.5h-17A1.5 1.5 0 0 1 2 18.5v-13A1.5 1.5 0 0 1 3.5 4Z" },
];

// Geometry in design units: a 939 x 698 box (the measured section plus a margin).
const BOX_W = 939;
const BOX_H = 698;
const FR = { l: 24.5, r: 915.5, t: 13.5, b: 684.5 };
const CX = 469;
const RING_CY = 180;
const RING_R = 391;
const SLOT_DEG = 25.58;
const HUB_CY = 347;
const FOCUS_CY = 560.5;
const DISC_R = 36;
const BIG = 1.735;
const HUB_R = 62.5;
const HALO_R = 69.5;
const PULL = 10.5;
const ICON = 32;

// Timing measured from the reference at 30 fps.
const ROT_DUR = 14.53 / 30;
const ROT_LEAD = (66 - 50.93) / 30;
const SWITCH_AT = 0.518;
const SCALE_DUR = 9.5 / 30;
const COMET_LEN = 30;
const CHARS = "{}[]()<>/*@%&#:;+=01";

// Code glyph tracks around the bottom slot: angle, radius at frame 0, drift per frame, visibility per frame of a 66 frame step.
const TRACKS: [number, number, number, string][] = [
  [161.1, 64.72, 0.477, "000000000000001111111110111111111100000011111111111110010000000000"],
  [-152.9, 68.57, 0.305, "000000000000011111111111111110100011111111111111111111110000000000"],
  [62.5, 69.84, 0.387, "000000001000111111011011111111111111101111111011001110000000000000"],
  [10.2, 66.69, 0.281, "000000000000010110011110000001111111111111111111110000000000000000"],
  [-107.5, 64.17, 0.324, "000000000000000000000100010111111111111110001111111111101111110000"],
  [-56.8, 65.33, 0.334, "000000000000000000000001111111111111111111111111001111111111000000"],
  [114.4, 67.82, 0.097, "000000000000000000000000000000111111111101001111100000000000000000"],
];

type Tween = { from: number; to: number; start: number };

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const easeInOutQuad = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const mod = (a: number, n: number) => ((a % n) + n) % n;

export function ToolWheel({
  items = DEFAULT_ITEMS,
  active,
  defaultActive = 0,
  onActiveChange,
  autoplay = true,
  paused = false,
  interval = 2.2,
  pauseOnHover = true,
  eyebrow = "CONNECTIONS",
  title = "Every tool. One shared workspace.",
  subtitle = "Plug the apps your team already works in into one shared view. Less switching. More time on the work itself.",
  markPath = TASKDOOR_MARK,
  markViewBox = "8 2 28 46",
  background = "#fcfcfc",
  surface = "#ffffff",
  surfaceLighting = false,
  color = "#0a0a0a",
  mutedColor = "#4a4a4a",
  accent = "#e61207",
  signal = "#d0104a",
  lineColor = "#ebebeb",
  frame = true,
  font = 'Georgia, "Iowan Old Style", "Times New Roman", serif',
  uiFont = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Inter, Arial, sans-serif',
  monoFont = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
  className,
  style,
}: ToolWheelProps) {
  const rootRef = useRef(null as HTMLDivElement | null);
  const canvasRef = useRef(null as HTMLCanvasElement | null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [announce, setAnnounce] = useState("");
  const [focusRing, setFocusRing] = useState(false);
  const n = Math.max(1, items.length);
  const controlled = active !== undefined;
  const start = mod(Math.round(controlled ? (active as number) : defaultActive), n);

  const live = useRef({
    T: 0,
    last: -1,
    rot0: start,
    rot1: start,
    animStart: -1,
    animDur: ROT_DUR,
    nextStepAt: interval - ROT_LEAD,
    manualEnd: -10,
    shown: start,
    scales: new Map<number, Tween>([
      [start, { from: 0, to: 1, start: -0.25 }],
      [start - 1, { from: 1, to: 0, start: -0.25 }],
    ]),
    hover: false,
    onscreen: true,
    reduced: false,
  });

  const props = useRef({ items, n, autoplay, paused, interval, pauseOnHover, controlled, onActiveChange, focusRing });
  props.current = { items, n, autoplay, paused, interval, pauseOnHover, controlled, onActiveChange, focusRing };

  const paths = useMemo(() => {
    if (typeof Path2D === "undefined") return [] as (Path2D | null)[];
    return items.map((it) => (it.path ? new Path2D(it.path) : null));
  }, [items]);
  const mark = useMemo(() => (typeof Path2D === "undefined" || !markPath ? null : new Path2D(markPath)), [markPath]);
  const markBox = useMemo(() => markViewBox.split(/[\s,]+/).map(Number), [markViewBox]);

  const rotAt = (T: number) => {
    const L = live.current;
    if (L.animStart < 0 || T >= L.animStart + L.animDur) return L.rot1;
    if (T <= L.animStart) return L.rot0;
    return L.rot0 + (L.rot1 - L.rot0) * ((T - L.animStart) / L.animDur);
  };
  const scaleOf = (j: number, T: number) => {
    const L = live.current;
    const tw = L.scales.get(j);
    if (!tw) return 0;
    const d = L.reduced ? 0 : SCALE_DUR;
    const p = d <= 0 ? 1 : easeInOutQuad(clamp01((T - tw.start) / d));
    return tw.from + (tw.to - tw.from) * p;
  };

  const goTo = useCallback((target: number) => {
    const L = live.current;
    const { n: count } = props.current;
    const cur = L.rot1;
    let delta = mod(target - mod(cur, count), count);
    if (delta > count / 2) delta -= count;
    if (delta === 0) return;
    const now = L.T;
    const from = rotAt(now);
    L.rot0 = from;
    L.rot1 = cur + delta;
    L.animStart = now;
    L.animDur = L.reduced ? 0.0001 : ROT_DUR * Math.sqrt(Math.abs(L.rot1 - from));
    L.manualEnd = now + L.animDur;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Measure the heading block against its designed height.
  useEffect(() => {
    const el = textRef.current;
    if (!el || size.w === 0) return;
    const measure = () => {
      const k = Math.min(size.w / BOX_W, size.h / BOX_H);
      const extra = Math.max(0, el.offsetHeight - 131.3 * k - 1.5);
      setTextExtra((prev) => (Math.abs(prev - extra) > 0.5 ? extra : prev));
    };
    measure();
    document.fonts?.ready?.then(measure);
  }, [size.w, size.h, eyebrow, title, subtitle, font, uiFont]);

  // Controlled index.
  useEffect(() => {
    if (controlled) goTo(mod(Math.round(active as number), n));
  }, [active, controlled, n, goTo]);

  // Size.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // Reduced motion, visibility.
  useEffect(() => {
    const L = live.current;
    const mq = typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    const upd = () => (L.reduced = !!mq?.matches);
    upd();
    mq?.addEventListener?.("change", upd);
    let io: IntersectionObserver | null = null;
    if (rootRef.current && typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver((es) => (L.onscreen = es[es.length - 1].isIntersecting));
      io.observe(rootRef.current);
    }
    return () => {
      mq?.removeEventListener?.("change", upd);
      io?.disconnect();
    };
  }, []);

  const [textExtra, setTextExtra] = useState(0);
  const textRef = useRef(null as HTMLDivElement | null);
  const extraRef = useRef(0);
  extraRef.current = textExtra;
  // When text floors make the heading block taller than designed, the wheel moves down by the difference.
  const layout = (w: number, h: number) => {
    const k = Math.min(w / BOX_W, h / BOX_H);
    const dy = Math.min(extraRef.current, Math.max(0, h - BOX_H * k));
    return { k, ox: (w - BOX_W * k) / 2, oy: (h - BOX_H * k - dy) / 2, dy };
  };

  // Item centres for drawing and hit testing.
  const placeItems = (T: number) => {
    const rot = rotAt(T);
    const out: { j: number; x: number; y: number; s: number }[] = [];
    const lo = Math.floor(rot) - 6;
    const hi = Math.ceil(rot) + 6;
    for (let j = lo; j <= hi; j++) {
      const off = j - rot;
      if (Math.abs(off) > 5.6) continue;
      const deg = 90 + off * SLOT_DEG;
      const dd = Math.abs(deg - 90);
      const pull = PULL * Math.max(0, 1 - (dd / 12) * (dd / 12));
      const a = (deg * Math.PI) / 180;
      const r = RING_R - pull;
      out.push({ j, x: CX + r * Math.cos(a), y: RING_CY + r * Math.sin(a), s: 1 + (BIG - 1) * scaleOf(j, T) });
    }
    out.sort((p, q) => p.s - q.s);
    return out;
  };

  const colors = useRef({ background, surface, surfaceLighting, color, accent, signal, lineColor, monoFont, frame });
  colors.current = { background, surface, surfaceLighting, color, accent, signal, lineColor, monoFont, frame };

  // Render loop.
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv || size.w === 0 || size.h === 0) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    cv.width = Math.round(size.w * dpr);
    cv.height = Math.round(size.h * dpr);
    const { k, ox, oy, dy } = layout(size.w, size.h);
    const L = live.current;
    let raf = 0;

    const commitActive = (T: number) => {
      const rot = rotAt(T);
      const next = Math.floor(rot + (1 - SWITCH_AT));
      while (L.shown !== next) {
        const dir = next > L.shown ? 1 : -1;
        const to = L.shown + dir;
        const cross = dir > 0 ? to - (1 - SWITCH_AT) : L.shown - (1 - SWITCH_AT);
        let tc = T;
        if (L.animStart >= 0 && L.rot1 !== L.rot0) tc = L.animStart + L.animDur * ((cross - L.rot0) / (L.rot1 - L.rot0));
        if (!(tc <= T)) tc = T;
        const prev = L.shown;
        L.scales.set(prev, { from: scaleOf(prev, tc), to: 0, start: tc });
        L.scales.set(to, { from: scaleOf(to, tc), to: 1, start: tc });
        L.shown = to;
        const idx = mod(to, props.current.n);
        props.current.onActiveChange?.(idx);
        setAnnounce(`${props.current.items[idx]?.label ?? ""}, ${idx + 1} of ${props.current.n}`);
      }
      for (const [j, tw] of L.scales) if (tw.to === 0 && T - tw.start > SCALE_DUR + 0.05) L.scales.delete(j);
    };

    const draw = (T: number) => {
      const C = colors.current;
      const P = props.current;
      const X = (x: number) => ox + x * k;
      const Y = (y: number) => oy + dy + y * k;
      const textBottom = dy > 0 && textRef.current ? oy + 31 * k + textRef.current.offsetHeight + 6 : -1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size.w, size.h);

      if (C.frame) {
        ctx.fillStyle = C.lineColor;
        const lw = Math.max(1, k);
        ctx.fillRect(X(FR.l) - lw / 2, 0, lw, size.h);
        ctx.fillRect(X(FR.r) - lw / 2, 0, lw, size.h);
        ctx.fillRect(X(FR.l), oy + FR.t * k - lw / 2, (FR.r - FR.l) * k, lw);
        ctx.fillRect(X(FR.l), Y(FR.b) - lw / 2, (FR.r - FR.l) * k, lw);
      }

      ctx.save();
      ctx.beginPath();
      const clipTop = Math.max(oy + (FR.t + 0.5) * k, textBottom);
      ctx.rect(X(FR.l + 0.5), clipTop, (FR.r - FR.l - 1) * k, Y(FR.b - 0.5) - clipTop);
      ctx.clip();

      // Wheel and connector.
      ctx.strokeStyle = C.lineColor;
      ctx.lineWidth = Math.max(1, k);
      ctx.beginPath();
      ctx.arc(X(CX), Y(RING_CY), RING_R * k, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(X(CX), Y(HUB_CY + HALO_R));
      ctx.lineTo(X(CX), Y(FOCUS_CY - HALO_R));
      ctx.stroke();

      const halo = (cy: number) => {
        ctx.beginPath();
        ctx.arc(X(CX), Y(cy), HALO_R * k, 0, Math.PI * 2);
        ctx.fillStyle = C.background;
        ctx.fill();
        ctx.strokeStyle = C.lineColor;
        ctx.lineWidth = Math.max(1, k);
        ctx.stroke();
      };
      halo(HUB_CY);
      halo(FOCUS_CY);

      const disc = (x: number, y: number, r: number, s: number, hub = false) => {
        const lift = 1 + Math.max(0, s - 1) * 0.25;
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = C.surface;
        ctx.shadowColor = C.surfaceLighting ? "rgba(0, 0, 0, 0.34)" : "rgba(0, 0, 0, 0.03)";
        ctx.shadowBlur = (C.surfaceLighting ? 12 * lift : 6) * k * dpr;
        ctx.shadowOffsetY = (C.surfaceLighting ? 6 * lift : 3.5) * k * dpr;
        ctx.fill();
        ctx.shadowColor = C.surfaceLighting ? "rgba(0, 0, 0, 0.42)" : "rgba(0, 0, 0, 0.12)";
        ctx.shadowBlur = (C.surfaceLighting ? 3 : 2.4) * k * dpr;
        ctx.shadowOffsetY = (C.surfaceLighting ? 2 : 1.1) * k * dpr;
        ctx.fill();
        if (C.surfaceLighting) {
          ctx.shadowColor = "transparent";
          ctx.shadowBlur = 0;
          ctx.shadowOffsetY = 0;
          const face = ctx.createLinearGradient(x - r * 0.5, y - r, x + r * 0.5, y + r);
          face.addColorStop(0, hub ? "rgba(255, 255, 255, 0.08)" : "rgba(255, 255, 255, 0.055)");
          face.addColorStop(0.5, "rgba(255, 255, 255, 0.008)");
          face.addColorStop(1, "rgba(0, 0, 0, 0.08)");
          ctx.fillStyle = face;
          ctx.fill();
          const edge = ctx.createLinearGradient(x - r * 0.5, y - r, x + r * 0.5, y + r);
          edge.addColorStop(0, hub ? "rgba(255, 255, 255, 0.20)" : "rgba(255, 255, 255, 0.14)");
          edge.addColorStop(0.5, "rgba(255, 255, 255, 0.045)");
          edge.addColorStop(1, "rgba(0, 0, 0, 0.24)");
          ctx.strokeStyle = edge;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        ctx.restore();
      };

      // Tools.
      for (const it of placeItems(T)) {
        const x = X(it.x);
        const y = Y(it.y);
        const r = DISC_R * it.s * k;
        if (y + r * 1.4 < oy + FR.t * k) continue;
        disc(x, y, r, it.s);
        const p = paths[mod(it.j, P.n)];
        const sz = ICON * it.s * k;
        ctx.save();
        ctx.translate(x - sz / 2, y - sz / 2);
        ctx.scale(sz / 24, sz / 24);
        ctx.fillStyle = C.color;
        if (p) ctx.fill(p, "evenodd");
        else {
          ctx.beginPath();
          ctx.arc(12, 12, 4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // Hub.
      disc(X(CX), Y(HUB_CY), HUB_R * k, BIG, true);
      if (mark && markBox.length === 4) {
        const [mx, my, mw, mh] = markBox;
        const hgt = 58 * k;
        const sc = hgt / mh;
        ctx.save();
        ctx.translate(X(CX) - (mw * sc) / 2, Y(HUB_CY) - hgt / 2);
        ctx.scale(sc, sc);
        ctx.translate(-mx, -my);
        // Match the original brand artwork in the header in both themes.
        if (markViewBox === "8 2 28 46") {
          ctx.fillStyle = "#BFDCC9";
          ctx.beginPath();
          ctx.roundRect(mx, my, mw, mh, 2.5);
          ctx.fill();
          ctx.fillStyle = "#2F7D4F";
        } else {
          ctx.fillStyle = C.accent;
        }
        ctx.fill(mark);
        ctx.restore();
      }

      // The brief signal travels from the focused output into TaskDoor.
      if (!L.reduced) {
        const cycle = mod(T, P.interval);
        const cf = (cycle / P.interval) * 66;
        // Code glyphs.
        const fi = Math.floor(cf);
        ctx.fillStyle = C.signal;
        ctx.font = `400 ${Math.max(6, 10 * k)}px ${C.monoFont}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const stepNo = mod(Math.floor(T / P.interval), P.n);
        TRACKS.forEach(([ang, r0, dr, mask], ti) => {
          if (mask[fi] !== "1") return;
          const rr = r0 + dr * cf;
          const a = (ang * Math.PI) / 180;
          const h = Math.imul(ti + 1, 73856093) ^ Math.imul(Math.floor(cf / 3) + 1 + stepNo * 31, 19349663);
          const ch = CHARS[(h >>> 0) % CHARS.length];
          ctx.fillText(ch, X(CX + rr * Math.cos(a)), Y(FOCUS_CY + rr * Math.sin(a)));
        });
        // Signal travelling hub ring, connector, slot ring, connector.
        const LOOP = 2 * Math.PI * HALO_R;
        const SEG = FOCUS_CY - HALO_R - (HUB_CY + HALO_R);
        const TOTAL = 2 * LOOP + 2 * SEG;
        const at = (s: number): [number, number] => {
          s = mod(s, TOTAL);
          if (s < LOOP) {
            const th = Math.PI / 2 - s / HALO_R;
            return [CX + HALO_R * Math.cos(th), HUB_CY + HALO_R * Math.sin(th)];
          }
          s -= LOOP;
          if (s < SEG) return [CX, HUB_CY + HALO_R + s];
          s -= SEG;
          if (s < LOOP) {
            const th = -Math.PI / 2 + s / HALO_R;
            return [CX + HALO_R * Math.cos(th), FOCUS_CY + HALO_R * Math.sin(th)];
          }
          s -= LOOP;
          return [CX, FOCUS_CY - HALO_R - s];
        };
        const head = (cycle / P.interval) * TOTAL + 3;
        ctx.strokeStyle = C.signal;
        ctx.lineWidth = Math.max(0.8, 1.25 * k);
        ctx.lineCap = "round";
        const steps = 12;
        for (let i = 0; i < steps; i++) {
          const s0 = head - COMET_LEN + (COMET_LEN * i) / steps;
          const s1 = head - COMET_LEN + (COMET_LEN * (i + 1)) / steps;
          const u = (i + 0.5) / steps;
          ctx.globalAlpha = 0.9 * Math.min(1, Math.sin(Math.PI * Math.min(1, u * 1.15)) * 1.6);
          const [ax, ay] = at(s0);
          const [bx, by] = at((s0 + s1) / 2);
          const [cx2, cy2] = at(s1);
          ctx.beginPath();
          ctx.moveTo(X(ax), Y(ay));
          ctx.quadraticCurveTo(X(2 * bx - (ax + cx2) / 2), Y(2 * by - (ay + cy2) / 2), X(cx2), Y(cy2));
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      ctx.restore();

      if (P.focusRing) {
        ctx.beginPath();
        ctx.arc(X(CX), Y(FOCUS_CY), (HALO_R + 4) * k, 0, Math.PI * 2);
        ctx.strokeStyle = C.color;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    };

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const now = performance.now() / 1000;
      const visible = typeof document === "undefined" || document.visibilityState !== "hidden";
      if (L.last < 0) L.last = now;
      const dt = Math.min(0.1, Math.max(0, now - L.last));
      L.last = now;
      if (!visible || !L.onscreen) return;
      const P = props.current;
      if (!P.paused && !(P.pauseOnHover && L.hover) && !L.reduced) L.T += dt;
      const T = L.T;
      const held = (P.pauseOnHover && L.hover) || L.reduced || P.controlled || !P.autoplay;
      while (T >= L.nextStepAt) {
        const at = L.nextStepAt;
        L.nextStepAt += P.interval;
        const settled = L.animStart < 0 || at >= L.animStart + L.animDur;
        if (held || !settled || at - L.manualEnd < P.interval * 0.6) continue;
        L.rot0 = L.rot1;
        L.rot1 = L.rot1 + 1;
        L.animStart = at;
        L.animDur = ROT_DUR;
      }
      commitActive(T);
      draw(T);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.w, size.h, paths, mark, markBox, textExtra]);

  const hit = (e: React.PointerEvent | React.MouseEvent) => {
    const el = rootRef.current;
    if (!el) return null;
    const rc = el.getBoundingClientRect();
    const { k, ox, oy, dy } = layout(rc.width, rc.height);
    const px = (e.clientX - rc.left - ox) / k;
    const py = (e.clientY - rc.top - oy - dy) / k;
    if (py < FR.t) return null;
    let best: number | null = null;
    for (const it of placeItems(live.current.T)) {
      if (Math.hypot(px - it.x, py - it.y) <= DISC_R * it.s + 2) best = it.j;
    }
    return best;
  };

  const fontPx = (v: number, floor: number) => `${Math.max(floor, v * (layout(size.w || BOX_W, size.h || BOX_H).k)).toFixed(2)}px`;
  const { k, oy } = layout(size.w || BOX_W, size.h || BOX_H);
  const simpleCopy = !eyebrow && !title;

  return (
    <div
      ref={rootRef}
      className={className}
      tabIndex={0}
      role="group"
      aria-roledescription="tool wheel"
      aria-label={title || subtitle || "Tools"}
      onKeyDown={(e) => {
        const L = live.current;
        if (e.key === "ArrowRight" || e.key === "ArrowDown") {
          e.preventDefault();
          const t = mod(L.rot1 + 1, n);
          controlled ? onActiveChange?.(t) : goTo(t);
        } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
          e.preventDefault();
          const t = mod(L.rot1 - 1, n);
          controlled ? onActiveChange?.(t) : goTo(t);
        }
      }}
      onFocus={(e) => setFocusRing(e.currentTarget.matches(":focus-visible"))}
      onBlur={() => setFocusRing(false)}
      onPointerEnter={(e) => (live.current.hover = e.pointerType === "mouse")}
      onPointerLeave={(e) => {
        live.current.hover = false;
        (e.currentTarget as HTMLDivElement).style.cursor = "default";
      }}
      onPointerMove={(e) => {
        (e.currentTarget as HTMLDivElement).style.cursor = hit(e) !== null ? "pointer" : "default";
      }}
      onClick={(e) => {
        const j = hit(e);
        if (j === null) return;
        const idx = mod(j, n);
        controlled ? onActiveChange?.(idx) : goTo(idx);
      }}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: 360,
        overflow: "hidden",
        background,
        color,
        outline: "none",
        userSelect: "none",
        WebkitUserSelect: "none",
        WebkitTapHighlightColor: "transparent",
        ...style,
      }}
    >
      <canvas ref={canvasRef} aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />
      <div ref={textRef} style={{ position: "absolute", left: 16, right: 16, top: oy + (simpleCopy ? 96 : 31) * k, textAlign: "center", pointerEvents: "none" }}>
        {eyebrow ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: Math.max(16 * k, 13),
              fontFamily: uiFont,
              fontSize: fontPx(10.6, 11),
              fontWeight: 500,
              letterSpacing: "0.01em",
              lineHeight: 1,
              color,
            }}
          >
            <span style={{ color: mutedColor, fontWeight: 300 }}>[</span>
            <span style={{ width: Math.max(3, 4 * k), height: Math.max(3, 4 * k), background: accent, margin: `0 ${6 * k}px 0 ${7 * k}px` }} />
            <span>{eyebrow}</span>
            <span style={{ width: Math.max(3, 4 * k), height: Math.max(3, 4 * k), background: accent, margin: `0 ${7 * k}px 0 ${6 * k}px` }} />
            <span style={{ color: mutedColor, fontWeight: 300 }}>]</span>
          </div>
        ) : null}
        {title ? (
          <h2
            style={{
              margin: 0,
              marginTop: eyebrow ? 26.25 * k : 0,
              fontFamily: font,
              fontWeight: 400,
              fontSize: fontPx(37, 18),
              lineHeight: 1.1,
              letterSpacing: "0.004em",
              color,
              WebkitTextStroke: `${(0.12 * k).toFixed(2)}px ${color}`,
              textWrap: "balance",
              whiteSpace: "pre-line",
            } as React.CSSProperties}
          >
            {title}
          </h2>
        ) : null}
        {subtitle ? (
          <p
            style={{
              margin: "0 auto",
              marginTop: simpleCopy ? 0 : 7.35 * k,
              maxWidth: simpleCopy ? "min(100%, 480px)" : `${((440 * Math.max(11, 13 * k)) / 13).toFixed(1)}px`,
              fontFamily: uiFont,
              fontSize: fontPx(simpleCopy ? 21 : 13, simpleCopy ? 14 : 11),
              lineHeight: fontPx(simpleCopy ? 31 : 20.5, simpleCopy ? 22 : 15),
              whiteSpace: "pre-line",
              color: mutedColor,
            }}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
      <div aria-live="polite" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" }}>
        {announce}
      </div>
    </div>
  );
}

/** TaskDoor's auth story. The wheel geometry and timing are adapted from the
 * Tool Wheel component supplied by the user, by Louis Studios. */
export default function TaskDoorWheel() {
  const { locale } = useI18n();
  const zh = locale !== "en";
  const [editing, setEditing] = useState(false);
  const [dark, setDark] = useState(() => document.documentElement.dataset.theme === "dark");
  useEffect(() => {
    const syncTheme = () => setDark(document.documentElement.dataset.theme === "dark");
    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    syncTheme();
    const syncEditing = () => {
      const target = document.activeElement;
      setEditing(target instanceof HTMLElement && Boolean(target.closest(".onboarding-main")) && target.matches('input, textarea, select, [contenteditable="true"]'));
    };
    const onFocusOut = () => queueMicrotask(syncEditing);
    document.addEventListener("focusin", syncEditing);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      observer.disconnect();
      document.removeEventListener("focusin", syncEditing);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []);
  const items = useMemo(() => {
    const english = ["Documents", "Discussion", "Code", "Communication", "AI outputs", "Resources", "Deliverables", "Plans", "Files"];
    return DEFAULT_ITEMS.map((item, index) => ({ ...item, label: zh ? item.label : english[index] }));
  }, [zh]);
  return <div className="taskdoor-wheel">
    <ToolWheel
      className="taskdoor-wheel-graphic"
      items={items}
      defaultActive={8}
      autoplay
      paused={editing}
      interval={3.6}
      pauseOnHover={false}
      eyebrow=""
      title=""
      subtitle={zh ? "用你熟悉的 Agent 工作，\n与团队共享任务目标、进展与上下文。" : "Work with the agent you know.\nShare task goals, progress and context with your team."}
      background={dark ? "#1a1a1a" : "#fcfcfc"}
      surface={dark ? "#292929" : "#ffffff"}
      surfaceLighting={dark}
      color={dark ? "#ececec" : "#1a1a1a"}
      mutedColor={dark ? "#ababab" : "#686868"}
      accent={dark ? "#bdbdbd" : "#737373"}
      signal={dark ? "#bdbdbd" : "#737373"}
      lineColor={dark ? "#333333" : "#e8e8e8"}
      frame={false}
      font={'var(--ad-font-sans, -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif)'}
      style={{ minHeight: 0 }}
    />
  </div>;
}
