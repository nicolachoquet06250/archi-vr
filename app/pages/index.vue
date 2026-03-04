<script setup lang="ts">
import { ref } from 'vue'
import { useProjectStore } from '~/stores/project'
import PlanEditor from '~/components/PlanEditor.vue'
import Viewer3D from '~/components/Viewer3D.vue'

const { layers, addLayer, setCurrentLayer, toggleLayerVisibility, currentLayer } = useProjectStore()
const viewMode = ref<'2d' | '3d' | 'vr'>('2d')

function handleAddLayer() {
  const name = prompt('Nom de la nouvelle couche :', `Couche ${layers.value.length + 1}`)
  if (name) {
    addLayer(name)
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-100 p-4 font-sans">
    <header class="bg-white shadow-md rounded-lg p-4 mb-4 flex justify-between items-center">
      <h1 class="text-2xl font-bold text-gray-800">ArchiVR - Logiciel d'Architecture</h1>

      <div class="flex gap-2">
        <button
            @click="viewMode = '2d'"
            :class="['px-4 py-2 rounded', viewMode === '2d' ? 'bg-blue-600 text-white' : 'bg-gray-200']"
        >
          Plan 2D
        </button>
        <button
            @click="viewMode = '3d'"
            :class="['px-4 py-2 rounded', viewMode === '3d' ? 'bg-blue-600 text-white' : 'bg-gray-200']"
        >
          Vue 3D
        </button>
        <button
            @click="viewMode = 'vr'"
            :class="['px-4 py-2 rounded', viewMode === 'vr' ? 'bg-blue-600 text-white' : 'bg-gray-200']"
        >
          Mode VR
        </button>
      </div>
    </header>

    <div class="flex gap-4">
      <!-- Sidebar / Layers -->
      <aside class="w-64 bg-white shadow-md rounded-lg p-4 h-fit">
        <div class="flex justify-between items-center mb-4">
          <h2 class="font-semibold">Couches (Multi-layer)</h2>
          <button @click="handleAddLayer" class="text-blue-600 text-xl font-bold">+</button>
        </div>

        <ul class="space-y-2">
          <li
              v-for="layer in layers"
              :key="layer.id"
              class="flex items-center justify-between p-2 rounded hover:bg-gray-50 border"
              :class="{'border-blue-500 bg-blue-50': layer.id === currentLayer?.id}"
          >
            <div class="flex items-center gap-2 overflow-hidden">
              <input
                  type="checkbox"
                  :checked="layer.visible"
                  @change="toggleLayerVisibility(layer.id)"
              >
              <span
                  class="truncate cursor-pointer flex-1"
                  @click="setCurrentLayer(layer.id)"
              >
                {{ layer.name }}
              </span>
            </div>
            <span class="text-xs text-gray-500">({{ layer.walls.length }} murs)</span>
          </li>
        </ul>
      </aside>

      <!-- Main Content -->
      <main class="flex-1 bg-white shadow-md rounded-lg p-4 overflow-hidden min-h-[640px] flex items-center justify-center">
        <PlanEditor v-if="viewMode === '2d'" />
        <Viewer3D v-if="viewMode === '3d'" />
        <Viewer3D v-if="viewMode === 'vr'" :vr-enabled="true" />
      </main>
    </div>
  </div>
</template>

<style>
body {
  margin: 0;
  font-family: system-ui, -apple-system, sans-serif;
}

.bg-blue-600 { background-color: #2563eb; }
.bg-blue-50 { background-color: #eff6ff; }
.bg-gray-100 { background-color: #f3f4f6; }
.bg-gray-200 { background-color: #e5e7eb; }
.text-gray-800 { color: #1f2937; }
.text-gray-600 { color: #4b5563; }
.text-gray-500 { color: #6b7280; }
.border-blue-500 { border-color: #3b82f6; }
.shadow-md { box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
.rounded-lg { border-radius: 0.5rem; }
.font-bold { font-weight: 700; }
.font-semibold { font-weight: 600; }
.flex { display: flex; }
.gap-2 { gap: 0.5rem; }
.gap-4 { gap: 1rem; }
.p-4 { padding: 1rem; }
.mb-4 { margin-bottom: 1rem; }
.mt-2 { margin-top: 0.5rem; }
.flex-1 { flex: 1 1 0; }
.min-h-screen { min-height: 100vh; }
.w-64 { width: 16rem; }
.space-y-2 > * + * { margin-top: 0.5rem; }
.items-center { align-items: center; }
.justify-between { justify-content: space-between; }
.justify-center { justify-content: center; }
.rounded { border-radius: 0.25rem; }
.px-4 { padding-left: 1rem; padding-right: 1rem; }
.py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
.text-white { color: #fff; }
.border { border: 1px solid #d1d5db; }
.overflow-hidden { overflow: hidden; }
.truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
