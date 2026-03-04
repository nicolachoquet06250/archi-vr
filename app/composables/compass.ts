const showCompass = ref(true);

export const useCompass = () => ({
    showCompass: computed(() => showCompass.value),
    toggle: () => showCompass.value = !showCompass.value
})