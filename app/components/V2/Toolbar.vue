<script setup lang="ts">
import type {ToolbarSelectedTool} from "~/composables/toolbar";
import {
  SelectIcon, MoveIcon,
  MultipleSelectIcon, EditIcon,
  MeasureIcon, PaintIcon,
  ZoomInIcon, ZoomOutIcon,
  RoofIcon, FurnitureIcon,
  LayerIcon, SettingsIcon,
  DeletionIcon, MoreIcon,
} from '~/components/V2/icons';

const props = withDefaults(defineProps<{
  vertical?: boolean;
  horizontal?: boolean;
  side?: 'left' | 'right' | 'top' | 'bottom';
}>(), {
  vertical: true,
  horizontal: false,
  side: 'left'
});

const $styles = useCssModule()

const {selectedTool, selectTool, resetView, zoomIn, zoomOut, zoom} = useToolbar();

const containerRef = ref<HTMLElement | null>(null);
const groupRefs = ref<HTMLElement[]>([]);
const setGroupRef = (el: any) => {
  if (el && !groupRefs.value.includes(el)) {
    groupRefs.value.push(el);
  }
};

const visibleGroupsCount = ref(6);
const isDropdownOpen = ref(false);

const resetAndMeasure = () => {
  visibleGroupsCount.value = 6;
  groupRefs.value = [];
  nextTick(() => {
    updateVisibleGroups();
  });
};

const closeDropdown = (e: MouseEvent) => {
  if (isDropdownOpen.value && containerRef.value && !containerRef.value.contains(e.target as Node)) {
    isDropdownOpen.value = false;
  }
};

const updateVisibleGroups = () => {
  if (!props.vertical || !containerRef.value) {
    visibleGroupsCount.value = 6;
    return;
  }

  const parentHeight = containerRef.value.parentElement?.clientHeight || 0;
  if (parentHeight === 0) return;

  // Hauteur du bouton "..." (environ 30px + marge)
  const moreButtonHeight = 40;
  let currentHeight = moreButtonHeight + 20; // Marge de sécurité
  let count = 0;

  // On trie les refs par position dans le DOM car l'ordre de push n'est pas garanti
  const sortedGroups = [...groupRefs.value]
    .filter(el => el && el.isConnected)
    .sort((a, b) => {
      return a.offsetTop - b.offsetTop;
    });

  groupRefs.value = sortedGroups;

  for (let i = 0; i < sortedGroups.length; i++) {
    const group = sortedGroups[i];
    if (group) {
      const groupHeight = group.offsetHeight + 2; // +2 pour les marges
      if (currentHeight + groupHeight <= parentHeight) {
        currentHeight += groupHeight;
        count++;
      } else {
        break;
      }
    }
  }

  // Si on peut tout afficher sans le bouton "..."
  let totalHeight = 0;
  sortedGroups.forEach(g => { if(g) totalHeight += g.offsetHeight + 2; });
  if (totalHeight <= parentHeight) {
    visibleGroupsCount.value = 6;
  } else {
    visibleGroupsCount.value = count;
  }
};

onMounted(() => {
  resetAndMeasure();
  window.addEventListener('resize', resetAndMeasure);
  window.addEventListener('mousedown', closeDropdown);
});

onUnmounted(() => {
  window.removeEventListener('resize', resetAndMeasure);
  window.removeEventListener('mousedown', closeDropdown);
});

watch(() => props.vertical, resetAndMeasure);

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
<div ref="containerRef" :class="[$style.nav, {
  [$style.horizontal]: horizontal,
  [$style.vertical]: vertical
}]">
  <ul v-show="visibleGroupsCount >= 1" :ref="setGroupRef">
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

  <ul v-show="visibleGroupsCount >= 2" :ref="setGroupRef">
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

  <ul v-show="visibleGroupsCount >= 3" :ref="setGroupRef">
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

  <ul v-show="visibleGroupsCount >= 4" :ref="setGroupRef">
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

  <ul v-show="visibleGroupsCount >= 5" :ref="setGroupRef">
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

  <ul v-show="visibleGroupsCount >= 6" :ref="setGroupRef">
    <li>
      <button :class="isActive('deletion')" @click="selectTool('deletion')">
        <DeletionIcon :size="20" />
      </button>
    </li>
  </ul>

  <ul v-if="vertical && visibleGroupsCount < 6">
    <li :class="$style.dropdown">
      <button @click="isDropdownOpen = !isDropdownOpen">
        <MoreIcon :size="20" />
      </button>

      <div v-if="isDropdownOpen" :class="[$style.dropdownContent, { [$style.rightSide]: side === 'right' }]">
        <div v-if="visibleGroupsCount < 1">
          <button :class="isActive('selection')" @click="selectTool('selection')">
            <SelectIcon :size="20" />
          </button>
          <button :class="isActive('move')" @click="selectTool('move')">
            <MoveIcon :size="20" />
          </button>
          <button :class="isActive('multiple-selection')" @click="selectTool('multiple-selection')">
            <MultipleSelectIcon :size="20" />
          </button>
        </div>
        
        <div v-if="visibleGroupsCount < 2">
          <button @click="zoomIn">
            <ZoomInIcon :size="20" />
          </button>
          <button @click="zoomOut">
            <ZoomOutIcon :size="20" />
          </button>
        </div>

        <div v-if="visibleGroupsCount < 3">
          <button :class="isActive('edit')" @click="selectTool('edit')">
            <EditIcon :size="20" />
          </button>
          <button :class="isActive('measure')" @click="selectTool('measure')">
            <MeasureIcon :size="20" />
          </button>
          <button :class="isActive('paint')" @click="selectTool('paint')">
            <PaintIcon :size="20" />
          </button>
        </div>

        <div v-if="visibleGroupsCount < 4">
          <button :class="isActive('roof')" @click="selectTool('roof')">
            <RoofIcon :size="20" />
          </button>
          <button :class="isActive('furniture')" @click="selectTool('furniture')">
            <FurnitureIcon :size="20" />
          </button>
        </div>

        <div v-if="visibleGroupsCount < 5">
          <button :class="isActive('layer')" @click="selectTool('layer')">
            <LayerIcon :size="20" />
          </button>
          <button :class="isActive('settings')" @click="selectTool('settings')">
            <SettingsIcon :size="20" />
          </button>
        </div>

        <div v-if="visibleGroupsCount < 6">
          <button :class="isActive('deletion')" @click="selectTool('deletion')">
            <DeletionIcon :size="20" />
          </button>
        </div>
      </div>
    </li>
  </ul>
</div>
</template>

<style module>
.nav {
  position: relative;
  z-index: 1000;

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
    margin: 0 1px 2px;

    > li {
      > button > span {
        display: inline-block;
        padding: 6px 0;
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

  .dropdown {
    position: relative;
    width: 100%;

    button {
      border-radius: 10px;
    }
  }

  .dropdownContent {
    position: absolute;
    bottom: 0;
    left: 100%;
    margin-left: 10px;
    background-color: #33353a;
    border-radius: 10px;
    padding: 5px;
    display: flex;
    flex-direction: row;
    gap: 10px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
    z-index: 1001;

    &.rightSide {
      left: auto;
      right: 100%;
      margin-left: 0;
      margin-right: 10px;
    }

    > div {
      display: flex;
      flex-direction: row;
      gap: 10px;
      padding: 0 5px;
      border-right: 1px solid #444;

      &:last-child {
        border-right: none;
      }
    }

    button {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 5px;
      border-radius: 5px;

      &:hover {
        background-color: #3a80b6;
      }

      svg {
        flex-shrink: 0;
      }
    }
  }
}
</style>