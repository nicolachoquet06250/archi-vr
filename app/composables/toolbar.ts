type ToolbarSide = 'left' | 'right' | 'bottom' | 'top';

export type ToolbarSelectedTool =
    'selection' | 'move' |
    'multiple-selection' | 'edit' |
    'measure' | 'paint' |
    'layer' | 'settings' |
    'deletion';

const toolbarSide = ref<ToolbarSide>('left');
const selectedToolbarTool = ref<ToolbarSelectedTool>('selection');
const resetTrigger = ref(0);
const zoomInTrigger = ref(0);
const zoomOutTrigger = ref(0);
const zoom = ref(1);

/**
 * Ratio de l'échelle : 1 mètre correspond à une unité de grille secondaire (10 unités SVG).
 */
export const GRID_SECONDARY_UNIT_SIZE = 10;
export const METERS_PER_GRID_UNIT = 1;

export const MIN_ZOOM = 0.15; // 15%
export const MAX_ZOOM = 20;   // 2000%

export const useToolbar = () => ({
    toolbarSide: computed(() => toolbarSide.value),
    selectedTool: computed(() => selectedToolbarTool.value),
    resetTrigger: computed(() => resetTrigger.value),
    zoomInTrigger: computed(() => zoomInTrigger.value),
    zoomOutTrigger: computed(() => zoomOutTrigger.value),
    zoom: computed(() => zoom.value),
    change: (side: ToolbarSide) => toolbarSide.value = side,
    selectTool: (tool: ToolbarSelectedTool) => selectedToolbarTool.value = tool,
    resetView: () => {
        resetTrigger.value++;
        zoom.value = 1;
    },
    zoomIn: () => {
        const nextZoom = zoom.value * 1.2;
        if (nextZoom > MAX_ZOOM) {
            zoom.value = MAX_ZOOM;
            return;
        }
        zoomInTrigger.value++;
        zoom.value = nextZoom;
    },
    zoomOut: () => {
        const nextZoom = zoom.value / 1.2;
        if (nextZoom < MIN_ZOOM) {
            zoom.value = MIN_ZOOM;
            return
        }
        zoomOutTrigger.value++;
        zoom.value = nextZoom;
    },
    setZoom: (value: number) => {
        zoom.value = Math.min(Math.max(value, MIN_ZOOM), MAX_ZOOM);
    }
})