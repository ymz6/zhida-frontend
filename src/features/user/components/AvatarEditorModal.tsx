import {
  createAvatarUploadFile,
  createCroppedAvatarBlob,
  validateAvatarFile,
} from '@/features/user/utils/avatar'
import { Alert, App, Button, Card, Flex, Modal, Slider, Typography } from 'antd'
import { Camera, RotateCw, ZoomIn } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { RefObject } from 'react'
import type { Area } from 'react-easy-crop'
import Cropper from 'react-easy-crop'

const { Text } = Typography

export function AvatarEditorModal({
  open,
  width,
  avatarInputRef,
  onReadyToEdit,
  onCancel,
  onAvatarChange,
}: {
  open: boolean
  width: number | string
  avatarInputRef: RefObject<HTMLInputElement | null>
  onReadyToEdit: () => void
  onCancel: () => void
  onAvatarChange: (avatarFile: File) => Promise<void> | void
}) {
  const { message } = App.useApp()
  const [isCropperMounted, setIsCropperMounted] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [sourceUrl, setSourceUrl] = useState<string | null>(null)
  const [sourceFileName, setSourceFileName] = useState('')
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)

  useEffect(() => {
    return () => {
      if (sourceUrl) {
        URL.revokeObjectURL(sourceUrl)
      }
    }
  }, [sourceUrl])

  const clearInputValue = () => {
    if (avatarInputRef.current) {
      avatarInputRef.current.value = ''
    }
  }

  const resetEditorState = () => {
    setSourceUrl(null)
    setSourceFileName('')
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setRotation(0)
    setCroppedAreaPixels(null)
    setIsCropperMounted(false)
    clearInputValue()
  }

  const handleClose = () => {
    if (isSaving) {
      return
    }

    onCancel()
    resetEditorState()
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    clearInputValue()

    if (!file) {
      return
    }

    try {
      const objectUrl = await validateAvatarFile(file)

      setSourceUrl(objectUrl)
      setSourceFileName(file.name)
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      setRotation(0)
      setCroppedAreaPixels(null)
      setIsCropperMounted(false)
      onReadyToEdit()
    } catch (fileError) {
      message.error(fileError instanceof Error ? fileError.message : '头像文件校验失败')
    }
  }

  const handleSave = async () => {
    if (!sourceUrl || !croppedAreaPixels) {
      message.error('请先完成头像裁切')
      return
    }

    setIsSaving(true)

    try {
      const avatarBlob = await createCroppedAvatarBlob({
        sourceUrl,
        croppedAreaPixels,
        rotation,
      })
      const avatarFile = createAvatarUploadFile(avatarBlob, sourceFileName)

      await onAvatarChange(avatarFile)
      message.success('头像更新成功')
      onCancel()
      resetEditorState()
    } catch (saveError) {
      message.error(saveError instanceof Error ? saveError.message : '头像更新失败')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <input
        ref={avatarInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        onChange={(event) => void handleFileChange(event)}
        className="hidden"
      />

      <Modal
        title={<span className="text-xl font-semibold text-slate-900">编辑头像</span>}
        open={open}
        onCancel={handleClose}
        afterOpenChange={setIsCropperMounted}
        destroyOnHidden
        centered
        width={width}
        mask={{ enabled: true, closable: !isSaving }}
        keyboard={!isSaving}
        closable={!isSaving}
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
              onClick={handleClose}
              disabled={isSaving}
              className="rounded-full"
            >
              取消
            </Button>
            <Button
              type="primary"
              loading={isSaving}
              disabled={!croppedAreaPixels}
              onClick={() => void handleSave()}
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
              {sourceUrl && isCropperMounted ? (
                <Cropper
                  image={sourceUrl}
                  crop={crop}
                  zoom={zoom}
                  rotation={rotation}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  objectFit="cover"
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onRotationChange={setRotation}
                  onCropComplete={(_, nextCroppedAreaPixels) =>
                    setCroppedAreaPixels(nextCroppedAreaPixels)
                  }
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
                  <Text className="text-slate-400">{`${zoom.toFixed(1)}x`}</Text>
                </Flex>
                <Slider
                  min={1}
                  max={3}
                  step={0.01}
                  value={zoom}
                  onChange={(value) => setZoom(Array.isArray(value) ? value[0] : value)}
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
                  <Text className="text-slate-400">{Math.round(rotation)}°</Text>
                </Flex>
                <Slider
                  min={0}
                  max={360}
                  step={1}
                  value={rotation}
                  onChange={(value) => setRotation(Array.isArray(value) ? value[0] : value)}
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
    </>
  )
}
