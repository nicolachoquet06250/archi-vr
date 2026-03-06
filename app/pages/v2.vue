<script setup lang="ts">
import AppHeaderZone from "~/components/V2/AppHeaderZone.vue";
import Compass from "~/components/V2/Compass.vue";
import BuildZoneTabs from "~/components/V2/BuildZoneTabs.vue";
import Toolbar from "~/components/V2/Toolbar.vue";
import DrawingZone from "~/components/V2/DrawingZone.vue";
import Loader from "~/components/V2/Loader.vue";

import {WallIcon, DoorIcon, DoorDoubleIcon, WindowIcon, WindowDoubleIcon, WindowBayIcon, StairIcon, StairCornerIcon, StairSpiralIcon, StairPlatformIcon, RoofIcon, FurnitureIcon, ChevronIcon} from "~/components/V2/icons";

const $styles = useCssModule();

const {showCompass} = useCompass()
const {toolbarSide} = useToolbar()
const { viewMode } = useViewMode()
const { isMenuOpen, isPropertiesOpen, toggleMenu, toggleProperties, closeAll: closeSidebar } = useSidebar()
const { selectedRoomIds, totalSelectedArea, clearRoomSelection, isRoomSelectionMode } = useRoomSelection()
const { selectedWallId, selectedWallLength, selectedWallHeight } = useWallSelection()
const { isWallsMenuOpen, isDoorsMenuOpen, isWindowsMenuOpen, isStairsMenuOpen, handleWallsSelect, handleDoorsSelect, handleWindowsSelect, handleStairsSelect, closeAllSubMenus, selectedTool, selectTool } = useToolbarMenu()

const mainZone = ref<HTMLElement | null>(null)
const menuZoneRef = ref<HTMLElement | null>(null)
const propertiesZoneRef = ref<HTMLElement | null>(null)
const mainZoneWidth = ref(0)
const isCompact = computed(() => mainZoneWidth.value < 1100) // 700 (buildZone) + 200 (menu) + 200 (properties)

watch(selectedWallId, (newId) => {
  if (newId) {
    isPropertiesOpen.value = true
  }
})

const handleClickOutside = (event: MouseEvent) => {
  if (!isCompact.value) return

  const target = event.target as HTMLElement

  if (isMenuOpen.value && menuZoneRef.value && !menuZoneRef.value.contains(target)) {
    isMenuOpen.value = false
    closeAllSubMenus()
  }
  if (isPropertiesOpen.value && propertiesZoneRef.value && !propertiesZoneRef.value.contains(target)) {
    isPropertiesOpen.value = false
    clearRoomSelection()
    selectedWallId.value = null
  }
}

const isReady = ref(false)

const position = computed(() => ({
  [$styles.bottom]: toolbarSide.value === 'bottom',
  [$styles.left]: toolbarSide.value === 'left',
  [$styles.top]: toolbarSide.value === 'top',
  [$styles.right]: toolbarSide.value === 'right'
}))

useSeoMeta({
  title: 'ArchiVR - Villa Océane',
  description: `création d'une application d'architecture complète avec la spécificité qu'elle intègre une vue 3D ET une vue VR destiné aux client pour la visite immersive du batiment`,
  ogImage: '/logo.png',
  ogTitle: 'ArchiVR - Villa Océane',
  ogDescription: `création d'une application d'architecture complète avec la spécificité qu'elle intègre une vue 3D ET une vue VR destiné aux client pour la visite immersive du batiment`,
  twitterCard: 'summary_large_image',
  twitterTitle: 'ArchiVR - Villa Océane',
  twitterImage: '/logo.png',
  twitterDescription: `création d'une application d'architecture complète avec la spécificité qu'elle intègre une vue 3D ET une vue VR destiné aux client pour la visite immersive du batiment`,
})

let observer: ResizeObserver | null = null;

const isActive = (tool: ToolbarMenuSelectedTool) => ({
  [$styles.active]: selectedTool.value === tool
})
const isPossibleActive = (tools: ToolbarMenuSelectedTool[]) => ({
  [$styles.active]: selectedTool.value && tools.includes(selectedTool.value)
})

onMounted(() => {
  window.addEventListener('mousedown', handleClickOutside)
  if (mainZone.value) {
    observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        mainZoneWidth.value = entry.contentRect.width
      }
    })
    observer.observe(mainZone.value)
  }

  nextTick(() => {
    setTimeout(() => {
      isReady.value = true
    }, 2000)
  })
})

onUnmounted(() => {
  window.removeEventListener('mousedown', handleClickOutside)
  if (observer) {
    observer.disconnect()
  }
})
</script>

<template>
  <Transition name="fade">
    <Loader v-if="!isReady" />
  </Transition>

  <AppHeaderZone />

  <main ref="mainZone" :class="[$style.mainZone, { [$style.compact]: isCompact }]">
    <aside v-if="viewMode === '2D'" ref="menuZoneRef" :class="[$style.menuZone, { [$style.open]: isMenuOpen }]">
      <nav :class="$style.title" @click="toggleMenu">
        <span v-show="!isCompact || isMenuOpen">Architecture</span>
        <span v-if="isCompact" :class="$style.toggleIcon">
          <ChevronIcon :size="12" :class="[$style.chevron, { [$style.expanded]: isMenuOpen }]" />
        </span>
      </nav>

      <div :class="$style.content">
        <ul :class="$style.menuList">
          <li
              :class="[
                  $style.menuItem,
                  $style.expandable,
                  isPossibleActive([
                      'wall', 'wall-flat',
                      'wall-round'
                  ]),
                  { [$style.expanded]: isWallsMenuOpen }
              ]"
              @click="handleWallsSelect(isCompact)"
          >
            <div :class="$style.menuItemMain">
              <WallIcon :size="20" />
              <span v-show="!isCompact || isMenuOpen">Walls</span>
              <ChevronIcon
                  v-show="!isCompact || isMenuOpen"
                  :size="12"
                  :class="[$style.chevron, { [$style.expanded]: isWallsMenuOpen }]"
              />
            </div>

            <Transition name="expand">
              <ul v-show="isWallsMenuOpen && (!isCompact || isMenuOpen)" :class="$style.subMenu" @click.stop>
                <li :class="[$style.subMenuItem, isActive('wall-flat')]" @click="selectTool('wall-flat')">
                  <WallIcon :size="18" />
                  <span>Flat wall</span>
                </li>

                <li :class="[$style.subMenuItem, isActive('wall-round')]" @click="selectTool('wall-round')">
                  <WallIcon :size="18" />
                  <span>Round wall</span>
                </li>
              </ul>
            </Transition>
          </li>

          <li
              :class="[
                  $style.menuItem,
                  $style.expandable,
                  isPossibleActive([
                      'door', 'door-simple',
                      'door-double'
                  ]),
                  { [$style.expanded]: isDoorsMenuOpen }
              ]"
              @click="handleDoorsSelect(isCompact)"
          >
            <div :class="$style.menuItemMain">
              <DoorIcon :size="22" />
              <span v-show="!isCompact || isMenuOpen">Doors</span>
              <ChevronIcon
                  v-show="!isCompact || isMenuOpen"
                  :size="12"
                  :class="[$style.chevron, { [$style.expanded]: isDoorsMenuOpen }]"
              />
            </div>

            <Transition name="expand">
              <ul v-show="isDoorsMenuOpen && (!isCompact || isMenuOpen)" :class="$style.subMenu" @click.stop>
                <li :class="[$style.subMenuItem, isActive('door-simple')]" @click="selectTool('door-simple')">
                  <DoorIcon :size="18" />
                  <span>Simple doors</span>
                </li>

                <li :class="[$style.subMenuItem, isActive('door-double')]" @click="selectTool('door-double')">
                  <DoorDoubleIcon :size="18" />
                  <span>Double doors</span>
                </li>
              </ul>
            </Transition>
          </li>

          <li
              :class="[
                  $style.menuItem,
                  $style.expandable,
                  isPossibleActive([
                      'window', 'window-simple',
                      'window-double', 'window-bay'
                  ]),
                  { [$style.expanded]: isWindowsMenuOpen }
              ]"
              @click="handleWindowsSelect(isCompact)"
          >
            <div :class="$style.menuItemMain">
              <WindowIcon :size="22" />
              <span v-show="!isCompact || isMenuOpen">Windows</span>
              <ChevronIcon
                  v-show="!isCompact || isMenuOpen"
                  :size="12"
                  :class="[$style.chevron, { [$style.expanded]: isWindowsMenuOpen }]"
              />
            </div>

            <Transition name="expand">
              <ul v-show="isWindowsMenuOpen && (!isCompact || isMenuOpen)" :class="$style.subMenu" @click.stop>
                <li :class="[$style.subMenuItem, isActive('window-simple')]" @click="selectTool('window-simple')">
                  <WindowIcon :size="18" />
                  <span>Simple window</span>
                </li>

                <li :class="[$style.subMenuItem, isActive('window-double')]" @click="selectTool('window-double')">
                  <WindowDoubleIcon :size="18" />
                  <span>Double window</span>
                </li>

                <li :class="[$style.subMenuItem, isActive('window-bay')]" @click="selectTool('window-bay')">
                  <WindowBayIcon :size="18" />
                  <span>Bay window</span>
                </li>
              </ul>
            </Transition>
          </li>

          <li
              :class="[
                  $style.menuItem,
                  $style.expandable,
                  isPossibleActive([
                      'stair', 'stair-straight',
                      'stair-corner', 'stair-spiral',
                      'stair-platform'
                  ]),
                  { [$style.expanded]: isStairsMenuOpen }
              ]"
              @click="handleStairsSelect(isCompact)"
          >
            <div :class="$style.menuItemMain">
              <StairIcon :size="22" />
              <span v-show="!isCompact || isMenuOpen">Stairs</span>
              <ChevronIcon
                  v-show="!isCompact || isMenuOpen"
                  :size="12"
                  :class="[$style.chevron, { [$style.expanded]: isStairsMenuOpen }]"
              />
            </div>

            <Transition name="expand">
              <ul v-show="isStairsMenuOpen && (!isCompact || isMenuOpen)" :class="$style.subMenu" @click.stop>
                <li :class="[$style.subMenuItem, isActive('stair-straight')]" @click="selectTool('stair-straight')">
                  <StairIcon :size="18" />
                  <span>Straight staircases</span>
                </li>

                <li :class="[$style.subMenuItem, isActive('stair-corner')]" @click="selectTool('stair-corner')">
                  <StairCornerIcon :size="18" />
                  <span>Corner stairs</span>
                </li>

                <li :class="[$style.subMenuItem, isActive('stair-spiral')]" @click="selectTool('stair-spiral')">
                  <StairSpiralIcon :size="18" />
                  <span>Spiral staircases</span>
                </li>

                <li :class="[$style.subMenuItem, isActive('stair-platform')]" @click="selectTool('stair-platform')">
                  <StairPlatformIcon :size="18" />
                  <span>Stairs with platforms</span>
                </li>
              </ul>
            </Transition>
          </li>

          <li
              :class="[
                  $style.menuItem,
                  isActive('roof')
              ]"
              @click="selectTool('roof')"
          >
            <RoofIcon :size="20" />
            <span v-show="!isCompact || isMenuOpen">Roofs</span>
          </li>

          <li
              :class="[
                  $style.menuItem,
                  isActive('furniture')
              ]"
              @click="selectTool('furniture')"
          >
            <FurnitureIcon :size="20" />
            <span v-show="!isCompact || isMenuOpen">Furnitures</span>
          </li>
        </ul>
      </div>
    </aside>

    <section :class="$style.buildZone">
      <DrawingZone />
      <BuildZoneTabs />

      <Toolbar
          v-if="viewMode === '2D'"
          :class="[$style.toolbar, position]"
          :horizontal="['top', 'bottom'].includes(toolbarSide)"
          :vertical="['left', 'right'].includes(toolbarSide)"
          :side="toolbarSide"
      />

      <Compass v-show="showCompass" size="100px" :class="$style.compass" />
    </section>

    <aside v-if="viewMode === '2D'" ref="propertiesZoneRef" :class="[$style.propertiesZone, { [$style.open]: isPropertiesOpen }]">
      <nav :class="$style.title" @click="() => { toggleProperties(); if (!isPropertiesOpen) { clearRoomSelection(); } }">
        <span v-if="isCompact" :class="$style.toggleIcon">
          <ChevronIcon :size="12" :class="[$style.chevron, { [$style.expanded]: isPropertiesOpen }]" />
        </span>
        <span v-show="!isCompact || isPropertiesOpen">Properties</span>
      </nav>

      <div :class="$style.content">
        <!-- Contenu des propriétés ici -->
        <div v-if="selectedRoomIds.length > 0" :class="$style.propertyItem">
          <label>{{ selectedRoomIds.length > 1 ? 'Superficie totale :' : 'Superficie de la pièce :' }}</label>
          <span>{{ (totalSelectedArea / 100).toFixed(2) }} m²</span>
        </div>

        <div v-if="selectedWallId" style="border-top: 1px solid #3a3f42; padding-top: 15px; margin-top: 15px;">
          <div :class="$style.propertyItem">
            <label>Longueur du mur :</label>
            <span>{{ selectedWallLength.toFixed(2) }} m</span>
          </div>
          <div :class="$style.propertyItem">
            <label>Hauteur du mur (m) :</label>
            <input 
              type="number" 
              v-model="selectedWallHeight" 
              step="0.1" 
              min="0"
              style="width: 100%; background-color: #3a3f42; border: 1px solid #4a4f52; color: #ffffff; padding: 5px 8px; border-radius: 4px; font-size: 14px; outline: none;"
            />
          </div>
        </div>
      </div>
    </aside>
  </main>
</template>

<style>
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease-in-out;
  max-height: 100px;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
}

#__nuxt {
  height: 100vh;
}

:root {
  --neon-blue: #00f2ff;
  --dark-bg: #1a1a1a;
}
</style>

<style module>
.mainZone {
  display: flex;
  flex-direction: row;
  min-height: calc(100% - (79px + 21px));
  background-color: #303538;
  position: relative;

  .menuZone {
    width: 200px;
    transition: width 0.3s ease;
    background-color: #2b2e31;
    display: flex;
    flex-direction: column;
    z-index: 1000;
    overflow-x: hidden;
  }

  .propertiesZone {
    width: 200px;
    transition: width 0.3s ease;
    background-color: #2b2e31;
    display: flex;
    flex-direction: column;
    z-index: 1000;
    overflow-x: hidden;
  }

  .menuZone .title,
  .propertiesZone .title {
    position: relative;
    z-index: 1;
    height: 30px;
    background-color: #222222;
    cursor: default;
    display: flex;
    justify-content: space-between;
    align-items: center;
    white-space: nowrap;

    color: #cfd1d2;

    > span {
      line-height: 30px;
      padding: 0 10px;
    }
  }

  &.compact {
    .menuZone {
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      width: 30px;
      z-index: 1001;

      &.open {
        width: 200px;
        z-index: 1002;
      }
    }

    .buildZone {
      margin-left: 30px;
      margin-right: 30px;
    }

    .propertiesZone {
      position: absolute;
      top: 0;
      right: 0;
      height: 100%;
      width: 30px;
      z-index: 1001;

      &.open {
        width: 200px;
        z-index: 1002;
      }
    }

    .menuZone .title,
    .propertiesZone .title {
      cursor: pointer;
    }
  }

  .buildZone {
    flex: 1;
    min-height: 100%;
    background-color: #ffffff;
    position: relative;
    overflow: hidden;
    min-width: 0;
  }
}

.compass {
  position: absolute;
  bottom: 5px;
  left: 5px;
}

.propertyItem {
  margin-bottom: 15px;
  color: #cfd1d2;

  label {
    display: block;
    font-size: 12px;
    margin-bottom: 5px;
    color: #888;
  }

  span {
    font-size: 16px;
    font-weight: bold;
  }
}

.numberInput {
  width: 100%;
  background-color: #3a3f42;
  border: 1px solid #4a4f52;
  color: #ffffff;
  padding: 5px 8px;
  border-radius: 4px;
  font-size: 14px;
  outline: none;

  &:focus {
    border-color: #3a80b6;
  }
}

.propertyGroup {
  border-top: 1px solid #3a3f42;
  padding-top: 15px;
  margin-top: 15px;
}

.toggleIcon {
  font-size: 10px;
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.menuList {
  list-style: none;
  padding: 10px 0;
  margin: 0;
}

.menuItem {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  padding: 10px 15px;
  color: #cfd1d2;
  cursor: pointer;
  transition: background-color 0.2s, padding 0.3s ease;
  width: 100%;
  box-sizing: border-box;

  .mainZone.compact .menuZone:not(.open) & {
    padding: 10px 5px;
    justify-content: center;
    gap: 0;
  }

  &:hover {
    background-color: #3a3f42;
  }

  &.active {
    background-color: #3a80b6;
    color: #ffffff;
  }

  span {
    font-size: 14px;
  }
}

.expandable {
  display: block;
  padding: 0;

  .menuItemMain {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 15px;
    width: 100%;
    box-sizing: border-box;
    transition: padding 0.3s ease;

    .mainZone.compact .menuZone:not(.open) & {
      padding: 0;
      justify-content: center;
      gap: 0;
    }
  }

  &.active .menuItemMain {
    background-color: #3a80b6;
    color: #ffffff;
  }

  &:not(.active) .menuItemMain:hover {
    background-color: #3a3f42;
  }
}

.chevron {
  margin-left: auto;
  transition: transform 0.3s ease;

  &.expanded {
    transform: rotate(90deg);
  }
}

.menuZone .chevron {
  transform: rotate(180deg);

  &.expanded {
    transform: rotate(90deg);
  }
}

.subMenu {
  list-style: none;
  padding: 0;
  margin: 0;
  background-color: #222222;
}

.subMenuItem {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 15px 8px 35px;
  color: #cfd1d2;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: #3a3f42;
  }

  &.active {
    background-color: #4a4f52;
    color: #ffffff;
  }

  span {
    font-size: 13px;
  }
}

.toolbar {
  position: absolute;
  z-index: 10;

  &.bottom {
    bottom: 20px;
    left: 50%;
    translate: -50% 15px;
  }

  &.top {
    top: 20px;
    left: 50%;
    translate: -50% 15px;
  }

  &.left {
    top: 50%;
    left: 20px;
    translate: -15px -50%;
  }

  &.right {
    top: 50%;
    right: 20px;
    translate: 15px -50%;
  }
}
</style>