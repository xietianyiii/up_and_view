<script setup lang="ts">
import Navigation from './views/Navigation.vue'
</script>

<template>
  <div class="app-container">
    <div>
      <Navigation />
    </div>

    <div class="content-container">
      <RouterView />
    </div>
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  height: 100vh; /* 占满全屏高度 */
}

.content-container {
  overflow-y: auto; /* 如果内容过长，添加滚动条 */
  padding: 20px;
}
</style>
