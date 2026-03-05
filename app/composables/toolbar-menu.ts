import type {ToolbarSelectedTool} from "~/composables/toolbar";

export type ToolbarMenuSelectedTool =
    'roof' | 'furniture' |
    'wall' | 'door' |
    'door-simple' | 'door-double' |
    'window' | 'window-simple' |
    'window-double' | 'window-bay' |
    'stair' | 'stair-straight' |
    'stair-corner' | 'stair-spiral' |
    'stair-platform';

const isDoorsMenuOpen = ref(false)
const isWindowsMenuOpen = ref(false)
const isStairsMenuOpen = ref(false)
const selectedSidebarTool = ref<ToolbarMenuSelectedTool | null>(null)

export const useToolbarMenu = () => {
    const { isMenuOpen } = useSidebar()

    const selectTool = (tool: ToolbarMenuSelectedTool) => {
        selectedSidebarTool.value = tool
    }

    const handleDoorsSelect = (isCompact: boolean) => {
        if (isCompact && !isMenuOpen.value) {
            isMenuOpen.value = true;
            isDoorsMenuOpen.value = true;
        } else {
            isDoorsMenuOpen.value = !isDoorsMenuOpen.value;
        }
        if (isDoorsMenuOpen.value) {
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
            isDoorsMenuOpen.value = false;
            isWindowsMenuOpen.value = false;
        }
    }

    const closeAllSubMenus = () => {
        isDoorsMenuOpen.value = false
        isWindowsMenuOpen.value = false
        isStairsMenuOpen.value = false
    }

    return {
        isDoorsMenuOpen,
        isWindowsMenuOpen,
        isStairsMenuOpen,
        selectedTool: computed(() => selectedSidebarTool.value),
        handleDoorsSelect,
        handleWindowsSelect,
        handleStairsSelect,
        closeAllSubMenus,
        selectTool
    }
}
