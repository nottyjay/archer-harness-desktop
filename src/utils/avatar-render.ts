/** 将通知头像绘制为带实心背景的 PNG，供原生托盘缓存使用。 */
export async function renderAvatarPngBytes(avatar: string | null | undefined, size = 64): Promise<number[] | null> {
  if (typeof window === 'undefined' || !avatar)
    return null

  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  if (!context)
    return null

  // 不依赖系统菜单栏背景：即使头像本身透明，托盘图也保持完整对比度。
  context.fillStyle = '#1f2937'
  context.fillRect(0, 0, size, size)

  if (avatar.startsWith('css:')) {
    const seed = avatar.slice(4)
    let palette = ['#0c4a6e', '#38bdf8']
    if (seed.includes('ember'))
      palette = ['#7c2d12', '#fb923c']
    else if (seed.includes('mint'))
      palette = ['#064e3b', '#34d399']
    else if (seed.includes('canyon'))
      palette = ['#78350f', '#fbbf24']
    const gradient = context.createLinearGradient(0, 0, size, size)
    gradient.addColorStop(0, palette[0])
    gradient.addColorStop(1, palette[1])
    context.fillStyle = gradient
    context.fillRect(0, 0, size, size)
    context.fillStyle = 'rgba(255,255,255,0.28)'
    context.beginPath()
    context.arc(size * 0.3, size * 0.3, size * 0.32, 0, Math.PI * 2)
    context.fill()
  }
  else {
    const image = await new Promise<HTMLImageElement | null>((resolve) => {
      const element = new Image()
      element.crossOrigin = 'anonymous'
      element.onload = () => resolve(element)
      element.onerror = () => resolve(null)
      element.src = avatar
    })
    if (!image)
      return null
    const scale = Math.max(size / image.width, size / image.height)
    const width = image.width * scale
    const height = image.height * scale
    try {
      context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height)
    }
    catch {
      return null
    }
  }

  let blob: Blob | null
  try {
    blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
  }
  catch {
    return null
  }
  if (!blob)
    return null
  return Array.from(new Uint8Array(await blob.arrayBuffer()))
}
