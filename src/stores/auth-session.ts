import type { UserInfo } from '@/api/generated/models'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthSessionState {
  accessToken: string | null
  userInfo: UserInfo | null
  setSession: (payload: { accessToken: string; userInfo: UserInfo }) => void
  setUserInfo: (userInfo: UserInfo) => void
  clearSession: () => void
}

export const useAuthSessionStore = create<AuthSessionState>()(
  persist(
    (set) => ({
      accessToken: null,
      userInfo: null,
      setSession: ({ accessToken, userInfo }) => set({ accessToken, userInfo }),
      setUserInfo: (userInfo) => set({ userInfo }),
      clearSession: () => set({ accessToken: null, userInfo: null }),
    }),
    {
      name: 'auth-session',
    },
  ),
)
