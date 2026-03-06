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

// Facteur de conversion pour que 1 mètre = 10 unités 3D (cohérent avec GRID_SECONDARY_UNIT_SIZE)
const SCALE_FACTOR = 10;
const HUMAN_EYE_HEIGHT_RATIO = 1.6 / 2.5; // Environ 1.6m pour un mur de 2.5m

const props = defineProps<{
  walls: any[];
  rooms: any[];
}>();

// Hauteur de la caméra calculée dynamiquement
const cameraHeight = computed(() => {
  if (props.walls.length === 0) return 1.7 * SCALE_FACTOR;
  // On prend la hauteur du premier mur (ou du mur sélectionné s'il y en avait un de passé en prop)
  const baseHeight = props.walls[0].height || 2.5;
  return baseHeight * HUMAN_EYE_HEIGHT_RATIO * SCALE_FACTOR;
});

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
  camera.position.set(0, cameraHeight.value, 0); 
  
  // On s'assure qu'on regarde l'horizon dès le début
  const initialLookAt = new THREE.Vector3(1, cameraHeight.value, 0);
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
    const startX = wall.start.x - 500;
    const startZ = wall.start.y - 500;
    const endX = wall.end.x - 500;
    const endZ = wall.end.y - 500;

    minX = Math.min(minX, startX, endX);
    minZ = Math.min(minZ, startZ, endZ);
    maxX = Math.max(maxX, startX, endX);
    maxZ = Math.max(maxZ, startZ, endZ);

    const start = new THREE.Vector2(startX, startZ);
    const end = new THREE.Vector2(endX, endZ);
    
    // Trouver les murs connectés à start et end
    const connectedAtStart = props.walls.filter(w => 
      w.id !== wall.id && 
      (Math.abs(w.start.x - wall.start.x) < 0.1 && Math.abs(w.start.y - wall.start.y) < 0.1 ||
       Math.abs(w.end.x - wall.start.x) < 0.1 && Math.abs(w.end.y - wall.start.y) < 0.1)
    );
    const connectedAtEnd = props.walls.filter(w => 
      w.id !== wall.id && 
      (Math.abs(w.start.x - wall.end.x) < 0.1 && Math.abs(w.start.y - wall.end.y) < 0.1 ||
       Math.abs(w.end.x - wall.end.x) < 0.1 && Math.abs(w.end.y - wall.end.y) < 0.1)
    );

    const wallThickness = 5;
    const halfThickness = wallThickness / 2;
    const wallHeight = (wall.height || 2.5) * SCALE_FACTOR;

    // Direction du mur actuel
    const dir = new THREE.Vector2().subVectors(end, start).normalize();
    const normal = new THREE.Vector2(-dir.y, dir.x);

    // Points de base du rectangle du mur (sans mitre)
    let p1 = start.clone().add(normal.clone().multiplyScalar(halfThickness)); // Start Left
    let p2 = start.clone().add(normal.clone().multiplyScalar(-halfThickness)); // Start Right
    let p3 = end.clone().add(normal.clone().multiplyScalar(-halfThickness)); // End Right
    let p4 = end.clone().add(normal.clone().multiplyScalar(halfThickness)); // End Left

    const getMitrePoint = (p: THREE.Vector2, d1: THREE.Vector2, d2: THREE.Vector2, thickness: number, isLeft: boolean) => {
      const n1 = new THREE.Vector2(-d1.y, d1.x);
      const n2 = new THREE.Vector2(-d2.y, d2.x);
      
      // On utilise la bissectrice des normales pour la direction du mitre
      const miterDir = new THREE.Vector2().addVectors(n1, n2).normalize();
      
      // Si les murs sont colinéaires (ou presque), la normale moyenne est la normale
      if (miterDir.length() < 0.01) {
        return p.clone().add(n1.clone().multiplyScalar(isLeft ? thickness : -thickness));
      }

      // Calculer la longueur du mitre
      // La formule est : thickness / cos(angle/2)
      // On peut l'obtenir avec le produit scalaire entre miterDir et une des normales
      const dot = miterDir.dot(n1);
      
      if (Math.abs(dot) < 0.1) { // Éviter la division par zéro sur des angles extrêmes
         return p.clone().add(n1.clone().multiplyScalar(isLeft ? thickness : -thickness));
      }
      
      const miterLen = thickness / dot;
      
      // Limiter la longueur du mitre pour éviter des pics infinis sur des angles très aigus
      // (Même si pour des murs normaux ça ne devrait pas arriver)
      const clampedMiterLen = Math.min(Math.abs(miterLen), thickness * 3) * Math.sign(miterLen);
      
      return p.clone().add(miterDir.multiplyScalar(isLeft ? clampedMiterLen : -clampedMiterLen));
    };

    if (connectedAtStart.length > 0) {
      const other = connectedAtStart[0];
      const otherStart = new THREE.Vector2(other.start.x - 500, other.start.y - 500);
      const otherEnd = new THREE.Vector2(other.end.x - 500, other.end.y - 500);
      let otherDir: THREE.Vector2;
      
      if (Math.abs(other.end.x - wall.start.x) < 0.1 && Math.abs(other.end.y - wall.start.y) < 0.1) {
        // Le mur 'other' finit là où 'wall' commence
        otherDir = new THREE.Vector2().subVectors(otherEnd, otherStart).normalize();
      } else {
        // Le mur 'other' commence là où 'wall' commence
        otherDir = new THREE.Vector2().subVectors(otherStart, otherEnd).normalize();
      }
      
      p1 = getMitrePoint(start, otherDir, dir, halfThickness, true);
      p2 = getMitrePoint(start, otherDir, dir, halfThickness, false);
    }

    if (connectedAtEnd.length > 0) {
      const other = connectedAtEnd[0];
      const otherStart = new THREE.Vector2(other.start.x - 500, other.start.y - 500);
      const otherEnd = new THREE.Vector2(other.end.x - 500, other.end.y - 500);
      let otherDir: THREE.Vector2;
      
      if (Math.abs(other.start.x - wall.end.x) < 0.1 && Math.abs(other.start.y - wall.end.y) < 0.1) {
        // Le mur 'other' commence là où 'wall' finit
        otherDir = new THREE.Vector2().subVectors(otherEnd, otherStart).normalize();
      } else {
        // Le mur 'other' finit là où 'wall' finit
        otherDir = new THREE.Vector2().subVectors(otherStart, otherEnd).normalize();
      }
      
      p3 = getMitrePoint(end, dir, otherDir, halfThickness, false);
      p4 = getMitrePoint(end, dir, otherDir, halfThickness, true);
    }

    const shape = new THREE.Shape();
    shape.moveTo(p1.x, p1.y);
    shape.lineTo(p2.x, p2.y);
    shape.lineTo(p3.x, p3.y);
    shape.lineTo(p4.x, p4.y);
    shape.closePath();

    const extrudeSettings = {
      steps: 1,
      depth: wallHeight,
      bevelEnabled: false
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    const material = new THREE.MeshPhongMaterial({ color: 0xcccccc });
    const mesh = new THREE.Mesh(geometry, material);
    
    // Rotation pour mettre le mur debout (Extrude extrude selon Z, on veut selon Y)
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0; // Le bas du mur est à 0
    
    mesh.userData.type = 'wall';
    scene.add(mesh);
  });

  // Si la caméra est à (0, cameraHeight.value, 0), on la place au milieu des murs
  if (camera.position.x === 0 && camera.position.z === 0 && props.walls.length > 0) {
    const centerX = (minX + maxX) / 2;
    const centerZ = (minZ + maxZ) / 2;
    const currentCameraHeight = cameraHeight.value;
    camera.position.set(centerX, currentCameraHeight, centerZ);
    controls.target.set(centerX + 1, currentCameraHeight, centerZ);
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
    camera.position.y = cameraHeight.value;

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

watch(() => props.walls, () => {
  updateScene();
}, { deep: true });

watch(cameraHeight, (newHeight) => {
  if (camera) {
    camera.position.y = newHeight;
    if (controls) {
      controls.target.y = newHeight;
      controls.update();
    }
  }
});

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
