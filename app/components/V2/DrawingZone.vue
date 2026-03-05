<script setup lang="ts">
import { GRID_SECONDARY_UNIT_SIZE } from '~/composables/toolbar'

const { selectedTool, resetTrigger, zoom, zoomIn, zoomOut } = useToolbar()
const { selectedTool: sidebarSelectedTool } = useToolbarMenu()

interface Point {
  x: number;
  y: number;
}

interface Wall {
  start: Point;
  end: Point;
}

const walls = ref<Wall[]>([])
const firstPoint = ref<Point | null>(null)
const initialPoint = ref<Point | null>(null)
const mousePos = ref<Point | null>(null)

const isSnapped = computed(() => {
  if (!mousePos.value || !initialPoint.value || !firstPoint.value) return false
  return mousePos.value.x === initialPoint.value.x && mousePos.value.y === initialPoint.value.y
})

const drawingZoneRef = ref<HTMLElement | null>(null)

const isDrawingMode = computed(() => {
  return selectedTool.value === 'edit' && sidebarSelectedTool.value === 'wall'
})

const getSvgPoint = (event: MouseEvent | Touch): Point => {
  if (!drawingZoneRef.value) return { x: 0, y: 0 }
  const rect = drawingZoneRef.value.getBoundingClientRect()
  const x = (event.clientX - rect.left - panX.value) / zoom.value
  const y = (event.clientY - rect.top - panY.value) / zoom.value
  return { x, y }
}

const isDragging = ref(false)
const panX = ref(0)
const panY = ref(0)
const lastMouseX = ref(0)
const lastMouseY = ref(0)

const isResetting = ref(false)

watch(resetTrigger, () => {
  isResetting.value = true
  panX.value = 0
  panY.value = 0
  
  // Désactive la transition après qu'elle soit terminée
  // On utilise un timeout correspondant à la durée de la transition CSS (300ms)
  setTimeout(() => {
    isResetting.value = false
  }, 300)
})

const onWheel = (event: WheelEvent) => {
  if (event.ctrlKey) {
    event.preventDefault()
    if (event.deltaY < 0) {
      zoomIn()
    } else {
      zoomOut()
    }
  }
}

const onKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && isDrawingMode.value) {
    firstPoint.value = null
    initialPoint.value = null
    mousePos.value = null
    return
  }
  if (event.ctrlKey) {
    if (event.key === '+' || event.key === '=') {
      event.preventDefault()
      zoomIn()
    } else if (event.key === '-' || event.key === '_') {
      event.preventDefault()
      zoomOut()
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
})

const SNAP_TOLERANCE = 1.0 // Unité SVG (environ 1m dans la config actuelle)

const onMouseDown = (event: MouseEvent) => {
  if (isDrawingMode.value) {
    let point = getSvgPoint(event)
    
    // Vérouillage directionnel (orthogonal) si Ctrl est enfoncé
    if (event.ctrlKey && firstPoint.value) {
      const dx = Math.abs(point.x - firstPoint.value.x)
      const dy = Math.abs(point.y - firstPoint.value.y)
      if (dx > dy) {
        point.y = firstPoint.value.y
      } else {
        point.x = firstPoint.value.x
      }
    }
    
    // Si on a un point initial et qu'on clique sur le point de départ (avec snapping)
    if (initialPoint.value && firstPoint.value) {
      const dist = Math.sqrt(Math.pow(point.x - initialPoint.value.x, 2) + Math.pow(point.y - initialPoint.value.y, 2))
      if (dist < SNAP_TOLERANCE) { 
        // On ferme le tracé avec un mur vers le point initial exact pour une fermeture propre
        walls.value.push({
          start: firstPoint.value,
          end: { ...initialPoint.value }
        })
        firstPoint.value = null
        initialPoint.value = null
        mousePos.value = null
        return
      }
    }

    if (!firstPoint.value) {
      firstPoint.value = point
      initialPoint.value = point
      mousePos.value = point
    } else {
      walls.value.push({
        start: firstPoint.value,
        end: point
      })
      // Au lieu de mettre firstPoint à null, on le met au point actuel pour continuer
      firstPoint.value = point
      mousePos.value = point
    }
    return
  }
  if (selectedTool.value !== 'move') return
  isDragging.value = true
  lastMouseX.value = event.clientX
  lastMouseY.value = event.clientY
}

const onMouseMove = (event: MouseEvent) => {
  if (isDrawingMode.value && firstPoint.value) {
    let point = getSvgPoint(event)
    
    // Vérouillage directionnel (orthogonal) si Ctrl est enfoncé
    if (event.ctrlKey) {
      const dx = Math.abs(point.x - firstPoint.value.x)
      const dy = Math.abs(point.y - firstPoint.value.y)
      
      if (dx > dy) {
        // Déplacement principalement horizontal
        point.y = firstPoint.value.y
      } else {
        // Déplacement principalement vertical
        point.x = firstPoint.value.x
      }
    }
    
    // Snapping au point de départ
    if (initialPoint.value) {
      const dist = Math.sqrt(Math.pow(point.x - initialPoint.value.x, 2) + Math.pow(point.y - initialPoint.value.y, 2))
      if (dist < SNAP_TOLERANCE) {
        mousePos.value = { ...initialPoint.value }
        return
      }
    }
    
    mousePos.value = point
    return
  }
  if (!isDragging.value || selectedTool.value !== 'move') return
  
  const deltaX = (event.clientX - lastMouseX.value)
  const deltaY = (event.clientY - lastMouseY.value)
  
  panX.value += deltaX
  panY.value += deltaY
  
  lastMouseX.value = event.clientX
  lastMouseY.value = event.clientY
}

const onMouseUp = () => {
  isDragging.value = false
}

const onTouchStart = (event: TouchEvent) => {
  if (selectedTool.value !== 'move' || event.touches.length !== 1) return
  isDragging.value = true
  lastMouseX.value = event.touches[0]!.clientX
  lastMouseY.value = event.touches[0]!.clientY
}

const onTouchMove = (event: TouchEvent) => {
  if (!isDragging.value || selectedTool.value !== 'move' || event.touches.length !== 1) return

  const deltaX = (event.touches[0]!.clientX - lastMouseX.value)
  const deltaY = (event.touches[0]!.clientY - lastMouseY.value)

  panX.value += deltaX
  panY.value += deltaY

  lastMouseX.value = event.touches[0]!.clientX
  lastMouseY.value = event.touches[0]!.clientY
}

const onTouchEnd = () => {
  isDragging.value = false
}

const cursorStyle = computed(() => {
  if (isDrawingMode.value) return 'crosshair'
  if (selectedTool.value === 'move') {
    return isDragging.value ? 'grabbing' : 'grab'
  }
  return 'default'
})
</script>

<template>
  <div 
    ref="drawingZoneRef"
    :class="$style.drawingZone" 
    :style="{ cursor: cursorStyle }"
    @mousedown="onMouseDown"
    @mousemove="onMouseMove"
    @mouseup="onMouseUp"
    @mouseleave="onMouseUp"
    @touchstart.passive="onTouchStart"
    @touchmove.prevent="onTouchMove"
    @touchend="onTouchEnd"
    @wheel="onWheel"
  >
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Grille secondaire (petits carreaux) -->
        <pattern id="smallGrid" :width="GRID_SECONDARY_UNIT_SIZE" :height="GRID_SECONDARY_UNIT_SIZE" patternUnits="userSpaceOnUse">
          <path :d="`M ${GRID_SECONDARY_UNIT_SIZE} 0 L 0 0 0 ${GRID_SECONDARY_UNIT_SIZE}`" fill="none" stroke="#f0f0f0" stroke-width="0.5"/>
        </pattern>
        <!-- Grille principale (gros carreaux) -->
        <pattern id="grid" :width="GRID_SECONDARY_UNIT_SIZE * 10" :height="GRID_SECONDARY_UNIT_SIZE * 10" patternUnits="userSpaceOnUse">
          <rect :width="GRID_SECONDARY_UNIT_SIZE * 10" :height="GRID_SECONDARY_UNIT_SIZE * 10" fill="url(#smallGrid)"/>
          <path :d="`M ${GRID_SECONDARY_UNIT_SIZE * 10} 0 L 0 0 0 ${GRID_SECONDARY_UNIT_SIZE * 10}`" fill="none" stroke="#e0e0e0" stroke-width="1"/>
        </pattern>
      </defs>

      <g 
        :transform="`translate(${panX}, ${panY}) scale(${zoom})`"
        :class="{ [$style.transitioning]: isResetting }"
      >
        <rect x="-10000" y="-10000" width="20000" height="20000" fill="url(#grid)" />

        <!-- Murs fixés -->
        <line
          v-for="(wall, index) in walls"
          :key="index"
          :x1="wall.start.x"
          :y1="wall.start.y"
          :x2="wall.end.x"
          :y2="wall.end.y"
          stroke="black"
          stroke-width="5"
          stroke-linecap="round"
        />

        <!-- Mur de prévisualisation -->
        <line
          v-if="firstPoint && mousePos"
          :x1="firstPoint.x"
          :y1="firstPoint.y"
          :x2="mousePos.x"
          :y2="mousePos.y"
          stroke="blue"
          stroke-width="5"
          stroke-dasharray="5,5"
          stroke-linecap="round"
        />

        <!-- Point de départ initial (pour aider à viser la fermeture) -->
        <circle
          v-if="initialPoint"
          :cx="initialPoint.x"
          :cy="initialPoint.y"
          :r="isSnapped ? 8 : 5"
          fill="blue"
          :fill-opacity="isSnapped ? 0.6 : 0.3"
          style="transition: r 0.1s, fill-opacity 0.1s"
        />
      </g>
    </svg>
  </div>
</template>

<style module>
.drawingZone {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: all;
}

.transitioning {
  transition: transform 0.3s ease-out;
}
</style>
