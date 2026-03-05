<script setup lang="ts">

</script>

<template>
  <div :class="$style.fullPageLoader">
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
</template>

<style module>
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
  overflow: hidden;
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