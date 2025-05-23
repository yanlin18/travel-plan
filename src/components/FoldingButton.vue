<template>
  <div class="folding-button-container">
    <!-- 圆形折叠按钮 -->
    <button class="folding-button" @click="toggleIcons">
      <span v-if="isExpanded" class="icon-close">×</span>
      <span v-else class="icon-expand">+</span>
    </button>

    <!-- 图标容器 - 使用固定高度容器和绝对定位避免布局跳动 -->
    <div class="icons-wrapper">
      <transition name="fade">
        <div v-if="isExpanded" class="icons-container">
          <div
            class="icon-item"
            :class="{ 'icon-selected': selectedIcons.hotel }"
            @click="handleIconClick('hotel')"
          >
            <div class="icon-wrapper">
              <IconHotel />
              <div v-if="selectedIcons.hotel" class="icon-slash"></div>
            </div>
            <span>酒店</span>
          </div>
          <div
            class="icon-item"
            :class="{ 'icon-selected': selectedIcons.spot }"
            @click="handleIconClick('spot')"
          >
            <div class="icon-wrapper">
              <IconSpot />
              <div v-if="selectedIcons.spot" class="icon-slash"></div>
            </div>
            <span>景点</span>
          </div>
          <div
            class="icon-item"
            :class="{ 'icon-selected': selectedIcons.transportation }"
            @click="handleIconClick('transportation')"
          >
            <div class="icon-wrapper">
              <IconTransportation />
              <div v-if="selectedIcons.transportation" class="icon-slash"></div>
            </div>
            <span>交通</span>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import IconHotel from './icons/IconHotel.vue'
import IconSpot from './icons/IconSpot.vue'
import IconTransportation from './icons/IconTransportation.vue'

// 控制图标显示状态
const isExpanded = ref(false)

// 定义图标类型
type IconType = 'hotel' | 'spot' | 'transportation'

// 图标选择状态
const selectedIcons = ref({
  hotel: false,
  spot: false,
  transportation: false,
})

// 切换图标显示/隐藏
const toggleIcons = () => {
  isExpanded.value = !isExpanded.value
}

// 点击图标时的处理函数
const handleIconClick = (type: IconType) => {
  // 切换该图标的选中状态
  selectedIcons.value[type] = !selectedIcons.value[type]
  console.log(`选择了 ${type}，状态: ${selectedIcons.value[type] ? '禁用' : '启用'}`)
  // 发出事件通知父组件
  emit('filterChange', { type, selected: selectedIcons.value[type] })
}

// 定义要发出的事件
const emit = defineEmits<{
  (e: 'filterChange', payload: { type: string; selected: boolean }): void
}>()
</script>

<style scoped>
.folding-button-container {
  position: relative;
  display: flex;
  align-items: center;
  /* 固定布局高度，防止折叠/展开时引起页面跳动 */
  height: 44px;
}

.folding-button {
  width: 40px;
  height: 40px;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  /* 确保按钮垂直居中 */
  flex-shrink: 0;
}

.folding-button:hover {
  background-color: #45a049;
  transform: scale(1.05);
}

.icon-expand,
.icon-close {
  line-height: 1;
  position: relative;
  /* 调整垂直位置使图标居中 */
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  top: 0; /* 统一设置为0，确保两个图标都居中 */
}

/* 添加图标容器包装器，保持一致的高度和布局 */
.icons-wrapper {
  position: relative;
  height: 44px;
  margin-left: 15px;
  overflow: visible;
  flex-grow: 1;
  display: flex;
  align-items: center;
}

.icons-container {
  display: flex;
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  z-index: 5;
  /* 添加背景提升视觉效果 */
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 20px;
  padding: 4px 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.icon-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 0 8px;
  cursor: pointer;
  transition: transform 0.2s;
}

.icon-item:hover {
  transform: scale(1.1);
}

.icon-wrapper {
  position: relative;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-item svg {
  width: 28px;
  height: 28px;
}

.icon-slash {
  position: absolute;
  width: 100%;
  height: 2px;
  background-color: #ff0000;
  transform: rotate(-45deg);
  top: 50%;
  left: 0;
}

.icon-item span {
  margin-top: 2px;
  font-size: 11px;
  font-weight: 500;
}

/* 淡入淡出动画 - 替代滑动，防止布局变化 */
.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-50%) scale(0.95);
}

/* 暗模式适配 */
@media (prefers-color-scheme: dark) {
  .icons-container {
    background-color: rgba(50, 50, 50, 0.9);
  }

  .icon-item span {
    color: #eee;
  }
}
</style>
