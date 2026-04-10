// Zustand 示例代码
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

interface CounterState {
  count: number
  increment: () => void
  decrement: () => void
  reset: () => void
}

export const useCounterStore = create<CounterState>()(
  persist(
    immer((set) => ({
      count: 0,
      increment: () =>
        set((state) => {
          state.count += 1
        }),
      decrement: () =>
        set((state) => {
          state.count -= 1
        }),
      reset: () => set({ count: 0 }),
    })),
    { name: 'counter' },
  ),
)
