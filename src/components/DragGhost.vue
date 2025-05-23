<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  type: 'hotel' | 'spot' | 'transportation'
  position: { x: number; y: number }
  isDragging: boolean
}>()

// 根据类型计算颜色
const borderColor = computed(() => {
  switch (props.type) {
    case 'hotel':
      return '#3399ff'
    case 'spot':
      return '#18cc73'
    case 'transportation':
      return '#000000'
  }
})
</script>

<template>
  <div
    v-if="isDragging"
    class="dragging-ghost"
    :class="`${type}-ghost`"
    :style="{
      left: position.x + 'px',
      top: position.y + 'px',
      borderColor: borderColor,
    }"
  >
    <div class="ghost-icon">
      <slot></slot>
    </div>
    <div class="ghost-trail"></div>
  </div>
</template>

<style scoped>
.dragging-ghost {
  position: absolute;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 999;
  opacity: 0.9;
  animation: pulse 1.2s infinite;
  transition: all 0.05s linear;
  will-change: transform, opacity;
}

@keyframes pulse {
  0% {
    transform: translate(-50%, -50%) scale(1);
    box-shadow: 0 0 0 0 rgba(0, 0, 0, 0.2);
  }
  50% {
    transform: translate(-50%, -50%) scale(1.1);
    box-shadow: 0 0 10px 5px rgba(0, 0, 0, 0.1);
  }
  100% {
    transform: translate(-50%, -50%) scale(1);
    box-shadow: 0 0 0 0 rgba(0, 0, 0, 0.2);
  }
}

.ghost-icon {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.95);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  padding: 5px;
  position: relative;
  z-index: 2;
  border: 3px solid;
}

.ghost-trail {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.4);
  filter: blur(10px);
  z-index: 1;
  opacity: 0.7;
  animation: trailPulse 1s infinite;
}

@keyframes trailPulse {
  0% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.7;
  }
  100% {
    transform: translate(-50%, -50%) scale(2.5);
    opacity: 0;
  }
}

/* 根据类型设置不同的拖拽效果 */
.hotel-ghost .ghost-trail {
  background-color: rgba(51, 153, 255, 0.3);
}

.spot-ghost .ghost-trail {
  background-color: rgba(24, 204, 115, 0.3);
}

.transportation-ghost .ghost-trail {
  background-color: rgba(0, 0, 0, 0.2);
}

/* 暗模式支持 */
@media (prefers-color-scheme: dark) {
  .ghost-icon {
    background-color: rgba(42, 42, 42, 0.95);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
  }

  .ghost-trail {
    background-color: rgba(255, 255, 255, 0.2);
  }

  .hotel-ghost .ghost-trail {
    background-color: rgba(51, 153, 255, 0.2);
  }

  .spot-ghost .ghost-trail {
    background-color: rgba(24, 204, 115, 0.2);
  }

  .transportation-ghost .ghost-trail {
    background-color: rgba(200, 200, 200, 0.15);
  }
}
</style>
