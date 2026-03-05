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
    <!-- Un escalier avec palier -->
    <path d="M4 20H8V16H12V16H16V12H20V8" :stroke="color" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M8 16V20" :stroke="color" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.3"/>
    <path d="M16 12V16" :stroke="color" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.3"/>
    <rect x="8" y="16" width="4" height="4" :fill="color" fill-opacity="0.2"/>
    <path d="M4 20H20" :stroke="color" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.2"/>
  </svg>
</template>
