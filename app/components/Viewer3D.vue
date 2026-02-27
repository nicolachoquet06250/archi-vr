<script setup lang="ts">
import * as THREE from 'three'
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js'
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useProjectStore } from '~/stores/project'

const props = defineProps<{
  vrEnabled?: boolean
}>()

const { layers } = useProjectStore()
const containerRef = ref<HTMLDivElement | null>(null)

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let animationId: number

// États pour la rotation à la souris
const isDragging = ref(false)
const previousMousePosition = { x: 0, y: 0 }
const mouseRotateSpeed = 0.005

// États pour le déplacement
const keys = {
  ArrowUp: false,
  ArrowDown: false,
  ArrowLeft: false,
  ArrowRight: false,
}

const moveSpeed = 0.05
const rotateSpeed = 0.02
const collisionRadius = 0.3
const isShiftPressed = ref(false)

const raycaster = new THREE.Raycaster()

function checkCollision(position: THREE.Vector3, direction: THREE.Vector3, distance: number): boolean {
  // On vérifie les collisions à deux hauteurs : 
  // 1. Au niveau des yeux/torse (hauteur actuelle de la caméra ~1.7m)
  // 2. Au niveau des jambes (pour détecter les allèges de fenêtres ~0.5m)
  const heights = [position.y, 0.5]
  
  for (const h of heights) {
    const rayPos = position.clone()
    rayPos.y = h
    
    // Configurer le raycaster à partir de la position à la hauteur h vers la direction
    raycaster.set(rayPos, direction)
    
    // Chercher les intersections avec les murs, linteaux, allèges et coins
    const intersects = raycaster.intersectObjects(scene.children, true)
    
    // Ne garder que les objets bloquants
    const blockingIntersects = intersects.filter(intersect => {
      const name = intersect.object.name
      return name === 'wall' || name === 'opening-part' || name === 'corner'
    })

    // S'il y a une intersection à une distance inférieure au seuil, collision
    if (blockingIntersects.length > 0 && blockingIntersects[0].distance < distance + collisionRadius) {
      return true
    }
  }
  
  return false
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key in keys) {
    keys[e.key as keyof typeof keys] = true
  }
  if (e.key === 'Shift') {
    isShiftPressed.value = true
  }
}

function handleKeyUp(e: KeyboardEvent) {
  if (e.key in keys) {
    keys[e.key as keyof typeof keys] = false
  }
  if (e.key === 'Shift') {
    isShiftPressed.value = false
  }
}

function handleMouseDown(e: MouseEvent) {
  isDragging.value = true
  previousMousePosition.x = e.clientX
  previousMousePosition.y = e.clientY
}

function handleMouseMove(e: MouseEvent) {
  if (!isDragging.value) return

  const deltaX = e.clientX - previousMousePosition.x
  const deltaY = e.clientY - previousMousePosition.y

  // Rotation horizontale (Y)
  camera.rotation.y -= deltaX * mouseRotateSpeed
  
  // Rotation verticale (X) avec limitation pour ne pas faire de salto
  camera.rotation.x -= deltaY * mouseRotateSpeed
  camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x))

  previousMousePosition.x = e.clientX
  previousMousePosition.y = e.clientY
}

function handleMouseUp() {
  isDragging.value = false
}

function isPositionInsideWall(position: THREE.Vector3): boolean {
  // On considère qu'on est "dans" un mur si la position est à l'intérieur de la BoundingBox 
  // d'un objet bloquant.
  const tempBox = new THREE.Box3()
  
  for (const child of scene.children) {
    if (child instanceof THREE.Mesh && 
       (child.name === 'wall' || child.name === 'opening-part' || child.name === 'corner')) {
      
      // On calcule la bounding box dans le repère du monde
      tempBox.setFromObject(child)
      
      // On ajoute une petite marge de sécurité égale au collisionRadius
      tempBox.expandByScalar(collisionRadius - 0.05)
      
      // On vérifie si la position est à l'intérieur, en ignorant Y car on est au sol
      // mais en vérifiant quand même que la caméra n'est pas au dessus ou au dessous de l'objet
      if (tempBox.containsPoint(position)) {
        return true
      }
    }
  }
  return false
}

function ensureSafeSpawn(forceRandomDoor = false) {
  if (!scene || !camera) return

  // Si on ne force pas une porte et que la position actuelle est déjà sûre, on ne bouge pas
  if (!forceRandomDoor && !isPositionInsideWall(camera.position)) return

  // Collecter toutes les portes
  const doors: { pos: THREE.Vector3, normal: THREE.Vector3 }[] = []
  
  layers.value.forEach(layer => {
    if (!layer.visible) return
    layer.walls.forEach(wall => {
      const dx = wall.end.x - wall.start.x
      const dz = wall.end.y - wall.start.y
      const angle = Math.atan2(dz, dx)
      
      // La normale du mur (perpendiculaire)
      const normal = new THREE.Vector3(Math.sin(angle), 0, -Math.cos(angle))

      wall.openings.forEach(op => {
        if (op.type === 'door') {
          const posX = wall.start.x + dx * op.position
          const posZ = wall.start.y + dz * op.position
          doors.push({
            pos: new THREE.Vector3(posX, 1.7, posZ),
            normal: normal.clone()
          })
        }
      })
    })
  })

  if (doors.length > 0) {
    // Choisir une porte au hasard
    const door = doors[Math.floor(Math.random() * doors.length)]
    
    // Calculer le centre de tous les murs pour déterminer l'extérieur
    const center = new THREE.Vector3(0, 0, 0)
    let wallPointsCount = 0
    layers.value.forEach(l => l.walls.forEach(w => {
      center.x += w.start.x + w.end.x
      center.z += w.start.y + w.end.y
      wallPointsCount += 2
    }))
    if (wallPointsCount > 0) {
      center.x /= wallPointsCount
      center.z /= wallPointsCount
    }

    // Tester les deux côtés de la porte (à 5m)
    const pos1 = door.pos.clone().add(door.normal.clone().multiplyScalar(5))
    const pos2 = door.pos.clone().add(door.normal.clone().multiplyScalar(-5))
    
    // Celui qui est le plus loin du centre est considéré comme "l'extérieur"
    const dist1 = pos1.distanceTo(center)
    const dist2 = pos2.distanceTo(center)
    
    const spawnPos = dist1 > dist2 ? pos1 : pos2
    camera.position.copy(spawnPos)
    
    // Orienter la caméra vers la porte
    camera.lookAt(door.pos)
    // Forcer la rotation YXZ et s'assurer que X/Z sont propres (on regarde horizontalement)
    const targetRotationY = camera.rotation.y
    camera.rotation.set(0, targetRotationY, 0, 'YXZ')
    
    console.log("Apparition devant une porte à l'extérieur")
    return
  }

  // Si pas de porte, on utilise l'ancienne logique de sécurité ou un fallback
  const originalPos = camera.position.clone()
  
  // Si déjà en sécurité, on ne bouge pas
  if (!isPositionInsideWall(camera.position)) return

  console.log("Position de départ non sécurisée, recherche d'un emplacement libre...")

  let radius = 0.1 // On commence très près
  let angle = 0
  const maxAttempts = 500 // Encore plus de tentatives pour une recherche très fine
  
  let currentAttempt = 0
  while (isPositionInsideWall(camera.position) && currentAttempt < maxAttempts) {
    camera.position.x = originalPos.x + Math.cos(angle) * radius
    camera.position.z = originalPos.z + Math.sin(angle) * radius
    
    // Spirale : on augmente l'angle et le rayon petit à petit
    angle += 0.2
    radius += 0.01
    currentAttempt++
  }
  
  if (currentAttempt < maxAttempts) {
    console.log("Nouvelle position sécurisée trouvée après", currentAttempt, "tentatives")
  } else {
    // Si on a épuisé les tentatives sans trouver de place, on revient à l'original (cas désespéré)
    // et on essaie une position de secours absolue
    camera.position.copy(originalPos)
    console.warn("Impossible de trouver un point d'apparition sûr après", maxAttempts, "tentatives")
    
    // Position de secours absolue (hors des murs par défaut si le plan est raisonnable)
    if (isPositionInsideWall(camera.position)) {
       camera.position.set(0, 1.7, 0)
       if (isPositionInsideWall(camera.position)) {
         camera.position.set(5, 1.7, 5)
       }
    }
  }
}

function init() {
  if (!containerRef.value) return

  scene = new THREE.Scene()
  const backgroundColor = new THREE.Color(0xf0f0f0)
  scene.background = backgroundColor
  scene.fog = new THREE.Fog(backgroundColor, 10, 100)

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000)
  // Utilisation de l'ordre YXZ pour que la rotation Y (gauche/droite) soit indépendante des autres axes
  camera.rotation.order = 'YXZ'
  // Hauteur de tête humaine : environ 1.70m
  camera.position.set(2, 1.7, 5)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(window.innerWidth * 0.8, 600)
  renderer.xr.enabled = true
  containerRef.value.appendChild(renderer.domElement)

  if (props.vrEnabled) {
    containerRef.value.appendChild(VRButton.createButton(renderer))
  }

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
  directionalLight.position.set(10, 20, 10)
  scene.add(directionalLight)

  const gridHelper = new THREE.GridHelper(100, 100, 0x888888, 0xcccccc)
  scene.add(gridHelper)

  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
  renderer.domElement.addEventListener('mousedown', handleMouseDown)
  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('mouseup', handleMouseUp)

  updateScene()
  
  // Une fois la scène chargée, on fait apparaître la caméra devant une porte
  ensureSafeSpawn(true)
  
  animate()
}

function updateScene() {
  // Clear previous walls and stairs (excluding lights and grid)
  const elementsToRemove = scene.children.filter(child => 
    child.name === 'wall' || 
    child.name === 'floor' || 
    child.name === 'opening-part' || 
    child.name === 'corner' ||
    child.name === 'stair'
  )
  elementsToRemove.forEach(child => scene.remove(child))

  // Create Floor
  const floorSize = 1000
  const floorGeometry = new THREE.PlaneGeometry(floorSize, floorSize)
  const floorMaterial = new THREE.MeshStandardMaterial({ color: 0xf0f0f0 })
  const floor = new THREE.Mesh(floorGeometry, floorMaterial)
  floor.rotation.x = -Math.PI / 2
  floor.name = 'floor'
  scene.add(floor)

  // Create Walls and Stairs
  layers.value.forEach(layer => {
    if (!layer.visible) return

    // Collect all unique points (endpoints) and keep angles to size corner joints
    const pointMap = new Map<string, { x: number, y: number, heights: number[], thicknesses: number[], angles: number[] }>()

    function addPoint(key: string, x: number, y: number, height: number, thickness: number, angle: number) {
      const existing = pointMap.get(key)
      if (existing) {
        existing.heights.push(height)
        existing.thicknesses.push(thickness)
        existing.angles.push(angle)
      } else {
        pointMap.set(key, { x, y, heights: [height], thicknesses: [thickness], angles: [angle] })
      }
    }
    
    layer.walls.forEach(wall => {
      const startKey = `${wall.start.x.toFixed(3)},${wall.start.y.toFixed(3)}`
      const endKey = `${wall.end.x.toFixed(3)},${wall.end.y.toFixed(3)}`

      const dx = wall.end.x - wall.start.x
      const dz = wall.end.y - wall.start.y
      const length = Math.sqrt(dx * dx + dz * dz)
      const angle = Math.atan2(dz, dx)

      // Register endpoints with outgoing direction angles
      addPoint(startKey, wall.start.x, wall.start.y, wall.height, wall.thickness, angle)
      addPoint(endKey, wall.end.x, wall.end.y, wall.height, wall.thickness, (angle + Math.PI) % (Math.PI * 2))

      // Créer les segments de mur en évitant les ouvertures
      const sortedOpenings = [...(wall.openings || [])].sort((a, b) => a.position - b.position)
      let lastT = 0
      
      const createWallSegment = (t1: number, t2: number) => {
        if (t2 - t1 < 0.001) return
        const segLength = (t2 - t1) * length
        const geometry = new THREE.BoxGeometry(segLength, wall.height, wall.thickness)
        const material = new THREE.MeshStandardMaterial({ color: 0x808080, side: THREE.DoubleSide })
        const mesh = new THREE.Mesh(geometry, material)
        
        const centerT = (t1 + t2) / 2
        const posX = wall.start.x + dx * centerT
        const posZ = wall.start.y + dz * centerT
        
        mesh.position.set(posX, wall.height / 2, posZ)
        mesh.rotation.y = -angle
        mesh.name = 'wall'
        scene.add(mesh)
      }

      sortedOpenings.forEach(op => {
        const startT = op.position - (op.width / 2 / length)
        const endT = op.position + (op.width / 2 / length)
        
        // Segment avant l'ouverture (pleine hauteur)
        createWallSegment(lastT, startT)
        
        // Segment au-dessus de l'ouverture (linteau)
        const openingHeight = op.type === 'door' ? 2.1 : 1.2
        const openingBottom = op.type === 'door' ? 0 : 0.9
        
        // Linteau (dessus)
        const linteauHeight = wall.height - (openingBottom + openingHeight)
        if (linteauHeight > 0) {
          const geometry = new THREE.BoxGeometry(op.width, linteauHeight, wall.thickness)
          const material = new THREE.MeshStandardMaterial({ color: 0x808080, side: THREE.DoubleSide })
          const mesh = new THREE.Mesh(geometry, material)
          const posX = wall.start.x + dx * op.position
          const posZ = wall.start.y + dz * op.position
          mesh.position.set(posX, wall.height - linteauHeight / 2, posZ)
          mesh.rotation.y = -angle
          mesh.name = 'opening-part'
          scene.add(mesh)
        }
      
        // Allège (dessous) pour les fenêtres
        if (op.type === 'window' && openingBottom > 0) {
          const geometry = new THREE.BoxGeometry(op.width, openingBottom, wall.thickness)
          const material = new THREE.MeshStandardMaterial({ color: 0x808080, side: THREE.DoubleSide })
          const mesh = new THREE.Mesh(geometry, material)
          const posX = wall.start.x + dx * op.position
          const posZ = wall.start.y + dz * op.position
          mesh.position.set(posX, openingBottom / 2, posZ)
          mesh.rotation.y = -angle
          mesh.name = 'opening-part'
          scene.add(mesh)
        }
        
        lastT = endT
      })
      
      // Dernier segment
      createWallSegment(lastT, 1)
    })

    // Add corner joints: use cylinders of the same thickness to avoid "poles" sticking out
    pointMap.forEach(p => {
      const height = Math.max(...p.heights)
      const thickness = Math.max(...p.thicknesses)

      // A cylinder with radius = thickness/2 fits exactly within the wall width
      // and rounds the outer corner slightly without sticking out on the sides.
      const geometry = new THREE.CylinderGeometry(thickness / 2, thickness / 2, height, 32)
      const material = new THREE.MeshStandardMaterial({ color: 0x808080, side: THREE.DoubleSide })
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.set(p.x, height / 2, p.y)
      mesh.name = 'corner' // Using specific name for cleanup
      scene.add(mesh)
    })

    // Add Stairs
    for (const stair of (layer.stairs ?? [])) {
      const group = new THREE.Group()
      group.position.set(stair.position.x, 0, stair.position.y)
      group.rotation.y = -stair.rotation
      group.name = 'stair'

      const stepThickness = Math.min(0.05, Math.max(0.03, stair.height / (stair.steps * 10)))

      if (stair.type === 'straight') {
        const stepCount = Math.max(3, stair.steps)
        const run = stair.length
        const rise = stair.height
        const width = stair.width
        const stepRise = rise / stepCount
        const stepDepth = run / stepCount
        for (let i = 0; i < stepCount; i++) {
          const g = new THREE.BoxGeometry(width, stepThickness, stepDepth)
          const m = new THREE.MeshStandardMaterial({ color: 0x9e9e9e })
          const mesh = new THREE.Mesh(g, m)
          const zCenter = -run/2 + stepDepth * (i + 0.5)
          const yCenter = stepRise * (i + 0.5)
          mesh.position.set(0, yCenter, zCenter)
          mesh.castShadow = true
          mesh.receiveShadow = true
          mesh.name = 'stair'
          group.add(mesh)
        }
      } else if (stair.type === 'corner') {
        // Two straight flights at 90°
        const halfRun = stair.length / 2
        const width = stair.width
        const stepCount = Math.max(3, stair.steps)
        const stepCountPerFlight = Math.floor(stepCount / 2)
        const rise = stair.height
        const stepRise = rise / stepCount
        const stepDepth = halfRun / stepCountPerFlight
        // First flight along -Z
        for (let i = 0; i < stepCountPerFlight; i++) {
          const g = new THREE.BoxGeometry(width, stepThickness, stepDepth)
          const m = new THREE.MeshStandardMaterial({ color: 0x9e9e9e })
          const mesh = new THREE.Mesh(g, m)
          const zCenter = -halfRun - width/2 + stepDepth * (i + 0.5)
          const yCenter = stepRise * (i + 0.5)
          mesh.position.set(0, yCenter, zCenter)
          mesh.name = 'stair'
          group.add(mesh)
        }
        // Second flight along +X
        for (let i = 0; i < stepCount - stepCountPerFlight; i++) {
          const g = new THREE.BoxGeometry(stepDepth, stepThickness, width)
          const m = new THREE.MeshStandardMaterial({ color: 0x9e9e9e })
          const mesh = new THREE.Mesh(g, m)
          const xCenter = stepDepth * (i + 0.5)
          const yCenter = stepRise * (stepCountPerFlight + i + 0.5)
          mesh.position.set(width/2 + xCenter, yCenter, -width/2)
          mesh.name = 'stair'
          group.add(mesh)
        }
      } else if (stair.type === 'spiral') {
        // Central pole
        const poleRadius = Math.max(0.05, stair.width * 0.05)
        const poleGeo = new THREE.CylinderGeometry(poleRadius, poleRadius, stair.height, 16)
        const poleMat = new THREE.MeshStandardMaterial({ color: 0x8d8d8d })
        const pole = new THREE.Mesh(poleGeo, poleMat)
        pole.position.set(0, stair.height/2, 0)
        pole.name = 'stair'
        group.add(pole)

        // Steps around the pole
        const stepCount = Math.max(8, stair.steps)
        const radius = Math.max(stair.width * 0.5, 0.5)
        for (let i = 0; i < stepCount; i++) {
          const angle = (i / stepCount) * Math.PI * 2 * 1.25 // ~1.25 tours
          const g = new THREE.BoxGeometry(radius * 0.6, stepThickness, radius * 0.2)
          const m = new THREE.MeshStandardMaterial({ color: 0x9e9e9e })
          const mesh = new THREE.Mesh(g, m)
          const yCenter = (stair.height / stepCount) * (i + 0.5)
          mesh.position.set(Math.cos(angle) * (radius * 0.7), yCenter, Math.sin(angle) * (radius * 0.7))
          mesh.rotation.y = -angle
          mesh.name = 'stair'
          group.add(mesh)
        }
      }

      scene.add(group)
    }
  })

  // Vérifier si la caméra se retrouve dans un mur suite aux changements (si la scène est déjà initialisée)
  if (camera) {
    ensureSafeSpawn()
  }
}

function animate() {
  renderer.setAnimationLoop(() => {
    // Calcul des vecteurs de direction
    const direction = new THREE.Vector3()
    const sideDirection = new THREE.Vector3()
    
    camera.getWorldDirection(direction)
    // On ignore la composante Y pour rester au sol
    direction.y = 0
    direction.normalize()
    
    // Vecteur latéral (produit vectoriel entre direction et axe vertical)
    sideDirection.crossVectors(direction, new THREE.Vector3(0, 1, 0)).normalize()

    // Calcul du vecteur de déplacement souhaité
    const moveVector = new THREE.Vector3(0, 0, 0)
    
    if (keys.ArrowUp) {
      moveVector.add(direction.clone().multiplyScalar(moveSpeed))
    }
    if (keys.ArrowDown) {
      moveVector.add(direction.clone().multiplyScalar(-moveSpeed))
    }
    
    if (keys.ArrowLeft) {
      if (isShiftPressed.value) {
        camera.rotation.y += rotateSpeed
      } else {
        moveVector.add(sideDirection.clone().multiplyScalar(-moveSpeed))
      }
    }
    if (keys.ArrowRight) {
      if (isShiftPressed.value) {
        camera.rotation.y -= rotateSpeed
      } else {
        moveVector.add(sideDirection.clone().multiplyScalar(moveSpeed))
      }
    }

    // Application du déplacement avec glissement sur les murs
    if (moveVector.length() > 0) {
      // On essaie de se déplacer sur l'axe X
      if (Math.abs(moveVector.x) > 0) {
        const dirX = new THREE.Vector3(Math.sign(moveVector.x), 0, 0)
        if (!checkCollision(camera.position, dirX, Math.abs(moveVector.x))) {
          camera.position.x += moveVector.x
        }
      }
      // On essaie de se déplacer sur l'axe Z
      if (Math.abs(moveVector.z) > 0) {
        const dirZ = new THREE.Vector3(0, 0, Math.sign(moveVector.z))
        if (!checkCollision(camera.position, dirZ, Math.abs(moveVector.z))) {
          camera.position.z += moveVector.z
        }
      }
    }
    
    renderer.render(scene, camera)
  })
}

watch(layers, () => {
  updateScene()
}, { deep: true })

onMounted(() => {
  init()
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
  if (renderer) {
    renderer.domElement.removeEventListener('mousedown', handleMouseDown)
  }
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('mouseup', handleMouseUp)
  
  if (renderer) {
    renderer.setAnimationLoop(null)
    renderer.dispose()
  }
})
</script>

<template>
  <div ref="containerRef" class="viewer-3d"></div>
</template>

<style scoped>
.viewer-3d {
  width: 100%;
  height: 600px;
  overflow: hidden;
  border: 1px solid #ccc;
  position: relative;
}
</style>
