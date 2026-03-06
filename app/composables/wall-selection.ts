const selectedWallId = ref<string | null>(null)
const selectedWallLength = ref<number>(0)
const selectedWallHeight = ref<number>(2.5)

export const useWallSelection = () => {
    const selectWall = (id: string | null, length: number = 0, height: number = 2.5) => {
        selectedWallId.value = id
        selectedWallLength.value = length
        selectedWallHeight.value = height
    }

    return {
        selectedWallId,
        selectedWallLength,
        selectedWallHeight,
        selectWall
    }
}
