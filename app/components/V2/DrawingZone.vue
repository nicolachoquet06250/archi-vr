<script setup lang="ts">
import { GRID_SECONDARY_UNIT_SIZE, MIN_ZOOM, MAX_ZOOM } from '~/composables/toolbar'
import { usePinch } from '@vueuse/gesture'

const { selectedTool, resetTrigger, zoom, zoomIn, zoomOut, setZoom } = useToolbar()
const { selectedTool: sidebarSelectedTool } = useToolbarMenu()
const { selectedRoomIds, totalSelectedArea, toggleRoomSelection, clearRoomSelection } = useRoomSelection()

interface Point {
  x: number;
  y: number;
}

interface Wall {
  id: string;
  start: Point;
  end: Point;
  openings: Opening[];
  groupId?: string;
}

interface Opening {
  id: string;
  type: 'door' | 'window';
  variant: 'simple' | 'double' | 'bay';
  position: number; // 0 à 1 (le long du mur)
  width: number; // en unités SVG
  flipped: boolean; // côté d'ouverture
}

interface RoomFace {
  id: string;
  points: Point[];
  area: number;
  color: string;
}

const WALL_STROKE_WIDTH = 5
const GRAPH_EPSILON = 0.5
const ROOM_MIN_AREA = 100 // Augmenté pour éviter les micro-pièces dues aux arrondis

const walls = ref<Wall[]>([])
const rooms = ref<RoomFace[]>([])
const selectedWallIndices = ref<number[]>([])
const selectedOpeningId = ref<string | null>(null)
const firstPoint = ref<Point | null>(null)
const curvePoint1 = ref<Point | null>(null)
const curvePoint2 = ref<Point | null>(null)
const initialPoint = ref<Point | null>(null)
const mousePos = ref<Point | null>(null)

const wallsPathData = computed(() => walls.value.map(wall => `M ${wall.start.x} ${wall.start.y} L ${wall.end.x} ${wall.end.y}`).join(' '))

const isSnapped = computed(() => {
  if (!mousePos.value || !initialPoint.value || !firstPoint.value) return false
  return mousePos.value.x === initialPoint.value.x && mousePos.value.y === initialPoint.value.y
})

const arcSegments = computed(() => {
  if (!isWallRoundMode.value || !firstPoint.value || !curvePoint1.value || !mousePos.value) return []
  
  if (curvePoint2.value) {
    // Si on a les 4 points, on utilise la courbe cubique
    return generateArcSegments(firstPoint.value, curvePoint1.value, curvePoint2.value, mousePos.value)
  } else {
    // Sinon, on utilise une courbe quadratique pour la prévisualisation du 3ème point
    return generateArcSegmentsQuadratic(firstPoint.value, curvePoint1.value, mousePos.value)
  }
})

const generateArcSegmentsQuadratic = (start: Point, end: Point, control: Point): { start: Point, end: Point }[] => {
  const segments: { start: Point, end: Point }[] = []
  const dist = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2))
  const numSegments = Math.max(5, Math.min(30, Math.floor(dist / 2)))

  let lastPoint = { ...start }
  for (let i = 1; i <= numSegments; i++) {
    const t = i / numSegments

    const getBezierPoint = (t: number) => {
      const x = (1 - t) * (1 - t) * start.x + 2 * (1 - t) * t * control.x + t * t * end.x
      const y = (1 - t) * (1 - t) * start.y + 2 * (1 - t) * t * control.y + t * t * end.y
      return { x, y }
    }

    const currentPoint = i === numSegments ? { ...end } : getBezierPoint(t)
    segments.push({
      start: lastPoint,
      end: currentPoint
    })
    lastPoint = currentPoint
  }
  return segments
}

const generateArcSegments = (start: Point, end: Point, control1: Point, control2: Point): { start: Point, end: Point }[] => {
  const segments: { start: Point, end: Point }[] = []
  
  // Calculer la distance entre start et end pour adapter le nombre de segments
  const dist = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2))
  const numSegments = Math.max(5, Math.min(30, Math.floor(dist / 2)))

  // On utilise une courbe de Bézier cubique pour simuler l'arrondi avec 4 points
  let lastPoint = { ...start }
  for (let i = 1; i <= numSegments; i++) {
    const t = i / numSegments

    const getBezierPoint = (t: number) => {
      const x = Math.pow(1 - t, 3) * start.x + 
                3 * Math.pow(1 - t, 2) * t * control1.x + 
                3 * (1 - t) * Math.pow(t, 2) * control2.x + 
                Math.pow(t, 3) * end.x
      const y = Math.pow(1 - t, 3) * start.y + 
                3 * Math.pow(1 - t, 2) * t * control1.y + 
                3 * (1 - t) * Math.pow(t, 2) * control2.y + 
                Math.pow(t, 3) * end.y
      return { x, y }
    }

    const currentPoint = i === numSegments ? { ...end } : getBezierPoint(t)
    segments.push({
      start: lastPoint,
      end: currentPoint
    })
    lastPoint = currentPoint
  }
  return segments
}

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

const isWallRoundMode = computed(() => {
  return selectedTool.value === 'edit' && sidebarSelectedTool.value === 'wall-round'
})

const isDrawingMode = computed(() => {
  return selectedTool.value === 'edit' && ['wall', 'wall-flat'].includes(sidebarSelectedTool.value!)
})

const isSelectionMode = computed(() => {
  return selectedTool.value === 'selection' && ['wall', 'wall-flat', 'wall-round'].includes(sidebarSelectedTool.value!)
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

const isRoomSelectionMode = computed(() => {
  return selectedTool.value === 'measure'
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

const getSnapPoint = (point: Point): Point => {
  let snappedPoint = { ...point }
  let minDistance = EXTREMITY_SNAP_TOLERANCE

  // 1. On cherche d'abord les extrémités libres (priorité haute)
  for (const wall of walls.value) {
    const dStart = distanceBetween(point, wall.start)
    if (dStart < minDistance) {
      minDistance = dStart
      snappedPoint = { ...wall.start }
    }
    const dEnd = distanceBetween(point, wall.end)
    if (dEnd < minDistance) {
      minDistance = dEnd
      snappedPoint = { ...wall.end }
    }
  }

  // Si on a déjà trouvé un point d'extrémité, on ne cherche pas à snapper sur le segment
  if (minDistance < EXTREMITY_SNAP_TOLERANCE) return snappedPoint

  // 2. Sinon, snapping sur le segment du mur (projection orthogonale)
  minDistance = SNAP_TOLERANCE
  for (const wall of walls.value) {
    const projection = projectPointOnSegment(point, wall.start, wall.end)
    if (projection.t > 0 && projection.t < 1 && projection.distance < minDistance) {
      minDistance = projection.distance
      snappedPoint = projection.point
    }
  }

  return snappedPoint
}

const isResizeMode = computed(() => {
  return selectedTool.value === 'resize' && (['window-bay', 'wall', 'wall-flat', 'wall-round'].includes(sidebarSelectedTool.value!))
})

const isDragging = ref(false)
const isResizing = ref<'left' | 'right' | null>(null)
const isResizingWall = ref<'start' | 'end' | null>(null)
const isDraggingOpening = ref(false)
const dragOpeningOffset = ref(0)
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
  if (event.key === 'Escape' && (isDrawingMode.value || isWallRoundMode.value)) {
    firstPoint.value = null
    curvePoint1.value = null
    curvePoint2.value = null
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

const SNAP_TOLERANCE = 3.0 // Unité SVG (environ 3m dans la config actuelle, couvre l'épaisseur visuelle du mur de 5 unités)
const EXTREMITY_SNAP_TOLERANCE = 8.0 // Unité SVG (plus large pour les extrémités, impression d'aimant)

const ROOM_ATTACH_TOLERANCE = WALL_STROKE_WIDTH / 2 + SNAP_TOLERANCE

interface SegmentProjection {
  point: Point;
  t: number;
  distance: number;
}

interface GraphVertex {
  id: string;
  point: Point;
  outgoing: GraphHalfEdge[];
}

interface GraphHalfEdge {
  id: string;
  from: string;
  to: string;
  angle: number;
  twinId: string;
  visited: boolean;
}

const distanceBetween = (a: Point, b: Point) => {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

const almostEqual = (a: number, b: number, epsilon = GRAPH_EPSILON) => {
  return Math.abs(a - b) <= epsilon
}

const pointsEqual = (a: Point, b: Point, epsilon = GRAPH_EPSILON) => {
  return almostEqual(a.x, b.x, epsilon) && almostEqual(a.y, b.y, epsilon)
}

const pointKey = (point: Point, _epsilon = GRAPH_EPSILON) => {
  return `${Math.round(point.x * 2) / 2}:${Math.round(point.y * 2) / 2}`
}

const polygonSignedArea = (points: Point[]) => {
  let area = 0

  for (let i = 0; i < points.length; i++) {
    const current = points[i]!
    const next = points[(i + 1) % points.length]!
    area += current.x * next.y - next.x * current.y
  }

  return area / 2
}

const projectPointOnSegment = (point: Point, start: Point, end: Point): SegmentProjection => {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const lengthSquared = dx * dx + dy * dy

  if (lengthSquared === 0) {
    return {
      point: { ...start },
      t: 0,
      distance: distanceBetween(point, start),
    }
  }

  let t = ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared
  t = Math.max(0, Math.min(1, t))

  const projectedPoint = {
    x: start.x + dx * t,
    y: start.y + dy * t,
  }

  return {
    point: projectedPoint,
    t,
    distance: distanceBetween(point, projectedPoint),
  }
}

const segmentIntersection = (
    a1: Point,
    a2: Point,
    b1: Point,
    b2: Point,
    epsilon = GRAPH_EPSILON,
): Point | null => {
  const dax = a2.x - a1.x
  const day = a2.y - a1.y
  const dbx = b2.x - b1.x
  const dby = b2.y - b1.y

  const denominator = dax * dby - day * dbx
  if (Math.abs(denominator) <= epsilon) return null

  const s = ((a1.x - b1.x) * dby - (a1.y - b1.y) * dbx) / denominator
  const t = ((a1.x - b1.x) * day - (a1.y - b1.y) * dax) / denominator

  if (s < -epsilon || s > 1 + epsilon || t < -epsilon || t > 1 + epsilon) {
    return null
  }

  return {
    x: a1.x + s * dax,
    y: a1.y + s * day,
  }
}

const snapPointToWalls = (point: Point) => {
  return getSnapPoint(point)
}

const uniqueOrderedPoints = (points: Point[]) => {
  const result: Point[] = []

  for (const point of points) {
    const last = result[result.length - 1]
    if (!last || !pointsEqual(last, point)) {
      result.push(point)
    }
  }

  if (result.length > 1 && pointsEqual(result[0]!, result[result.length - 1]!)) {
    result.pop()
  }

  return result
}

const normalizeFaceKey = (points: Point[]) => {
  const keys = points.map((point) => pointKey(point))
  if (keys.length === 0) return ''

  const rotations: string[] = []

  for (let i = 0; i < keys.length; i++) {
    rotations.push([...keys.slice(i), ...keys.slice(0, i)].join('|'))
  }

  const reversed = [...keys].reverse()
  for (let i = 0; i < reversed.length; i++) {
    rotations.push([...reversed.slice(i), ...reversed.slice(0, i)].join('|'))
  }

  rotations.sort()
  return rotations[0]!
}

const seededRoomColor = (seed: string) => {
  let hash = 0

  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0
  }

  const hue = Math.abs(hash) % 360
  return `hsla(${hue}, 75%, 65%, 0.35)`
}

const buildSplitParametersForWall = (wall: Wall, allWalls: Wall[]) => {
  const parameters = [0, 1]

  for (const otherWall of allWalls) {
    if (otherWall.id !== wall.id) {
      const intersection = segmentIntersection(wall.start, wall.end, otherWall.start, otherWall.end, 0.01)

      if (intersection) {
        const projectedIntersection = projectPointOnSegment(intersection, wall.start, wall.end)
        parameters.push(projectedIntersection.t)
      }
    }

    const startProjection = projectPointOnSegment(otherWall.start, wall.start, wall.end)
    if (startProjection.distance <= 2.0) {
      parameters.push(startProjection.t)
    }

    const endProjection = projectPointOnSegment(otherWall.end, wall.start, wall.end)
    if (endProjection.distance <= 2.0) {
      parameters.push(endProjection.t)
    }
  }

  return [...new Set(parameters.map((value) => Number(value.toFixed(6))))].sort((a, b) => a - b)
}

const buildRoomFaces = (inputWalls: Wall[]): RoomFace[] => {
  if (inputWalls.length < 3) return []

  const splitSegments: Array<{ start: Point; end: Point }> = []

  for (const wall of inputWalls) {
    const splitParameters = buildSplitParametersForWall(wall, inputWalls)

    for (let i = 0; i < splitParameters.length - 1; i++) {
      const t1 = splitParameters[i]!
      const t2 = splitParameters[i + 1]!

      const start = {
        x: wall.start.x + (wall.end.x - wall.start.x) * t1,
        y: wall.start.y + (wall.end.y - wall.start.y) * t1,
      }

      const end = {
        x: wall.start.x + (wall.end.x - wall.start.x) * t2,
        y: wall.start.y + (wall.end.y - wall.start.y) * t2,
      }

      if (distanceBetween(start, end) > GRAPH_EPSILON) {
        splitSegments.push({ start, end })
      }
    }
  }

  const vertices = new Map<string, GraphVertex>()
  const edges = new Map<string, GraphHalfEdge>()
  let edgeIndex = 0

  const ensureVertex = (point: Point) => {
    const id = pointKey(point)
    const existing = vertices.get(id)

    if (existing) return existing

    const created: GraphVertex = {
      id,
      point,
      outgoing: [],
    }

    vertices.set(id, created)
    return created
  }

  for (const segment of splitSegments) {
    const fromVertex = ensureVertex(segment.start)
    const toVertex = ensureVertex(segment.end)

    if (fromVertex.id === toVertex.id) continue

    // Vérifier si une arête identique existe déjà (pour éviter les doublons de segments)
    const existingForward = fromVertex.outgoing.find(e => e.to === toVertex.id)
    if (existingForward) continue

    const forwardId = `edge-${edgeIndex++}`
    const backwardId = `edge-${edgeIndex++}`

    const forward: GraphHalfEdge = {
      id: forwardId,
      from: fromVertex.id,
      to: toVertex.id,
      angle: Math.atan2(toVertex.point.y - fromVertex.point.y, toVertex.point.x - fromVertex.point.x),
      twinId: backwardId,
      visited: false,
    }

    const backward: GraphHalfEdge = {
      id: backwardId,
      from: toVertex.id,
      to: fromVertex.id,
      angle: Math.atan2(fromVertex.point.y - toVertex.point.y, fromVertex.point.x - toVertex.point.x),
      twinId: forwardId,
      visited: false,
    }

    edges.set(forward.id, forward)
    edges.set(backward.id, backward)

    fromVertex.outgoing.push(forward)
    toVertex.outgoing.push(backward)
  }

  for (const [id, vertex] of vertices.entries()) {
    if (vertex.outgoing.length === 0) {
      vertices.delete(id)
    }
  }

  // Éliminer récursivement les sommets avec moins de 2 arêtes (feuilles et chaînes ouvertes)
  let changed = true
  while (changed) {
    changed = false
    for (const [id, vertex] of Array.from(vertices.entries())) {
      if (vertex.outgoing.length < 2) {
        for (const edge of vertex.outgoing) {
          const twin = edges.get(edge.twinId)
          if (twin) {
            const neighbor = vertices.get(twin.from)
            if (neighbor) {
              neighbor.outgoing = neighbor.outgoing.filter(e => e.id !== twin.id)
            }
            edges.delete(edge.twinId)
          }
          edges.delete(edge.id)
        }
        vertices.delete(id)
        changed = true
      }
    }
  }

  for (const vertex of vertices.values()) {
    vertex.outgoing.sort((a, b) => a.angle - b.angle)
  }

  const rawFaces: Array<{ key: string; points: Point[]; area: number }> = []

  for (const edge of edges.values()) {
    if (edge.visited) continue

    const facePoints: Point[] = []
    let currentEdge: GraphHalfEdge | undefined = edge
    let safety = 0

    while (currentEdge && safety < 10_000) {
      safety++
      currentEdge.visited = true

      const fromVertex = vertices.get(currentEdge.from)
      const toVertex = vertices.get(currentEdge.to)
      const twin = edges.get(currentEdge.twinId)

      if (!fromVertex || !toVertex || !twin) break

      facePoints.push(fromVertex.point)

      const outgoing = toVertex.outgoing
      const twinIndex = outgoing.findIndex((outgoingEdge) => outgoingEdge.id === twin.id)

      if (twinIndex === -1) break

      const nextIndex = (twinIndex - 1 + outgoing.length) % outgoing.length
      currentEdge = outgoing[nextIndex]!

      if (currentEdge.id === edge.id) {
        break
      }
    }

    const simplifiedPoints = uniqueOrderedPoints(facePoints)

    if (simplifiedPoints.length < 3) continue

    const area = polygonSignedArea(simplifiedPoints)
    if (Math.abs(area) < ROOM_MIN_AREA) continue

    rawFaces.push({
      key: normalizeFaceKey(simplifiedPoints),
      points: simplifiedPoints,
      area,
    })
  }

  const deduplicatedFaces = Array.from(
      rawFaces.reduce((map, face) => {
        if (!map.has(face.key)) {
          map.set(face.key, face)
        }
        return map
      }, new Map<string, { key: string; points: Point[]; area: number }>() ).values()
  )

  if (deduplicatedFaces.length === 0) return []

  const outerFace = deduplicatedFaces.reduce((largest, current) => {
    return Math.abs(current.area) > Math.abs(largest.area) ? current : largest
  })

  return deduplicatedFaces
      .filter((face) => face.key !== outerFace.key)
      .map((face) => ({
        id: face.key,
        points: face.points,
        area: Math.abs(face.area),
        color: seededRoomColor(face.key),
      }))
}

const onMouseDown = (event: MouseEvent) => {
  if (isRoomSelectionMode.value) {
    // Si on clique dans le vide (hors d'un polygone qui a .stop), on vide la sélection
    clearRoomSelection()
    return
  }

  if (isResizeMode.value) {
    const point = getSvgPoint(event)
    const snappedPoint = snapPointToWalls(point)
    const threshold = 15 / zoom.value

    // 1. D'abord, vérifier si on clique sur une extrémité du mur sélectionné (pour le resize)
    if (selectedWallIndices.value.length > 0) {
      const wall = walls.value[selectedWallIndices.value[0]!]
      if (wall) {
        const dStart = Math.sqrt(Math.pow(snappedPoint.x - wall.start.x, 2) + Math.pow(snappedPoint.y - wall.start.y, 2))
        const dEnd = Math.sqrt(Math.pow(snappedPoint.x - wall.end.x, 2) + Math.pow(snappedPoint.y - wall.end.y, 2))

        if (dStart < threshold) {
          isResizingWall.value = 'start'
          return
        } else if (dEnd < threshold) {
          isResizingWall.value = 'end'
          return
        }
      }
    }

    // 2. Vérifier les ouvertures (logique existante)
    let minDistanceOpening = Infinity
    let closestOpeningId = null
    let handle = null

    walls.value.forEach((wall) => {
      wall.openings.forEach((opening) => {
        const dx = wall.end.x - wall.start.x
        const dy = wall.end.y - wall.start.y
        const wallLength = Math.sqrt(dx * dx + dy * dy)
        if (wallLength === 0) return

        // Points de redimensionnement de l'ouverture
        const ox = wall.start.x + dx * opening.position
        const oy = wall.start.y + dy * opening.position
        const ex = ox + (dx / wallLength) * opening.width
        const ey = oy + (dy / wallLength) * opening.width

        const dLeft = Math.sqrt(Math.pow(snappedPoint.x - ox, 2) + Math.pow(snappedPoint.y - oy, 2))
        const dRight = Math.sqrt(Math.pow(snappedPoint.x - ex, 2) + Math.pow(snappedPoint.y - ey, 2))

        if (dLeft < threshold && dLeft < minDistanceOpening) {
          minDistanceOpening = dLeft
          closestOpeningId = opening.id
          handle = 'left'
        }
        if (dRight < threshold && dRight < minDistanceOpening) {
          minDistanceOpening = dRight
          closestOpeningId = opening.id
          handle = 'right'
        }
      })
    })

    if (closestOpeningId) {
      selectedOpeningId.value = closestOpeningId
      isResizing.value = handle as unknown as 'left' | 'right'
      return
    }

    // 2.5 Vérifier si on clique sur le corps d'une ouverture pour la sélectionner (sans la redimensionner immédiatement)
    if (sidebarSelectedTool.value === 'window-bay' || isDoorSelectionMode.value) {
      let closestOpeningIdSelect = null
      let minDistanceOpeningSelect = Infinity
      const selectThreshold = 20 / zoom.value

      walls.value.forEach((wall) => {
        wall.openings.forEach((opening) => {
          if (!isDoorSelectionMode.value && opening.variant !== 'bay') return

          const dx = wall.end.x - wall.start.x
          const dy = wall.end.y - wall.start.y
          const wallLength = Math.sqrt(dx * dx + dy * dy)
          if (wallLength === 0) return

          const ox = wall.start.x + dx * opening.position
          const oy = wall.start.y + dy * opening.position
          const ex = ox + (dx / wallLength) * opening.width
          const ey = oy + (dy / wallLength) * opening.width

          // Distance du point au segment de l'ouverture
          const odx = ex - ox
          const ody = ey - oy
          const ol2 = odx * odx + ody * ody
          let ot = ((point.x - ox) * odx + (point.y - oy) * ody) / ol2
          ot = Math.max(0, Math.min(1, ot))
          const dist = Math.sqrt(Math.pow(point.x - (ox + ot * odx), 2) + Math.pow(point.y - (oy + ot * ody), 2))

          if (dist < selectThreshold && dist < minDistanceOpeningSelect) {
            minDistanceOpeningSelect = dist
            closestOpeningIdSelect = opening.id
          }
        })
      })

      if (closestOpeningIdSelect) {
        selectedOpeningId.value = closestOpeningIdSelect
        selectedWallIndices.value = []
        isDraggingOpening.value = true
        
        // Calculer l'offset initial pour un glissement fluide
        const sel = selectedOpening.value
        if (sel) {
          const dx = sel.wall.end.x - sel.wall.start.x
          const dy = sel.wall.end.y - sel.wall.start.y
          const wallLength = Math.sqrt(dx * dx + dy * dy)
          const clickT = ((point.x - sel.wall.start.x) * dx + (point.y - sel.wall.start.y) * dy) / (wallLength * wallLength)
          dragOpeningOffset.value = clickT - sel.opening.position
        }
        return
      }
    }

    // 3. Sinon, permettre de sélectionner un mur en mode resize
    let minDistanceWall = Infinity
    let closestWallIndex = null
    const wallThreshold = 10 / zoom.value

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
      
      if (dist < minDistanceWall) {
        minDistanceWall = dist
        closestWallIndex = index
      }
    })

    if (minDistanceWall < wallThreshold) {
      const clickedWall = walls.value[closestWallIndex!]
      if (clickedWall?.groupId) {
        selectedWallIndices.value = walls.value
          .map((wall, index) => wall.groupId === clickedWall.groupId ? index : -1)
          .filter(index => index !== -1)
      } else {
        selectedWallIndices.value = [closestWallIndex!]
      }
      selectedOpeningId.value = null
    } else {
      selectedWallIndices.value = []
      selectedOpeningId.value = null
    }
    return
  }

  if (isWallRoundMode.value) {
    const rawPoint = getSvgPoint(event)
    const point = getSnapPoint(rawPoint)
    // On arrondit pour assurer la cohérence avec le graphe
    point.x = Math.round(point.x * 2) / 2
    point.y = Math.round(point.y * 2) / 2

    if (!firstPoint.value) {
      firstPoint.value = point
      initialPoint.value = point
      mousePos.value = point
    } else if (!curvePoint1.value) {
      // Deuxième clic : on fixe la fin de la corde
      const d = Math.sqrt(Math.pow(point.x - firstPoint.value.x, 2) + Math.pow(point.y - firstPoint.value.y, 2))
      if (d < SNAP_TOLERANCE) return

      curvePoint1.value = point
      mousePos.value = point
    } else if (!curvePoint2.value) {
      // Troisième clic : on fixe le premier point de contrôle
      curvePoint2.value = point
      mousePos.value = point
    } else {
      // Quatrième clic : on valide la courbe cubique avec le point actuel comme second point de contrôle
      const segments = generateArcSegments(firstPoint.value, curvePoint1.value, curvePoint2.value, point)
      
      const groupId = crypto.randomUUID()
      segments.forEach(seg => {
        walls.value.push({
          id: crypto.randomUUID(),
          start: seg.start,
          end: seg.end,
          openings: [],
          groupId: groupId
        })
      })
      // Réinitialisation
      firstPoint.value = null
      curvePoint1.value = null
      curvePoint2.value = null
      initialPoint.value = null
      mousePos.value = null
    }
    return
  }

  if (isDrawingMode.value) {
    const rawPoint = getSvgPoint(event)
    const point = snapPointToWalls(rawPoint)
    
    // On arrondit pour assurer la cohérence avec le graphe
    point.x = Math.round(point.x * 2) / 2
    point.y = Math.round(point.y * 2) / 2

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
      const rawPoint = getSvgPoint(event)
      const point = getSnapPoint(rawPoint)
      point.x = Math.round(point.x * 2) / 2
      point.y = Math.round(point.y * 2) / 2
      firstPoint.value = point
      initialPoint.value = point
      mousePos.value = point
    } else {
      const rawPoint = getSvgPoint(event)
      const point = getSnapPoint(rawPoint)
      point.x = Math.round(point.x * 2) / 2
      point.y = Math.round(point.y * 2) / 2
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
      const wall = walls.value[closestWallIndex]!
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
      const clickedWall = walls.value[closestWallIndex!]
      if (clickedWall?.groupId) {
        selectedWallIndices.value = walls.value
          .map((wall, index) => wall.groupId === clickedWall.groupId ? index : -1)
          .filter(index => index !== -1)
      } else {
        selectedWallIndices.value = [closestWallIndex!]
      }
      
      // Recherche d'une ouverture cliquée pour le drag
      let closestOpeningIdSelect = null
      let minDistanceOpeningSelect = Infinity
      const selectOpeningThreshold = 20 / zoom.value

      clickedWall.openings.forEach((opening) => {
        const dx = clickedWall.end.x - clickedWall.start.x
        const dy = clickedWall.end.y - clickedWall.start.y
        const wallLength = Math.sqrt(dx * dx + dy * dy)
        if (wallLength === 0) return

        const ox = clickedWall.start.x + dx * opening.position
        const oy = clickedWall.start.y + dy * opening.position
        const ex = ox + (dx / wallLength) * opening.width
        const ey = oy + (dy / wallLength) * opening.width

        // Distance du point au segment de l'ouverture
        const odx = ex - ox
        const ody = ey - oy
        const ol2 = odx * odx + ody * ody
        let ot = ((point.x - ox) * odx + (point.y - oy) * ody) / ol2
        ot = Math.max(0, Math.min(1, ot))
        const dist = Math.sqrt(Math.pow(point.x - (ox + ot * odx), 2) + Math.pow(point.y - (oy + ot * ody), 2))

        if (dist < selectOpeningThreshold && dist < minDistanceOpeningSelect) {
          minDistanceOpeningSelect = dist
          closestOpeningIdSelect = opening.id
        }
      })

      if (closestOpeningIdSelect) {
        selectedOpeningId.value = closestOpeningIdSelect
        selectedWallIndices.value = []
        isDraggingOpening.value = true
        
        // Calculer l'offset initial pour un glissement fluide
        const sel = selectedOpening.value
        if (sel) {
          const dx = sel.wall.end.x - sel.wall.start.x
          const dy = sel.wall.end.y - sel.wall.start.y
          const wallLength = Math.sqrt(dx * dx + dy * dy)
          const clickT = ((point.x - sel.wall.start.x) * dx + (point.y - sel.wall.start.y) * dy) / (wallLength * wallLength)
          dragOpeningOffset.value = clickT - sel.opening.position
        }
      }
    } else {
      selectedWallIndices.value = []
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
      isDraggingOpening.value = true
      
      // Calculer l'offset initial pour un glissement fluide
      const sel = selectedOpening.value
      if (sel) {
        const dx = sel.wall.end.x - sel.wall.start.x
        const dy = sel.wall.end.y - sel.wall.start.y
        const wallLength = Math.sqrt(dx * dx + dy * dy)
        const clickT = ((point.x - sel.wall.start.x) * dx + (point.y - sel.wall.start.y) * dy) / (wallLength * wallLength)
        dragOpeningOffset.value = clickT - sel.opening.position
      }
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
  if (isDraggingOpening.value && selectedOpeningId.value) {
    const point = getSvgPoint(event)
    let currentWall: Wall | null = null
    let currentOpening: Opening | null = null
    
    for (const wall of walls.value) {
      const opening = wall.openings.find(o => o.id === selectedOpeningId.value)
      if (opening) {
        currentWall = wall
        currentOpening = opening
        break
      }
    }

    if (currentWall && currentOpening) {
      const dx = currentWall.end.x - currentWall.start.x
      const dy = currentWall.end.y - currentWall.start.y
      const wallLength = Math.sqrt(dx * dx + dy * dy)
      
      if (wallLength > 0) {
        let t = ((point.x - currentWall.start.x) * dx + (point.y - currentWall.start.y) * dy) / (wallLength * wallLength)
        let newT = t - dragOpeningOffset.value
        const openingTWidth = currentOpening.width / wallLength

        // Si on dépasse les bornes du mur actuel, chercher un mur adjacent
        if (newT < 0 || newT > 1 - openingTWidth) {
          const junctionPoint = newT < 0 ? currentWall.start : currentWall.end
          
          // Chercher d'autres murs connectés à ce point
          for (const otherWall of walls.value) {
            if (otherWall.id === currentWall.id) continue
            
            const isStart = otherWall.start.x === junctionPoint.x && otherWall.start.y === junctionPoint.y
            const isEnd = otherWall.end.x === junctionPoint.x && otherWall.end.y === junctionPoint.y
            
            if (isStart || isEnd) {
              const odx = otherWall.end.x - otherWall.start.x
              const ody = otherWall.end.y - otherWall.start.y
              const otherWallLength = Math.sqrt(odx * odx + ody * ody)
              if (otherWallLength < currentOpening.width) continue // Mur trop court

              // Calculer la projection sur le nouveau mur
              let otherT = ((point.x - otherWall.start.x) * odx + (point.y - otherWall.start.y) * ody) / (otherWallLength * otherWallLength)
              
              // Vérifier si le mouvement de la souris "entre" dans le nouveau mur
              // Si on vient de la fin du mur précédent vers le début du nouveau mur (isStart)
              // ou du début du mur précédent vers la fin du nouveau mur (isEnd)
              if ((isStart && otherT > 0) || (isEnd && otherT < 1)) {
                // Transférer l'ouverture
                currentWall.openings = currentWall.openings.filter(o => o.id !== selectedOpeningId.value)
                otherWall.openings.push(currentOpening)
                
                // Recalculer l'offset pour la fluidité sur le nouveau mur
                // Le point de jonction sur le nouveau mur est otherT_junction (0 ou 1)
                // On veut que l'ouverture soit positionnée de sorte que la souris garde la même distance relative à son bord
                const otherOpeningTWidth = currentOpening.width / otherWallLength
                
                if (isStart) {
                  currentOpening.position = 0
                } else {
                  currentOpening.position = 1 - otherOpeningTWidth
                }
                
                // Mettre à jour l'offset de drag pour le nouveau mur
                dragOpeningOffset.value = otherT - currentOpening.position
                break
              }
            }
          }
          
          // Ré-appliquer la limite après tentative de transfert
          newT = Math.max(0, Math.min(1 - openingTWidth, newT))
        }
        
        currentOpening.position = newT
      }
    }
    return
  }

  if (isResizingWall.value && selectedWallIndices.value.length > 0) {
    const rawPoint = getSvgPoint(event)
    const point = getSnapPoint(rawPoint)
    point.x = Math.round(point.x * 2) / 2
    point.y = Math.round(point.y * 2) / 2
    const wall = walls.value[selectedWallIndices.value[0]!]
    if (wall) {
      const oldPoint = isResizingWall.value === 'start' ? { ...wall.start } : { ...wall.end }
      
      // Mettre à jour tous les murs qui partagent ce point
      walls.value.forEach(w => {
        if (w.start.x === oldPoint.x && w.start.y === oldPoint.y) {
          w.start = { ...point }
        }
        if (w.end.x === oldPoint.x && w.end.y === oldPoint.y) {
          w.end = { ...point }
        }
      })
    }
    return
  }

  if (isResizing.value && selectedOpeningId.value) {
    const point = getSvgPoint(event)
    
    // Trouver le mur et l'ouverture correspondante
    for (const wall of walls.value) {
      const openingIndex = wall.openings.findIndex(o => o.id === selectedOpeningId.value)
      if (openingIndex !== -1) {
        const opening = wall.openings[openingIndex]!
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

  if (isWallRoundMode.value && firstPoint.value) {
    const rawPoint = getSvgPoint(event)
    const point = getSnapPoint(rawPoint)
    point.x = Math.round(point.x * 2) / 2
    point.y = Math.round(point.y * 2) / 2
    mousePos.value = point
    return
  }
  
  if (isDrawingMode.value && firstPoint.value) {
    const rawPoint = getSvgPoint(event)
    const point = getSnapPoint(rawPoint)
    point.x = Math.round(point.x * 2) / 2
    point.y = Math.round(point.y * 2) / 2
    
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
  isResizingWall.value = null
  isDraggingOpening.value = false
}

const onTouchStart = (event: TouchEvent) => {
  if (isRoomSelectionMode.value) {
    clearRoomSelection()
    return
  }
  if (selectedTool.value !== 'move') return
  
  if (event.touches.length === 1) {
    isDragging.value = true
    lastMouseX.value = event.touches[0]!.clientX
    lastMouseY.value = event.touches[0]!.clientY
  }
}

const onTouchMove = (event: TouchEvent) => {
  if (isDraggingOpening.value && selectedOpeningId.value) {
    const point = getSvgPoint(event.touches[0]!)
    let currentWall: Wall | null = null
    let currentOpening: Opening | null = null
    
    for (const wall of walls.value) {
      const opening = wall.openings.find(o => o.id === selectedOpeningId.value)
      if (opening) {
        currentWall = wall
        currentOpening = opening
        break
      }
    }

    if (currentWall && currentOpening) {
      const dx = currentWall.end.x - currentWall.start.x
      const dy = currentWall.end.y - currentWall.start.y
      const wallLength = Math.sqrt(dx * dx + dy * dy)
      
      if (wallLength > 0) {
        let t = ((point.x - currentWall.start.x) * dx + (point.y - currentWall.start.y) * dy) / (wallLength * wallLength)
        let newT = t - dragOpeningOffset.value
        const openingTWidth = currentOpening.width / wallLength

        // Si on dépasse les bornes du mur actuel, chercher un mur adjacent
        if (newT < 0 || newT > 1 - openingTWidth) {
          const junctionPoint = newT < 0 ? currentWall.start : currentWall.end
          
          for (const otherWall of walls.value) {
            if (otherWall.id === currentWall.id) continue
            
            const isStart = otherWall.start.x === junctionPoint.x && otherWall.start.y === junctionPoint.y
            const isEnd = otherWall.end.x === junctionPoint.x && otherWall.end.y === junctionPoint.y
            
            if (isStart || isEnd) {
              const odx = otherWall.end.x - otherWall.start.x
              const ody = otherWall.end.y - otherWall.start.y
              const otherWallLength = Math.sqrt(odx * odx + ody * ody)
              if (otherWallLength < currentOpening.width) continue

              let otherT = ((point.x - otherWall.start.x) * odx + (point.y - otherWall.start.y) * ody) / (otherWallLength * otherWallLength)
              
              if ((isStart && otherT > 0) || (isEnd && otherT < 1)) {
                currentWall.openings = currentWall.openings.filter(o => o.id !== selectedOpeningId.value)
                otherWall.openings.push(currentOpening)
                
                const otherOpeningTWidth = currentOpening.width / otherWallLength
                
                if (isStart) {
                  currentOpening.position = 0
                } else {
                  currentOpening.position = 1 - otherOpeningTWidth
                }
                
                dragOpeningOffset.value = otherT - currentOpening.position
                break
              }
            }
          }
          newT = Math.max(0, Math.min(1 - openingTWidth, newT))
        }
        currentOpening.position = newT
      }
    }
    return
  }

  if (isResizingWall.value && selectedWallIndices.value.length > 0) {
    const rawPoint = getSvgPoint(event.touches[0]!)
    const point = getSnapPoint(rawPoint)
    const wall = walls.value[selectedWallIndices.value[0]!]
    if (wall) {
      const oldPoint = isResizingWall.value === 'start' ? { ...wall.start } : { ...wall.end }
      
      walls.value.forEach(w => {
        if (w.start.x === oldPoint.x && w.start.y === oldPoint.y) {
          w.start = { ...point }
        }
        if (w.end.x === oldPoint.x && w.end.y === oldPoint.y) {
          w.end = { ...point }
        }
      })
    }
    return
  }

  if (isResizing.value && selectedOpeningId.value) {
    const point = getSvgPoint(event.touches[0]!)
    
    // Trouver le mur et l'ouverture correspondante
    for (const wall of walls.value) {
      const openingIndex = wall.openings.findIndex(o => o.id === selectedOpeningId.value)
      if (openingIndex !== -1) {
        const opening = wall.openings[openingIndex]!
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
  isDraggingOpening.value = false
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
  if (selectedTool.value === 'resize') {
    if (selectedOpeningId.value) return resizeCursorStyle.value
    if (isResizingWall.value) return 'move'
    return 'default'
  }
  if (selectedTool.value === 'move') {
    return isDragging.value ? 'grabbing' : 'grab'
  }
  return 'default'
})

const selectedWalls = computed(() => {
  return selectedWallIndices.value.map(index => walls.value[index]!).filter(wall => !!wall)
})

const isSelectedGroup = computed(() => {
  if (selectedWalls.value.length <= 1) return false
  const firstGroupId = selectedWalls.value[0]?.groupId
  if (!firstGroupId) return false
  return selectedWalls.value.every(wall => wall.groupId === firstGroupId)
})

const groupStartPoint = computed(() => {
  if (!isSelectedGroup.value) return null
  return selectedWalls.value[0]?.start || null
})

const groupEndPoint = computed(() => {
  if (!isSelectedGroup.value) return null
  return selectedWalls.value[selectedWalls.value.length - 1]?.end || null
})

const groupTotalLength = computed(() => {
  if (!isSelectedGroup.value) return 0
  return selectedWalls.value.reduce((sum, wall) => {
    const dx = wall.end.x - wall.start.x
    const dy = wall.end.y - wall.start.y
    return sum + Math.sqrt(dx * dx + dy * dy)
  }, 0) / GRID_SECONDARY_UNIT_SIZE
})

const groupChordLength = computed(() => {
  if (!groupStartPoint.value || !groupEndPoint.value) return 0
  const dx = groupEndPoint.value.x - groupStartPoint.value.x
  const dy = groupEndPoint.value.y - groupStartPoint.value.y
  return Math.sqrt(dx * dx + dy * dy) / GRID_SECONDARY_UNIT_SIZE
})

const selectedWall = computed(() => {
  if (isSelectedGroup.value) {
    return {
      start: groupStartPoint.value!,
      end: groupEndPoint.value!
    } as Wall
  }
  return selectedWalls.value[0] || null
})

const buildingPoints = computed(() => {
  if (walls.value.length < 3) return []
  return walls.value.reduce((acc, wall) => {
    const startKey = `${Math.round(wall.start.x * 2) / 2},${Math.round(wall.start.y * 2) / 2}`
    const endKey = `${Math.round(wall.end.x * 2) / 2},${Math.round(wall.end.y * 2) / 2}`
    if (!acc.some(p => p.key === startKey)) acc.push({ key: startKey, x: wall.start.x, y: wall.start.y })
    if (!acc.some(p => p.key === endKey)) acc.push({ key: endKey, x: wall.end.x, y: wall.end.y })
    return acc
  }, [] as { key: string, x: number, y: number }[])
})

const buildingArea = computed(() => {
  if (buildingPoints.value.length < 3) return 0
  return Math.abs(polygonSignedArea(buildingPoints.value))
})

const selectedRoomCenter = computed(() => {
  if (selectedRoomIds.value.length === 0) return { x: 0, y: 0 }
  
  // Cas spécial pour le bâtiment complet
  if (selectedRoomIds.value.includes('global-building')) {
    if (buildingPoints.value.length === 0) return { x: 0, y: 0 }
    const sumX = buildingPoints.value.reduce((sum, p) => sum + p.x, 0)
    const sumY = buildingPoints.value.reduce((sum, p) => sum + p.y, 0)
    return {
      x: sumX / buildingPoints.value.length,
      y: sumY / buildingPoints.value.length
    }
  }

  const room = rooms.value.find(r => r.id === selectedRoomIds.value[0])
  if (!room) return { x: 0, y: 0 }
  
  const sumX = room.points.reduce((sum, p) => sum + p.x, 0)
  const sumY = room.points.reduce((sum, p) => sum + p.y, 0)
  return {
    x: sumX / room.points.length,
    y: sumY / room.points.length
  }
})

const selectedWallDistance = computed(() => {
  if (isSelectedGroup.value) return groupChordLength.value
  if (!selectedWall.value) return 0
  const wall = selectedWall.value
  const dx = wall.end.x - wall.start.x
  const dy = wall.end.y - wall.start.y
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

watch([selectedTool, sidebarSelectedTool], (newValues, oldValues) => {
  const [newTool, newSidebarTool] = newValues
  const [oldTool, oldSidebarTool] = oldValues

  selectedWallIndices.value = []

  // On ne réinitialise selectedOpeningId que si on ne passe pas de window-bay (edit) à resize (ou inversement)
  const isMovingToResizeFromBay = oldTool === 'edit' && oldSidebarTool === 'window-bay' && newTool === 'resize'
  const isMovingToBayFromResize = oldTool === 'resize' && newTool === 'edit' && newSidebarTool === 'window-bay'

  if (!isMovingToResizeFromBay && !isMovingToBayFromResize) {
    selectedOpeningId.value = null
  }

  if (selectedTool.value !== 'measure') {
    clearRoomSelection()
  }
})

watch(
    walls,
    (nextWalls) => rooms.value = buildRoomFaces(nextWalls),
    { deep: true, immediate: true }
)
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

      <!-- Forme globale du bâtiment (remplissage sans contour) -->
        <polygon
            v-if="walls.length >= 3"
            :points="buildingPoints.map(p => `${p.x},${p.y}`).join(' ')"
            :fill="selectedRoomIds.includes('global-building') ? '#ffeb3b' : '#f5f5f5'"
            :fill-opacity="selectedRoomIds.includes('global-building') ? 0.8 : 0.5"
            stroke="none"
            pointer-events="all"
            :style="{ cursor: isRoomSelectionMode ? 'pointer' : undefined }"
            @mousedown="(event: MouseEvent) => {
              if (isRoomSelectionMode) {
                event.preventDefault()
                event.stopPropagation()
                toggleRoomSelection('global-building', buildingArea, event.ctrlKey)
              }
            }"
            @touchstart="(event: TouchEvent) => { 
              if (isRoomSelectionMode) {
                event.preventDefault()
                event.stopPropagation()
                toggleRoomSelection('global-building', buildingArea, false) 
              }
            }"
        />

      <!-- Pièces générées -->
        <polygon
            v-for="room in rooms"
            :key="room.id"
            :points="room.points.map(point => `${point.x},${point.y}`).join(' ')"
            :fill="selectedRoomIds.includes(room.id) ? '#ffeb3b' : room.color"
            :fill-opacity="selectedRoomIds.includes(room.id) ? 0.8 : 1"
            stroke="none"
            pointer-events="all"
            :style="{ cursor: isRoomSelectionMode ? 'pointer' : undefined }"
            @mousedown="(event: MouseEvent) => {
              if (isRoomSelectionMode) {
                event.preventDefault()
                event.stopPropagation()
                toggleRoomSelection(room.id, room.area, event.ctrlKey)
              }
            }"
            @touchstart="(event: TouchEvent) => { 
              if (isRoomSelectionMode) {
                event.stopPropagation()
                toggleRoomSelection(room.id, room.area, false) 
              }
            }"
        />

        <!-- Murs fixés -->
        <path
          :d="wallsPathData"
          stroke="black"
          :stroke-width="WALL_STROKE_WIDTH"
          stroke-linecap="round"
          fill="none"
        />

        <!-- Ouvertures -->
        <g v-for="wall in walls" :key="`openings-${wall.id}`">
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

        <!-- Murs sélectionnés (affichage orange pour tous les segments du groupe) -->
        <g v-if="selectedWalls.length > 0">
          <line
            v-for="swall in selectedWalls"
            :key="swall.id"
            :x1="swall.start.x"
            :y1="swall.start.y"
            :x2="swall.end.x"
            :y2="swall.end.y"
            stroke="orange"
            :stroke-width="WALL_STROKE_WIDTH"
            stroke-linecap="round"
          />
          <template v-if="selectedWall">
            <circle
              v-if="!isSelectedGroup"
              :cx="selectedWall.start.x"
              :cy="selectedWall.start.y"
              :r="isResizeMode ? 8 : 6"
              :fill="isResizeMode ? 'white' : 'orange'"
              :stroke="isResizeMode ? 'orange' : 'none'"
              :stroke-width="isResizeMode ? 2 : 0"
              :style="{ cursor: isResizeMode ? 'move' : 'default' }"
            />
            <circle
              v-if="!isSelectedGroup"
              :cx="selectedWall.end.x"
              :cy="selectedWall.end.y"
              :r="isResizeMode ? 8 : 6"
              :fill="isResizeMode ? 'white' : 'orange'"
              :stroke="isResizeMode ? 'orange' : 'none'"
              :stroke-width="isResizeMode ? 2 : 0"
              :style="{ cursor: isResizeMode ? 'move' : 'default' }"
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
              <template v-if="isSelectedGroup"> (arc: {{ groupTotalLength.toFixed(2) }}m)</template>
            </text>
          </template>

          <template v-if="isRoomSelectionMode && selectedRoomIds.length > 0">
            <text
                fill="black"
                font-size="14"
                text-anchor="middle"
                alignment-baseline="middle"
                :x="selectedRoomCenter.x"
                :y="selectedRoomCenter.y"
                style="user-select: none; font-weight: bold; paint-order: stroke; stroke: white; stroke-width: 4px;"
            >
              {{ (totalSelectedArea / (GRID_SECONDARY_UNIT_SIZE * GRID_SECONDARY_UNIT_SIZE)).toFixed(2) }} m²
            </text>
          </template>
        </g>

        <!-- Mur de prévisualisation -->
        <template v-if="firstPoint && mousePos">
          <!-- Si on est en train de définir la courbure -->
          <template v-if="curvePoint1">
            <line
              v-for="(seg, idx) in arcSegments"
              :key="idx"
              :x1="seg.start.x"
              :y1="seg.start.y"
              :x2="seg.end.x"
              :y2="seg.end.y"
              stroke="blue"
              :stroke-width="WALL_STROKE_WIDTH"
              stroke-dasharray="5,5"
              stroke-linecap="round"
            />
          </template>
          <!-- Sinon segment droit classique (corde pour wall-round ou mur normal) -->
          <line
            v-else
            :x1="firstPoint.x"
            :y1="firstPoint.y"
            :x2="mousePos.x"
            :y2="mousePos.y"
            stroke="blue"
            :stroke-width="WALL_STROKE_WIDTH"
            stroke-dasharray="5,5"
            stroke-linecap="round"
          />
        </template>

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
