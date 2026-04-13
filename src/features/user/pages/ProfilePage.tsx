import {
  getGetProfileQueryKey,
  useChangeAvatar,
  useGetProfile,
  useUpdateProfile,
} from '@/api/generated/endpoints/profile'
import type { ResponseUserInfo, UserInfo } from '@/api/generated/models'
import { useAuthSessionStore } from '@/stores/auth-session'
import { useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  App,
  Avatar,
  Button,
  Card,
  Descriptions,
  Drawer,
  Flex,
  Form,
  Grid,
  Input,
  Modal,
  Result,
  Skeleton,
  Slider,
  Tag,
  Typography,
} from 'antd'
import type { Area } from 'react-easy-crop'
import Cropper from 'react-easy-crop'
import { Camera, PencilLine, RotateCw, ZoomIn } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

const { Text, Title } = Typography
const { TextArea } = Input

interface ProfileEditFormValues {
  nickname: string
  profile: string
}

export function ProfilePage() {
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const screens = Grid.useBreakpoint()
  const [form] = Form.useForm<ProfileEditFormValues>()
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false)
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false)
  const [isAvatarCropperMounted, setIsAvatarCropperMounted] = useState(false)
  const [avatarSourceUrl, setAvatarSourceUrl] = useState<string | null>(null)
  const [avatarFileName, setAvatarFileName] = useState('avatar')
  const [avatarCrop, setAvatarCrop] = useState({ x: 0, y: 0 })
  const [avatarZoom, setAvatarZoom] = useState(1)
  const [avatarRotation, setAvatarRotation] = useState(0)
  const [avatarCroppedAreaPixels, setAvatarCroppedAreaPixels] = useState<Area | null>(null)
  const setUserInfo = useAuthSessionStore((state) => state.setUserInfo)
  const {
    data: profile,
    isPending,
    isError,
    error,
  } = useGetProfile<UserInfo, { message: string }>({
    query: {
      retry: false,
      retryOnMount: false,
      select: (response) => response.data as UserInfo,
    },
  })
  const updateProfileMutation = useUpdateProfile()
  const changeAvatarMutation = useChangeAvatar()

  useEffect(() => {
    return () => {
      if (avatarSourceUrl) {
        URL.revokeObjectURL(avatarSourceUrl)
      }
    }
  }, [avatarSourceUrl])

  const clearAvatarInputValue = () => {
    if (avatarInputRef.current) {
      avatarInputRef.current.value = ''
    }
  }

  const resetAvatarEditorState = () => {
    setAvatarSourceUrl(null)
    setAvatarFileName('avatar')
    setAvatarCrop({ x: 0, y: 0 })
    setAvatarZoom(1)
    setAvatarRotation(0)
    setAvatarCroppedAreaPixels(null)
    setIsAvatarCropperMounted(false)
    clearAvatarInputValue()
  }

  const handleCloseAvatarModal = () => {
    if (changeAvatarMutation.isPending) {
      return
    }

    setIsAvatarModalOpen(false)
    resetAvatarEditorState()
  }

  const handleOpenAvatarPicker = () => {
    if (changeAvatarMutation.isPending) {
      return
    }

    avatarInputRef.current?.click()
  }

  const validateAvatarFile = async (file: File) => {
    if (file.size === 0) {
      throw new Error('头像文件不能为空')
    }

    if (file.size > 1024 * 1024) {
      throw new Error('头像文件大小不能超过1MB')
    }

    const extension = file.name.split('.').pop()?.trim().toLowerCase() || ''

    if (!extension) {
      throw new Error('头像文件后缀不合法')
    }

    if (!['jpg', 'jpeg', 'png', 'webp'].includes(extension)) {
      throw new Error('头像仅支持jpg/jpeg/png/webp格式')
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      throw new Error('头像文件格式不合法')
    }

    const objectUrl = URL.createObjectURL(file)

    try {
      await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image()

        image.onload = () => resolve(image)
        image.onerror = () => reject(new Error('头像文件损坏或格式不合法'))
        image.src = objectUrl
      })
      return objectUrl
    } catch {
      URL.revokeObjectURL(objectUrl)
      throw new Error('头像文件损坏或格式不合法')
    }
  }

  const handleAvatarFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    clearAvatarInputValue()

    if (!file) {
      return
    }

    try {
      const objectUrl = await validateAvatarFile(file)
      const extension = file.name.split('.').pop()?.trim().toLowerCase()

      setAvatarFileName(
        extension ? file.name.slice(0, -(extension.length + 1)) || 'avatar' : file.name || 'avatar',
      )
      setAvatarSourceUrl(objectUrl)
      setAvatarCrop({ x: 0, y: 0 })
      setAvatarZoom(1)
      setAvatarRotation(0)
      setAvatarCroppedAreaPixels(null)
      setIsAvatarCropperMounted(false)
      setIsAvatarModalOpen(true)
    } catch (fileError) {
      message.error(fileError instanceof Error ? fileError.message : '头像文件校验失败')
    }
  }

  const handleAvatarCropComplete = (_: Area, croppedAreaPixels: Area) => {
    setAvatarCroppedAreaPixels(croppedAreaPixels)
  }

  const handleUploadAvatar = async () => {
    if (!avatarSourceUrl || !avatarCroppedAreaPixels) {
      message.error('请先完成头像裁切')
      return
    }

    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const currentImage = new Image()

        currentImage.onload = () => resolve(currentImage)
        currentImage.onerror = () => reject(new Error('头像文件损坏或格式不合法'))
        currentImage.src = avatarSourceUrl
      })
      const imageWidth = image.naturalWidth
      const imageHeight = image.naturalHeight
      const rotationRadian = (avatarRotation * Math.PI) / 180
      const rotatedWidth =
        Math.abs(Math.cos(rotationRadian) * imageWidth) +
        Math.abs(Math.sin(rotationRadian) * imageHeight)
      const rotatedHeight =
        Math.abs(Math.sin(rotationRadian) * imageWidth) +
        Math.abs(Math.cos(rotationRadian) * imageHeight)

      const rotatedCanvas = document.createElement('canvas')
      rotatedCanvas.width = Math.round(rotatedWidth)
      rotatedCanvas.height = Math.round(rotatedHeight)

      const rotatedCanvasContext = rotatedCanvas.getContext('2d')

      if (!rotatedCanvasContext) {
        throw new Error('头像裁切失败，请重试')
      }

      rotatedCanvasContext.translate(rotatedCanvas.width / 2, rotatedCanvas.height / 2)
      rotatedCanvasContext.rotate(rotationRadian)
      rotatedCanvasContext.translate(-imageWidth / 2, -imageHeight / 2)
      rotatedCanvasContext.drawImage(image, 0, 0, imageWidth, imageHeight)

      const croppedCanvas = document.createElement('canvas')
      const cropWidth = Math.max(1, Math.round(avatarCroppedAreaPixels.width))
      const cropHeight = Math.max(1, Math.round(avatarCroppedAreaPixels.height))

      croppedCanvas.width = cropWidth
      croppedCanvas.height = cropHeight

      const croppedCanvasContext = croppedCanvas.getContext('2d')

      if (!croppedCanvasContext) {
        throw new Error('头像裁切失败，请重试')
      }

      croppedCanvasContext.drawImage(
        rotatedCanvas,
        Math.round(avatarCroppedAreaPixels.x),
        Math.round(avatarCroppedAreaPixels.y),
        cropWidth,
        cropHeight,
        0,
        0,
        cropWidth,
        cropHeight,
      )

      const webpBlob = await new Promise<Blob | null>((resolve) => {
        croppedCanvas.toBlob(resolve, 'image/webp', 0.92)
      })

      const croppedAvatarFile =
        webpBlob?.type === 'image/webp'
          ? new File([webpBlob], `${avatarFileName}.webp`, {
              type: 'image/webp',
              lastModified: Date.now(),
            })
          : await (async () => {
              const jpegBlob = await new Promise<Blob | null>((resolve) => {
                croppedCanvas.toBlob(resolve, 'image/jpeg', 0.92)
              })

              if (!jpegBlob?.type || jpegBlob.type !== 'image/jpeg') {
                throw new Error('头像裁切失败，请重试')
              }

              return new File([jpegBlob], `${avatarFileName}.jpg`, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              })
            })()

      if (croppedAvatarFile.size > 1024 * 1024) {
        message.error('头像文件大小不能超过1MB')
        return
      }

      const response = await changeAvatarMutation.mutateAsync({
        data: {
          file: croppedAvatarFile,
        },
      })
      const updatedProfile = response.data as UserInfo

      queryClient.setQueryData<ResponseUserInfo>(getGetProfileQueryKey(), response)
      setUserInfo(updatedProfile)
      message.success('头像更新成功')
      setIsAvatarModalOpen(false)
      resetAvatarEditorState()
    } catch (uploadError) {
      message.error(uploadError instanceof Error ? uploadError.message : '头像更新失败')
    }
  }

  const handleOpenEditDrawer = () => {
    if (!profile) {
      return
    }

    form.resetFields()
    form.setFieldsValue({
      nickname: profile.nickname ?? '',
      profile: profile.profile ?? '',
    })
    setIsEditDrawerOpen(true)
  }

  const handleCloseEditDrawer = () => {
    form.resetFields()
    setIsEditDrawerOpen(false)
  }

  const handleUpdateProfile = async (values: ProfileEditFormValues) => {
    const payload = {
      nickname: values.nickname.trim(),
      profile: values.profile.trim(),
    }

    try {
      const response = await updateProfileMutation.mutateAsync({
        data: payload,
      })
      const updatedProfile = response.data as UserInfo

      queryClient.setQueryData<ResponseUserInfo>(getGetProfileQueryKey(), response)
      setUserInfo(updatedProfile)
      message.success('个人信息更新成功')
      handleCloseEditDrawer()
    } catch (submitError) {
      message.error(submitError instanceof Error ? submitError.message : '个人信息更新失败')
    }
  }

  if (isPending) {
    return (
      <Card className="rounded-3xl border-slate-200/70 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <Skeleton
          active
          avatar={{ size: 80, shape: 'circle' }}
          title={{ width: '32%' }}
          paragraph={{ rows: 5, width: ['100%', '84%', '72%', '88%', '64%'] }}
        />
      </Card>
    )
  }

  if (isError || !profile) {
    return (
      <Card className="rounded-3xl border-slate-200/70 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <Result
          status="warning"
          title="个人信息加载失败"
          subTitle={isError ? error.message : '未获取到个人信息'}
        />
      </Card>
    )
  }

  const profileDisplayName = profile.nickname?.trim() || '未设置'
  const profileDisplayInitial = profile.nickname?.trim().slice(0, 1).toUpperCase()
  const isAdmin = profile.role === 1

  return (
    <div className="space-y-6">
      <Card className="rounded-3xl border-slate-200/70 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)] [&_.ant-card-body]:p-6 sm:[&_.ant-card-body]:p-8">
        <Flex
          vertical
          gap={24}
        >
          <Flex
            align="start"
            justify="space-between"
            gap={20}
            wrap="wrap"
          >
            <Flex
              align="center"
              gap={20}
              wrap="wrap"
              className="min-w-0 flex-1"
            >
              <button
                type="button"
                onClick={handleOpenAvatarPicker}
                aria-label="更换头像"
                aria-haspopup="dialog"
                className="group relative shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-100"
              >
                <Avatar
                  size={80}
                  src={profile.avatar}
                  className="bg-slate-900! ring-2 ring-white transition-transform duration-200 group-hover:scale-[1.02] group-focus-visible:scale-[1.02]"
                >
                  {profileDisplayInitial}
                </Avatar>
                <span className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center rounded-full bg-slate-950/55 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
                  <Camera className="mb-1 size-5 text-white" />
                  <span className="text-[11px] font-medium tracking-[0.08em] text-white">
                    更换头像
                  </span>
                </span>
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                onChange={(event) => void handleAvatarFileChange(event)}
                className="hidden"
              />
              <div className="min-w-0 flex-1">
                <Flex
                  align="center"
                  gap={12}
                  wrap="wrap"
                  className="mb-2"
                >
                  <Title
                    level={3}
                    className="mb-0!"
                  >
                    {profileDisplayName}
                  </Title>
                  <Tag color={isAdmin ? 'blue' : 'default'}>{isAdmin ? '管理员' : '普通用户'}</Tag>
                </Flex>
                <Text className="text-slate-400">账号：{profile.account || '未设置'}</Text>
              </div>
            </Flex>

            <Button
              icon={<PencilLine className="size-4" />}
              onClick={handleOpenEditDrawer}
              className="h-10 rounded-full border-sky-300 bg-white px-4 font-medium text-slate-800 shadow-[0_4px_12px_rgba(15,23,42,0.04)] transition-[background-color,border-color,box-shadow,color] hover:border-sky-400 hover:bg-sky-50/40 hover:text-sky-700 hover:shadow-[0_6px_16px_rgba(14,165,233,0.08)]"
            >
              编辑用户信息
            </Button>
          </Flex>

          <Descriptions
            column={{ xs: 1, md: 2 }}
            className="[&_.ant-descriptions-item-label]:w-24 [&_.ant-descriptions-item-label]:text-slate-500 [&_.ant-descriptions-item-content]:text-slate-800"
            items={[
              {
                key: 'id',
                label: '用户 ID',
                children: profile.id || '未设置',
              },
              {
                key: 'role',
                label: '角色标识',
                children: profile.roleText || '未设置',
              },
              {
                key: 'nickname',
                label: '昵称',
                children: profile.nickname || '未设置',
              },
              {
                key: 'createTime',
                label: '创建时间',
                children: profile.createTime || '未设置',
              },
              {
                key: 'profile',
                label: '个人简介',
                children: profile.profile || '未设置',
                span: 2,
              },
            ]}
          />
        </Flex>
      </Card>

      <Modal
        title={<span className="text-xl font-semibold text-slate-900">编辑头像</span>}
        open={isAvatarModalOpen}
        onCancel={handleCloseAvatarModal}
        afterOpenChange={setIsAvatarCropperMounted}
        destroyOnHidden
        centered
        width={screens.md ? 600 : 'calc(100vw - 24px)'}
        mask={{ enabled: true, closable: !changeAvatarMutation.isPending }}
        keyboard={!changeAvatarMutation.isPending}
        closable={!changeAvatarMutation.isPending}
        classNames={{
          body: 'px-4 py-3 sm:px-4 sm:py-3',
          footer: 'px-4 pb-4 pt-2',
          header: 'px-4 py-3',
        }}
        footer={
          <Flex
            justify="end"
            gap={12}
          >
            <Button
              onClick={handleCloseAvatarModal}
              disabled={changeAvatarMutation.isPending}
              className="rounded-full"
            >
              取消
            </Button>
            <Button
              type="primary"
              loading={changeAvatarMutation.isPending}
              disabled={!avatarCroppedAreaPixels}
              onClick={() => void handleUploadAvatar()}
              className="rounded-full px-5 shadow-none"
            >
              保存头像
            </Button>
          </Flex>
        }
      >
        <div className="space-y-4">
          <Card
            variant="borderless"
            className="rounded-3xl bg-white shadow-none"
            classNames={{
              body: 'p-0',
            }}
          >
            <div className="relative mx-auto aspect-square w-full max-w-70 overflow-hidden rounded-[22px] bg-slate-950 sm:max-w-75">
              {avatarSourceUrl && isAvatarCropperMounted ? (
                <Cropper
                  image={avatarSourceUrl}
                  crop={avatarCrop}
                  zoom={avatarZoom}
                  rotation={avatarRotation}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  objectFit="cover"
                  onCropChange={setAvatarCrop}
                  onZoomChange={setAvatarZoom}
                  onRotationChange={setAvatarRotation}
                  onCropComplete={handleAvatarCropComplete}
                />
              ) : (
                <Flex
                  vertical
                  align="center"
                  justify="center"
                  gap={8}
                  className="h-full text-slate-300"
                >
                  <Camera className="size-8" />
                  <Text className="text-slate-300">正在准备头像编辑器…</Text>
                </Flex>
              )}
            </div>
          </Card>

          <Card
            variant="borderless"
            size="small"
            title={<Text className="font-medium text-slate-700">裁切调整</Text>}
            className="rounded-3xl bg-white shadow-none"
            classNames={{
              header: 'border-none px-0 py-0 pb-2 shadow-none',
              body: 'px-3.5 pb-3.5 pt-2.5',
            }}
          >
            <Flex
              vertical
              gap={2}
            >
              <div>
                <Flex
                  align="center"
                  justify="space-between"
                  className="mb-2.5"
                >
                  <Flex
                    align="center"
                    gap={8}
                  >
                    <ZoomIn className="size-4 text-slate-500" />
                    <Text className="text-slate-700">缩放</Text>
                  </Flex>
                  <Text className="text-slate-400">{`${avatarZoom.toFixed(1)}x`}</Text>
                </Flex>
                <Slider
                  min={1}
                  max={3}
                  step={0.01}
                  value={avatarZoom}
                  onChange={(value) => setAvatarZoom(Array.isArray(value) ? value[0] : value)}
                  tooltip={{
                    formatter: (value) => (typeof value === 'number' ? `${value.toFixed(1)}x` : ''),
                  }}
                />
                <Flex
                  justify="space-between"
                  className="mt-2 text-xs text-slate-400"
                >
                  <span>1.0x</span>
                  <span>3.0x</span>
                </Flex>
              </div>

              <div>
                <Flex
                  align="center"
                  justify="space-between"
                  className="mb-2.5"
                >
                  <Flex
                    align="center"
                    gap={8}
                  >
                    <RotateCw className="size-4 text-slate-500" />
                    <Text className="text-slate-700">旋转</Text>
                  </Flex>
                  <Text className="text-slate-400">{Math.round(avatarRotation)}°</Text>
                </Flex>
                <Slider
                  min={0}
                  max={360}
                  step={1}
                  value={avatarRotation}
                  onChange={(value) => setAvatarRotation(Array.isArray(value) ? value[0] : value)}
                  tooltip={{
                    formatter: (value) =>
                      typeof value === 'number' ? `${Math.round(value)}°` : '',
                  }}
                />
              </div>
            </Flex>
          </Card>

          <Alert
            showIcon
            type="info"
            title="上传要求"
            description="仅支持 jpg/jpeg/png/webp 格式，且文件大小不能超过 1MB。"
            className="rounded-[20px] border-sky-100 bg-white"
            classNames={{
              description: 'text-sm',
              title: 'text-sm font-medium',
            }}
          />
        </div>
      </Modal>

      <Drawer
        title="编辑用户信息"
        placement="right"
        open={isEditDrawerOpen}
        onClose={handleCloseEditDrawer}
        width={screens.md ? 480 : '100%'}
        footer={
          <Flex
            justify="end"
            gap={12}
          >
            <Button
              onClick={handleCloseEditDrawer}
              disabled={updateProfileMutation.isPending}
              className="rounded-full"
            >
              取消
            </Button>
            <Button
              type="primary"
              loading={updateProfileMutation.isPending}
              onClick={() => void form.submit()}
              className="rounded-full px-5 shadow-none"
            >
              保存
            </Button>
          </Flex>
        }
      >
        <Form
          form={form}
          layout="vertical"
          colon={false}
          requiredMark={false}
          onFinish={(values) => void handleUpdateProfile(values)}
          className="[&_.ant-form-item]:mb-5"
        >
          <Form.Item
            name="nickname"
            label="昵称"
            validateFirst
            rules={[
              {
                validator: (_, value: string | undefined) => {
                  if (!value?.trim()) {
                    return Promise.reject(new Error('昵称不能为空'))
                  }

                  return Promise.resolve()
                },
              },
              {
                max: 10,
                message: '昵称最多10个字符',
              },
            ]}
          >
            <Input
              placeholder="请输入昵称"
              maxLength={10}
              showCount
              className="h-11 rounded-xl"
            />
          </Form.Item>

          <Form.Item
            name="profile"
            label="个人简介"
            validateFirst
            rules={[
              {
                max: 100,
                message: '个人简介最多100个字符',
              },
            ]}
          >
            <TextArea
              rows={5}
              maxLength={100}
              allowClear
              showCount
              placeholder="介绍一下自己吧"
              className="rounded-2xl"
            />
          </Form.Item>
        </Form>
      </Drawer>

      <Card className="rounded-3xl border-slate-200/70 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)] [&_.ant-card-body]:p-0">
        <Flex
          vertical
          align="center"
          justify="center"
          className="min-h-80 px-6 py-8"
        >
          <div className="w-full max-w-120">
            <Skeleton
              active
              round
              title={{ width: '38%' }}
              paragraph={{ rows: 6, width: ['100%', '92%', '96%', '88%', '94%', '80%'] }}
            />
          </div>
        </Flex>
      </Card>
    </div>
  )
}
