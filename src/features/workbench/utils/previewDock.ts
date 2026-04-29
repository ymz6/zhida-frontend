export type PreviewDockState = {
  isExpanded: boolean
  offsetY: number
}

export const PREVIEW_DOCK_EDGE_OFFSET = 16

export const DEFAULT_PREVIEW_DOCK_STATE: PreviewDockState = {
  isExpanded: true,
  offsetY: PREVIEW_DOCK_EDGE_OFFSET,
}
