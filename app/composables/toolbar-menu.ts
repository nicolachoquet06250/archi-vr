export type ToolbarMenuSelectedTool =
    'roof' | 'furniture' |
    'wall' | 'wall-flat' | 'wall-round' | 'door' |
    'door-simple' | 'door-double' |
    'window' | 'window-simple' |
    'window-double' | 'window-bay' |
    'stair' | 'stair-straight' |
    'stair-corner' | 'stair-spiral' |
    'stair-platform';

const isWallsMenuOpen = ref(false)
const isDoorsMenuOpen = ref(false)
const isWindowsMenuOpen = ref(false)
const isStairsMenuOpen = ref(false)
const selectedSidebarTool = ref<ToolbarMenuSelectedTool | null>(null)

export const useToolbarMenu = () => {
    const { isMenuOpen } = useSidebar()

    const selectTool = (tool: ToolbarMenuSelectedTool) => {
        selectedSidebarTool.value = tool
    }

    const handleWallsSelect = (isCompact: boolean) => {
        if (isCompact && !isMenuOpen.value) {
            isMenuOpen.value = true;
            isWallsMenuOpen.value = true;
        } else {
            isWallsMenuOpen.value = !isWallsMenuOpen.value;
        }
        if (isWallsMenuOpen.value) {
            isDoorsMenuOpen.value = false;
            isWindowsMenuOpen.value = false;
            isStairsMenuOpen.value = false;
        }
    }

    const handleDoorsSelect = (isCompact: boolean) => {
        if (isCompact && !isMenuOpen.value) {
            isMenuOpen.value = true;
            isDoorsMenuOpen.value = true;
        } else {
            isDoorsMenuOpen.value = !isDoorsMenuOpen.value;
        }
        if (isDoorsMenuOpen.value) {
            isWallsMenuOpen.value = false;
            isWindowsMenuOpen.value = false;
            isStairsMenuOpen.value = false;
        }
    }

    const handleWindowsSelect = (isCompact: boolean) => {
        if (isCompact && !isMenuOpen.value) {
            isMenuOpen.value = true;
            isWindowsMenuOpen.value = true;
        } else {
            isWindowsMenuOpen.value = !isWindowsMenuOpen.value;
        }
        if (isWindowsMenuOpen.value) {
            isWallsMenuOpen.value = false;
            isDoorsMenuOpen.value = false;
            isStairsMenuOpen.value = false;
        }
    }

    const handleStairsSelect = (isCompact: boolean) => {
        if (isCompact && !isMenuOpen.value) {
            isMenuOpen.value = true;
            isStairsMenuOpen.value = true;
        } else {
            isStairsMenuOpen.value = !isStairsMenuOpen.value;
        }
        if (isStairsMenuOpen.value) {
            isWallsMenuOpen.value = false;
            isDoorsMenuOpen.value = false;
            isWindowsMenuOpen.value = false;
        }
    }

    const closeAllSubMenus = () => {
        isWallsMenuOpen.value = false
        isDoorsMenuOpen.value = false
        isWindowsMenuOpen.value = false
        isStairsMenuOpen.value = false
    }

    return {
        isWallsMenuOpen,
        isDoorsMenuOpen,
        isWindowsMenuOpen,
        isStairsMenuOpen,
        selectedTool: computed(() => selectedSidebarTool.value),
        handleWallsSelect,
        handleDoorsSelect,
        handleWindowsSelect,
        handleStairsSelect,
        closeAllSubMenus,
        selectTool
    }
}
