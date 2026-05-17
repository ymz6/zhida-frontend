import {
  changeAvatar,
  invalidateGetProfile,
  useGetProfile,
  useUpdateProfile,
} from '@/api/generated/endpoints/profile'
import type { UserVO } from '@/api/generated/models'
import { queryClient } from '@/libs/query-client'
import { useAuthSessionStore } from '@/stores/auth-session'
import { App, Alert, Grid, Tabs } from 'antd'
import { Bookmark, FolderKanban, UserRoundCheck, UsersRound } from 'lucide-react'
import { useRef, useState } from 'react'

import { AvatarEditorModal } from '../components/AvatarEditorModal'
import { ProfileFavoritesSection } from '../components/ProfileFavoritesSection'
import { ProfileFollowUsersSection } from '../components/ProfileFollowUsersSection'
import { ProfileEditDrawer } from '../components/ProfileEditDrawer'
import { ProfileInfoCard } from '../components/ProfileInfoCard'
import { ProfileWorksSection } from '../components/ProfileWorksSection'
import type { ProfileEditFormValues, ProfileInfo } from '../types'
import { getErrorMessage } from '../utils/profile'

type ProfileTabKey = 'works' | 'favorites' | 'following' | 'followers'

export function ProfilePage() {
  const { message } = App.useApp()
  const screens = Grid.useBreakpoint()
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const sessionUser = useAuthSessionStore((state) => state.user)
  const setUser = useAuthSessionStore((state) => state.setUser)
  const [activeTab, setActiveTab] = useState<ProfileTabKey>('works')
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false)
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false)
  const profileQuery = useGetProfile<UserVO | undefined, { message?: string }>({
    query: {
      retry: false,
      select: (response) => response.data,
    },
  })
  const updateProfileMutation = useUpdateProfile<{ message?: string }>()
  const profile = (profileQuery.data ?? sessionUser ?? {}) as ProfileInfo

  const handleOpenAvatarPicker = () => {
    avatarInputRef.current?.click()
  }

  const syncProfile = async (nextProfile?: UserVO) => {
    if (nextProfile) {
      setUser(nextProfile)
    }

    await invalidateGetProfile(queryClient)
  }

  const handleAvatarChange = async (avatarFile: File) => {
    try {
      const response = await changeAvatar({ file: avatarFile })
      await syncProfile(response.data)
    } catch (error) {
      message.error(getErrorMessage(error, '头像更新失败'))
      throw error
    }
  }

  const handleUpdateProfile = async (values: ProfileEditFormValues) => {
    try {
      const response = await updateProfileMutation.mutateAsync({ data: values })
      await syncProfile(response.data)
      message.success('个人信息已更新')
      setIsEditDrawerOpen(false)
    } catch (error) {
      message.error(getErrorMessage(error, '个人信息更新失败'))
      throw error
    }
  }

  return (
    <div className="space-y-6">
      {profileQuery.isError ? (
        <Alert
          showIcon
          type="error"
          title="个人信息加载失败"
          description={getErrorMessage(profileQuery.error, '请稍后重试')}
          className="rounded-2xl"
        />
      ) : null}

      <ProfileInfoCard
        profile={profile}
        onOpenAvatarPicker={handleOpenAvatarPicker}
        onOpenEditDrawer={() => setIsEditDrawerOpen(true)}
      />

      <AvatarEditorModal
        open={isAvatarModalOpen}
        width={screens.md ? 600 : 'calc(100vw - 24px)'}
        avatarInputRef={avatarInputRef}
        onReadyToEdit={() => setIsAvatarModalOpen(true)}
        onCancel={() => setIsAvatarModalOpen(false)}
        onAvatarChange={handleAvatarChange}
      />

      <ProfileEditDrawer
        open={isEditDrawerOpen}
        profile={profile}
        width={screens.md ? 480 : '100%'}
        submitting={updateProfileMutation.isPending}
        onClose={() => setIsEditDrawerOpen(false)}
        onSubmit={handleUpdateProfile}
      />

      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as ProfileTabKey)}
        items={[
          {
            key: 'works',
            label: (
              <span className="inline-flex items-center gap-1.5">
                <FolderKanban className="size-4" />
                我的作品
              </span>
            ),
            children: <ProfileWorksSection />,
          },
          {
            key: 'favorites',
            label: (
              <span className="inline-flex items-center gap-1.5">
                <Bookmark className="size-4" />
                收藏夹管理
              </span>
            ),
            children: <ProfileFavoritesSection />,
          },
          {
            key: 'following',
            label: (
              <span className="inline-flex items-center gap-1.5">
                <UserRoundCheck className="size-4" />
                我的关注
              </span>
            ),
            children: (
              <ProfileFollowUsersSection
                userId={profile.id}
                type="following"
              />
            ),
          },
          {
            key: 'followers',
            label: (
              <span className="inline-flex items-center gap-1.5">
                <UsersRound className="size-4" />
                我的粉丝
              </span>
            ),
            children: (
              <ProfileFollowUsersSection
                userId={profile.id}
                type="followers"
              />
            ),
          },
        ]}
        className="[&_.ant-tabs-nav]:mb-3! [&_.ant-tabs-nav]:rounded-3xl [&_.ant-tabs-nav]:border [&_.ant-tabs-nav]:border-slate-200/70 [&_.ant-tabs-nav]:bg-white [&_.ant-tabs-nav]:px-4 [&_.ant-tabs-nav]:shadow-[0_12px_30px_rgba(15,23,42,0.05)] sm:[&_.ant-tabs-nav]:px-6 [&_.ant-tabs-tab]:flex [&_.ant-tabs-tab]:h-14 [&_.ant-tabs-tab]:items-center [&_.ant-tabs-tab]:px-1"
      />
    </div>
  )
}
