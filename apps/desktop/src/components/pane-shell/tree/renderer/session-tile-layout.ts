import { atom } from 'nanostores'

import type { CanvasSize, SessionWindowRect } from './session-canvas-state'

interface TileSnapshot {
  frames: Record<string, SessionWindowRect>
  focused: string | null
}

type Frames = Record<string, SessionWindowRect>
const gap = 8

function intersects(a: SessionWindowRect, b: SessionWindowRect) {
  return (
    a.x < b.x + b.width + gap && a.x + a.width + gap > b.x && a.y < b.y + b.height + gap && a.y + a.height + gap > b.y
  )
}

/** Retain the largest rectangular part of a neighbour outside the resized frame. */
function makeRoom(peer: SessionWindowRect, frame: SessionWindowRect): SessionWindowRect | null {
  const candidates = [
    { ...peer, width: Math.min(peer.width, frame.x - gap - peer.x) },
    { ...peer, height: Math.min(peer.height, frame.y - gap - peer.y) },
    {
      ...peer,
      x: Math.max(peer.x, frame.x + frame.width + gap),
      width: peer.x + peer.width - Math.max(peer.x, frame.x + frame.width + gap)
    },
    {
      ...peer,
      y: Math.max(peer.y, frame.y + frame.height + gap),
      height: peer.y + peer.height - Math.max(peer.y, frame.y + frame.height + gap)
    }
  ]
  const minWidth = Math.min(180, peer.width)
  const minHeight = Math.min(120, peer.height)
  return (
    candidates
      .filter(rect => rect.width >= minWidth && rect.height >= minHeight)
      .sort((a, b) => b.width * b.height - a.width * a.height)[0] ?? null
  )
}

/** Each session owns a rectangle. Only neighbours touched by growth yield space. */
export class SessionTileLayout {
  readonly state = atom<TileSnapshot>({ frames: {}, focused: null })
  private order: string[] = []
  private size: CanvasSize = { width: 1000, height: 650 }
  private saved: Frames | null = null

  register(id: string, index: number) {
    if (this.order.includes(id)) {
      return
    }
    this.order.splice(Math.max(0, index), 0, id)
    this.arrange()
  }

  unregister(id: string) {
    this.order = this.order.filter(key => key !== id)
    this.arrange()
  }

  measure(size: CanvasSize) {
    if (size.width <= 0 || size.height <= 0 || (size.width === this.size.width && size.height === this.size.height)) {
      return
    }
    const scale = (frames: Frames) =>
      Object.fromEntries(
        Object.entries(frames).map(([id, rect]) => [
          id,
          {
            x: (rect.x * size.width) / this.size.width,
            y: (rect.y * size.height) / this.size.height,
            width: (rect.width * size.width) / this.size.width,
            height: (rect.height * size.height) / this.size.height
          }
        ])
      )
    const frames = scale(this.state.get().frames)
    if (this.saved) {
      this.saved = scale(this.saved)
    }
    this.size = size
    this.state.set({ ...this.state.get(), frames })
  }

  arrange() {
    const count = this.order.length
    const columns = count < 2 ? 1 : this.size.width >= 1250 && count > 4 ? 3 : 2
    const rows = Math.max(1, Math.ceil(count / columns))
    const space = Math.min(gap, this.size.width / (columns * 4), this.size.height / (rows * 4))
    const width = (this.size.width - space * (columns - 1)) / columns
    const height = (this.size.height - space * (rows - 1)) / rows
    const frames: Frames = {}
    this.order.forEach((id, index) => {
      const x = (index % columns) * (width + space)
      frames[id] = {
        x,
        y: Math.floor(index / columns) * (height + space),
        width: index === count - 1 ? this.size.width - x : width,
        height
      }
    })
    this.saved = null
    this.state.set({ frames, focused: null })
  }

  move(id: string, x: number, y: number) {
    const frames = this.state.get().frames
    if (!frames[id]) {
      return
    }
    const target = this.order.find(
      key =>
        key !== id &&
        x >= frames[key]!.x &&
        x <= frames[key]!.x + frames[key]!.width &&
        y >= frames[key]!.y &&
        y <= frames[key]!.y + frames[key]!.height
    )
    if (!target) {
      return
    }
    const from = this.order.indexOf(id)
    const to = this.order.indexOf(target)
    this.order[from] = target
    this.order[to] = id
    this.saved = null
    this.state.set({ frames: { ...frames, [id]: frames[target]!, [target]: frames[id]! }, focused: null })
  }

  moveBy(id: string, dx: number, dy: number) {
    const frames = this.state.get().frames
    const frame = frames[id]
    if (!frame) {
      return
    }
    const cx = frame.x + frame.width / 2
    const cy = frame.y + frame.height / 2
    const candidates = this.order
      .filter(key => key !== id)
      .map(key => {
        const r = frames[key]!
        return { r, x: r.x + r.width / 2 - cx, y: r.y + r.height / 2 - cy }
      })
      .filter(p => (dx ? p.x * dx > 0 : p.y * dy > 0))
      .sort((a, b) => a.x * a.x + a.y * a.y - b.x * b.x - b.y * b.y)
    const target = candidates[0]?.r
    if (target) {
      this.move(id, target.x + target.width / 2, target.y + target.height / 2)
    }
  }

  resize(id: string, edge: string, dx: number, dy: number) {
    const frames = this.state.get().frames
    const rect = frames[id]
    if (!rect) {
      return
    }
    const minWidth = Math.min(180, rect.width)
    const minHeight = Math.min(120, rect.height)
    const right = rect.x + rect.width
    const bottom = rect.y + rect.height
    const x = edge.includes('w') ? Math.max(0, Math.min(right - minWidth, rect.x + dx)) : rect.x
    const y = edge.includes('n') ? Math.max(0, Math.min(bottom - minHeight, rect.y + dy)) : rect.y
    const endX = edge.includes('e') ? Math.max(x + minWidth, Math.min(this.size.width, right + dx)) : right
    const endY = edge.includes('s') ? Math.max(y + minHeight, Math.min(this.size.height, bottom + dy)) : bottom
    const desired = { x, y, width: endX - x, height: endY - y }
    const trial = (fraction: number): Frames | null => {
      const candidate = {
        x: rect.x + (desired.x - rect.x) * fraction,
        y: rect.y + (desired.y - rect.y) * fraction,
        width: rect.width + (desired.width - rect.width) * fraction,
        height: rect.height + (desired.height - rect.height) * fraction
      }
      const next: Frames = { ...frames, [id]: candidate }
      for (const [key, peer] of Object.entries(frames)) {
        if (key === id || !intersects(candidate, peer)) {
          continue
        }
        // Scaling the viewport can reduce gaps. Do not move untouched neighbours.
        const wasOverlap = intersects(rect, peer)
        const growsTowardPeer =
          candidate.x < rect.x ||
          candidate.y < rect.y ||
          candidate.x + candidate.width > right ||
          candidate.y + candidate.height > bottom
        if (wasOverlap && !growsTowardPeer) {
          continue
        }
        const adjusted = makeRoom(peer, candidate)
        if (!adjusted) {
          return null
        }
        next[key] = adjusted
      }
      return next
    }
    let next = trial(1)
    if (!next) {
      let low = 0
      let high = 1
      next = frames
      for (let i = 0; i < 24; i++) {
        const mid = (low + high) / 2
        const attempt = trial(mid)
        if (attempt) {
          low = mid
          next = attempt
        } else {
          high = mid
        }
      }
    }
    this.saved = null
    this.state.set({ frames: next, focused: null })
  }

  focus(id: string) {
    if (this.state.get().focused === id && this.saved) {
      this.state.set({ frames: this.saved, focused: null })
      this.saved = null
      return
    }
    const before = this.saved ?? this.state.get().frames
    const rect = this.state.get().frames[id]
    if (!rect) {
      return
    }
    this.resize(
      id,
      rect.x > this.size.width / 2 ? 'w' : 'e',
      rect.x > this.size.width / 2 ? -rect.width / 2 : rect.width / 2,
      0
    )
    this.saved = before
    this.state.set({ ...this.state.get(), focused: id })
  }
}

const layouts = new WeakMap<HTMLElement, SessionTileLayout>()
export function sessionTileLayout(parent: HTMLElement) {
  let layout = layouts.get(parent)
  if (!layout) {
    layout = new SessionTileLayout()
    layouts.set(parent, layout)
  }
  return layout
}
export const emptyTileSnapshot = atom<TileSnapshot>({ frames: {}, focused: null })
