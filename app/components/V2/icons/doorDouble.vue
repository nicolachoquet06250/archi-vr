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
    <!-- Double porte entrouverte -->
    <path d="M2 20V4C2 2.89543 2.89543 2 4 2H20C21.1046 2 22 2.89543 22 4V20" :stroke="color" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M2 20H22" :stroke="color" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M4 20V6L12 4V22L4 20Z" :stroke="color" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M20 20V6L12 4V22L20 20Z" :stroke="color" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
</template>
