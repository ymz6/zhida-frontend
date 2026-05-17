import type { Area } from 'react-easy-crop'

export async function validateAvatarFile(file: File) {
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
    await loadImage(objectUrl)
    return objectUrl
  } catch {
    URL.revokeObjectURL(objectUrl)
    throw new Error('头像文件损坏或格式不合法')
  }
}

export async function createCroppedAvatarBlob({
  sourceUrl,
  croppedAreaPixels,
  rotation,
}: {
  sourceUrl: string
  croppedAreaPixels: Area
  rotation: number
}) {
  const image = await loadImage(sourceUrl)
  const imageWidth = image.naturalWidth
  const imageHeight = image.naturalHeight
  const rotationRadian = (rotation * Math.PI) / 180
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
  const cropWidth = Math.max(1, Math.round(croppedAreaPixels.width))
  const cropHeight = Math.max(1, Math.round(croppedAreaPixels.height))

  croppedCanvas.width = cropWidth
  croppedCanvas.height = cropHeight

  const croppedCanvasContext = croppedCanvas.getContext('2d')

  if (!croppedCanvasContext) {
    throw new Error('头像裁切失败，请重试')
  }

  croppedCanvasContext.drawImage(
    rotatedCanvas,
    Math.round(croppedAreaPixels.x),
    Math.round(croppedAreaPixels.y),
    cropWidth,
    cropHeight,
    0,
    0,
    cropWidth,
    cropHeight,
  )

  const webpBlob = await canvasToBlob(croppedCanvas, 'image/webp')
  const croppedAvatarBlob =
    webpBlob?.type === 'image/webp' ? webpBlob : await canvasToBlob(croppedCanvas, 'image/jpeg')

  if (!croppedAvatarBlob?.type) {
    throw new Error('头像裁切失败，请重试')
  }

  if (croppedAvatarBlob.size > 1024 * 1024) {
    throw new Error('头像文件大小不能超过1MB')
  }

  return croppedAvatarBlob
}

export function createAvatarUploadFile(avatarBlob: Blob, sourceFileName: string) {
  const fileExtension = avatarBlob.type === 'image/webp' ? 'webp' : 'jpg'
  const sourceBaseName = sourceFileName.replace(/\.[^/.]+$/, '').trim() || 'avatar'

  // canvas.toBlob() returns a Blob without File.name; wrapping it keeps multipart filename.
  return new File([avatarBlob], `${sourceBaseName}.${fileExtension}`, {
    type: avatarBlob.type,
  })
}

function loadImage(sourceUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()

    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('头像文件损坏或格式不合法'))
    image.src = sourceUrl
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, type: 'image/webp' | 'image/jpeg') {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, type, 0.92)
  })
}
