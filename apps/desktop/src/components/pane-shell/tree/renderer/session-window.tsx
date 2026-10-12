import { useStore } from '@nanostores/react'
import {
  type HTMLAttributes,
  type PointerEvent,
  type ReactNode,
  useCallback,
  useLayoutEffect,
  useRef,
  useState
} from 'react'

import { Button } from '@/components/ui/button'
import { Codicon } from '@/components/ui/codicon'
import { useResizeObserver } from '@/hooks/use-resize-observer'
import { cn } from '@/lib/utils'

import {
  $sessionCanvas,
  $sessionCanvasArrange,
  arrangeSessionWindow,
  type CanvasSize,
  fitSessionWindow,
  type SessionWindowRect
} from './session-canvas-state'

interface SessionWindowProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  enabled: boolean
  paneId: string
  index: number
  count: number
  title: ReactNode
  active: boolean
  onActivate: () => void
  onClose?: () => void
}

const grips = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'] as const

/** Only the frame updates during a gesture. Its keyed, native chat child stays mounted. */
export function SessionWindow({
  enabled,
  paneId,
  index,
  count,
  title,
  active,
  onActivate,
  onClose,
  children,
  className,
  ...rest
}: SessionWindowProps) {
  const ref = useRef<HTMLDivElement>(null)

  const gesture = useRef<{
    x: number
    y: number
    edge: string
    rect: SessionWindowRect
  } | null>(null)

  const size = useRef<CanvasSize>({ width: 1000, height: 650 })

  const [rect, setRect] = useState<SessionWindowRect>(() =>
    arrangeSessionWindow(Math.max(0, index), count, size.current)
  )

  const [maximized, setMaximized] = useState(false)
  const arrange = useStore($sessionCanvasArrange)
  const manual = useRef(false)
  const lastArrange = useRef(arrange)
  const parentRef = useRef<HTMLDivElement>(null)

  const measure = useCallback(() => {
    const parent = ref.current?.parentElement

    if (!parent || !enabled) {return}
    size.current = { width: parent.clientWidth, height: parent.clientHeight }

    if (size.current.width <= 0 || size.current.height <= 0) {return}
    setRect(old =>
      manual.current ? fitSessionWindow(old, size.current) : arrangeSessionWindow(index, count, size.current)
    )
  }, [enabled, index, count])

  useLayoutEffect(() => {
    parentRef.current = ref.current?.parentElement as HTMLDivElement | null
    measure()
  }, [measure])
  useResizeObserver(measure, parentRef)
  useLayoutEffect(() => {
    if (lastArrange.current !== arrange) {
      manual.current = false
      lastArrange.current = arrange
      setMaximized(false)
      measure()
    }
  }, [arrange, measure])

  const down = (e: PointerEvent<HTMLElement>, edge: string) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest('button')) {return}
    onActivate()

    if (maximized) {return}
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    gesture.current = { x: e.clientX, y: e.clientY, edge, rect }
  }

  const move = (e: PointerEvent<HTMLElement>) => {
    const g = gesture.current

    if (!g) {return}

    const dx = e.clientX - g.x,
      dy = e.clientY - g.y

    const next = { ...g.rect }

    if (g.edge === 'move') {
      next.x += dx
      next.y += dy
    } else {
      if (g.edge.includes('e')) {next.width += dx}

      if (g.edge.includes('s')) {next.height += dy}

      if (g.edge.includes('w')) {
        next.x += dx
        next.width -= dx
      }

      if (g.edge.includes('n')) {
        next.y += dy
        next.height -= dy
      }
    }

    manual.current = true
    setRect(fitSessionWindow(next, size.current))
  }

  const up = (e: PointerEvent<HTMLElement>) => {
    gesture.current = null

    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {e.currentTarget.releasePointerCapture(e.pointerId)}
  }

  const events = {
    onPointerMove: move,
    onPointerUp: up,
    onPointerCancel: up,
    onLostPointerCapture: () => {
      gesture.current = null
    }
  }

  const frame = maximized ? { x: 0, y: 0, ...size.current } : rect

  return (
    <div
      {...rest}
      className={cn(
        className,
        enabled &&
          'flex flex-col rounded-xl border border-(--stroke-nous) bg-(--ui-editor-surface-background) shadow-nous'
      )}
      data-session-window={enabled ? paneId : undefined}
      onFocusCapture={enabled && !active ? onActivate : undefined}
      onPointerDownCapture={enabled && !active ? onActivate : undefined}
      ref={ref}
      style={
        enabled
          ? {
              left: frame.x,
              top: frame.y,
              width: frame.width,
              height: frame.height,
              right: 'auto',
              bottom: 'auto',
              overflow: 'hidden',
              zIndex: active ? 12 : 10
            }
          : undefined
      }
    >
      {enabled && (
        <header
          {...events}
          aria-label="Session penceresini taşı"
          className="flex h-10 shrink-0 cursor-grab items-center gap-2 border-b border-(--stroke-nous) px-3 select-none"
          onDoubleClick={() => setMaximized(v => !v)}
          onKeyDown={e => {
            const delta: Record<string, [number, number]> = {
              ArrowLeft: [-10, 0],
              ArrowRight: [10, 0],
              ArrowUp: [0, -10],
              ArrowDown: [0, 10]
            }

            const d = delta[e.key]

            if (!d) {return}
            e.preventDefault()
            manual.current = true
            setRect(old =>
              fitSessionWindow(
                {
                  ...old,
                  ...(e.shiftKey
                    ? { width: old.width + d[0], height: old.height + d[1] }
                    : { x: old.x + d[0], y: old.y + d[1] })
                },
                size.current
              )
            )
          }}
          onPointerDown={e => down(e, 'move')}
          style={{ touchAction: 'none' }}
          tabIndex={0}
        >
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{title}</span>
          <Button
            aria-label={maximized ? 'Geri küçült' : 'Büyüt'}
            onClick={() => setMaximized(v => !v)}
            size="icon"
            variant="ghost"
          >
            <Codicon name={maximized ? 'chrome-restore' : 'chrome-maximize'} />
          </Button>
          {onClose && (
            <Button aria-label="Pencereyi kapat" onClick={onClose} size="icon" variant="ghost">
              <Codicon name="close" />
            </Button>
          )}
        </header>
      )}
      <div className="relative h-full min-h-0 flex-1 overflow-hidden">{children}</div>
      {enabled &&
        !maximized &&
        grips.map(edge => (
          <div
            key={edge}
            {...events}
            aria-hidden
            data-session-resize={edge}
            onPointerDown={e => down(e, edge)}
            style={{
              position: 'absolute',
              zIndex: 20,
              touchAction: 'none',
              cursor: `${edge}-resize`,
              width: edge === 'n' || edge === 's' ? 'calc(100% - 16px)' : 8,
              height: edge === 'e' || edge === 'w' ? 'calc(100% - 16px)' : 8,
              left: edge.includes('w') ? 0 : edge === 'n' || edge === 's' ? 8 : undefined,
              right: edge.includes('e') ? 0 : undefined,
              top: edge.includes('n') ? 0 : edge === 'e' || edge === 'w' ? 8 : undefined,
              bottom: edge.includes('s') ? 0 : undefined
            }}
          />
        ))}
    </div>
  )
}

export function SessionCanvasControls({ enabled, onNew }: { enabled: boolean; onNew?: () => void }) {
  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-(--stroke-nous) px-2 py-1">
      <Button aria-pressed={enabled} onClick={() => $sessionCanvas.set(!enabled)} size="sm" variant="ghost">
        {enabled ? 'Pencereler' : 'Sekmeler'}
      </Button>
      {enabled && (
        <Button onClick={() => $sessionCanvasArrange.set($sessionCanvasArrange.get() + 1)} size="sm" variant="ghost">
          Düzenle
        </Button>
      )}
      {onNew && (
        <Button onClick={onNew} size="sm" variant="ghost">
          + Yeni session
        </Button>
      )}
    </div>
  )
}
