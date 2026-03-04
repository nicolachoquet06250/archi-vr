<script setup lang="ts">
const { selectedTool, resetTrigger, zoomInTrigger, zoomOutTrigger, zoom, zoomIn, zoomOut, resetView } = useToolbar()

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

const onMouseDown = (event: MouseEvent) => {
  if (selectedTool.value !== 'move') return
  isDragging.value = true
  lastMouseX.value = event.clientX
  lastMouseY.value = event.clientY
}

const onMouseMove = (event: MouseEvent) => {
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

const cursorStyle = computed(() => {
  if (selectedTool.value === 'move') {
    return isDragging.value ? 'grabbing' : 'grab'
  }
  return 'default'
})
</script>

<template>
  <div 
    :class="$style.drawingZone" 
    :style="{ cursor: cursorStyle }"
    @mousedown="onMouseDown"
    @mousemove="onMouseMove"
    @mouseup="onMouseUp"
    @mouseleave="onMouseUp"
    @wheel="onWheel"
  >
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Grille secondaire (petits carreaux) -->
        <pattern id="smallGrid" width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#f0f0f0" stroke-width="0.5"/>
        </pattern>
        <!-- Grille principale (gros carreaux) -->
        <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
          <rect width="100" height="100" fill="url(#smallGrid)"/>
          <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#e0e0e0" stroke-width="1"/>
        </pattern>
      </defs>

      <g 
        :transform="`translate(${panX}, ${panY}) scale(${zoom})`"
        :class="{ [$style.transitioning]: isResetting }"
      >
        <rect x="-10000" y="-10000" width="20000" height="20000" fill="url(#grid)" />
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
