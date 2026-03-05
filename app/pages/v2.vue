<script setup lang="ts">
import AppHeaderZone from "~/components/V2/AppHeaderZone.vue";
import Compass from "~/components/V2/Compass.vue";
import BuildZoneTabs from "~/components/V2/BuildZoneTabs.vue";
import Toolbar from "~/components/V2/Toolbar.vue";
import DrawingZone from "~/components/V2/DrawingZone.vue";

const $styles = useCssModule();

const {showCompass} = useCompass()
const {toolbarSide} = useToolbar()

const mainZone = ref<HTMLElement | null>(null)
const menuZoneRef = ref<HTMLElement | null>(null)
const propertiesZoneRef = ref<HTMLElement | null>(null)
const mainZoneWidth = ref(0)
const isCompact = computed(() => mainZoneWidth.value < 1100) // 700 (buildZone) + 200 (menu) + 200 (properties)
const isMenuOpen = ref(false)
const isPropertiesOpen = ref(false)

const handleClickOutside = (event: MouseEvent) => {
  if (!isCompact.value) return

  const target = event.target as HTMLElement

  if (isMenuOpen.value && menuZoneRef.value && !menuZoneRef.value.contains(target)) {
    isMenuOpen.value = false
  }
  if (isPropertiesOpen.value && propertiesZoneRef.value && !propertiesZoneRef.value.contains(target)) {
    isPropertiesOpen.value = false
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

let observer: ResizeObserver | null = null

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
    <div v-if="!isReady" :class="$style.fullPageLoader">
      <div :class="$style.loaderContainer">
        <div :class="$style.vrHeadset">
          <div :class="$style.visor">
            <div :class="$style.lensGlow"/>
            <div :class="$style.scanLine"/>
          </div>
          <div :class="$style.strap"/>
        </div>
        <p>INITIALISATION VR...</p>
      </div>
    </div>
  </Transition>

  <AppHeaderZone />

  <main ref="mainZone" :class="[$style.mainZone, { [$style.compact]: isCompact }]">
    <aside ref="menuZoneRef" :class="[$style.menuZone, { [$style.open]: isMenuOpen }]">
      <nav :class="$style.title" @click="isMenuOpen = !isMenuOpen">
        <span v-show="!isCompact || isMenuOpen">Architecture</span>
        <span v-if="isCompact" :class="$style.toggleIcon">{{ isMenuOpen ? '❮' : '❯' }}</span>
      </nav>

      <div v-show="!isCompact || isMenuOpen" :class="$style.content">
        <!-- Contenu du menu ici -->
      </div>
    </aside>

    <section :class="$style.buildZone">
      <DrawingZone />
      <BuildZoneTabs />

      <Toolbar
          :class="[$style.toolbar, position]"
          :horizontal="['top', 'bottom'].includes(toolbarSide)"
          :vertical="['left', 'right'].includes(toolbarSide)"
          :side="toolbarSide"
      />

      <Compass v-show="showCompass" size="100px" :class="$style.compass" />
    </section>

    <aside ref="propertiesZoneRef" :class="[$style.propertiesZone, { [$style.open]: isPropertiesOpen }]">
      <nav :class="$style.title" @click="isPropertiesOpen = !isPropertiesOpen">
        <span v-if="isCompact" :class="$style.toggleIcon">{{ isPropertiesOpen ? '❯' : '❮' }}</span>
        <span v-show="!isCompact || isPropertiesOpen">Properties</span>
      </nav>

      <div v-show="!isCompact || isPropertiesOpen" :class="$style.content">
        <!-- Contenu des propriétés ici -->
      </div>
    </aside>
  </main>
</template>

<style>
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
}

.menuZone {
  width: 200px;
  transition: width 0.3s ease;
  background-color: #2b2e31;
  display: flex;
  flex-direction: column;
  z-index: 1000;
}

.mainZone.compact .menuZone {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: 30px;
  overflow: hidden;
  z-index: 1001;
}

.mainZone.compact .menuZone.open {
  width: 200px;
  z-index: 1002;
}

.buildZone {
  flex: 1;
  min-height: 100%;
  background-color: #ffffff;
  position: relative;
  overflow: hidden;
  min-width: 0;
}

.mainZone.compact .buildZone {
  margin-left: 30px;
  margin-right: 30px;
}

.propertiesZone {
  width: 200px;
  transition: width 0.3s ease;
  background-color: #2b2e31;
  display: flex;
  flex-direction: column;
  z-index: 1000;
}

.mainZone.compact .propertiesZone {
  position: absolute;
  top: 0;
  right: 0;
  height: 100%;
  width: 30px;
  overflow: hidden;
  z-index: 1001;
}

.mainZone.compact .propertiesZone.open {
  width: 200px;
  z-index: 1002;
}

.compass {
  position: absolute;
  bottom: 5px;
  left: 5px;
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

.mainZone.compact .menuZone .title,
.mainZone.compact .propertiesZone .title {
  cursor: pointer;
}

.toggleIcon {
  font-size: 10px;
}

.content {
  flex: 1;
  overflow-y: auto;
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

.fullPageLoader {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: #333;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.loaderContainer {
  text-align: center;

  p {
    color: var(--neon-blue);
    letter-spacing: 3px;
    font-size: 12px;
    text-shadow: 0 0 5px var(--neon-blue);
    animation: blink 1s infinite;
  }
}

/* Le Casque */
.vrHeadset {
  position: relative;
  width: 120px;
  height: 60px;
  background: #333;
  border-radius: 10px 10px 25px 25px;
  margin: 0 auto 20px;
  box-shadow: 0 0 20px rgba(0,0,0,0.5);
  animation: float 2s ease-in-out infinite;
}

/* La Visière */
.visor {
  position: absolute;
  top: 10px;
  left: 10px;
  right: 10px;
  bottom: 15px;
  background: #111;
  border-radius: 5px 5px 15px 15px;
  overflow: hidden;
  border: 1px solid #444;
}

/* Lueur interne */
.lensGlow {
  position: absolute;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle, rgba(0, 242, 255, 0.2) 0%, transparent 70%);
}

/* Ligne de Scan */
.scanLine {
  position: absolute;
  width: 100%;
  height: 4px;
  background: var(--neon-blue);
  box-shadow: 0 0 15px var(--neon-blue);
  opacity: 0.7;
  animation: scan 1.5s linear infinite;
}

/* Sangle */
.strap {
  position: absolute;
  top: 15px;
  left: -15px;
  width: 150px;
  height: 10px;
  background: #222;
  z-index: -1;
  border-radius: 5px;
}

/* Animations */
@keyframes scan {
  0% { top: -5px; }
  100% { top: 65px; }
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
</style>