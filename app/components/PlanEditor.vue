<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useProjectStore } from '~/stores/project'
import type { Point, OpeningType, OpeningVariant, StairType } from '~/types/project'

const { 
  layers, 
  currentLayer, 
  addWall, 
  removeWall, 
  updateWall, 
  addOpening, 
  removeOpening, 
  updateOpening, 
  moveOpeningToWall, 
  toggleOpeningFlip,
  addStair,
  removeStair,
  updateStair
} = useProjectStore()
const canvasRef = ref<HTMLCanvasElement | null>(null)
const activeTool = ref<'wall' | 'opening' | 'stair'>('wall')
const selectedOpeningType = ref<OpeningType>('window')
const selectedOpeningVariant = ref<OpeningVariant>('square')
const selectedStairType = ref<StairType>('straight')

const isDrawing = ref(false)
const isResizing = ref(false)
const isResizingOpening = ref(false)
const isDraggingOpening = ref(false)
const isDraggingStair = ref(false)
const resizingEndpoint = ref<'start' | 'end' | null>(null)
const startPoint = ref<Point | null>(null)
const currentMousePos = ref<Point | null>(null)
const isCtrlPressed = ref(false)
const isShiftPressed = ref(false)
const lockDirection = ref<'none' | 'horizontal' | 'vertical'>('none')
const selectedWallId = ref<string | null>(null)
const selectedOpeningId = ref<{ wallId: string, openingId: string } | null>(null)
const selectedStairId = ref<string | null>(null)

const baseScale = 50 // 50 pixels = 1 meter
const zoom = ref(1.0)
const offset = ref({ x: 0, y: 0 }) // Décalage en pixels
const isPanning = ref(false)
const lastMousePos = ref({ x: 0, y: 0 })

const DOOR_SIMPLE_WIDTH = 0.9
const DOOR_DOUBLE_WIDTH = DOOR_SIMPLE_WIDTH * 2

function rotateSelectedStair() {
  if (selectedStairId.value) {
    const stair = layers.value.flatMap(l => l.stairs || []).find(s => s.id === selectedStairId.value)
    if (stair) {
      const newRotation = (stair.rotation + Math.PI / 2) % (Math.PI * 2)
      updateStair(selectedStairId.value, { rotation: newRotation })
      draw()
    }
  }
}

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

  if ((e.key === 'Delete' || e.key === 'Backspace')) {
    if (selectedOpeningId.value) {
      removeOpening(selectedOpeningId.value.wallId, selectedOpeningId.value.openingId)
      selectedOpeningId.value = null
      draw()
    } else if (selectedWallId.value) {
      removeWall(selectedWallId.value)
      selectedWallId.value = null
      draw()
    } else if (selectedStairId.value) {
      removeStair(selectedStairId.value)
      selectedStairId.value = null
      draw()
    }
  }

  if (e.key === 'r' || e.key === 'R') {
    rotateSelectedStair()
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

function findWallEndpointAt(pos: Point, wallId?: string): { wallId: string, endpoint: 'start' | 'end', point: Point } | null {
  const threshold = 0.2 // Seuil de magnétisme légèrement plus grand (10px)
  
  for (const layer of layers.value) {
    if (!layer.visible) continue
    
    for (const wall of layer.walls) {
      if (wallId && wall.id !== wallId) continue
      
      const distStart = Math.sqrt((pos.x - wall.start.x) ** 2 + (pos.y - wall.start.y) ** 2)
      if (distStart < threshold) return { wallId: wall.id, endpoint: 'start', point: { ...wall.start } }
      
      const distEnd = Math.sqrt((pos.x - wall.end.x) ** 2 + (pos.y - wall.end.y) ** 2)
      if (distEnd < threshold) return { wallId: wall.id, endpoint: 'end', point: { ...wall.end } }
    }
  }
  return null
}

function getConstrainedMousePos(e: MouseEvent): Point {
  const rawPos = getMousePos(e)
  
  // Magnétisme aux extrémités d'abord
  const endpointInfo = findWallEndpointAt(rawPos)
  if (endpointInfo) return endpointInfo.point

  if ((isDrawing.value || isResizing.value) && startPoint.value && isCtrlPressed.value) {
    if (lockDirection.value === 'none') {
      const dx = Math.abs(rawPos.x - startPoint.value.x)
      const dy = Math.abs(rawPos.y - startPoint.value.y)
      
      // Seuil de détection de 5 pixels (0.1 unité à l'échelle 50)
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

function findOpeningAt(pos: Point): { wallId: string, openingId: string } | null {
  const threshold = 0.1

  for (const layer of layers.value) {
    if (!layer.visible) continue
    for (const wall of layer.walls) {
      const dx = wall.end.x - wall.start.x
      const dy = wall.end.y - wall.start.y
      const wallLength = Math.sqrt(dx * dx + dy * dy)
      
      for (const opening of wall.openings) {
        const opStartX = wall.start.x + (dx * (opening.position - opening.width / 2 / wallLength))
        const opStartY = wall.start.y + (dy * (opening.position - opening.width / 2 / wallLength))
        const opEndX = wall.start.x + (dx * (opening.position + opening.width / 2 / wallLength))
        const opEndY = wall.start.y + (dy * (opening.position + opening.width / 2 / wallLength))
        
        // Distance point à segment de l'ouverture
        const odx = opEndX - opStartX
        const ody = opEndY - opStartY
        const oLengthSq = odx * odx + ody * ody
        
        let t = ((pos.x - opStartX) * odx + (pos.y - opStartY) * ody) / oLengthSq
        t = Math.max(0, Math.min(1, t))
        
        const projX = opStartX + t * odx
        const projY = opStartY + t * ody
        
        const dist = Math.sqrt((pos.x - projX) ** 2 + (pos.y - projY) ** 2)
        if (dist < threshold) {
          return { wallId: wall.id, openingId: opening.id }
        }
      }
    }
  }
  return null
}

function findOpeningHandleAt(pos: Point, wallId: string, openingId: string): 'start' | 'end' | null {
  const threshold = 0.2
  const wall = layers.value.flatMap(l => l.walls).find(w => w.id === wallId)
  if (!wall) return null
  
  const opening = wall.openings.find(o => o.id === openingId)
  if (!opening) return null
  
  const dx = wall.end.x - wall.start.x
  const dy = wall.end.y - wall.start.y
  const wallLength = Math.sqrt(dx * dx + dy * dy)
  
  const opStartPos = opening.position - (opening.width / 2 / wallLength)
  const opEndPos = opening.position + (opening.width / 2 / wallLength)
  
  const pStart = {
    x: wall.start.x + dx * opStartPos,
    y: wall.start.y + dy * opStartPos
  }
  const pEnd = {
    x: wall.start.x + dx * opEndPos,
    y: wall.start.y + dy * opEndPos
  }
  
  const dStart = Math.sqrt((pos.x - pStart.x)**2 + (pos.y - pStart.y)**2)
  if (dStart < threshold) return 'start'
  
  const dEnd = Math.sqrt((pos.x - pEnd.x)**2 + (pos.y - pEnd.y)**2)
  if (dEnd < threshold) return 'end'
  
  return null
}

function findStairAt(pos: Point): string | null {
  const threshold = 0.5 // ~25px
  for (const layer of layers.value) {
    if (!layer.visible) continue
    for (const stair of layer.stairs ?? []) {
      const r = Math.max(stair.width, stair.length) / 2
      const dx = pos.x - stair.position.x
      const dy = pos.y - stair.position.y
      const dist = Math.sqrt(dx*dx + dy*dy)
      if (dist <= r + threshold) {
        return stair.id
      }
    }
  }
  return null
}

function startDrawing(e: MouseEvent) {
  if (isShiftPressed.value) {
    isPanning.value = true
    lastMousePos.value = { x: e.clientX, y: e.clientY }
    return
  }

  const pos = getMousePos(e)
  
  // Gérer la sélection et le redimensionnement des ouvertures
  if (selectedOpeningId.value) {
    const wall = layers.value.flatMap(l => l.walls).find(w => w.id === selectedOpeningId.value?.wallId)
    const opening = wall?.openings.find(o => o.id === selectedOpeningId.value?.openingId)
    
    const handle = findOpeningHandleAt(pos, selectedOpeningId.value.wallId, selectedOpeningId.value.openingId)
    if (handle && opening && !(opening.type === 'door' && opening.variant === 'double')) {
      isResizingOpening.value = true
      resizingEndpoint.value = handle
      return
    }
  }

  const clickedOpening = findOpeningAt(pos)
  if (clickedOpening) {
    selectedOpeningId.value = clickedOpening
    selectedWallId.value = null
    selectedStairId.value = null
    isDraggingOpening.value = true
    draw()
    return
  }

  // Si on clique sur un escalier existant, le sélectionner et activer le déplacement
  const clickedStairId = findStairAt(pos)
  if (clickedStairId) {
    selectedStairId.value = clickedStairId
    selectedWallId.value = null
    selectedOpeningId.value = null
    isDraggingStair.value = true
    draw()
    return
  }

  // Si l'outil est "ouverture", on essaie de placer une ouverture
  if (activeTool.value === 'opening') {
    const wallId = findWallAt(pos)
    if (wallId) {
      const wall = layers.value.flatMap(l => l.walls).find(w => w.id === wallId)
      if (wall) {
        // Calculer la position relative (0 à 1) sur le mur
        const dx = wall.end.x - wall.start.x
        const dy = wall.end.y - wall.start.y
        const lengthSq = dx * dx + dy * dy
        let t = ((pos.x - wall.start.x) * dx + (pos.y - wall.start.y) * dy) / lengthSq
        t = Math.max(0, Math.min(1, t))
        
        const defaultWidth = selectedOpeningType.value === 'door' && selectedOpeningVariant.value === 'double' ? DOOR_DOUBLE_WIDTH : DOOR_SIMPLE_WIDTH
        addOpening(wallId, selectedOpeningType.value, selectedOpeningVariant.value, t, defaultWidth)
        draw()
      }
    } else {
      // Désélectionner si on clique à côté
      selectedWallId.value = null
      selectedOpeningId.value = null
      selectedStairId.value = null
      draw()
    }
    return
  }

  // Si l'outil est "escalier", on place un escalier au clic
  if (activeTool.value === 'stair') {
    addStair(selectedStairType.value, pos, 0)
    selectedStairId.value = null
    selectedWallId.value = null
    selectedOpeningId.value = null
    draw()
    return
  }

  // Si un mur est déjà sélectionné, vérifier si on clique sur une poignée (extrémité)
  if (selectedWallId.value) {
    const endpointInfo = findWallEndpointAt(pos, selectedWallId.value)
    if (endpointInfo) {
      isResizing.value = true
      resizingEndpoint.value = endpointInfo.endpoint
      // Le point de départ pour la contrainte est l'autre extrémité
      const wall = layers.value.flatMap(l => l.walls).find(w => w.id === selectedWallId.value)
      if (wall) {
        startPoint.value = endpointInfo.endpoint === 'start' ? wall.end : wall.start
      }
      return
    }
  }

  // Priorité : Magnétisme aux extrémités pour démarrer un nouveau mur
  const endpointInfo = findWallEndpointAt(pos)
  if (endpointInfo) {
    selectedWallId.value = null
    selectedOpeningId.value = null
    selectedStairId.value = null
    isDrawing.value = true
    lockDirection.value = 'none'
    startPoint.value = endpointInfo.point
    currentMousePos.value = endpointInfo.point
    draw()
    return
  }
  
  const clickedWallId = findWallAt(pos)
  
  if (clickedWallId) {
    selectedWallId.value = clickedWallId
    selectedOpeningId.value = null
    selectedStairId.value = null
    draw()
    return
  }
  
  // Désélectionner tout si on clique dans le vide (et qu'on ne clique pas sur un outil spécifique)
  selectedWallId.value = null
  selectedOpeningId.value = null
  selectedStairId.value = null

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

  const pos = getMousePos(e)

  // Gérer le curseur de la souris
  if (!isDrawing.value && !isResizing.value && !isResizingOpening.value && !isDraggingOpening.value) {
    if (selectedOpeningId.value) {
      const wall = layers.value.flatMap(l => l.walls).find(w => w.id === selectedOpeningId.value?.wallId)
      const opening = wall?.openings.find(o => o.id === selectedOpeningId.value?.openingId)
      const isDoubleDoor = opening?.type === 'door' && opening?.variant === 'double'

      if (!isDoubleDoor && findOpeningHandleAt(pos, selectedOpeningId.value.wallId, selectedOpeningId.value.openingId)) {
        canvasRef.value!.style.cursor = 'move'
      } else if (findOpeningAt(pos)) {
        canvasRef.value!.style.cursor = 'move'
      } else {
        canvasRef.value!.style.cursor = 'crosshair'
      }
    } else if (selectedWallId.value) {
      const endpointInfo = findWallEndpointAt(pos, selectedWallId.value)
      if (endpointInfo) {
        canvasRef.value!.style.cursor = 'move'
      } else if (findWallAt(pos)) {
        canvasRef.value!.style.cursor = 'pointer'
      } else {
        canvasRef.value!.style.cursor = 'crosshair'
      }
    } else if (selectedStairId.value) {
      if (findStairAt(pos) === selectedStairId.value) {
        canvasRef.value!.style.cursor = 'move'
      } else if (findStairAt(pos)) {
        canvasRef.value!.style.cursor = 'pointer'
      } else {
        canvasRef.value!.style.cursor = 'crosshair'
      }
    } else if (findOpeningAt(pos)) {
      canvasRef.value!.style.cursor = 'move'
    } else if (findStairAt(pos)) {
      canvasRef.value!.style.cursor = 'pointer'
    } else if (findWallAt(pos)) {
      canvasRef.value!.style.cursor = 'pointer'
    } else {
      canvasRef.value!.style.cursor = 'crosshair'
    }
  }

  if (isDraggingStair.value && selectedStairId.value) {
    updateStair(selectedStairId.value, { position: pos })
    draw()
    return
  }

  if (isResizingOpening.value && selectedOpeningId.value && resizingEndpoint.value) {
    const wall = layers.value.flatMap(l => l.walls).find(w => w.id === selectedOpeningId.value?.wallId)
    const opening = wall?.openings.find(o => o.id === selectedOpeningId.value?.openingId)
    if (wall && opening) {
      const dx = wall.end.x - wall.start.x
      const dy = wall.end.y - wall.start.y
      const wallLength = Math.sqrt(dx * dx + dy * dy)
      
      // Position de la souris sur le mur
      const lengthSq = dx * dx + dy * dy
      let t = ((pos.x - wall.start.x) * dx + (pos.y - wall.start.y) * dy) / lengthSq
      t = Math.max(0, Math.min(1, t))
      
      let newWidth
      let newPosition

      if (resizingEndpoint.value === 'start') {
        const endPos = opening.position + (opening.width / 2 / wallLength)
        newWidth = Math.max(0.1, (endPos - t) * wallLength)
        newPosition = endPos - (newWidth / 2 / wallLength)
      } else {
        const startPos = opening.position - (opening.width / 2 / wallLength)
        newWidth = Math.max(0.1, (t - startPos) * wallLength)
        newPosition = startPos + (newWidth / 2 / wallLength)
      }
      
      updateOpening(wall.id, opening.id, { width: newWidth, position: newPosition })
      draw()
    }
    return
  }

  if (isDraggingOpening.value && selectedOpeningId.value) {
    let wall = layers.value.flatMap(l => l.walls).find(w => w.id === selectedOpeningId.value?.wallId)
    const opening = wall?.openings.find(o => o.id === selectedOpeningId.value?.openingId)
    
    if (wall && opening) {
      // Détecter si la souris est sur un autre mur
      const otherWallId = findWallAt(pos)
      if (otherWallId && otherWallId !== wall.id) {
        moveOpeningToWall(wall.id, otherWallId, opening.id)
        selectedOpeningId.value.wallId = otherWallId
        // Mettre à jour la référence locale du mur pour la suite du calcul
        wall = layers.value.flatMap(l => l.walls).find(w => w.id === otherWallId)
      }

      if (wall) {
        const dx = wall.end.x - wall.start.x
        const dy = wall.end.y - wall.start.y
        const wallLength = Math.sqrt(dx * dx + dy * dy)
        
        const lengthSq = dx * dx + dy * dy
        let t = ((pos.x - wall.start.x) * dx + (pos.y - wall.start.y) * dy) / lengthSq
        
        // Contraindre pour que l'ouverture reste dans le mur
        const minT = (opening.width / 2) / wallLength
        const maxT = 1 - minT
        t = Math.max(minT, Math.min(maxT, t))
        
        updateOpening(wall.id, opening.id, { position: t })
        draw()
      }
    }
    return
  }

  if (isResizing.value && selectedWallId.value && resizingEndpoint.value) {
    const newPos = getConstrainedMousePos(e)
    const wall = layers.value.flatMap(l => l.walls).find(w => w.id === selectedWallId.value)
    if (wall) {
      if (resizingEndpoint.value === 'start') {
        updateWall(selectedWallId.value, newPos, wall.end)
      } else {
        updateWall(selectedWallId.value, wall.start, newPos)
      }
      draw()
    }
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

  if (isResizingOpening.value) {
    isResizingOpening.value = false
    resizingEndpoint.value = null
    draw()
    return
  }

  if (isResizing.value) {
    isResizing.value = false
    resizingEndpoint.value = null
    draw()
    return
  }

  if (isDraggingOpening.value) {
    isDraggingOpening.value = false
    draw()
    return
  }

  if (isDraggingStair.value) {
    isDraggingStair.value = false
    draw()
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

    // Dessiner les escaliers d'abord (sous les murs)
    layer.stairs?.forEach(stair => {
      const isSelected = stair.id === selectedStairId.value
      const px = stair.position.x * currentScale
      const py = stair.position.y * currentScale

      ctx.save()
      ctx.translate(px, py)
      ctx.rotate(stair.rotation)

      // Styles
      ctx.strokeStyle = isSelected ? '#e74c3c' : '#2ecc71'
      ctx.lineWidth = isSelected ? 3 : 2

      if (stair.type === 'straight') {
        const w = stair.width * currentScale
        const l = stair.length * currentScale
        // rectangle de l'emprise
        ctx.strokeRect(-w/2, -l/2, w, l)
        // marches
        const stepCount = Math.max(3, stair.steps)
        for (let i = 1; i < stepCount; i++) {
          const y = -l/2 + (l/stepCount) * i
          ctx.beginPath()
          ctx.moveTo(-w/2, y)
          ctx.lineTo(w/2, y)
          ctx.stroke()
        }
        // flèche de montée
        ctx.beginPath()
        ctx.moveTo(0, l/2 - 10)
        ctx.lineTo(0, -l/2 + 10)
        ctx.stroke()
      } else if (stair.type === 'corner') {
        const w = stair.width * currentScale
        const l = stair.length * currentScale / 2
        // forme en L
        ctx.strokeRect(-w/2, -l - w/2, w, l) // branche 1
        ctx.strokeRect(-w/2, -w/2, l, w)     // branche 2
        // marches stylisées
        const stepCount = Math.max(3, Math.floor(stair.steps/2))
        for (let i = 1; i < stepCount; i++) {
          const y = -l - w/2 + (l/stepCount) * i
          ctx.beginPath(); ctx.moveTo(-w/2, y); ctx.lineTo(w/2, y); ctx.stroke()
        }
        for (let i = 1; i < stepCount; i++) {
          const x = -w/2 + (l/stepCount) * i
          ctx.beginPath(); ctx.moveTo(x, -w/2); ctx.lineTo(x, w/2); ctx.stroke()
        }
      } else if (stair.type === 'spiral') {
        const r = (stair.width * 0.5) * currentScale
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke()
        // spirale simple
        ctx.beginPath()
        const turns = 1.25
        const segments = 24
        for (let i = 0; i <= segments; i++) {
          const t = i / segments
          const a = turns * Math.PI * 2 * t
          const rr = (r * 0.2) + (r * 0.8) * t
          const x = Math.cos(a) * rr
          const y = Math.sin(a) * rr
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
        }
        ctx.stroke()
        // noyau
        ctx.beginPath(); ctx.arc(0, 0, r*0.1, 0, Math.PI*2); ctx.stroke()
      }

      ctx.restore()
    })
    
    layer.walls.forEach(wall => {
      const isSelected = wall.id === selectedWallId.value
      const wallDx = wall.end.x - wall.start.x
      const wallDy = wall.end.y - wall.start.y
      const wallLength = Math.sqrt(wallDx * wallDx + wallDy * wallDy)
      const wallAngle = Math.atan2(wallDy, wallDx)

      ctx.strokeStyle = isSelected ? 'red' : (layer.id === currentLayer.value?.id ? '#000' : '#999')
      ctx.lineWidth = isSelected ? 7 : 5
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      
      // Dessiner le mur (en plusieurs segments s'il y a des ouvertures)
      const sortedOpenings = [...wall.openings].sort((a, b) => a.position - b.position)
      let lastT = 0
      
      sortedOpenings.forEach(op => {
        const startT = op.position - (op.width / 2 / wallLength)
        const endT = op.position + (op.width / 2 / wallLength)
        
        // Segment de mur avant l'ouverture
        ctx.beginPath()
        ctx.moveTo((wall.start.x + wallDx * lastT) * currentScale, (wall.start.y + wallDy * lastT) * currentScale)
        ctx.lineTo((wall.start.x + wallDx * startT) * currentScale, (wall.start.y + wallDy * startT) * currentScale)
        ctx.stroke()
        
        // Dessiner l'ouverture
        const isOpSelected = selectedOpeningId.value?.wallId === wall.id && selectedOpeningId.value?.openingId === op.id
        ctx.save()
        ctx.translate((wall.start.x + wallDx * op.position) * currentScale, (wall.start.y + wallDy * op.position) * currentScale)
        ctx.rotate(wallAngle)
        
        const opWidthPx = op.width * currentScale
        
        if (op.type === 'window') {
          ctx.strokeStyle = isOpSelected ? 'red' : '#3498db'
          ctx.lineWidth = isOpSelected ? 4 : 2
          ctx.strokeRect(-opWidthPx/2, -5, opWidthPx, 10)
          ctx.fillStyle = 'rgba(52, 152, 219, 0.2)'
          ctx.fillRect(-opWidthPx/2, -5, opWidthPx, 10)
          
          // Symbole fenêtre (double trait au milieu si rectangulaire par exemple)
          ctx.beginPath()
          ctx.moveTo(-opWidthPx/2, 0)
          ctx.lineTo(opWidthPx/2, 0)
          ctx.stroke()
        } else {
          // Porte
          ctx.strokeStyle = isOpSelected ? 'red' : '#e67e22'
          ctx.lineWidth = isOpSelected ? 4 : 2
          
          const flip = op.flipped ? -1 : 1
          
          if (op.variant === 'simple') {
            // Arc de cercle pour l'ouverture
            ctx.setLineDash([5, 5])
            ctx.beginPath()
            // Centre à gauche (-opWidthPx/2), arc de 0 (bord droit) vers -PI/2 (90° haut) ou PI/2 (90° bas)
            // L'angle final doit être -Math.PI/2 * flip. 
            // Si flip = 1, on va de 0 à -PI/2 (90° vers le haut). 
            // Si flip = -1, on va de 0 à PI/2 (90° vers le bas).
            // Le paramètre anticlockwise doit être true si flip = 1 (-PI/2 < 0) et false si flip = -1 (PI/2 > 0)
            ctx.arc(-opWidthPx/2, 0, opWidthPx, 0, -Math.PI/2 * flip, flip === 1)
            ctx.stroke()
            ctx.setLineDash([])
            
            // Le battant de la porte
            ctx.beginPath()
            ctx.moveTo(-opWidthPx/2, 0)
            ctx.lineTo(-opWidthPx/2, -opWidthPx * flip)
            ctx.stroke()
          } else {
            // Porte double
            ctx.setLineDash([5, 5])
            // Arc gauche : centre à -opWidthPx/2, rayon opWidthPx/2, de 0 vers -PI/2 * flip
            ctx.beginPath()
            ctx.arc(-opWidthPx/2, 0, opWidthPx/2, 0, -Math.PI/2 * flip, flip === 1)
            ctx.stroke()
            // Arc droit : centre à opWidthPx/2, rayon opWidthPx/2, de PI vers PI + PI/2 * flip
            // Si flip = 1, on va de PI à PI - PI/2 = PI/2. Anticlockwise = false (horaire)
            // Si flip = -1, on va de PI à PI + PI/2 = 3PI/2. Anticlockwise = true (anti-horaire)
            ctx.beginPath()
            ctx.arc(opWidthPx/2, 0, opWidthPx/2, Math.PI, Math.PI + Math.PI/2 * flip, flip === -1)
            ctx.stroke()
            ctx.setLineDash([])
            
            // Battants
            ctx.beginPath()
            ctx.moveTo(-opWidthPx/2, 0); ctx.lineTo(-opWidthPx/2, -opWidthPx/2 * flip)
            ctx.moveTo(opWidthPx/2, 0); ctx.lineTo(opWidthPx/2, -opWidthPx/2 * flip)
            ctx.stroke()
          }
        }
        
        // Poignées de redimensionnement de l'ouverture si sélectionnée
        if (isOpSelected && !(op.type === 'door' && op.variant === 'double')) {
          ctx.fillStyle = 'white'
          ctx.strokeStyle = 'red'
          ctx.lineWidth = 1
          ctx.beginPath(); ctx.arc(-opWidthPx/2, 0, 4, 0, Math.PI*2); ctx.fill(); ctx.stroke()
          ctx.beginPath(); ctx.arc(opWidthPx/2, 0, 4, 0, Math.PI*2); ctx.fill(); ctx.stroke()
        }
        
        ctx.restore()
        lastT = endT
      })
      
      // Dernier segment de mur
      ctx.beginPath()
      ctx.moveTo((wall.start.x + wallDx * lastT) * currentScale, (wall.start.y + wallDy * lastT) * currentScale)
      ctx.lineTo(wall.end.x * currentScale, wall.end.y * currentScale)
      ctx.stroke()

      // Dessiner des poignées si mur sélectionné
      if (isSelected) {
        ctx.fillStyle = 'white'
        ctx.strokeStyle = 'red'
        ctx.lineWidth = 2
        
        // Début
        ctx.beginPath()
        ctx.arc(wall.start.x * currentScale, wall.start.y * currentScale, 6, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        
        // Fin
        ctx.beginPath()
        ctx.arc(wall.end.x * currentScale, wall.end.y * currentScale, 6, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      }
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
    <div class="toolbar">
      <button 
        @click="activeTool = 'wall'; selectedWallId = null; selectedOpeningId = null; draw()" 
        :class="{ active: activeTool === 'wall' }"
      >
        Mur
      </button>
      
      <div class="divider"></div>

      <div class="tool-group">
        <div class="tool-row">
          <button 
            @click="activeTool = 'opening'; selectedOpeningType = 'window'; selectedOpeningVariant = 'square'; selectedWallId = null; selectedOpeningId = null; draw()" 
            :class="{ active: activeTool === 'opening' && selectedOpeningType === 'window' && selectedOpeningVariant === 'square' }"
          >
            Fenêtre Carrée
          </button>
          <button 
            @click="activeTool = 'opening'; selectedOpeningType = 'window'; selectedOpeningVariant = 'rectangular'; selectedWallId = null; selectedOpeningId = null; draw()" 
            :class="{ active: activeTool === 'opening' && selectedOpeningType === 'window' && selectedOpeningVariant === 'rectangular' }"
          >
            Fenêtre Rect.
          </button>
        </div>
        <div class="tool-row">
          <button 
            @click="activeTool = 'opening'; selectedOpeningType = 'door'; selectedOpeningVariant = 'simple'; selectedWallId = null; selectedOpeningId = null; draw()" 
            :class="{ active: activeTool === 'opening' && selectedOpeningType === 'door' && selectedOpeningVariant === 'simple' }"
          >
            Porte Simple
          </button>
          <button 
            @click="activeTool = 'opening'; selectedOpeningType = 'door'; selectedOpeningVariant = 'double'; selectedWallId = null; selectedOpeningId = null; draw()" 
            :class="{ active: activeTool === 'opening' && selectedOpeningType === 'door' && selectedOpeningVariant === 'double' }"
          >
            Porte Double
          </button>
        </div>
      </div>

      <div class="divider"></div>

      <div class="tool-group">
        <div class="tool-row">
          <button
            @click="activeTool = 'stair'; selectedStairType = 'straight'; selectedWallId = null; selectedOpeningId = null; selectedStairId = null; draw()"
            :class="{ active: activeTool === 'stair' && selectedStairType === 'straight' }"
          >
            Escalier Droit
          </button>
          <button
            @click="activeTool = 'stair'; selectedStairType = 'corner'; selectedWallId = null; selectedOpeningId = null; selectedStairId = null; draw()"
            :class="{ active: activeTool === 'stair' && selectedStairType === 'corner' }"
          >
            Escalier d'angle
          </button>
          <button
            @click="activeTool = 'stair'; selectedStairType = 'spiral'; selectedWallId = null; selectedOpeningId = null; selectedStairId = null; draw()"
            :class="{ active: activeTool === 'stair' && selectedStairType === 'spiral' }"
          >
            Escalier colimaçon
          </button>
        </div>
      </div>

      <div v-if="selectedOpeningId" class="divider"></div>

      <div v-if="selectedOpeningId" class="selection-info">
        <div 
          v-if="layers.flatMap(l => l.walls).find(w => w.id === selectedOpeningId?.wallId)?.openings.find(o => o.id === selectedOpeningId?.openingId)?.type === 'door'"
          class="opening-actions"
        >
          <div class="switch-container">
            <label for="toggle-sens" class="label">Inverser Sens</label>
            <label class="switch">
              <input
                  id="toggle-sens"
                  type="checkbox"
                  :checked="layers.flatMap(l => l.walls).find(w => w.id === selectedOpeningId?.wallId)?.openings.find(o => o.id === selectedOpeningId?.openingId)?.flipped"
                  @change="toggleOpeningFlip(selectedOpeningId?.wallId, selectedOpeningId?.openingId); draw()"
              >
              <span class="slider round"></span>
            </label>
          </div>
        </div>
      </div>

      <div v-if="selectedStairId" class="divider"></div>

      <div v-if="selectedStairId" class="selection-info">
        <button 
          @click="rotateSelectedStair"
        >
          Tourner 90° (R)
        </button>
      </div>
    </div>

    <canvas 
      ref="canvasRef" 
      width="800" 
      height="600"
      @mousedown="startDrawing"
      @mousemove="handleMouseMove"
      @mouseup="endDrawing"
      class="border bg-white cursor-crosshair"
    ></canvas>
    <div class="help-text">
      <strong>Outils :</strong> Dessinez des murs, placez des ouvertures et des escaliers sur le plan.<br>
      <strong>Murs :</strong> Cliquez et glissez. Cliquez sur un mur pour le sélectionner. <strong>Ctrl</strong> pour contraindre.<br>
      <strong>Ouvertures :</strong> Choisissez un type puis cliquez sur un mur. Redimensionnez par poignées, double porte non redimensionnable. Inverser le sens via l'interrupteur.<br>
      <strong>Escaliers :</strong> Choisissez un type (droit, d'angle, colimaçon) puis cliquez pour placer. Supprimez avec Suppr/Retour. Utilisez <strong>R</strong> pour tourner de 90°.
      <br>
      <strong>Navigation :</strong> Maintenez <strong>Maj + Glisser</strong> pour déplacer le plan. <strong>Ctrl + Molette</strong> pour zoomer.
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

/* Toolbar vanilla styling */
.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background-color: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  margin-bottom: 16px;
}

.toolbar button {
  padding: 8px 16px;
  border-radius: 4px;
  border: 1px solid #e5e7eb;
  background-color: white;
  cursor: pointer;
  font-size: 14px;
}

.toolbar button:hover {
  background-color: #f9fafb;
}

.toolbar button.active {
  background-color: #2563eb;
  color: white;
}

.tool-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tool-row {
  display: flex;
  gap: 4px;
}

.divider {
  height: 32px;
  width: 1px;
  background-color: #d1d5db;
  margin: 0 4px;
}

.selection-info {
  display: flex;
  align-items: center;
  gap: 4px;
}

.selection-label {
  font-size: 12px;
  color: #6b7280;
}

.opening-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 8px;
}

.opening-actions .label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

/* The switch - the box around the slider */
.switch-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  gap: 10px;
}

.switch {
  position: relative;
  display: inline-block;
  width: 36px;
  height: 20px;
}

/* Hide default HTML checkbox */
.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

/* The slider */
.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  -webkit-transition: .4s;
  transition: .4s;
}

.slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  -webkit-transition: .4s;
  transition: .4s;
}

input:checked + .slider {
  background-color: #2196F3;
}

input:focus + .slider {
  box-shadow: 0 0 1px #2196F3;
}

input:checked + .slider:before {
  -webkit-transform: translateX(16px);
  -ms-transform: translateX(16px);
  transform: translateX(16px);
}

/* Rounded sliders */
.slider.round {
  border-radius: 20px;
}

.slider.round:before {
  border-radius: 50%;
}

.help-text {
  margin-top: 8px;
  font-size: 14px;
  color: #4b5563;
  max-width: 42rem;
  text-align: center;
}
</style>
