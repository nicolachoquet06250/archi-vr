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
    <!-- Baie vitrée (large fenêtre avec plusieurs divisions verticales) -->
    <path d="M2 5H22V19H2V5Z" :stroke="color" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M8 5V19" :stroke="color" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M16 5V19" :stroke="color" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M2 12H22" stroke-width="1" stroke-dasharray="2 2" :stroke="color" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
</template>
