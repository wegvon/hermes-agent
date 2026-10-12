import { expect, it } from 'vitest'
import { SessionTileLayout } from './session-tile-layout'

it('keeps every session disjoint through resize, swap, focus, viewport shrink and membership changes', () => {
  const layout = new SessionTileLayout()
  layout.measure({ width: 1500, height: 900 })
  for (let i = 0; i < 5; i++) layout.register(String(i), i)
  const check = (width: number, height: number) => {
    const frames = Object.values(layout.state.get().frames)
    for (const a of frames) {
      expect(a.width).toBeGreaterThan(0)
      expect(a.height).toBeGreaterThan(0)
      expect(a.x + a.width).toBeLessThanOrEqual(width + 0.001)
      expect(a.y + a.height).toBeLessThanOrEqual(height + 0.001)
      for (const b of frames) {
        if (a === b) continue
        expect(
          a.x + a.width <= b.x + 0.001 ||
            b.x + b.width <= a.x + 0.001 ||
            a.y + a.height <= b.y + 0.001 ||
            b.y + b.height <= a.y + 0.001
        ).toBe(true)
      }
    }
  }
  check(1500, 900)
  layout.resize('0', 'se', 250, 200)
  check(1500, 900)
  layout.move('0', 1400, 800)
  check(1500, 900)
  const before = layout.state.get().frames
  layout.focus('2')
  check(1500, 900)
  layout.focus('2')
  expect(layout.state.get().frames).toEqual(before)
  layout.measure({ width: 320, height: 240 })
  check(320, 240)
  layout.resize('1', 'nw', -10000, 10000)
  check(320, 240)
  layout.register('5', 5)
  check(320, 240)
  layout.unregister('3')
  check(320, 240)
})
