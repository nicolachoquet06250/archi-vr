const toolbarSide = ref<'left'|'right'|'bottom'|'top'>('left');

export const useToolbar = () => ({
    toolbarSide: computed(() => toolbarSide.value),
    change: (side: 'left'|'right'|'bottom'|'top') => toolbarSide.value = side,
})