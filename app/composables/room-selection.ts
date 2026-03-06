const selectedRoomIds = ref<string[]>([])
const selectedRoomAreas = ref<Map<string, number>>(new Map())

const totalSelectedArea = computed(() => {
    let total = 0
    selectedRoomAreas.value.forEach(area => {
        total += area
    })
    return total
})

const toggleRoomSelection = (roomId: string, area: number, isMultiSelect: boolean) => {
    if (isMultiSelect) {
        const index = selectedRoomIds.value.indexOf(roomId)
        if (index > -1) {
            selectedRoomIds.value.splice(index, 1)
            selectedRoomAreas.value.delete(roomId)
        } else {
            selectedRoomIds.value.push(roomId)
            selectedRoomAreas.value.set(roomId, area)
        }
    } else {
        selectedRoomIds.value = [roomId]
        selectedRoomAreas.value.clear()
        selectedRoomAreas.value.set(roomId, area)
    }
}

const clearRoomSelection = () => {
    selectedRoomIds.value = []
    selectedRoomAreas.value.clear()
}

export const useRoomSelection = () => {
    return {
        selectedRoomIds,
        totalSelectedArea,
        toggleRoomSelection,
        clearRoomSelection
    }
}
