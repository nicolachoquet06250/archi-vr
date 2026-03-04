<script setup lang="ts">
withDefaults(defineProps<{
  vertical?: boolean;
  horizontal?: boolean;
}>(), {
  vertical: true,
  horizontal: false,
});
</script>

<template>
<div :class="{[$style.nav]: true, [$style.horizontal]: horizontal, [$style.vertical]: vertical}">
  <ul>
    <li>
      <button :class="$style.active">
        <svg :width="20" :height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M13 13L20 10L5 5L10 20L13 13ZM13 13L19 19" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </li>

    <li>
      <button>
        <svg :width="20" :height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6 12H18M12 6V18" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </li>

    <li>
      <button>
        <svg :width="20" :height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8.976 21C4.05476 21 3 19.9452 3 15.024" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
          <path d="M21 15.024C21 19.9452 19.9452 21 15.024 21" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
          <path d="M15.024 3C19.9452 3 21 4.05476 21 8.976" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
          <path d="M3 8.976C3 4.05476 4.05476 3 8.976 3" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
    </li>

    <li>
      <button>
        <svg :width="20" :height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15.4998 5.49994L18.3282 8.32837M3 20.9997L3.04745 20.6675C3.21536 19.4922 3.29932 18.9045 3.49029 18.3558C3.65975 17.8689 3.89124 17.4059 4.17906 16.9783C4.50341 16.4963 4.92319 16.0765 5.76274 15.237L17.4107 3.58896C18.1918 2.80791 19.4581 2.80791 20.2392 3.58896C21.0202 4.37001 21.0202 5.63634 20.2392 6.41739L8.37744 18.2791C7.61579 19.0408 7.23497 19.4216 6.8012 19.7244C6.41618 19.9932 6.00093 20.2159 5.56398 20.3879C5.07171 20.5817 4.54375 20.6882 3.48793 20.9012L3 20.9997Z" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </li>

    <li>
      <button>
        <svg :width="20" :height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 6H20M16 6L15.7294 5.18807C15.4671 4.40125 15.3359 4.00784 15.0927 3.71698C14.8779 3.46013 14.6021 3.26132 14.2905 3.13878C13.9376 3 13.523 3 12.6936 3H11.3064C10.477 3 10.0624 3 9.70951 3.13878C9.39792 3.26132 9.12208 3.46013 8.90729 3.71698C8.66405 4.00784 8.53292 4.40125 8.27064 5.18807L8 6M18 6V16.2C18 17.8802 18 18.7202 17.673 19.362C17.3854 19.9265 16.9265 20.3854 16.362 20.673C15.7202 21 14.8802 21 13.2 21H10.8C9.11984 21 8.27976 21 7.63803 20.673C7.07354 20.3854 6.6146 19.9265 6.32698 19.362C6 18.7202 6 17.8802 6 16.2V6M14 10V17M10 10V17" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </li>
  </ul>
</div>
</template>

<style module>
.nav {
  position: relative;
  z-index: 2;

  &.vertical > ul {
    flex-direction: column;

    > li {
      &:first-of-type button {
        border-top-left-radius: 10px;
        border-top-right-radius: 10px;
      }

      &:last-of-type button {
        border-bottom-left-radius: 10px;
        border-bottom-right-radius: 10px;
      }
    }
  }

  &.horizontal > ul {
    flex-direction: row;

    > li {
      &:first-of-type button {
        border-top-left-radius: 10px;
        border-bottom-left-radius: 10px;
      }

      &:last-of-type button {
        border-top-right-radius: 10px;
        border-bottom-right-radius: 10px;
      }
    }
  }

  > ul {
    display: flex;
    justify-content: flex-start;
    align-items: center;
    list-style: none;
    margin: 0;
    padding: 0;

    button {
      border: none;
      padding: 5px;
      cursor: pointer;
      background-color: #33353a;

      &:hover, &.active {
        background-color: #3a80b6;
      }
    }
  }
}
</style>