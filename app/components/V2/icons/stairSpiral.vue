<script setup lang="ts">
withDefaults(defineProps<{
  width?: number;
  height?: number;
  size?: number;
  color?: string;
}>(), {
  color: '#ffffff'
})
</script>

<template>
  <svg :width="size ?? width" :height="size ?? height" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Un escalier en colimaçon vu de dessus -->
    <circle cx="12" cy="12" r="9" :stroke="color" stroke-width="2"/>
    <circle cx="12" cy="12" r="1.5" :fill="color"/>
    <path d="M12 3V12" :stroke="color" stroke-width="1.5"/>
    <path d="M12 12L18.5 5.5" :stroke="color" stroke-width="1.5"/>
    <path d="M12 12H21" :stroke="color" stroke-width="1.5"/>
    <path d="M12 12L18.5 18.5" :stroke="color" stroke-width="1.5"/>
    <path d="M12 12V21" :stroke="color" stroke-width="1.5"/>
    <path d="M12 12L5.5 18.5" :stroke="color" stroke-width="1.5"/>
    <path d="M12 12H3" :stroke="color" stroke-width="1.5"/>
    <path d="M12 12L5.5 5.5" :stroke="color" stroke-width="1.5"/>
  </svg>
</template>
