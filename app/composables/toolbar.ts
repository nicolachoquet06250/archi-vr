type ToolbarSide = 'left'|'right'|'bottom'|'top';

export type ToolbarSelectedTool =
    'selection' | 'move' |
    'multiple-selection' | 'zoom-in' |
    'zoom-out' | 'edit' |
    'measure' | 'paint' |
    'roof' | 'furniture' |
    'layer' | 'settings' |
    'deletion';

const toolbarSide = ref<ToolbarSide>('left');
const selectedTool = ref<ToolbarSelectedTool>('selection');
const resetTrigger = ref(0);

export const useToolbar = () => ({
    toolbarSide: computed(() => toolbarSide.value),
    selectedTool: computed(() => selectedTool.value),
    resetTrigger: computed(() => resetTrigger.value),
    change: (side: ToolbarSide) => toolbarSide.value = side,
    selectTool: (tool: ToolbarSelectedTool) => selectedTool.value = tool,
    resetView: () => resetTrigger.value++,
})