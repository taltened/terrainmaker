export interface OverlayProps {
  /** SRGB color for grid lines (e.g. 0xff00e9). */
  readonly color: number;
  /** Alpha for grid lines [0,1]. */
  readonly alpha: number;
  /** Line thickness for grid lines (>=0). */
  readonly thickness: number;
}
