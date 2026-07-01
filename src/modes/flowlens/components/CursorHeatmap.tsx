import type { CursorSample } from '@platform/features/flowTracer/types'
import { useEffect, useRef } from 'react'

interface Props {
  samples: CursorSample[]
  screenId: string
  width: number
  height: number
}

const RADIUS = 24
const MAX_OPACITY = 0.85

export default function CursorHeatmap({ samples, screenId, width, height }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, width, height)

    const filtered = samples.filter(s => s.screenId === screenId)
    if (filtered.length === 0) return

    // Use the capture dimensions from first sample for coordinate mapping
    const captureW = filtered[0].screenW
    const captureH = filtered[0].screenH
    const scaleX = width / captureW
    const scaleY = height / captureH

    // Build density map
    const offscreen = document.createElement('canvas')
    offscreen.width = width
    offscreen.height = height
    const offCtx = offscreen.getContext('2d')
    if (!offCtx) return

    offCtx.globalCompositeOperation = 'source-over'

    for (const sample of filtered) {
      const x = sample.x * scaleX
      const y = sample.y * scaleY
      const grad = offCtx.createRadialGradient(x, y, 0, x, y, RADIUS)
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.15)')
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)')
      offCtx.fillStyle = grad
      offCtx.beginPath()
      offCtx.arc(x, y, RADIUS, 0, Math.PI * 2)
      offCtx.fill()
    }

    // Colorize: read offscreen alpha, map to heatmap palette
    const imgData = offCtx.getImageData(0, 0, width, height)
    const outData = ctx.createImageData(width, height)

    for (let i = 0; i < imgData.data.length; i += 4) {
      const alpha = imgData.data[i + 3] / 255
      if (alpha < 0.01) continue
      const [r, g, b] = heatColor(Math.min(alpha / MAX_OPACITY, 1))
      outData.data[i] = r
      outData.data[i + 1] = g
      outData.data[i + 2] = b
      outData.data[i + 3] = Math.round(alpha * 200)
    }

    ctx.putImageData(outData, 0, 0)
  }, [samples, screenId, width, height])

  if (samples.filter(s => s.screenId === screenId).length === 0) return null

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute top-0 left-0 pointer-events-none rounded-lg"
    />
  )
}

// Blue → cyan → green → yellow → red heatmap
export function heatColor(t: number): [number, number, number] {
  const stops: Array<[number, number, number, number]> = [
    [0.0, 0, 0, 255],
    [0.25, 0, 255, 255],
    [0.5, 0, 255, 0],
    [0.75, 255, 255, 0],
    [1.0, 255, 0, 0],
  ]
  for (let i = 1; i < stops.length; i++) {
    const [t0, r0, g0, b0] = stops[i - 1]
    const [t1, r1, g1, b1] = stops[i]
    if (t <= t1) {
      const f = (t - t0) / (t1 - t0)
      return [
        Math.round(r0 + (r1 - r0) * f),
        Math.round(g0 + (g1 - g0) * f),
        Math.round(b0 + (b1 - b0) * f),
      ]
    }
  }
  return [255, 0, 0]
}
