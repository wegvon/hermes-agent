import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { registry } from '@/contrib/registry'
import { stubMenuDomApis } from '@/test/jsdom'

import { usePaneVisible } from '../../pane-visibility'
import { group } from '../model'
import { $dismissedPanes, $hiddenTreePanes, $layoutTree, $narrowViewport, activateTreePane } from '../store'

import { $sessionCanvas, arrangeSessionWindow, fitSessionWindow } from './session-canvas-state'

import { LayoutTreeRoot } from '.'

const disposers: (() => void)[] = []
const mounts = new Map<string, number>()
const ids = ['workspace', ...Array.from({ length: 4 }, (_, i) => `session-tile:real-${i}`)]
beforeEach(() => {
  stubMenuDomApis()
  vi.stubGlobal('CSS', { ...globalThis.CSS, escape: (s: string) => s })
  $sessionCanvas.set(true)
  $hiddenTreePanes.set(new Set())
  $dismissedPanes.set(new Set())
  $narrowViewport.set(false)
  mounts.clear()

  for (const id of ids) {
    function ChatProbe() {
      const visible = usePaneVisible()
      useEffect(() => {
        mounts.set(id, (mounts.get(id) ?? 0) + 1)
      }, [])

      return <textarea data-chat-id={id} data-visible={visible} defaultValue={id} />
    }

    disposers.push(
      registry.register({
        id,
        area: 'panes',
        title: id,
        data: { placement: 'main' },
        render: () => <ChatProbe />
      })
    )
  }

  $layoutTree.set(group(ids, { id: 'sessions', active: ids[0] }))
})
afterEach(() => {
  cleanup()
  disposers.splice(0).forEach(d => d())
  $layoutTree.set(null)
  vi.unstubAllGlobals()
})
it('keeps five native contribution bodies visible and distinct when focus, arrange and size change', () => {
  render(<LayoutTreeRoot />)
  const chats = ids.map(id => document.querySelector<HTMLTextAreaElement>(`[data-chat-id="${id}"]`)!)
  expect(document.querySelectorAll('[data-session-window]')).toHaveLength(5)
  chats.forEach((chat, i) => {
    expect(chat.dataset.visible).toBe('true')
    fireEvent.change(chat, { target: { value: `draft-${i}` } })
  })
  act(() => activateTreePane('sessions', ids[3]))
  fireEvent.click([...document.querySelectorAll('button')].find(b => b.textContent === 'Pencereler')!)
  // Return to canvas after toggling tabs, then arrange. Existing active inputs retain identity.
  act(() => $sessionCanvas.set(true))
  expect(document.querySelectorAll('[data-session-window]')).toHaveLength(5)
  const active = document.querySelector<HTMLTextAreaElement>(`[data-chat-id="${ids[3]}"]`)!
  expect(active).toBe(chats[3])
  expect(active.value).toBe('draft-3')
  const arrange = [...document.querySelectorAll('button')].find(b => b.textContent === 'Düzenle')!
  fireEvent.click(arrange)
  const frame = document.querySelector<HTMLElement>(`[data-session-window="${ids[3]}"]`)!
  fireEvent.keyDown(frame.querySelector('header')!, { key: 'ArrowLeft' })
  expect(document.querySelector(`[data-chat-id="${ids[3]}"]`)).toBe(active)
  expect(active.dataset.visible).toBe('true')
})
it('bounds windows on a smaller screen and assigns five usable initial frames', () => {
  const size = { width: 1500, height: 900 }
  const frames = ids.map((_, i) => arrangeSessionWindow(i, ids.length, size))
  expect(new Set(frames.map(r => `${r.x},${r.y}`)).size).toBe(5)

  for (const r of frames) {
    const next = fitSessionWindow(r, { width: 320, height: 240 })
    expect(next.x + next.width).toBeLessThanOrEqual(320)
    expect(next.y + next.height).toBeLessThanOrEqual(240)
  }
})

it('drags and resizes a live window without replacing its chat or draft', () => {
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1500)
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(900)
  const { container } = render(<LayoutTreeRoot />)
  const frame = container.querySelector<HTMLElement>('[data-session-window="workspace"]')!
  const chat = frame.querySelector('textarea')!
  fireEvent.change(chat, { target: { value: 'unsent message' } })
  const pointer = (target: HTMLElement, type: string, x: number, y: number) => {
    target.setPointerCapture = () => undefined
    const event = new MouseEvent(type, { bubbles: true, clientX: x, clientY: y, button: 0 })
    Object.defineProperty(event, 'pointerId', { value: 1 })
    act(() => {
      target.dispatchEvent(event)
    })
  }
  const header = frame.querySelector('header')!
  pointer(header, 'pointerdown', 100, 100)
  pointer(header, 'pointermove', 700, 100)
  pointer(header, 'pointerup', 700, 100)
  expect(Number.parseFloat(frame.style.left)).toBeGreaterThan(400)
  expect(Number.parseFloat(frame.style.top)).toBe(0)
  const width = Number.parseFloat(frame.style.width)
  const grip = frame.querySelector<HTMLElement>('[data-session-resize="se"]')!
  pointer(grip, 'pointerdown', 300, 300)
  pointer(grip, 'pointermove', 420, 380)
  pointer(grip, 'pointerup', 420, 380)
  expect(Number.parseFloat(frame.style.width)).toBeGreaterThan(width)
  const frames = [...container.querySelectorAll<HTMLElement>('[data-session-window]')]
  for (const a of frames)
    for (const b of frames) {
      if (a === b) continue
      const rect = (el: HTMLElement) =>
        [el.style.left, el.style.top, el.style.width, el.style.height].map(Number.parseFloat)
      const [ax, ay, aw, ah] = rect(a),
        [bx, by, bw, bh] = rect(b)
      expect(
        ax! + aw! <= bx! + 0.01 || bx! + bw! <= ax! + 0.01 || ay! + ah! <= by! + 0.01 || by! + bh! <= ay! + 0.01
      ).toBe(true)
    }
  expect(frame.querySelector('textarea')).toBe(chat)
  expect(chat.value).toBe('unsent message')
  expect(mounts.get('workspace')).toBe(1)
  vi.restoreAllMocks()
})
