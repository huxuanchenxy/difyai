// DifyApiDemoDialog 字体整体缩放配置（持久化到 localStorage）
const FontScaleKey = 'Dify-Font-Scale'

export const MIN_FONT_SCALE = 0.8
export const MAX_FONT_SCALE = 1.8
export const FONT_SCALE_STEP = 0.1

function clamp(value: number): number {
  if (!Number.isFinite(value)) {
    return 1
  }
  return Math.min(MAX_FONT_SCALE, Math.max(MIN_FONT_SCALE, value))
}

export function getFontScale(): number {
  const raw = localStorage.getItem(FontScaleKey)
  if (!raw) {
    return 1
  }
  return clamp(Number(raw))
}

export function setFontScale(scale: number) {
  localStorage.setItem(FontScaleKey, String(clamp(scale)))
}

export function resetFontScale() {
  localStorage.removeItem(FontScaleKey)
}
