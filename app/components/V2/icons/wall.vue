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
    <!-- Un mur représenté par deux briques en bas et une centrée en haut -->
    <path d="M2 18H10V12H2V18Z" :stroke="color" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M14 18H22V12H14V18Z" :stroke="color" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M8 12H16V6H8V12Z" :stroke="color" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
</template>
