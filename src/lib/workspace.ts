import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Trading-terminal workspace state.
 *
 * The console is a full-screen professional trading workspace: a dominant
 * chart with an optional left drawing rail, right AI analysis sidebar and a
 * resizable bottom workspace. Every panel can be toggled independently so the
 * chart can claim the entire viewport when everything else is closed.
 *
 * Preferences persist to localStorage under `cryptolytic_workspace` (the
 * persist middleware skips storage during SSR automatically).
 */

export type BottomTab =
  "screener" | "performance" | "technicals" | "indicators" | "strategy" | "trading";

export type WorkspaceState = {
  /** Right AI analysis sidebar. */
  rightPanel: boolean;
  /** Bottom workspace (screener / performance / technicals / …). */
  bottomPanel: boolean;
  /** Left vertical drawing toolbar. */
  leftToolbar: boolean;
  /** In-app "focus chart" — hides the top nav + market ticker. */
  focusMode: boolean;
  /** Active bottom workspace tab. */
  bottomTab: BottomTab;
  /** Bottom workspace height in px (drag-resized). */
  bottomPanelHeight: number;
  /** Right sidebar width in px. */
  rightPanelWidth: number;

  setRightPanel: (v: boolean) => void;
  setBottomPanel: (v: boolean) => void;
  setLeftToolbar: (v: boolean) => void;
  setFocusMode: (v: boolean) => void;
  setBottomTab: (t: BottomTab) => void;
  setBottomPanelHeight: (h: number) => void;
  setRightPanelWidth: (w: number) => void;
};

const DEFAULTS = {
  rightPanel: true,
  bottomPanel: true,
  leftToolbar: true,
  focusMode: false,
  bottomTab: "screener" as BottomTab,
  bottomPanelHeight: 300,
  rightPanelWidth: 340,
};

export const useWorkspace = create<WorkspaceState>()(
  persist(
    (set) => ({
      ...DEFAULTS,

      setRightPanel: (v) => set({ rightPanel: v }),
      setBottomPanel: (v) => set({ bottomPanel: v }),
      setLeftToolbar: (v) => set({ leftToolbar: v }),
      setFocusMode: (v) => set({ focusMode: v }),
      setBottomTab: (t) => set({ bottomTab: t }),
      setBottomPanelHeight: (h) => set({ bottomPanelHeight: h }),
      setRightPanelWidth: (w) => set({ rightPanelWidth: w }),
    }),
    {
      name: "cryptolytic_workspace",
      // focusMode is a transient view state — never persisted.
      partialize: (s) => ({
        rightPanel: s.rightPanel,
        bottomPanel: s.bottomPanel,
        leftToolbar: s.leftToolbar,
        bottomTab: s.bottomTab,
        bottomPanelHeight: s.bottomPanelHeight,
        rightPanelWidth: s.rightPanelWidth,
      }),
      // Sanitize anything stale from an older session (heights/widths out of
      // range, renamed tabs) before it reaches the app.
      merge: (persisted, current) => {
        const p = persisted as Partial<WorkspaceState> | undefined;
        if (!p || typeof p !== "object") return current;
        return {
          ...current,
          ...clampWorkspace(p),
        };
      },
    },
  ),
);

/** Clamp a persisted value into a sane range (guards against stale storage). */
export function clampWorkspace(v: Partial<WorkspaceState>) {
  return {
    rightPanel: typeof v.rightPanel === "boolean" ? v.rightPanel : DEFAULTS.rightPanel,
    bottomPanel: typeof v.bottomPanel === "boolean" ? v.bottomPanel : DEFAULTS.bottomPanel,
    leftToolbar: typeof v.leftToolbar === "boolean" ? v.leftToolbar : DEFAULTS.leftToolbar,
    bottomTab: v.bottomTab ?? DEFAULTS.bottomTab,
    bottomPanelHeight: Math.min(
      720,
      Math.max(140, v.bottomPanelHeight ?? DEFAULTS.bottomPanelHeight),
    ),
    rightPanelWidth: Math.min(460, Math.max(280, v.rightPanelWidth ?? DEFAULTS.rightPanelWidth)),
  };
}
