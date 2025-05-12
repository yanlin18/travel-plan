<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="app">
    <RouterView />
  </div>
</template>

<style scoped>
.app {
  width: 100%;
  height: 100%;
  font-size: 2em;
  text-align: center;
  color: black;
  background-color: white;
}
</style>
