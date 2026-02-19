<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useProjectStore } from '~/stores/project'
import type { Point } from '~/types/project'

const { layers, currentLayer, addWall, removeWall } = useProjectStore()
const canvasRef = ref<HTMLCanvasElement | null>(null)
const isDrawing = ref(false)
const startPoint = ref<Point | null>(null)
const currentMousePos = ref<Point | null>(null)
const isCtrlPressed = ref(false)
const isShiftPressed = ref(false)
const lockDirection = ref<'none' | 'horizontal' | 'vertical'>('none')
const selectedWallId = ref<string | null>(null)

const baseScale = 50 // 50 pixels = 1 meter
const zoom = ref(1.0)
const offset = ref({ x: 0, y: 0 }) // Décalage en pixels
const isPanning = ref(false)
const lastMousePos = ref({ x: 0, y: 0 })

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Control') {
    isCtrlPressed.value = true
  }
  if (e.key === 'Shift') {
    isShiftPressed.value = true
  }
  
  // Zoom avec Ctrl + "+" ou "-"
  if (isCtrlPressed.value) {
    if (e.key === '+' || e.key === '=') {
      e.preventDefault()
      zoom.value = Math.min(zoom.value * 1.2, 5.0)
      draw()
    } else if (e.key === '-' || e.key === '_') {
      e.preventDefault()
      zoom.value = Math.max(zoom.value / 1.2, 0.2)
      draw()
    }
  }

  if ((e.key === 'Delete' || e.key === 'Backspace') && selectedWallId.value) {
    removeWall(selectedWallId.value)
    selectedWallId.value = null
    draw()
  }
}

function handleKeyUp(e: KeyboardEvent) {
  if (e.key === 'Control') {
    isCtrlPressed.value = false
  }
  if (e.key === 'Shift') {
    isShiftPressed.value = false
    isPanning.value = false
  }
}

function handleWheel(e: WheelEvent) {
  if (isCtrlPressed.value) {
    e.preventDefault()
    const zoomFactor = 1.1
    if (e.deltaY < 0) {
      zoom.value = Math.min(zoom.value * zoomFactor, 5.0)
    } else {
      zoom.value = Math.max(zoom.value / zoomFactor, 0.2)
    }
    draw()
  }
}

function getMousePos(e: MouseEvent): Point {
  const rect = canvasRef.value!.getBoundingClientRect()
  const currentScale = baseScale * zoom.value
  return {
    x: (e.clientX - rect.left - offset.value.x) / currentScale,
    y: (e.clientY - rect.top - offset.value.y) / currentScale
  }
}

function findWallAt(pos: Point): string | null {
  const threshold = 0.1 // Distance en mètres (5px)
  
  for (const layer of layers.value) {
    if (!layer.visible) continue
    
    for (const wall of layer.walls) {
      // Distance point à segment
      const dx = wall.end.x - wall.start.x
      const dy = wall.end.y - wall.start.y
      const lengthSq = dx * dx + dy * dy
      
      let t = ((pos.x - wall.start.x) * dx + (pos.y - wall.start.y) * dy) / lengthSq
      t = Math.max(0, Math.min(1, t))
      
      const projX = wall.start.x + t * dx
      const projY = wall.start.y + t * dy
      
      const dist = Math.sqrt((pos.x - projX) ** 2 + (pos.y - projY) ** 2)
      
      if (dist < threshold) {
        return wall.id
      }
    }
  }
  return null
}

function findWallEndpointAt(pos: Point): Point | null {
  const threshold = 0.2 // Seuil de magnétisme légèrement plus grand (10px)
  
  for (const layer of layers.value) {
    if (!layer.visible) continue
    
    for (const wall of layer.walls) {
      const distStart = Math.sqrt((pos.x - wall.start.x) ** 2 + (pos.y - wall.start.y) ** 2)
      if (distStart < threshold) return { ...wall.start }
      
      const distEnd = Math.sqrt((pos.x - wall.end.x) ** 2 + (pos.y - wall.end.y) ** 2)
      if (distEnd < threshold) return { ...wall.end }
    }
  }
  return null
}

function getConstrainedMousePos(e: MouseEvent): Point {
  const rawPos = getMousePos(e)
  
  // Magnétisme aux extrémités d'abord
  const endpoint = findWallEndpointAt(rawPos)
  if (endpoint) return endpoint

  if (isDrawing.value && startPoint.value && isCtrlPressed.value) {
    if (lockDirection.value === 'none') {
      const dx = Math.abs(rawPos.x - startPoint.value.x)
      const dy = Math.abs(rawPos.y - startPoint.value.y)
      
      // Seuil de détection de 5 pixels (0.1 unités à l'échelle 50)
      // Astuce: on privilégie l'horizontal en cas d'égalité pour éviter un biais vers le vertical
      if (dx > 0.1 || dy > 0.1) {
        lockDirection.value = dx >= dy ? 'horizontal' : 'vertical'
      }
    }

    if (lockDirection.value === 'horizontal') {
      return { x: rawPos.x, y: startPoint.value.y }
    } else if (lockDirection.value === 'vertical') {
      return { x: startPoint.value.x, y: rawPos.y }
    }
  }

  return rawPos
}

function startDrawing(e: MouseEvent) {
  if (isShiftPressed.value) {
    isPanning.value = true
    lastMousePos.value = { x: e.clientX, y: e.clientY }
    return
  }

  const pos = getMousePos(e)
  
  // Priorité : Magnétisme aux extrémités pour démarrer un nouveau mur
  const endpoint = findWallEndpointAt(pos)
  if (endpoint) {
    selectedWallId.value = null
    isDrawing.value = true
    lockDirection.value = 'none'
    startPoint.value = endpoint
    currentMousePos.value = endpoint
    draw()
    return
  }
  
  const clickedWallId = findWallAt(pos)
  
  if (clickedWallId) {
    selectedWallId.value = clickedWallId
    draw()
    return
  }
  
  selectedWallId.value = null
  isDrawing.value = true
  lockDirection.value = 'none'
  startPoint.value = getConstrainedMousePos(e)
  currentMousePos.value = startPoint.value
  draw()
}

function handleMouseMove(e: MouseEvent) {
  if (isPanning.value) {
    const dx = e.clientX - lastMousePos.value.x
    const dy = e.clientY - lastMousePos.value.y
    offset.value.x += dx
    offset.value.y += dy
    lastMousePos.value = { x: e.clientX, y: e.clientY }
    draw()
    return
  }

  if (!isDrawing.value) return
  currentMousePos.value = getConstrainedMousePos(e)
  draw()
}

function endDrawing(e: MouseEvent) {
  if (isPanning.value) {
    isPanning.value = false
    return
  }

  if (!isDrawing.value || !startPoint.value) return
  const endPoint = getConstrainedMousePos(e)
  
  // Only add if there is a minimum length
  const dx = endPoint.x - startPoint.value.x
  const dy = endPoint.y - startPoint.value.y
  if (Math.sqrt(dx*dx + dy*dy) > 0.1) {
    addWall(startPoint.value, endPoint)
  }

  isDrawing.value = false
  startPoint.value = null
  currentMousePos.value = null
  draw()
}

function draw() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const currentScale = baseScale * zoom.value
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  ctx.save()
  ctx.translate(offset.value.x, offset.value.y)

  // Draw grid
  ctx.strokeStyle = '#eee'
  ctx.lineWidth = 1
  
  // Calculate grid bounds based on offset and zoom
  const startX = -Math.floor(offset.value.x / currentScale) * currentScale
  const startY = -Math.floor(offset.value.y / currentScale) * currentScale
  
  for (let x = startX; x < canvas.width - offset.value.x; x += currentScale) {
    ctx.beginPath(); ctx.moveTo(x, -offset.value.y); ctx.lineTo(x, canvas.height - offset.value.y); ctx.stroke()
  }
  for (let y = startY; y < canvas.height - offset.value.y; y += currentScale) {
    ctx.beginPath(); ctx.moveTo(-offset.value.x, y); ctx.lineTo(canvas.width - offset.value.x, y); ctx.stroke()
  }

  // Draw all visible layers
  layers.value.forEach(layer => {
    if (!layer.visible) return
    
    layer.walls.forEach(wall => {
      ctx.strokeStyle = wall.id === selectedWallId.value ? 'red' : (layer.id === currentLayer.value?.id ? '#000' : '#999')
      ctx.lineWidth = wall.id === selectedWallId.value ? 7 : 5
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(wall.start.x * currentScale, wall.start.y * currentScale)
      ctx.lineTo(wall.end.x * currentScale, wall.end.y * currentScale)
      ctx.stroke()
    })
  })

  // Draw current wall preview
  if (isDrawing.value && startPoint.value && currentMousePos.value) {
    ctx.strokeStyle = 'blue'
    ctx.setLineDash([5, 5])
    ctx.beginPath()
    ctx.moveTo(startPoint.value.x * currentScale, startPoint.value.y * currentScale)
    ctx.lineTo(currentMousePos.value.x * currentScale, currentMousePos.value.y * currentScale)
    ctx.stroke()
    ctx.setLineDash([])
  }

  ctx.restore()
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
  canvasRef.value?.addEventListener('wheel', handleWheel, { passive: false })
  draw()
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
  canvasRef.value?.removeEventListener('wheel', handleWheel)
})
</script>

<template>
  <div class="editor-container">
    <canvas 
      ref="canvasRef" 
      width="800" 
      height="600"
      @mousedown="startDrawing"
      @mousemove="handleMouseMove"
      @mouseup="endDrawing"
      class="border bg-white cursor-crosshair"
    ></canvas>
    <div class="mt-2 text-sm text-gray-600">
      Cliquez et glissez pour dessiner un mur. Cliquez sur un mur pour le sélectionner. Appuyez sur <strong>Suppr</strong> pour supprimer. <br>
      Maintenez <strong>Maj + Glisser</strong> pour déplacer le plan. <strong>Ctrl</strong> pour un mur droit. <strong>Ctrl + Molette</strong> ou <strong>Ctrl +/-</strong> pour zoomer. Échelle : 1m = {{ Math.round(baseScale * zoom) }}px
    </div>
  </div>
</template>

<style scoped>
.editor-container {
  display: flex;
  flex-direction: column;
  align-items: center;
}
canvas {
  border: 1px solid #ccc;
}
</style>
