<script setup lang="ts">
import AppHeaderZone from "~/components/V2/AppHeaderZone.vue";
import Compass from "~/components/V2/Compass.vue";
import BuildZoneTabs from "~/components/V2/BuildZoneTabs.vue";
import Toolbar from "~/components/V2/Toolbar.vue";
import DrawingZone from "~/components/V2/DrawingZone.vue";

const isReady = ref(false)

const {showCompass} = useCompass()
const {toolbarSide} = useToolbar()

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

onMounted(() => {
  nextTick(() => {
    setTimeout(() => {
      isReady.value = true
    }, 2000)
  })
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

  <main :class="$style.mainZone">
    <aside :class="$style.menuZone">
      <nav :class="$style.title">
        <span>Architecture</span>
      </nav>
    </aside>

    <section :class="$style.buildZone">
      <DrawingZone />
      <BuildZoneTabs />

      <Toolbar
          :class="[
            $style.toolbar, {
            [$style.bottom]: toolbarSide === 'bottom',
            [$style.left]: toolbarSide === 'left',
            [$style.top]: toolbarSide === 'top',
            [$style.right]: toolbarSide === 'right'
          }]"
          :horizontal="['top', 'bottom'].includes(toolbarSide)"
          :vertical="['left', 'right'].includes(toolbarSide)"
      />

      <Compass
          v-show="showCompass"
          size="140px"
          :class="$style.compass"
      />
    </section>

    <aside :class="$style.propertiesZone">
      <nav :class="$style.title">
        <span>Properties</span>
      </nav>
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
  height: calc(100% - 98.5px);
  background-color: #303538;
}

.menuZone {
  width: 200px;
}
.buildZone {
  flex: 1;
  height: 100%;
  background-color: #ffffff;
  position: relative;
  overflow: hidden;
}
.propertiesZone {
  width: 200px;
}

.compass {
  position: absolute;
  bottom: 20px;
  left: 20px;
}

.menuZone .title,
.propertiesZone .title {
  position: relative;
  z-index: 1;
  height: 30px;
  background-color: #222222;

  color: #cfd1d2;

  > span {
    line-height: 30px;
    padding: 0 10px;
  }
}

.toolbar {
  position: absolute;

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