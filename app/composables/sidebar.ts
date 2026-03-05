const isMenuOpen = ref(false)
const isPropertiesOpen = ref(false)

export const useSidebar = () => {
    return {
        isMenuOpen,
        isPropertiesOpen,
        toggleMenu: () => isMenuOpen.value = !isMenuOpen.value,
        toggleProperties: () => isPropertiesOpen.value = !isPropertiesOpen.value,
        closeAll: () => {
            isMenuOpen.value = false
            isPropertiesOpen.value = false
        }
    }
}
