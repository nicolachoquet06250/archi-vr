<template>
  <div :class="$style.compassWrapper" :style="{ width: size, height: size }">
    <div :class="$style.compassContainer">
      <div :class="$style.bezel">
        <span :class="[$style.point, $style.n]">N</span>
        <span :class="[$style.point, $style.e]">E</span>
        <span :class="[$style.point, $style.s]">S</span>
        <span :class="[$style.point, $style.w]">W</span>

        <div
            :class="$style.needle"
            :style="{ transform: `translate(-50%, -50%) rotate(${heading}deg)` }"
        >
          <div :class="$style.north" />
          <div :class="$style.south" />
          <div :class="$style.pivot" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const props = defineProps({
  // Taille par défaut, peut être n'importe quelle unité CSS (px, em, %, etc.)
  size: {
    type: String,
    default: '200px'
  },
  modelValue: {
    type: Number,
    default: 0
  },
  autoRotate: {
    type: Boolean,
    default: true
  }
});

const heading = ref(props.modelValue);

const handleOrientation = (event) => {
  if (!props.autoRotate) return;
  const webkitAlpha = event.webkitCompassHeading;
  const alpha = event.alpha;

  if (webkitAlpha !== undefined) {
    heading.value = webkitAlpha;
  } else if (alpha !== undefined) {
    heading.value = 360 - alpha;
  }
};

onMounted(() => {
  if (props.autoRotate && window.DeviceOrientationEvent) {
    window.addEventListener('deviceorientation', handleOrientation, true);
  }
});

onUnmounted(() => {
  window.removeEventListener('deviceorientation', handleOrientation);
});
</script>

<style module>
/* Définit les variables CSS pour tout le composant */
.compassWrapper {
  --bg-color: #2c2e31;
  --accent-red: #e74c3c;
  --accent-blue: #3498db;
  --text-color: #ffffff;

  /* Permet d'utiliser 'em' à l'intérieur du composant */
  font-size: 16px;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  z-index: 1;
}

.compassContainer {
  width: 100%;
  height: 100%;
  aspect-ratio: 1 / 1; /* S'assure que c'est toujours un carré */
}

.bezel {
  position: relative;
  width: 100%;
  height: 100%;
  background-color: var(--bg-color);
  border-radius: 50%;
  /* Bordure relative à la taille */
  border: 0.04em solid #1a1a1a;
  box-shadow: inset 0 0 1em rgba(0,0,0,0.5), 0 0.3em 1em rgba(0,0,0,0.3);
  box-sizing: border-box; /* Crucial pour les calculs de taille */
}

.point {
  position: absolute;
  color: var(--text-color);
  font-family: Arial, sans-serif;
  font-weight: bold;
  /* Taille du texte proportionnelle */
  font-size: calc(1em * 1.2);
}

/* Positionnement proportionnel */
.n { top: 7%; left: 50%; transform: translateX(-50%); color: var(--accent-red); }
.e { right: 7%; top: 50%; transform: translateY(-50%); }
.s { bottom: 7%; left: 50%; transform: translateX(-50%); }
.w { left: 7%; top: 50%; transform: translateY(-50%); }

.needle {
  position: absolute;
  top: 50%;
  left: 50%;
  /* Largeur et hauteur de l'aiguille en % du cadran */
  width: 12%;
  height: 80%;
  transition: transform 0.3s cubic-bezier(0.25, 0.1, 0.25, 1);
  pointer-events: none;
}

/* Calculs CSS pour les triangles de l'aiguille */
.north, .south {
  position: absolute;
  width: 0;
  height: 0;
  border-left: 0.5em solid transparent; /* Moitié de la largeur de l'aiguille */
  border-right: 0.5em solid transparent;
}

.north {
  top: 0;
  border-bottom: 2.5em solid var(--accent-red); /* Longueur proportionnelle */
  translate: 0 50%;
}

.south {
  bottom: 0;
  border-top: 2.5em solid var(--accent-blue);
  translate: 0 -50%;
}

.pivot {
  position: absolute;
  top: 50%;
  left: 50%;
  /* Taille du pivot proportionnelle */
  width: 0.8em;
  height: 0.8em;
  background: #000;
  border: 0.15em solid #555;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;
}
</style>