import { create } from 'zustand'

import type { VisualEditElement } from '../utils/visualEdit'

interface WorkbenchRuntimeSnapshot {
  appId: string | null
  isGenerating: boolean
  isSubmitting: boolean
  isVisualEditMode: boolean
  selectedVisualEditElement: VisualEditElement | null
  previewRefreshVersion: number
  isPreviewReady: boolean
}

interface WorkbenchRuntimeActions {
  enterApp: (appId: string) => void
  setGenerating: (isGenerating: boolean) => void
  setSubmitting: (isSubmitting: boolean) => void
  setVisualEditMode: (enabled: boolean) => void
  setSelectedVisualEditElement: (element: VisualEditElement | null) => void
  setPreviewReady: (isPreviewReady: boolean) => void
  requestPreviewRefresh: () => void
}

type WorkbenchRuntimeState = WorkbenchRuntimeSnapshot & WorkbenchRuntimeActions

const initialRuntimeSnapshot: WorkbenchRuntimeSnapshot = {
  appId: null,
  isGenerating: false,
  isSubmitting: false,
  isVisualEditMode: false,
  selectedVisualEditElement: null,
  previewRefreshVersion: 0,
  isPreviewReady: false,
}

export const useWorkbenchRuntimeStore = create<WorkbenchRuntimeState>()((set) => ({
  ...initialRuntimeSnapshot,
  enterApp: (appId) =>
    set((state) => {
      if (state.appId === appId) {
        return state
      }

      // 切换应用时清空当前工作台临时态，避免选中元素、加载状态串到下一个应用。
      return {
        ...initialRuntimeSnapshot,
        appId,
      }
    }),
  setGenerating: (isGenerating) => set({ isGenerating }),
  setSubmitting: (isSubmitting) => set({ isSubmitting }),
  setVisualEditMode: (enabled) =>
    set(
      enabled
        ? { isVisualEditMode: true }
        : { isVisualEditMode: false, selectedVisualEditElement: null },
    ),
  setSelectedVisualEditElement: (element) => set({ selectedVisualEditElement: element }),
  setPreviewReady: (isPreviewReady) =>
    set((state) => ({
      isPreviewReady,
      selectedVisualEditElement: isPreviewReady ? state.selectedVisualEditElement : null,
    })),
  requestPreviewRefresh: () =>
    set((state) => ({
      previewRefreshVersion: state.previewRefreshVersion + 1,
    })),
}))
