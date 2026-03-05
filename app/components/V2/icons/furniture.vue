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
  <svg :width="size ?? width" :height="size ?? height" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M21,3H3A1,1,0,0,0,3,5V16a2,2,0,0,0,2,2H19a2,2,0,0,0,2-2V5a1,1,0,0,0,0-2Zm-6.5,8.5h-5a1,1,0,0,1,0-2h5a1,1,0,0,1,0,2ZM10.08,19l-1.3,1.62A1,1,0,0,1,8,21a1,1,0,0,1-.62-.22,1,1,0,0,1-.16-1.4l.3-.38Zm6.54,1.78A1,1,0,0,1,16,21a1,1,0,0,1-.78-.38L13.92,19h2.56l.3.38A1,1,0,0,1,16.62,20.78Z" :fill="color"/>
  </svg>
</template>
