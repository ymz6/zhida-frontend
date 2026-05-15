import { useEffect, useState } from 'react'

export function useTypewriterPlaceholder(prompts: readonly string[]) {
  const [promptPlaceholder, setPromptPlaceholder] = useState('')

  useEffect(() => {
    if (prompts.length === 0) {
      setPromptPlaceholder('')
      return
    }

    // 尊重系统“减少动态效果”设置，避免继续播放打字动画。
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReducedMotion) {
      setPromptPlaceholder(prompts[0])
      return
    }

    let promptIndex = 0
    let charIndex = 0
    let isDeleting = false
    let timeoutId: ReturnType<typeof window.setTimeout>

    const tick = () => {
      const prompt = prompts[promptIndex]
      const nextText = prompt.slice(0, charIndex)

      setPromptPlaceholder(nextText)

      // 按“输入 -> 停顿 -> 删除 -> 切换下一条”的节奏循环展示占位文案。
      if (!isDeleting && charIndex < prompt.length) {
        charIndex += 1
        timeoutId = window.setTimeout(tick, 70)
        return
      }

      if (!isDeleting && charIndex === prompt.length) {
        isDeleting = true
        timeoutId = window.setTimeout(tick, 1600)
        return
      }

      if (isDeleting && charIndex > 0) {
        charIndex -= 1
        timeoutId = window.setTimeout(tick, 28)
        return
      }

      isDeleting = false
      promptIndex = (promptIndex + 1) % prompts.length
      timeoutId = window.setTimeout(tick, 360)
    }

    timeoutId = window.setTimeout(tick, 300)

    return () => window.clearTimeout(timeoutId)
  }, [prompts])

  return promptPlaceholder
}
