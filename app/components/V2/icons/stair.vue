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
    <!-- Remplissage blanc du triangle formé par les marches -->
    <path d="M4 20H20V4H16V8H12V12H8V16H4V20Z" fill="white" />
    <path d="M4 20H8V16H12V12H16V8H20V4" :stroke="color" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M4 20H20" :stroke="color" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.2"/>
    <path d="M20 20V4" :stroke="color" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.2"/>
  </svg>
</template>
