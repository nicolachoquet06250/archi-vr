<script setup lang="ts">
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const moveForward = ref(false);
const moveBackward = ref(false);
const moveLeft = ref(false);
const moveRight = ref(false);
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const moveSpeed = 400.0; // Vitesse de déplacement augmentée

// Constantes pour l'altitude de la caméra
const CAMERA_HEIGHT = 17;

const props = defineProps<{
  walls: any[];
  rooms: any[];
}>();

const container = ref<HTMLElement | null>(null);
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;

const init = () => {
  if (!container.value) return;

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf0f0f0);

  // Camera
  camera = new THREE.PerspectiveCamera(75, container.value.clientWidth / container.value.clientHeight, 0.1, 5000);
  camera.position.set(0, CAMERA_HEIGHT, 0); 
  
  // On s'assure qu'on regarde l'horizon dès le début
  const initialLookAt = new THREE.Vector3(1, CAMERA_HEIGHT, 0);
  camera.lookAt(initialLookAt);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.value.clientWidth, container.value.clientHeight);
  container.value.appendChild(renderer.domElement);

  // Controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = false; // Désactiver le glissement pour une rotation plus "sèche"
  controls.enablePan = false; // Désactiver le panoramique pour garder la hauteur d'homme
  controls.screenSpacePanning = false;
  controls.maxPolarAngle = Math.PI - 0.01; // Permettre de regarder vers le sol (proche de 180°)
  controls.minPolarAngle = 0.01; // Permettre de regarder vers le ciel (proche de 0°)
  controls.enableZoom = false; // Désactiver le zoom car on se déplace au clavier
  controls.target.copy(initialLookAt); // Regard horizontal vers l'avant (X positif)
  controls.update(); // Mettre à jour immédiatement pour appliquer la target

  // Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(50, 100, 50);
  scene.add(directionalLight);

  // Grid
  const gridHelper = new THREE.GridHelper(2000, 100);
  scene.add(gridHelper);

  // Ground Plane
  const planeGeometry = new THREE.PlaneGeometry(2000, 2000);
  
  // Création d'une texture avec le motif "ArchiVR"
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  if (context) {
    // Fond blanc
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, 256, 256);
    
    // Texte ArchiVR
    context.font = 'bold 40px Arial';
    context.fillStyle = '#e0e0e0';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('ArchiVR', 128, 128);
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(50, 50); // Répéter le motif 50 fois sur les 2000 unités
  
  const planeMaterial = new THREE.MeshPhongMaterial({ 
    map: texture,
    side: THREE.DoubleSide 
  });
  const plane = new THREE.Mesh(planeGeometry, planeMaterial);
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = -0.1; // Slightly below 0 to avoid z-fighting with grid if any
  plane.receiveShadow = true;
  plane.userData.type = 'ground';
  scene.add(plane);

  updateScene();
  animate();
};

const updateScene = () => {
  if (!scene) return;

  // On nettoie la scène (on ne garde que le sol, les lumières et la grille)
  const objectsToRemove = scene.children.filter(child => 
    child.userData.type === 'wall'
  );
  objectsToRemove.forEach(obj => scene.remove(obj));
  
  if (props.walls.length === 0) return;

  // Calculer le centre de tous les murs pour y placer la caméra si elle est à 0,0,0
  let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;

  props.walls.forEach(wall => {
    // Les coordonnées 2D (x, y) deviennent (x, z) en 3D (Y est la hauteur)
    // On garde le décalage de -500 cohérent avec le SVG si nécessaire
    const startX = wall.start.x - 500;
    const startZ = wall.start.y - 500;
    const endX = wall.end.x - 500;
    const endZ = wall.end.y - 500;

    minX = Math.min(minX, startX, endX);
    minZ = Math.min(minZ, startZ, endZ);
    maxX = Math.max(maxX, startX, endX);
    maxZ = Math.max(maxZ, startZ, endZ);

    const start = new THREE.Vector3(startX, 0, startZ);
    const end = new THREE.Vector3(endX, 0, endZ);
    
    const distance = start.distanceTo(end);
    const geometry = new THREE.BoxGeometry(distance, 25, 5); // 25 units height
    const material = new THREE.MeshPhongMaterial({ color: 0xcccccc });
    const mesh = new THREE.Mesh(geometry, material);
    
    // Position au milieu
    const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    mesh.position.set(midpoint.x, 12.5, midpoint.z);
    
    // Rotation pour aligner le mur
    const direction = new THREE.Vector3().subVectors(end, start);
    const angle = Math.atan2(direction.z, direction.x);
    mesh.rotation.y = -angle; 
    
    mesh.userData.type = 'wall';
    scene.add(mesh);
  });

  // Si la caméra est à (0, CAMERA_HEIGHT, 0), on la place au milieu des murs
  if (camera.position.x === 0 && camera.position.z === 0 && props.walls.length > 0) {
    const centerX = (minX + maxX) / 2;
    const centerZ = (minZ + maxZ) / 2;
    camera.position.set(centerX, CAMERA_HEIGHT, centerZ);
    controls.target.set(centerX + 1, CAMERA_HEIGHT, centerZ);
    controls.update();
  }
};

const animate = () => {
  const time = performance.now();
  const delta = (time - prevTime) / 1000;

  requestAnimationFrame(animate);

  if (controls && controls.enabled) {
    // Les contrôles au clavier restent fluides
    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;

    direction.z = Number(moveForward.value) - Number(moveBackward.value);
    direction.x = Number(moveRight.value) - Number(moveLeft.value);
    direction.normalize(); // Assure un mouvement fluide dans toutes les directions

    if (moveForward.value || moveBackward.value) velocity.z -= direction.z * moveSpeed * delta;
    if (moveLeft.value || moveRight.value) velocity.x -= direction.x * moveSpeed * delta;

    // Calculer le déplacement basé sur l'orientation de la caméra
    const camDirection = new THREE.Vector3();
    camera.getWorldDirection(camDirection);
    
    // Pour le mouvement au sol, on ignore la composante Y
    const walkDirection = camDirection.clone();
    walkDirection.y = 0;
    walkDirection.normalize();

    const camRight = new THREE.Vector3().crossVectors(camera.up, walkDirection).normalize();

    // Appliquer le mouvement
    camera.position.addScaledVector(walkDirection, -velocity.z * delta);
    camera.position.addScaledVector(camRight, velocity.x * delta);

    // Maintenir la caméra à hauteur d'homme
    camera.position.y = CAMERA_HEIGHT;

    // Mettre à jour la cible d'OrbitControls pour qu'elle suive la caméra.
    // En utilisant getWorldDirection, la cible sera toujours dans l'axe de la vue actuelle,
    // ce qui permet de continuer la rotation là où l'on s'est arrêté.
    const targetOffset = camDirection.clone().multiplyScalar(10);
    controls.target.copy(camera.position).add(targetOffset);
  }

  controls.update();
  renderer.render(scene, camera);
  prevTime = time;
};

let prevTime = performance.now();

const handleResize = () => {
  if (!container.value || !camera || !renderer) return;
  camera.aspect = container.value.clientWidth / container.value.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.value.clientWidth, container.value.clientHeight);
};

const onKeyDown = (event: KeyboardEvent) => {
  switch (event.code) {
    case 'ArrowUp':
    case 'KeyW':
    case 'KeyZ':
      moveForward.value = true;
      break;
    case 'ArrowLeft':
    case 'KeyA':
    case 'KeyQ':
      moveLeft.value = true;
      break;
    case 'ArrowDown':
    case 'KeyS':
      moveBackward.value = true;
      break;
    case 'ArrowRight':
    case 'KeyD':
      moveRight.value = true;
      break;
  }
};

const onKeyUp = (event: KeyboardEvent) => {
  switch (event.code) {
    case 'ArrowUp':
    case 'KeyW':
    case 'KeyZ':
      moveForward.value = false;
      break;
    case 'ArrowLeft':
    case 'KeyA':
    case 'KeyQ':
      moveLeft.value = false;
      break;
    case 'ArrowDown':
    case 'KeyS':
      moveBackward.value = false;
      break;
    case 'ArrowRight':
    case 'KeyD':
      moveRight.value = false;
      break;
  }
};

onMounted(() => {
  init();
  window.addEventListener('resize', handleResize);
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  document.removeEventListener('keydown', onKeyDown);
  document.removeEventListener('keyup', onKeyUp);
  if (renderer) {
    renderer.dispose();
  }
});

watch(() => props.walls, () => {
  updateScene();
}, { deep: true });
</script>

<template>
  <div ref="container" :class="$style.threeContainer"></div>
</template>

<style module>
.threeContainer {
  width: 100%;
  height: 100%;
  outline: none;
}
</style>
