<script setup lang="ts">
import type {ToolbarSelectedTool} from "~/composables/toolbar";
import {
  SelectIcon, MoveIcon,
  MultipleSelectIcon, EditIcon,
  MeasureIcon, PaintIcon,
  ZoomInIcon, ZoomOutIcon,
  RoofIcon, FurnitureIcon,
  LayerIcon, SettingsIcon,
  DeletionIcon,
} from '~/components/V2/icons';

withDefaults(defineProps<{
  vertical?: boolean;
  horizontal?: boolean;
}>(), {
  vertical: true,
  horizontal: false,
});

const $styles = useCssModule()

const {selectedTool, selectTool, resetView, zoomIn, zoomOut, zoom} = useToolbar();

const isActive = (tool: string) => ({
  [$styles.active]: selectedTool.value === tool
});

const onToolDblClick = (tool: ToolbarSelectedTool) => {
  if (tool === 'move') {
    resetView()
  }
}
</script>

<template>
<div :class="[$style.nav, {
  [$style.horizontal]: horizontal,
  [$style.vertical]: vertical
}]">
  <ul>
    <li>
      <button :class="isActive('selection')" @click="selectTool('selection')">
        <SelectIcon :size="20" />
      </button>
    </li>

    <li>
      <button :class="isActive('move')" @click="selectTool('move')" @dblclick="onToolDblClick('move')">
        <MoveIcon :size="20" />
      </button>
    </li>

    <li>
      <button :class="isActive('multiple-selection')" @click="selectTool('multiple-selection')">
        <MultipleSelectIcon :size="20" />
      </button>
    </li>
  </ul>

  <ul>
    <li>
      <button @click="zoomIn">
        <ZoomInIcon :size="20" />
      </button>
    </li>

    <li :class="$style.zoomLevel">
      <button @click="resetView">
        <span>{{ Math.round(zoom * 100) }}%</span>
      </button>
    </li>

    <li>
      <button @click="zoomOut">
        <ZoomOutIcon :size="20" />
      </button>
    </li>
  </ul>

  <ul>
    <li>
      <button :class="isActive('edit')" @click="selectTool('edit')">
        <EditIcon :size="20" />
      </button>
    </li>

    <li>
      <button :class="isActive('measure')" @click="selectTool('measure')">
        <MeasureIcon :size="20" />
      </button>
    </li>

    <li>
      <button :class="isActive('paint')" @click="selectTool('paint')">
        <PaintIcon :size="20" />
      </button>
    </li>
  </ul>

  <ul>
    <li>
      <button :class="isActive('roof')" @click="selectTool('roof')">
        <RoofIcon :size="20" />
      </button>
    </li>

    <li>
      <button :class="isActive('furniture')" @click="selectTool('furniture')">
        <FurnitureIcon :size="20" />
      </button>
    </li>
  </ul>

  <ul>
    <li>
      <button :class="isActive('layer')" @click="selectTool('layer')">
        <LayerIcon :size="20" />
      </button>
    </li>

    <li>
      <button :class="isActive('settings')" @click="selectTool('settings')">
        <SettingsIcon :size="20" />
      </button>
    </li>
  </ul>

  <ul>
    <li>
      <button :class="isActive('deletion')" @click="selectTool('deletion')">
        <DeletionIcon :size="20" />
      </button>
    </li>
  </ul>
</div>
</template>

<style module>
.nav {
  position: relative;
  z-index: 2;

  * {
    color: #ffffff;
    font-size: 8.5px;
  }

  &.vertical > ul {
    display: flex;
    flex-direction: column;
    margin: 1px 0;

    > li {
      width: 100%;

      &:first-of-type button {
        border-top-left-radius: 10px;
        border-top-right-radius: 10px;
      }

      &:last-of-type button {
        border-bottom-left-radius: 10px;
        border-bottom-right-radius: 10px;
      }
    }
  }

  &.horizontal > ul {
    display: inline-flex;
    flex-direction: row;
    margin: 0 1px;

    > li {
      > button > span {
        font-size: 20px;
      }

      &:first-of-type button {
        border-top-left-radius: 10px;
        border-bottom-left-radius: 10px;
      }

      &:last-of-type button {
        border-top-right-radius: 10px;
        border-bottom-right-radius: 10px;
      }
    }
  }

  > ul {
    justify-content: flex-start;
    align-items: center;
    list-style: none;
    padding: 0;

    button {
      border: none;
      padding: 5px;
      cursor: pointer;
      background-color: #33353a;
      width: 100%;

      &:hover, &.active {
        background-color: #3a80b6;
      }
    }
  }
}
</style>