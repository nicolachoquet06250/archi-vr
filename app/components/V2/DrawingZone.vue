<script setup lang="ts">
import { GRID_SECONDARY_UNIT_SIZE, MIN_ZOOM, MAX_ZOOM } from '~/composables/toolbar'
import { usePinch } from '@vueuse/gesture'

const { selectedTool, resetTrigger, zoom, zoomIn, zoomOut, setZoom } = useToolbar()
const { selectedTool: sidebarSelectedTool } = useToolbarMenu()

interface Point {
  x: number;
  y: number;
}

interface Wall {
  id: string;
  start: Point;
  end: Point;
  openings: Opening[];
}

interface Opening {
  id: string;
  type: 'door' | 'window';
  variant: 'simple' | 'double' | 'bay';
  position: number; // 0 à 1 (le long du mur)
  width: number; // en unités SVG
  flipped: boolean; // côté d'ouverture
}

const walls = ref<Wall[]>([])
const selectedWallIndex = ref<number | null>(null)
const selectedOpeningId = ref<string | null>(null)
const firstPoint = ref<Point | null>(null)
const initialPoint = ref<Point | null>(null)
const mousePos = ref<Point | null>(null)

const wallsPathData = computed(() => {
  if (walls.value.length === 0) return ''
  
  let path = ''
  let currentEnd: Point | null = null
  
  walls.value.forEach((wall) => {
    // Si le point de départ du mur actuel n'est pas le point d'arrivée du précédent, on fait un MoveTo
    if (!currentEnd || wall.start.x !== currentEnd.x || wall.start.y !== currentEnd.y) {
      path += `M ${wall.start.x} ${wall.start.y} `
    }
    // LineTo vers le point d'arrivée
    path += `L ${wall.end.x} ${wall.end.y} `
    currentEnd = wall.end
  })
  
  return path.trim()
})

const isSnapped = computed(() => {
  if (!mousePos.value || !initialPoint.value || !firstPoint.value) return false
  return mousePos.value.x === initialPoint.value.x && mousePos.value.y === initialPoint.value.y
})

const drawingZoneRef = ref<HTMLElement | null>(null)

usePinch(({ pinching, offset: [s], event }) => {
  if (event instanceof WheelEvent) {
    if (event.ctrlKey) event.preventDefault()
    return
  }
  if (pinching) {
    setZoom(s)
  }
}, {
  domTarget: drawingZoneRef,
  from: () => [zoom.value, 0],
  scaleBounds: { min: MIN_ZOOM, max: MAX_ZOOM },
  filterTaps: true,
  // On désactive explicitement la reconnaissance du wheel par usePinch
  // car l'utilisateur a supprimé ses propres wheel events et usePinch
  // pourrait essayer de les interpréter s'il n'est pas bridé.
  eventOptions: { passive: false },
  preventDefault: true,
  modifierKey: null,
  pointer: { touch: true }
})

const isDrawingMode = computed(() => {
  return selectedTool.value === 'edit' && sidebarSelectedTool.value === 'wall'
})

const isSelectionMode = computed(() => {
  return selectedTool.value === 'selection' && sidebarSelectedTool.value === 'wall'
})

const isDoorSelectionMode = computed(() => {
  return selectedTool.value === 'selection' && (
    sidebarSelectedTool.value === 'door-simple' || 
    sidebarSelectedTool.value === 'door-double' || 
    sidebarSelectedTool.value === 'window-simple' || 
    sidebarSelectedTool.value === 'window-double' || 
    sidebarSelectedTool.value === 'window-bay'
  )
})

const isBayWindowMode = computed(() => {
  return selectedTool.value === 'edit' && sidebarSelectedTool.value === 'window-bay'
})

const isDoorMode = computed(() => {
  return selectedTool.value === 'edit' && sidebarSelectedTool.value === 'door-simple'
})

const isDoubleDoorMode = computed(() => {
  return selectedTool.value === 'edit' && sidebarSelectedTool.value === 'door-double'
})

const isWindowMode = computed(() => {
  return selectedTool.value === 'edit' && sidebarSelectedTool.value === 'window-simple'
})

const isDoubleWindowMode = computed(() => {
  return selectedTool.value === 'edit' && sidebarSelectedTool.value === 'window-double'
})

const getSvgPoint = (event: MouseEvent | Touch): Point => {
  if (!drawingZoneRef.value) return { x: 0, y: 0 }
  const rect = drawingZoneRef.value.getBoundingClientRect()
  const x = (event.clientX - rect.left - panX.value) / zoom.value
  const y = (event.clientY - rect.top - panY.value) / zoom.value
  return { x, y }
}

const isResizeMode = computed(() => {
  return selectedTool.value === 'resize' && (sidebarSelectedTool.value === 'window-bay')
})

const isDragging = ref(false)
const isResizing = ref<'left' | 'right' | null>(null)
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

    const zoomFactor = 1.1
    const newZoom = event.deltaY < 0
        ? Math.min(zoom.value * zoomFactor, MAX_ZOOM)
        : Math.max(zoom.value / zoomFactor, MIN_ZOOM)
    setZoom(newZoom);
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
  drawingZoneRef.value?.addEventListener('wheel', onWheel, { passive: false })
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
  drawingZoneRef.value?.removeEventListener('wheel', onWheel)
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
          id: crypto.randomUUID(),
          start: firstPoint.value,
          end: { ...initialPoint.value },
          openings: []
        })
        firstPoint.value = null
        initialPoint.value = null
        mousePos.value = null
        return
      }
    }

    if (!firstPoint.value) {
      const point = getSvgPoint(event)
      firstPoint.value = point
      initialPoint.value = point
      mousePos.value = point
    } else {
      const point = getSvgPoint(event)
      walls.value.push({
        id: crypto.randomUUID(),
        start: firstPoint.value,
        end: point,
        openings: []
      })
      // Au lieu de mettre firstPoint à null, on le met au point actuel pour continuer
      firstPoint.value = point
      mousePos.value = point
    }
    return
  }

  if (isDoorMode.value || isDoubleDoorMode.value || isWindowMode.value || isDoubleWindowMode.value || isBayWindowMode.value) {
    const point = getSvgPoint(event)
    let minDistance = Infinity
    let closestWallIndex: number | null = null
    const threshold = 20 / zoom.value // Augmentation du seuil pour faciliter le placement des portes et fenêtres

    walls.value.forEach((wall, index) => {
      const dx = wall.end.x - wall.start.x
      const dy = wall.end.y - wall.start.y
      const l2 = dx * dx + dy * dy
      if (l2 === 0) return

      let t = ((point.x - wall.start.x) * dx + (point.y - wall.start.y) * dy) / l2
      t = Math.max(0, Math.min(1, t))

      const dist = Math.sqrt(
        Math.pow(point.x - (wall.start.x + t * dx), 2) +
        Math.pow(point.y - (wall.start.y + t * dy), 2)
      )

      if (dist < minDistance) {
        minDistance = dist
        closestWallIndex = index
      }
    })

    if (closestWallIndex !== null && minDistance < threshold) {
      const wall = walls.value[closestWallIndex]
      const dx = wall.end.x - wall.start.x
      const dy = wall.end.y - wall.start.y
      const l2 = dx * dx + dy * dy
      const wallLength = Math.sqrt(l2)
      let t = ((point.x - wall.start.x) * dx + (point.y - wall.start.y) * dy) / l2
      t = Math.max(0, Math.min(1, t))

      const isWindow = isWindowMode.value || isDoubleWindowMode.value || isBayWindowMode.value
      const width = (isDoubleDoorMode.value || isDoubleWindowMode.value || isBayWindowMode.value) ? 20 : 10
      
      // Ajuster t pour les ouvertures centrées (toutes sauf variant 'bay')
      let finalT = t
      if (isBayWindowMode.value) {
          finalT = Math.max(0, Math.min(1 - (width / wallLength), t))
      }

      wall.openings.push({
        id: crypto.randomUUID(),
        type: isWindow ? 'window' : 'door',
        variant: (isDoubleDoorMode.value || isDoubleWindowMode.value) ? 'double' : (isBayWindowMode.value ? 'bay' : 'simple'),
        position: finalT,
        width: width, // ~2 mètres pour double/bay ouverture, ~1 mètre pour le reste
        flipped: false
      })
    }
    return
  }
  
  if (isSelectionMode.value) {
    const point = getSvgPoint(event)
    let minDistance = Infinity
    let closestWallIndex = null
    const threshold = 10 / zoom.value // Seuil de sélection (environ 10px écran)

    walls.value.forEach((wall, index) => {
      // Distance point à segment
      const dx = wall.end.x - wall.start.x
      const dy = wall.end.y - wall.start.y
      const l2 = dx * dx + dy * dy
      
      let t = ((point.x - wall.start.x) * dx + (point.y - wall.start.y) * dy) / l2
      t = Math.max(0, Math.min(1, t))
      
      const dist = Math.sqrt(
        Math.pow(point.x - (wall.start.x + t * dx), 2) +
        Math.pow(point.y - (wall.start.y + t * dy), 2)
      )
      
      if (dist < minDistance) {
        minDistance = dist
        closestWallIndex = index
      }
    })

    if (minDistance < threshold) {
      selectedWallIndex.value = closestWallIndex
    } else {
      selectedWallIndex.value = null
    }
    return
  }

  if (isDoorSelectionMode.value) {
    const point = getSvgPoint(event)
    let minDistance = Infinity
    let closestOpeningId = null
    const threshold = 15 / zoom.value

    walls.value.forEach((wall) => {
      wall.openings.forEach((opening) => {
        const dx = wall.end.x - wall.start.x
        const dy = wall.end.y - wall.start.y
        const wallLength = Math.sqrt(dx * dx + dy * dy)
        if (wallLength === 0) return
        
        // Point d'origine de l'ouverture sur le mur
        const ox = wall.start.x + dx * opening.position
        const oy = wall.start.y + dy * opening.position

        // Calcul du centre de l'ouverture
        // Toutes les ouvertures (y compris bay) ont maintenant leur centre décalé de width/2 par rapport à leur origine
        const cx = ox + (dx / wallLength) * (opening.width / 2)
        const cy = oy + (dy / wallLength) * (opening.width / 2)
        
        const dist = Math.sqrt(Math.pow(point.x - cx, 2) + Math.pow(point.y - cy, 2))
        
        if (dist < minDistance) {
          minDistance = dist
          closestOpeningId = opening.id
        }
      })
    })

    if (minDistance < threshold) {
      selectedOpeningId.value = closestOpeningId
    } else {
      selectedOpeningId.value = null
    }
    return
  }

  if (selectedTool.value !== 'move') return
  isDragging.value = true
  lastMouseX.value = event.clientX
  lastMouseY.value = event.clientY
}

const onMouseMove = (event: MouseEvent) => {
  if (isResizing.value && selectedOpeningId.value) {
    const point = getSvgPoint(event)
    
    // Trouver le mur et l'ouverture correspondante
    for (const wall of walls.value) {
      const openingIndex = wall.openings.findIndex(o => o.id === selectedOpeningId.value)
      if (openingIndex !== -1) {
        const opening = wall.openings[openingIndex]
        const dx = wall.end.x - wall.start.x
        const dy = wall.end.y - wall.start.y
        const wallLength = Math.sqrt(dx * dx + dy * dy)
        
        // Projection du point de la souris sur le mur pour obtenir le nouveau 't' (position relative)
        let t = ((point.x - wall.start.x) * dx + (point.y - wall.start.y) * dy) / (wallLength * wallLength)
        t = Math.max(0, Math.min(1, t))
        
        if (isResizing.value === 'right') {
          // Calculer la nouvelle largeur en fonction de la distance entre le point de départ actuel et le point de la souris
          const currentStartPos = opening.position
          const newWidth = (t - currentStartPos) * wallLength
          if (newWidth > 1) { // Largeur minimale de 1 unité SVG
            opening.width = newWidth
          }
        } else if (isResizing.value === 'left') {
          // On déplace le point de départ et on ajuste la largeur
          const currentEndPos = opening.position + (opening.width / wallLength)
          const newWidth = (currentEndPos - t) * wallLength
          if (newWidth > 1) {
            opening.position = t
            opening.width = newWidth
          }
        }
        break
      }
    }
    return
  }

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
  isResizing.value = null
}

const onTouchStart = (event: TouchEvent) => {
  if (selectedTool.value !== 'move') return
  
  if (event.touches.length === 1) {
    isDragging.value = true
    lastMouseX.value = event.touches[0]!.clientX
    lastMouseY.value = event.touches[0]!.clientY
  }
}

const onTouchMove = (event: TouchEvent) => {
  if (isResizing.value && selectedOpeningId.value) {
    const point = getSvgPoint(event.touches[0]!)
    
    // Trouver le mur et l'ouverture correspondante
    for (const wall of walls.value) {
      const openingIndex = wall.openings.findIndex(o => o.id === selectedOpeningId.value)
      if (openingIndex !== -1) {
        const opening = wall.openings[openingIndex]
        const dx = wall.end.x - wall.start.x
        const dy = wall.end.y - wall.start.y
        const wallLength = Math.sqrt(dx * dx + dy * dy)
        
        // Projection du point de la souris sur le mur pour obtenir le nouveau 't' (position relative)
        let t = ((point.x - wall.start.x) * dx + (point.y - wall.start.y) * dy) / (wallLength * wallLength)
        t = Math.max(0, Math.min(1, t))
        
        if (isResizing.value === 'right') {
          // Calculer la nouvelle largeur en fonction de la distance entre le point de départ actuel et le point de la souris
          const currentStartPos = opening.position
          const newWidth = (t - currentStartPos) * wallLength
          if (newWidth > 1) { // Largeur minimale de 1 unité SVG
            opening.width = newWidth
          }
        } else if (isResizing.value === 'left') {
          // On déplace le point de départ et on ajuste la largeur
          const currentEndPos = opening.position + (opening.width / wallLength)
          const newWidth = (currentEndPos - t) * wallLength
          if (newWidth > 1) {
            opening.position = t
            opening.width = newWidth
          }
        }
        break
      }
    }
    return
  }

  if (selectedTool.value !== 'move') return

  if (event.touches.length === 1 && isDragging.value) {
    const deltaX = (event.touches[0]!.clientX - lastMouseX.value)
    const deltaY = (event.touches[0]!.clientY - lastMouseY.value)

    panX.value += deltaX
    panY.value += deltaY

    lastMouseX.value = event.touches[0]!.clientX
    lastMouseY.value = event.touches[0]!.clientY
  }
}

const onTouchEnd = (event: TouchEvent) => {
  isResizing.value = null
  if (event.touches.length === 0) {
    isDragging.value = false
  } else if (event.touches.length === 1) {
    // Si on repasse de 2 à 1 doigt, on réinitialise le drag pour éviter un saut
    isDragging.value = true
    lastMouseX.value = event.touches[0]!.clientX
    lastMouseY.value = event.touches[0]!.clientY
  }
}

const selectedOpening = computed(() => {
  if (!selectedOpeningId.value) return null
  for (const wall of walls.value) {
    const opening = wall.openings.find(o => o.id === selectedOpeningId.value)
    if (opening) return { wall, opening }
  }
  return null
})

const resizeCursorStyle = computed(() => {
  if (!selectedOpening.value) return 'ew-resize'
  const { wall } = selectedOpening.value
  const dx = Math.abs(wall.end.x - wall.start.x)
  const dy = Math.abs(wall.end.y - wall.start.y)
  
  // Si dx > dy, le mur est plus horizontal que vertical
  return dx >= dy ? 'ew-resize' : 'ns-resize'
})

const cursorStyle = computed(() => {
  if (isDrawingMode.value) return 'crosshair'
  if (isDoorMode.value || isDoubleDoorMode.value || isWindowMode.value || isDoubleWindowMode.value || isBayWindowMode.value) return 'copy'
  if (isSelectionMode.value || isDoorSelectionMode.value) return 'pointer'
  if (selectedTool.value === 'resize' && selectedOpeningId.value) return resizeCursorStyle.value
  if (selectedTool.value === 'move') {
    return isDragging.value ? 'grabbing' : 'grab'
  }
  return 'default'
})

const selectedWall = computed(() => {
  if (selectedWallIndex.value === null) return null
  return walls.value[selectedWallIndex.value] || null
})

const selectedWallDistance = computed(() => {
  if (!selectedWall.value) return 0
  const wall = selectedWall.value
  const dx = wall.end.x - wall.start.x
  const dy = wall.end.y - wall.start.y
  // GRID_SECONDARY_UNIT_SIZE = 10 unités SVG pour 1 mètre
  return Math.sqrt(dx * dx + dy * dy) / GRID_SECONDARY_UNIT_SIZE
})

const selectedWallCenter = computed(() => {
  if (!selectedWall.value) return { x: 0, y: 0 }
  const wall = selectedWall.value
  return {
    x: (wall.start.x + wall.end.x) / 2,
    y: (wall.start.y + wall.end.y) / 2
  }
})

const selectedWallAngle = computed(() => {
  if (!selectedWall.value) return 0
  const wall = selectedWall.value
  return Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x) * (180 / Math.PI)
})

const selectedWallTextRotation = computed(() => {
  let angle = selectedWallAngle.value
  // atan2 renvoie un angle entre -180 et 180.
  // Si l'angle est dans la moitié gauche du cercle (>90 ou <-90), 
  // on lui ajoute 180 pour que le texte soit à l'endroit.
  if (angle > 90 || angle < -90) {
    angle += 180
  }
  return angle
})

const selectedWallTextOffset = computed(() => {
  const angle = selectedWallAngle.value
  // Si on a retourné le texte (angle > 90 ou < -90),
  // il faut aussi inverser l'offset pour qu'il reste du même côté visuel du mur
  return (angle > 90 || angle < -90) ? 25 : -25
})

const selectedWallOffsetVectors = computed(() => {
  if (!selectedWall.value) return { normalX: 0, normalY: 0 }
  const wall = selectedWall.value
  const dx = wall.end.x - wall.start.x
  const dy = wall.end.y - wall.start.y
  const length = Math.sqrt(dx * dx + dy * dy)
  if (length === 0) return { normalX: 0, normalY: 0 }
  
  // Vecteur normal (perpendiculaire)
  return {
    normalX: -dy / length,
    normalY: dx / length
  }
})

const getOpeningTransform = (wall: Wall, opening: Opening) => {
  const dx = wall.end.x - wall.start.x
  const dy = wall.end.y - wall.start.y
  const angle = Math.atan2(dy, dx) * (180 / Math.PI)
  const x = wall.start.x + dx * opening.position
  const y = wall.start.y + dy * opening.position
  
  if (opening.variant === 'double' || opening.type === 'window') {
      // Pour une double porte ou une fenêtre (simple/double/bay), on se positionne au milieu de l'ouverture
      // SAUF si on est en train de redimensionner par la gauche ou si on est en mode bay
      // En fait, pour la 'bay' et le redimensionnement, il vaut mieux se baser sur le point de départ de l'ouverture (x,y) 
      // et ne pas décaler de width/2 si on veut que le redimensionnement soit intuitif (le point (0,0) de l'ouverture est son bord gauche).
      if (opening.variant === 'bay') {
          return `translate(${x}, ${y}) rotate(${angle})`
      }
      return `translate(${x}, ${y}) rotate(${angle}) translate(${-opening.width / 2}, 0)`
  }
  
  return `translate(${x}, ${y}) rotate(${angle})`
}

const selectedWallMeasurementLines = computed(() => {
  if (!selectedWall.value) return []
  const wall = selectedWall.value
  const { normalX, normalY } = selectedWallOffsetVectors.value
  const offset = 15 // Distance du mur
  
  return [
    {
      x1: wall.start.x + normalX * offset,
      y1: wall.start.y + normalY * offset,
      x2: wall.end.x + normalX * offset,
      y2: wall.end.y + normalY * offset
    },
    {
      x1: wall.start.x - normalX * offset,
      y1: wall.start.y - normalY * offset,
      x2: wall.end.x - normalX * offset,
      y2: wall.end.y - normalY * offset
    }
  ]
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
    @touchcancel="onTouchEnd"
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
        <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="orange" />
        </marker>
      </defs>

      <g 
        :transform="`translate(${panX}, ${panY}) scale(${zoom})`"
        :class="{ [$style.transitioning]: isResetting }"
      >
        <rect x="-10000" y="-10000" width="20000" height="20000" fill="url(#grid)" />

        <!-- Murs fixés -->
        <g v-for="wall in walls" :key="wall.id">
          <line
            :x1="wall.start.x"
            :y1="wall.start.y"
            :x2="wall.end.x"
            :y2="wall.end.y"
            stroke="black"
            stroke-width="5"
            stroke-linecap="round"
          />
          <!-- Portes -->
          <g v-for="opening in wall.openings" :key="opening.id">
            <g v-if="opening.type === 'door'" :transform="getOpeningTransform(wall, opening)">
              <!-- L'ouverture dans le mur -->
              <line 
                x1="0" y1="0" 
                :x2="opening.width" y2="0" 
                stroke="white" 
                stroke-width="6" 
                :style="{ cursor: isDoorSelectionMode ? 'pointer' : undefined }"
              />
              <!-- Porte simple -->
              <template v-if="opening.variant === 'simple'">
                <line 
                  x1="0" y1="0" 
                  :x2="0" :y2="-opening.width" 
                  :stroke="selectedOpeningId === opening.id ? 'orange' : 'brown'" 
                  stroke-width="2" 
                />
                <path 
                  :d="`M 0 ${-opening.width} A ${opening.width} ${opening.width} 0 0 1 ${opening.width} 0`" 
                  fill="none" 
                  :stroke="selectedOpeningId === opening.id ? 'orange' : 'brown'" 
                  stroke-width="1" 
                  stroke-dasharray="2,2" 
                />
              </template>
              <!-- Double porte -->
              <template v-else-if="opening.variant === 'double'">
                <!-- Battant gauche -->
                <line 
                  x1="0" y1="0" 
                  :x2="0" :y2="-opening.width / 2" 
                  :stroke="selectedOpeningId === opening.id ? 'orange' : 'brown'" 
                  stroke-width="2" 
                />
                <path 
                  :d="`M 0 ${-opening.width / 2} A ${opening.width / 2} ${opening.width / 2} 0 0 1 ${opening.width / 2} 0`" 
                  fill="none" 
                  :stroke="selectedOpeningId === opening.id ? 'orange' : 'brown'" 
                  stroke-width="1" 
                  stroke-dasharray="2,2" 
                />
                <!-- Battant droit -->
                <line 
                  :x1="opening.width" y1="0" 
                  :x2="opening.width" :y2="-opening.width / 2" 
                  :stroke="selectedOpeningId === opening.id ? 'orange' : 'brown'" 
                  stroke-width="2" 
                />
                <path 
                  :d="`M ${opening.width} ${-opening.width / 2} A ${opening.width / 2} ${opening.width / 2} 0 0 0 ${opening.width / 2} 0`" 
                  fill="none" 
                  :stroke="selectedOpeningId === opening.id ? 'orange' : 'brown'" 
                  stroke-width="1" 
                  stroke-dasharray="2,2" 
                />
              </template>
            </g>

            <!-- Fenêtres -->
            <g v-else-if="opening.type === 'window'" :transform="getOpeningTransform(wall, opening)">
              <!-- Cadre de la fenêtre -->
              <rect 
                x="0" y="-4" 
                :width="opening.width" height="8" 
                fill="white" 
                :stroke="selectedOpeningId === opening.id ? 'orange' : 'black'" 
                stroke-width="1" 
                :style="{ cursor: isDoorSelectionMode ? 'pointer' : undefined }"
              />
              <!-- Ligne(s) centrale(s) de la vitre -->
              <template v-if="opening.variant === 'simple'">
                <line 
                  x1="0" y1="0" 
                  :x2="opening.width" y2="0" 
                  :stroke="selectedOpeningId === opening.id ? 'orange' : 'blue'" 
                  stroke-width="1" 
                />
              </template>
              <template v-else-if="opening.variant === 'double'">
                <line 
                  x1="0" y1="0" 
                  :x2="opening.width" y2="0" 
                  :stroke="selectedOpeningId === opening.id ? 'orange' : 'blue'" 
                  stroke-width="1" 
                />
                <!-- Montant central pour distinguer la double fenêtre -->
                <line 
                  :x1="opening.width / 2" y1="-4" 
                  :x2="opening.width / 2" y2="4" 
                  :stroke="selectedOpeningId === opening.id ? 'orange' : 'black'" 
                  stroke-width="1" 
                />
              </template>
              <template v-else-if="opening.variant === 'bay'">
                <!-- Baie vitrée : deux lignes parallèles pour l'effet coulissant -->
                <line 
                  x1="0" y1="-2" 
                  :x2="opening.width" y2="-2" 
                  :stroke="selectedOpeningId === opening.id ? 'orange' : 'blue'" 
                  stroke-width="1" 
                />
                <line 
                  x1="0" y1="2" 
                  :x2="opening.width" y2="2" 
                  :stroke="selectedOpeningId === opening.id ? 'orange' : 'blue'" 
                  stroke-width="1" 
                />
                <!-- Montants latéraux -->
                <line x1="0" y1="-4" x2="0" y2="4" :stroke="selectedOpeningId === opening.id ? 'orange' : 'black'" stroke-width="1" />
                <line :x1="opening.width" y1="-4" :x2="opening.width" y2="4" :stroke="selectedOpeningId === opening.id ? 'orange' : 'black'" stroke-width="1" />
              </template>
              
              <!-- Poignées de redimensionnement (visibles uniquement en mode resize) -->
              <template v-if="isResizeMode && selectedOpeningId === opening.id">
                <circle 
                  cx="0" cy="0" r="4" 
                  fill="white" stroke="orange" stroke-width="2" 
                  :style="{ cursor: resizeCursorStyle }"
                  @mousedown.stop="isResizing = 'left'"
                  @touchstart.stop="isResizing = 'left'"
                />
                <circle 
                  :cx="opening.width" cy="0" r="4" 
                  fill="white" stroke="orange" stroke-width="2" 
                  :style="{ cursor: resizeCursorStyle }"
                  @mousedown.stop="isResizing = 'right'"
                  @touchstart.stop="isResizing = 'right'"
                />
              </template>
            </g>
          </g>
        </g>

        <!-- Segment sélectionné (on le garde en plus pour l'affichage orange) -->
        <g v-if="selectedWall">
          <line
            :x1="selectedWall.start.x"
            :y1="selectedWall.start.y"
            :x2="selectedWall.end.x"
            :y2="selectedWall.end.y"
            stroke="orange"
            stroke-width="5"
            stroke-linecap="round"
          />
          <circle
            :cx="selectedWall.start.x"
            :cy="selectedWall.start.y"
            :r="6"
            fill="orange"
          />
          <circle
            :cx="selectedWall.end.x"
            :cy="selectedWall.end.y"
            :r="6"
            fill="orange"
          />
          <!-- Flèches en pointillés avec distance (doubles) -->
          <line
            v-for="(line, idx) in selectedWallMeasurementLines"
            :key="idx"
            :x1="line.x1"
            :y1="line.y1"
            :x2="line.x2"
            :y2="line.y2"
            stroke="orange"
            stroke-width="1"
            stroke-dasharray="4,4"
            marker-start="url(#arrow)"
            marker-end="url(#arrow)"
          />
          <text
            fill="orange"
            font-size="12"
            text-anchor="middle"
            alignment-baseline="middle"
            :transform="`translate(${selectedWallCenter.x}, ${selectedWallCenter.y}) rotate(${selectedWallTextRotation}) translate(0, ${selectedWallTextOffset})`"
            style="user-select: none; font-weight: bold; paint-order: stroke; stroke: white; stroke-width: 3px;"
          >
            {{ selectedWallDistance.toFixed(2) }}m
          </text>
        </g>

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
  touch-action: none;
}

.transitioning {
  transition: transform 0.3s ease-out;
}
</style>
