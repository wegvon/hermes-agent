import { atom } from 'nanostores'

/** Window-local presentation only. Session identities and RPC routing remain core-owned. */
export const $sessionCanvas = atom(true)
export const $sessionCanvasArrange = atom(0)
export const isCanvasSession = (id: string): boolean => id === 'workspace' || id.startsWith('session-tile:')

export interface SessionWindowRect {
  x: number
  y: number
  width: number
  height: number
}
export interface CanvasSize {
  width: number
  height: number
}

export function fitSessionWindow(rect: SessionWindowRect, size: CanvasSize): SessionWindowRect {
  const width = Math.min(Math.max(280, rect.width), Math.max(1, size.width))
  const height = Math.min(Math.max(200, rect.height), Math.max(1, size.height))

  return {
    width,
    height,
    x: Math.max(0, Math.min(rect.x, size.width - width)),
    y: Math.max(0, Math.min(rect.y, size.height - height))
  }
}

export function arrangeSessionWindow(index: number, count: number, size: CanvasSize): SessionWindowRect {
  const columns = count < 2 ? 1 : size.width >= 1250 && count > 4 ? 3 : 2
  const rows = Math.ceil(Math.max(1, count) / columns)
  const gap = 8
  const width = (size.width - gap * (columns - 1)) / columns
  const height = (size.height - gap * (rows - 1)) / rows

  return fitSessionWindow(
    {
      x: (index % columns) * (width + gap),
      y: Math.floor(index / columns) * (height + gap),
      width,
      height
    },
    size
  )
}
