type ToolbarSide = 'left'|'right'|'bottom'|'top';

export type ToolbarSelectedTool =
    'selection' | 'move' |
    'multiple-selection' | 'edit' |
    'measure' | 'paint' |
    'roof' | 'furniture' | 'wall' | 'door' | 'door-simple' | 'door-double' | 'window' | 'window-simple' | 'window-double' | 'window-bay' | 'stair' | 'stair-straight' | 'stair-corner' | 'stair-spiral' | 'stair-platform' |
    'layer' | 'settings' |
    'deletion';

const toolbarSide = ref<ToolbarSide>('left');
const selectedTool = ref<ToolbarSelectedTool>('selection');
const resetTrigger = ref(0);
const zoomInTrigger = ref(0);
const zoomOutTrigger = ref(0);
const zoom = ref(1);

export const useToolbar = () => ({
    toolbarSide: computed(() => toolbarSide.value),
    selectedTool: computed(() => selectedTool.value),
    resetTrigger: computed(() => resetTrigger.value),
    zoomInTrigger: computed(() => zoomInTrigger.value),
    zoomOutTrigger: computed(() => zoomOutTrigger.value),
    zoom: computed(() => zoom.value),
    change: (side: ToolbarSide) => toolbarSide.value = side,
    selectTool: (tool: ToolbarSelectedTool) => selectedTool.value = tool,
    resetView: () => {
        resetTrigger.value++;
        zoom.value = 1;
    },
    zoomIn: () => {
        zoomInTrigger.value++;
        zoom.value *= 1.2;
    },
    zoomOut: () => {
        zoomOutTrigger.value++;
        zoom.value /= 1.2;
    },
})