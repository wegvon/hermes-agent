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

it('resizes one of four windows independently and only makes the contacted neighbour yield', () => {
  const layout = new SessionTileLayout()
  layout.measure({ width: 1400, height: 900 })
  for (let i = 0; i < 4; i++) layout.register(String(i), i)
  const original = layout.state.get().frames
  layout.resize('0', 'e', -120, 0)
  const smaller = layout.state.get().frames
  expect(smaller['0']!.width).toBe(original['0']!.width - 120)
  for (const id of ['1', '2', '3']) expect(smaller[id]).toBe(original[id])
  layout.resize('0', 'e', 200, 0)
  const larger = layout.state.get().frames
  expect(larger['0']!.width).toBe(original['0']!.width + 80)
  expect(larger['1']!.width).toBe(original['1']!.width - 80)
  expect(larger['2']).toBe(original['2'])
  expect(larger['3']).toBe(original['3'])
})
