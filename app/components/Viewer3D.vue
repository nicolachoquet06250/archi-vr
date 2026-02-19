<script setup lang="ts">
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
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
let controls: OrbitControls
let animationId: number

function init() {
  if (!containerRef.value) return

  scene = new THREE.Scene()
  const backgroundColor = new THREE.Color(0xf0f0f0)
  scene.background = backgroundColor
  scene.fog = new THREE.Fog(backgroundColor, 10, 100)

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000)
  camera.position.set(5, 5, 5)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(window.innerWidth * 0.8, 600)
  renderer.xr.enabled = true
  containerRef.value.appendChild(renderer.domElement)

  if (props.vrEnabled) {
    containerRef.value.appendChild(VRButton.createButton(renderer))
  }

  controls = new OrbitControls(camera, renderer.domElement)
  
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
  directionalLight.position.set(10, 20, 10)
  scene.add(directionalLight)

  const gridHelper = new THREE.GridHelper(100, 100, 0x888888, 0xcccccc)
  scene.add(gridHelper)

  updateScene()
  animate()
}

function updateScene() {
  // Clear previous walls (excluding lights and grid)
  const wallsToRemove = scene.children.filter(child => child.name === 'wall' || child.name === 'floor')
  wallsToRemove.forEach(child => scene.remove(child))

  // Create Floor
  const floorSize = 1000
  const floorGeometry = new THREE.PlaneGeometry(floorSize, floorSize)
  const floorMaterial = new THREE.MeshStandardMaterial({ color: 0xf0f0f0 })
  const floor = new THREE.Mesh(floorGeometry, floorMaterial)
  floor.rotation.x = -Math.PI / 2
  floor.name = 'floor'
  scene.add(floor)

  // Create Walls
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

      const geometry = new THREE.BoxGeometry(length, wall.height, wall.thickness)
      const material = new THREE.MeshStandardMaterial({ color: 0x808080 })
      const mesh = new THREE.Mesh(geometry, material)

      // Center of the wall
      const centerX = (wall.start.x + wall.end.x) / 2
      const centerZ = (wall.start.y + wall.end.y) / 2
      
      mesh.position.set(centerX, wall.height / 2, centerZ)
      mesh.rotation.y = -angle
      mesh.name = 'wall'
      
      scene.add(mesh)
    })

    // Add corner joints: use cylinders of the same thickness to avoid "poles" sticking out
    pointMap.forEach(p => {
      const height = Math.max(...p.heights)
      const thickness = Math.max(...p.thicknesses)

      // A cylinder with radius = thickness/2 fits exactly within the wall width
      // and rounds the outer corner slightly without sticking out on the sides.
      const geometry = new THREE.CylinderGeometry(thickness / 2, thickness / 2, height, 32)
      const material = new THREE.MeshStandardMaterial({ color: 0x808080 })
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.set(p.x, height / 2, p.y)
      mesh.name = 'wall' // Using the same name to allow cleanup
      scene.add(mesh)
    })
  })
}

function animate() {
  renderer.setAnimationLoop(() => {
    controls.update()
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
