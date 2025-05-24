<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="app">
    <RouterView />
  </div>
</template>

<style>
/* 全局移动端滚动优化 */
html,
body {
  -webkit-overflow-scrolling: touch;
  overflow-x: hidden;
  height: 100%;
  margin: 0;
  padding: 0;
}

/* 移动端滚动性能优化 */
* {
  -webkit-tap-highlight-color: transparent;
}

/* 移动端触摸优化 */
@media (max-width: 768px) {
  html,
  body {
    overscroll-behavior: contain;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
}
</style>

<style scoped>
.app {
  width: 100%;
  height: 100%;
  font-size: 2em;
  text-align: center;
  color: black;
  background-color: white;
  position: relative;
  /* 确保应用容器支持滚动 */
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
</style>
