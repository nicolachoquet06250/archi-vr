<script setup lang="ts">

</script>

<template>
  <nav :class="$style.tabs">
    <div :class="[$style.tab, $style.active]">
      <span>Villa Océane</span>

      <button>X</button>
    </div>
  </nav>
</template>

<style module>
.tabs {
  position: relative;
  z-index: 1;

  height: 30px;
  background-color: #222222;

  color: #cfd1d2;

  > span {
    line-height: 30px;
    padding: 0 10px;
  }

  > .tab {
    height: 100%;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    width: min-content;
    min-width: 150px;

    &:hover, &.active {
      background-color: #393e40;
    }

    > span {
      display: inline-flex;
      justify-content: center;
      align-items: center;
      padding: 0 10px;
    }

    &, & > button {
      cursor: pointer;
    }

    > button {
      background-color: transparent;
      color: #cfd1d2;
      border: none;

      &:hover {
        color: darkred;
        font-weight: bold;
        -webkit-text-stroke: .5px white;
        text-stroke: .5px white;
      }
    }
  }
}
</style>