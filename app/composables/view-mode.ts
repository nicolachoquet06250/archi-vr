export type ViewMode = '2D' | '3D';

const currentViewMode = ref<ViewMode>('2D');

export const useViewMode = () => {
  return {
    viewMode: computed(() => currentViewMode.value.trim()),
    setViewMode: (mode: ViewMode) => {
      currentViewMode.value = mode;
    },
    toggleViewMode: () => {
      currentViewMode.value = currentViewMode.value === '2D' ? '3D' : '2D';
    }
  };
};
