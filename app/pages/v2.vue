<script setup lang="ts">
import AppHeaderZone from "~/components/V2/AppHeaderZone.vue";
import Compass from "~/components/V2/Compass.vue";
import BuildZoneTabs from "~/components/V2/BuildZoneTabs.vue";
import Toolbar from "~/components/V2/Toolbar.vue";
import DrawingZone from "~/components/V2/DrawingZone.vue";

const {showCompass} = useCompass()
const {toolbarSide} = useToolbar()
</script>

<template>
  <AppHeaderZone />

  <main :class="$style.mainZone">
    <aside :class="$style.menuZone">
      <nav :class="$style.title">
        <span>Architecture</span>
      </nav>
    </aside>

    <section :class="$style.buildZone">
      <DrawingZone />
      <BuildZoneTabs />

      <Toolbar
          :class="[
            $style.toolbar, {
            [$style.bottom]: toolbarSide === 'bottom',
            [$style.left]: toolbarSide === 'left',
            [$style.top]: toolbarSide === 'top',
            [$style.right]: toolbarSide === 'right'
          }]"
          :horizontal="['top', 'bottom'].includes(toolbarSide)"
          :vertical="['left', 'right'].includes(toolbarSide)"
      />

      <Compass
          v-show="showCompass"
          size="140px"
          :class="$style.compass"
      />
    </section>

    <aside :class="$style.propertiesZone">
      <nav :class="$style.title">
        <span>Properties</span>
      </nav>
    </aside>
  </main>
</template>

<style>
#__nuxt {
  height: 100vh;
}
</style>

<style module>
.mainZone {
  display: flex;
  flex-direction: row;
  height: calc(100% - 98.5px);
  background-color: #303538;
}

.menuZone {
  width: 200px;
}
.buildZone {
  flex: 1;
  height: 100%;
  background-color: #ffffff;
  position: relative;
  overflow: hidden;
}
.propertiesZone {
  width: 200px;
}

.compass {
  position: absolute;
  bottom: 20px;
  left: 20px;
}

.menuZone .title,
.propertiesZone .title {
  position: relative;
  z-index: 1;
  height: 30px;
  background-color: #222222;

  color: #cfd1d2;

  > span {
    line-height: 30px;
    padding: 0 10px;
  }
}

.toolbar {
  position: absolute;

  &.bottom {
    bottom: 20px;
    left: 50%;
    translate: -50% 15px;
  }

  &.top {
    top: 20px;
    left: 50%;
    translate: -50% 15px;
  }

  &.left {
    top: 50%;
    left: 20px;
    translate: -15px -50%;
  }

  &.right {
    top: 50%;
    right: 20px;
    translate: 15px -50%;
  }
}
</style>