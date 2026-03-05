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
    <!-- Fenêtre à double battant -->
    <path d="M4 4H20V20H4V4Z" :stroke="color" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M12 4V20" :stroke="color" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M4 12H20" stroke-width="1" stroke-dasharray="2 2" :stroke="color" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M8 8V16" :stroke="color" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M16 8V16" :stroke="color" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
</template>
