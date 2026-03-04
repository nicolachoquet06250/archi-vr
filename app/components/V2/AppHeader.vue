<script setup lang="ts">

</script>

<template>
  <header>
    <div>
      <img src="/logo-2.png" alt="logo" :width="70">

      <div :class="$style.title">
        <span>Archi</span>
        <span>VR</span>
      </div>
    </div>
  </header>
</template>

<style module>
header {
  background-color: #e4ebf3;

  > div {
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
    align-items: center;
    gap: 5px;
    padding: 0 0 10px 0;

    > img {
      margin: 10px;
    }
  }
}

.title {
  display: inline-flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  user-select: none;

  > span {
    font-size: 2rem;
    font-weight: bold;

    &:last-of-type {
      color: #3a81b3;
    }
  }
}
</style>