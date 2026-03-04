<script setup lang="ts">
import MenuBar from "~/components/V2/MenuBar.vue";
import AppHeader from "~/components/V2/AppHeader.vue";
import ModeToggler from "~/components/V2/ModeToggler.vue";
</script>

<template>
  <AppHeader :class="$style.appHeader" />
  <nav>
    <MenuBar />

    <ModeToggler :class="$style.modeToggler" />
  </nav>
</template>

<style module>
nav {
  position: relative;
  z-index: 3;
}

.modeToggler {
  position: absolute;
  left: unset;
  right: 0;
  top: 5px;
  translate: -10px calc((100% + 10px) * -1);
}
</style>