import { atom } from 'nanostores'

import type { CanvasSize, SessionWindowRect } from './session-canvas-state'

interface TileSnapshot {
  frames: Record<string, SessionWindowRect>
  focused: string | null
}

/** One layout per canvas: shared boundaries make overlapping frames impossible. */
export class SessionTileLayout {
  readonly state = atom<TileSnapshot>({ frames: {}, focused: null })
  private order: string[] = []
  private size: CanvasSize = { width: 1000, height: 650 }
  private columns = 1
  private widths: number[] = [1]
  private heights: number[] = [1]
  private saved: { widths: number[]; heights: number[] } | null = null

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
    this.size = size
    // Keep ratios while the application itself changes size.
    this.publish()
  }

  arrange() {
    this.columns = this.order.length < 2 ? 1 : this.size.width >= 1250 && this.order.length > 4 ? 3 : 2
    this.widths = Array(this.columns).fill(1)
    this.heights = Array(Math.max(1, Math.ceil(this.order.length / this.columns))).fill(1)
    this.saved = null
    this.publish(null)
  }

  private tracks(weights: number[], length: number) {
    const gap = Math.min(8, length / Math.max(1, weights.length * 4))
    const available = Math.max(0, length - gap * (weights.length - 1))
    const sum = weights.reduce((a, b) => a + b, 0)
    let offset = 0
    return weights.map(weight => {
      const track = { start: offset, length: (available * weight) / sum }
      offset += track.length + gap
      return track
    })
  }

  private publish(focused = this.state.get().focused) {
    const xs = this.tracks(this.widths, this.size.width)
    const ys = this.tracks(this.heights, this.size.height)
    const frames: Record<string, SessionWindowRect> = {}
    this.order.forEach((id, index) => {
      const col = index % this.columns
      const row = Math.floor(index / this.columns)
      const x = xs[col]!
      const y = ys[row]!
      // The last session fills unused cells in the last row.
      const width = index === this.order.length - 1 ? this.size.width - x.start : x.length
      frames[id] = { x: x.start, y: y.start, width, height: y.length }
    })
    this.state.set({ frames, focused })
  }

  move(id: string, x: number, y: number) {
    const frames = this.state.get().frames
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
    if (from < 0) {
      return
    }
    ;[this.order[from], this.order[to]] = [target, id]
    this.publish()
  }

  moveBy(id: string, dx: number, dy: number) {
    const index = this.order.indexOf(id)
    const target = this.order[index + (dy ? Math.sign(dy) * this.columns : Math.sign(dx))]
    const frame = target && this.state.get().frames[target]
    if (frame) {
      this.move(id, frame.x + frame.width / 2, frame.y + frame.height / 2)
    }
  }

  resize(id: string, edge: string, dx: number, dy: number) {
    const index = this.order.indexOf(id)
    if (index < 0) {
      return
    }
    const col = index % this.columns
    const row = Math.floor(index / this.columns)
    const change = (weights: number[], length: number, boundary: number, delta: number, min: number) => {
      if (boundary < 0 || boundary >= weights.length - 1) {
        return
      }
      const tracks = this.tracks(weights, length)
      const a = tracks[boundary]!.length
      const b = tracks[boundary + 1]!.length
      const floor = Math.min(min, (a + b) / 3)
      const next = Math.max(floor, Math.min(a + b - floor, a + delta))
      const sum = weights[boundary]! + weights[boundary + 1]!
      weights[boundary] = (sum * next) / (a + b)
      weights[boundary + 1] = sum - weights[boundary]!
    }
    if (edge.includes('w')) {
      change(this.widths, this.size.width, col - 1, dx, 220)
    }
    if (edge.includes('e') && index !== this.order.length - 1) {
      change(this.widths, this.size.width, col, dx, 220)
    }
    if (edge.includes('n')) {
      change(this.heights, this.size.height, row - 1, dy, 140)
    }
    if (edge.includes('s')) {
      change(this.heights, this.size.height, row, dy, 140)
    }
    this.saved = null
    this.publish(null)
  }

  focus(id: string) {
    if (this.state.get().focused === id && this.saved) {
      this.widths = this.saved.widths
      this.heights = this.saved.heights
      this.saved = null
      this.publish(null)
      return
    }
    this.saved ??= { widths: [...this.widths], heights: [...this.heights] }
    const index = this.order.indexOf(id)
    this.widths = this.widths.map((_, col) => (col === index % this.columns ? 2 : 1))
    this.heights = this.heights.map((_, row) => (row === Math.floor(index / this.columns) ? 2 : 1))
    this.publish(id)
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
