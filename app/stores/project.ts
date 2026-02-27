import { reactive, computed } from 'vue'
import type { ProjectState, Layer, Wall, Point, Opening, OpeningType, OpeningVariant, Stair, StairType } from '~/types/project'

const state = reactive<ProjectState>({
  layers: [
    {
      id: 'layer-1',
      name: 'Rez-de-chaussée',
      visible: true,
      walls: [],
      stairs: []
    }
  ],
  currentLayerId: 'layer-1'
})

export function useProjectStore() {
  const layers = computed(() => state.layers)
  const currentLayer = computed(() => 
    state.layers.find(l => l.id === state.currentLayerId) || state.layers[0]
  )

  // Migration/robustesse: s'assurer que toutes les couches ont bien un tableau stairs
  state.layers.forEach(l => {
    // @ts-ignore - au runtime certaines anciennes couches peuvent ne pas avoir la prop
    if (!l.stairs) l.stairs = []
  })

  function addWall(start: Point, end: Point) {
    if (!currentLayer.value) return

    // Éviter les murs de longueur nulle
    const dist = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2)
    if (dist < 0.01) return

    // 1. Vérifier si un mur identique existe déjà (même points, peu importe l'ordre)
    const existingWall = currentLayer.value.walls.find(w => 
      (isSamePoint(w.start, start) && isSamePoint(w.end, end)) ||
      (isSamePoint(w.start, end) && isSamePoint(w.end, start))
    )
    if (existingWall) return

    // 2. Fusionner avec des murs colinéaires existants
    // On cherche un mur qui partage une extrémité ET qui est colinéaire
    for (const wall of currentLayer.value.walls) {
      if (isSamePoint(wall.end, start)) {
        if (isCollinear(wall.start, wall.end, end)) {
          wall.end = { ...end }
          return
        }
      } else if (isSamePoint(wall.start, start)) {
        if (isCollinear(wall.end, wall.start, end)) {
          wall.start = { ...end }
          return
        }
      } else if (isSamePoint(wall.end, end)) {
        if (isCollinear(wall.start, wall.end, start)) {
          wall.end = { ...start }
          return
        }
      } else if (isSamePoint(wall.start, end)) {
        if (isCollinear(wall.end, wall.start, start)) {
          wall.start = { ...start }
          return
        }
      }
    }

    const newWall: Wall = {
      id: crypto.randomUUID(),
      start: { ...start },
      end: { ...end },
      thickness: 0.2,
      height: 2.5,
      openings: []
    }
    
    currentLayer.value.walls.push(newWall)
  }

  function isSamePoint(p1: Point, p2: Point) {
    const threshold = 0.05 // 5cm
    return Math.abs(p1.x - p2.x) < threshold && Math.abs(p1.y - p2.y) < threshold
  }

  function isCollinear(p1: Point, p2: Point, p3: Point) {
    // Calcul de l'aire du triangle formé par les 3 points (doit être proche de 0)
    // Aire = 0.5 * |x1(y2-y3) + x2(y3-y1) + x3(y1-y2)|
    const area = Math.abs(p1.x * (p2.y - p3.y) + p2.x * (p3.y - p1.y) + p3.x * (p1.y - p2.y))
    // Le seuil dépend de la longueur des segments, mais on va utiliser une valeur fixe pour simplifier
    // Une aire de 0.01 pour des murs en mètres est assez précise
    return area < 0.01
  }

  function addLayer(name: string) {
    const newLayer: Layer = {
      id: crypto.randomUUID(),
      name,
      visible: true,
      walls: [],
      stairs: []
    }
    // Défense: s'assurer que les autres couches existantes ont stairs
    state.layers.forEach(l => {
      // @ts-ignore
      if (!l.stairs) l.stairs = []
    })
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

  function updateWall(id: string, start: Point, end: Point) {
    state.layers.forEach(layer => {
      const wall = layer.walls.find(w => w.id === id)
      if (wall) {
        wall.start = { ...start }
        wall.end = { ...end }
      }
    })
  }

  function addOpening(wallId: string, type: OpeningType, variant: OpeningVariant, position: number, width: number) {
    state.layers.forEach(layer => {
      const wall = layer.walls.find(w => w.id === wallId)
      if (wall) {
        wall.openings.push({
          id: crypto.randomUUID(),
          type,
          variant,
          position,
          width,
          flipped: false
        })
      }
    })
  }

  function removeOpening(wallId: string, openingId: string) {
    state.layers.forEach(layer => {
      const wall = layer.walls.find(w => w.id === wallId)
      if (wall) {
        wall.openings = wall.openings.filter(o => o.id !== openingId)
      }
    })
  }

  function updateOpening(wallId: string, openingId: string, updates: Partial<Opening>) {
    state.layers.forEach(layer => {
      const wall = layer.walls.find(w => w.id === wallId)
      if (wall) {
        const opening = wall.openings.find(o => o.id === openingId)
        if (opening) {
          Object.assign(opening, updates)
        }
      }
    })
  }

  function moveOpeningToWall(oldWallId: string, newWallId: string, openingId: string) {
    let openingToMove: Opening | null = null
    
    // Trouver et retirer l'ouverture du mur d'origine
    state.layers.forEach(layer => {
      const oldWall = layer.walls.find(w => w.id === oldWallId)
      if (oldWall) {
        const index = oldWall.openings.findIndex(o => o.id === openingId)
        if (index !== -1) {
          openingToMove = oldWall.openings.splice(index, 1)[0]!
        }
      }
    })

    // Ajouter l'ouverture au nouveau mur
    if (openingToMove) {
      state.layers.forEach(layer => {
        const newWall = layer.walls.find(w => w.id === newWallId)
        if (newWall) {
          newWall.openings.push(openingToMove!)
        }
      })
    }
  }

  function toggleOpeningFlip(wallId: string, openingId: string) {
    state.layers.forEach(layer => {
      const wall = layer.walls.find(w => w.id === wallId)
      if (wall) {
        const opening = wall.openings.find(o => o.id === openingId)
        if (opening) {
          opening.flipped = !opening.flipped
        }
      }
    })
  }

  function addStair(type: StairType, position: Point, rotation: number) {
    if (!currentLayer.value) return

    const newStair: Stair = {
      id: crypto.randomUUID(),
      type,
      position: { ...position },
      rotation,
      width: 1,
      length: 2,
      height: 2.5,
      steps: 15
    }

    // Garde-fou si la propriété n'existe pas encore sur la couche active
    // @ts-ignore
    if (!currentLayer.value.stairs) currentLayer.value.stairs = []
    currentLayer.value.stairs.push(newStair)
  }

  function removeStair(id: string) {
    state.layers.forEach(layer => {
      // @ts-ignore
      if (!layer.stairs) layer.stairs = []
      layer.stairs = layer.stairs.filter(s => s.id !== id)
    })
  }

  function updateStair(id: string, updates: Partial<Stair>) {
    state.layers.forEach(layer => {
      // @ts-ignore
      if (!layer.stairs) layer.stairs = []
      const stair = layer.stairs.find(s => s.id === id)
      if (stair) {
        Object.assign(stair, updates)
      }
    })
  }

  return {
    layers,
    currentLayer,
    addWall,
    removeWall,
    updateWall,
    addLayer,
    setCurrentLayer,
    toggleLayerVisibility,
    addOpening,
    removeOpening,
    updateOpening,
    moveOpeningToWall,
    toggleOpeningFlip,
    addStair,
    removeStair,
    updateStair
  }
}
