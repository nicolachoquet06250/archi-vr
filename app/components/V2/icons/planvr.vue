<script setup lang="ts">
withDefaults(defineProps<{
  size?: number;
  color?: string;
}>(), {
  color: '#ffffff'
})
</script>

<template>
  <svg :width="size" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <path :fill="color" d="M3,11v10c0,1.1,0.9,2,2,2h6.2c0.5,0,1-0.2,1.4-0.6l2-2c0.8-0.8,2-0.8,2.8,0l2,2c0.4,0.4,0.9,0.6,1.4,0.6H27 c1.1,0,2-0.9,2-2V11c0-1.1-0.9-2-2-2H5C3.9,9,3,9.9,3,11z"/>
    <circle cx="9" cy="16" r="3"/>
    <circle cx="23" cy="16" r="3"/>
  </svg>
</template>

<style scoped>

</style>