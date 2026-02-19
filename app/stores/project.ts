import { reactive, computed } from 'vue'
import type { ProjectState, Layer, Wall, Point } from '~/types/project'

const state = reactive<ProjectState>({
  layers: [
    {
      id: 'layer-1',
      name: 'Rez-de-chaussée',
      visible: true,
      walls: []
    }
  ],
  currentLayerId: 'layer-1'
})

export function useProjectStore() {
  const layers = computed(() => state.layers)
  const currentLayer = computed(() => 
    state.layers.find(l => l.id === state.currentLayerId) || state.layers[0]
  )

  function addWall(start: Point, end: Point) {
    if (!currentLayer.value) return
    
    const newWall: Wall = {
      id: crypto.randomUUID(),
      start: { ...start },
      end: { ...end },
      thickness: 0.2,
      height: 2.5
    }
    
    currentLayer.value.walls.push(newWall)
  }

  function addLayer(name: string) {
    const newLayer: Layer = {
      id: crypto.randomUUID(),
      name,
      visible: true,
      walls: []
    }
    state.layers.push(newLayer)
    state.currentLayerId = newLayer.id
  }

  function setCurrentLayer(id: string) {
    state.currentLayerId = id
  }

  function toggleLayerVisibility(id: string) {
    const layer = state.layers.find(l => l.id === id)
    if (layer) {
      layer.visible = !layer.visible
    }
  }

  function removeWall(id: string) {
    state.layers.forEach(layer => {
      layer.walls = layer.walls.filter(w => w.id !== id)
    })
  }

  return {
    layers,
    currentLayer,
    addWall,
    removeWall,
    addLayer,
    setCurrentLayer,
    toggleLayerVisibility
  }
}
