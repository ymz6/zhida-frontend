import { App, Grid } from 'antd'
import { useEffect, useRef, useState } from 'react'

import { AvatarEditorModal } from '../components/AvatarEditorModal'
import { ProfileEditDrawer } from '../components/ProfileEditDrawer'
import { ProfileInfoCard } from '../components/ProfileInfoCard'
import { ProfileWorksSection } from '../components/ProfileWorksSection'
import type { ProfileEditFormValues, ProfileInfo } from '../types'

const initialProfile: ProfileInfo = {
  id: 'local-user',
  account: 'local_account',
  role: 0,
  roleText: '普通用户',
  nickname: '本地用户',
  profile: '这里展示的是本地个人资料，暂未连接后端接口。',
  createTime: '2026-05-15',
}

export function ProfilePage() {
  const { message } = App.useApp()
  const screens = Grid.useBreakpoint()
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const avatarPreviewUrlRef = useRef<string | null>(null)
  const [profile, setProfile] = useState<ProfileInfo>(initialProfile)
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false)
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false)

  useEffect(() => {
    return () => {
      if (avatarPreviewUrlRef.current) {
        URL.revokeObjectURL(avatarPreviewUrlRef.current)
      }
    }
  }, [])

  const handleOpenAvatarPicker = () => {
    avatarInputRef.current?.click()
  }

  const handleAvatarChange = (avatarBlob: Blob) => {
    const avatarPreviewUrl = URL.createObjectURL(avatarBlob)

    // 头像只做本地预览，替换时主动释放上一张预览图的对象 URL。
    if (avatarPreviewUrlRef.current) {
      URL.revokeObjectURL(avatarPreviewUrlRef.current)
    }

    avatarPreviewUrlRef.current = avatarPreviewUrl
    setProfile((currentProfile) => ({
      ...currentProfile,
      avatar: avatarPreviewUrl,
    }))
  }

  const handleUpdateProfile = (values: ProfileEditFormValues) => {
    setProfile((currentProfile) => ({
      ...currentProfile,
      ...values,
    }))
    message.success('个人信息已更新到本地页面')
    setIsEditDrawerOpen(false)
  }

  return (
    <div className="space-y-6">
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
        onClose={() => setIsEditDrawerOpen(false)}
        onSubmit={handleUpdateProfile}
      />

      <ProfileWorksSection />
    </div>
  )
}
