import { type PanelLayoutState, usePanelLayout } from '@platform/core/layout/hooks/usePanelLayout'
import {
  LS_LEFT_PANEL_W as LS_LEFT,
  LS_RIGHT_PANEL_W as LS_RIGHT,
} from '@platform/shared/constants/storageKeys'

/**
 * Panel resize for the default FlowKit canvas.
 *
 * Thin wrapper over usePanelLayout. All geometry — drag widths, open state,
 * and derived effective widths — originates here and is passed down. No
 * consumer should recompute effectiveLeftW / effectiveRightW independently.
 *
 * The `fullscreen` flag is forwarded so usePanelLayout can zero out effective
 * widths without any consumer having to know about the derivation rule.
 */
export function usePanelResize(
  initialLeft: number | undefined,
  initialRight: number | undefined,
  fullscreen: boolean
): PanelLayoutState {
  return usePanelLayout({
    storageKeyLeft: LS_LEFT,
    storageKeyRight: LS_RIGHT,
    initialLeft,
    initialRight,
    fullscreen,
  })
}
