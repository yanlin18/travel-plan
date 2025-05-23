<script setup lang="ts">
import type { Hotel, Spot, Transportation } from '../types/travel'
import IconHotel from './icons/IconHotel.vue'
import IconSpot from './icons/IconSpot.vue'
import IconTransportation from './icons/IconTransportation.vue'
import { ref, inject, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'

const props = defineProps<{
  type: 'hotel' | 'spot' | 'transportation'
  item: Hotel | Spot | Transportation
  isSelected: boolean
}>()

const emit = defineEmits<{
  (e: 'toggleSelect', type: string, item: Hotel | Spot | Transportation, event: Event): void
  (e: 'addToPlan', type: string, item: Hotel | Spot | Transportation): void
}>()

// 注入用户交互标记函数
const markUserInteraction = inject('markUserInteraction', () => {
  console.log('MapMarker: 未找到全局用户交互标记函数')
})

// 注入视觉反馈函数
const provideVisualFeedback = inject('provideVisualFeedback', () => {
  console.log('MapMarker: 未找到视觉反馈函数')
})

// 处理点击事件 - 显示信息
const handleClick = (event: Event) => {
  markUserInteraction()
  event.stopPropagation()
  emit('toggleSelect', props.type, props.item, event)
}

// 处理加入行程按钮点击
const handleAddToPlan = (event: Event) => {
  markUserInteraction()
  event.stopPropagation()
  provideVisualFeedback()
  emit('addToPlan', props.type, props.item)
}

// 获取显示名称
const getItemName = () => {
  if (props.type === 'hotel' || props.type === 'spot') {
    return (props.item as Hotel | Spot).name
  } else {
    return `${(props.item as Transportation).type} 交通`
  }
}

// 获取位置信息
const getItemLocation = () => {
  if (props.type === 'hotel' || props.type === 'spot') {
    return (props.item as Hotel | Spot).location
  }
  return (props.item as Transportation).route
}

// 信息框位置相关
const tooltipEl = ref<HTMLElement | null>(null)
const markerEl = ref<HTMLElement | null>(null)
const tooltipPosition = ref({
  left: false,
  top: false,
  adjustY: 0,
})

// 计算信息框的最佳显示位置
const calculateTooltipPosition = () => {
  if (!tooltipEl.value || !markerEl.value) return

  const mapContainer = document.querySelector('.map-container')
  if (!mapContainer) return

  const mapRect = mapContainer.getBoundingClientRect()
  const markerRect = markerEl.value.getBoundingClientRect()
  const tooltipRect = tooltipEl.value.getBoundingClientRect()

  // 默认位置是在右侧
  let shouldBeLeft = false
  let shouldBeTop = false
  let yAdjustment = 0

  // 检查水平方向 - 如果标记位于右半侧，则显示在左侧
  if (markerRect.left + markerRect.width / 2 > mapRect.left + mapRect.width * 0.6) {
    shouldBeLeft = true
  }

  // 检查垂直方向 - 避免顶部或底部溢出
  const tooltipTop = markerRect.top - tooltipRect.height / 2
  const tooltipBottom = markerRect.top + tooltipRect.height / 2

  // 如果信息框底部超出地图底部边界
  if (tooltipBottom > mapRect.bottom - 20) {
    yAdjustment = mapRect.bottom - tooltipBottom - 20
  }

  // 如果信息框顶部超出地图顶部边界
  if (tooltipTop < mapRect.top + 20) {
    yAdjustment = mapRect.top - tooltipTop + 20
  }

  tooltipPosition.value = {
    left: shouldBeLeft,
    top: shouldBeTop,
    adjustY: yAdjustment,
  }
}

// 监听isSelected变化，调整信息框位置
watch(
  () => props.isSelected,
  (selected) => {
    if (selected) {
      nextTick(() => {
        calculateTooltipPosition()
      })
    }
  },
)

onMounted(() => {
  window.addEventListener('resize', calculateTooltipPosition)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', calculateTooltipPosition)
})
</script>

<template>
  <div
    :id="`marker-${type}-${item.id}`"
    ref="markerEl"
    class="map-marker"
    :class="{
      'hotel-marker': type === 'hotel',
      'spot-marker': type === 'spot',
      'transportation-marker': type === 'transportation',
      'marker-selected': isSelected,
    }"
    :style="{
      left: item.position.x + '%',
      top: item.position.y + '%',
    }"
    @click.stop="handleClick"
  >
    <div class="marker-icon" :class="`${type}-icon`">
      <IconHotel v-if="type === 'hotel'" />
      <IconSpot v-else-if="type === 'spot'" />
      <IconTransportation v-else-if="type === 'transportation'" />
    </div>
    <div
      v-if="isSelected"
      ref="tooltipEl"
      class="marker-tooltip"
      :class="{
        'tooltip-left': tooltipPosition.left,
        'tooltip-top': tooltipPosition.top,
        'tooltip-visible': isSelected,
      }"
      :style="{
        transform: tooltipPosition.left
          ? `translateY(calc(-50% + ${tooltipPosition.adjustY}px)) translateX(-10px) scale(1)`
          : `translateY(calc(-50% + ${tooltipPosition.adjustY}px)) translateX(10px) scale(1)`,
      }"
    >
      <h3>{{ getItemName() }}</h3>
      <template v-if="type === 'hotel'">
        <p>位置: {{ getItemLocation() }}</p>
        <p>价格: {{ (item as Hotel).price }}</p>
      </template>
      <template v-else-if="type === 'spot'">
        <p>位置: {{ getItemLocation() }}</p>
        <p>评分: {{ (item as Spot).rating }} ⭐</p>
      </template>
      <template v-else>
        <p>路线: {{ (item as Transportation).route }}</p>
        <p>频率: {{ (item as Transportation).frequency }}</p>
      </template>

      <button class="add-to-plan-btn" @click.stop="handleAddToPlan">
        <span class="add-icon">+</span> 加入行程
      </button>

      <button class="close-tooltip-btn" @click.stop="$emit('toggleSelect', type, item, $event)">
        ×
      </button>
    </div>
  </div>
</template>

<style scoped>
.map-marker {
  position: absolute;
  transform: translate(-50%, -50%);
  z-index: 10;
  cursor: pointer;
  transition: all 0.2s;
  /* 增加触摸区域 */
  padding: 8px;
  margin: -8px;
  /* 确保触摸区域完全覆盖 */
  touch-action: manipulation;
}

.marker-selected {
  z-index: 100; /* 选中的标记层级提高，确保在其他标记之上 */
}

.marker-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: #fff;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 2;
  transition:
    transform 0.2s ease-out,
    box-shadow 0.2s ease-out;
  will-change: transform;
  /* 确保图标边界清晰 */
  overflow: hidden;
}

/* 确保SVG图标大小合适 */
.marker-icon svg {
  width: 20px;
  height: 20px;
  /* 确保SVG不会被裁剪 */
  display: block;
}

.marker-selected .marker-icon {
  transform: scale(1.15);
  box-shadow:
    0 3px 12px rgba(0, 0, 0, 0.4),
    0 0 0 2px rgba(255, 255, 255, 0.5);
}

/* 酒店标记样式 */
.hotel-icon {
  border: 3px solid #3399ff;
}

/* 景点标记样式 */
.spot-icon {
  border: 3px solid #18cc73;
}

/* 交通标记样式 */
.transportation-icon {
  border: 3px solid #000000;
}

/* 提示框样式 */
.marker-tooltip {
  position: absolute;
  top: 0;
  left: 100%;
  width: 220px;
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 3px 14px rgba(0, 0, 0, 0.25);
  padding: 14px;
  opacity: 0;
  pointer-events: none;
  transform: translateY(-50%) translateX(10px) scale(0.95);
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  z-index: 1000; /* 确保信息框显示在所有地图元素之上 */
  overflow: hidden;
  /* 添加1px白色边框增强视觉 */
  border: 1px solid rgba(255, 255, 255, 0.8);
}

.tooltip-visible {
  opacity: 1;
  pointer-events: auto;
}

.tooltip-left {
  left: auto;
  right: 100%;
}

.tooltip-top {
  top: auto;
  bottom: 100%;
  transform-origin: bottom center;
}

.marker-tooltip h3 {
  margin: 0 0 10px 0;
  font-size: 1.05rem;
  color: #333;
  font-weight: 600;
  padding-right: 20px; /* 为关闭按钮留出空间 */
}

.marker-tooltip p {
  margin: 6px 0;
  font-size: 0.9rem;
  color: #666;
}

/* 关闭按钮 */
.close-tooltip-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background-color: rgba(0, 0, 0, 0.1);
  border: none;
  color: #666;
  font-size: 14px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  padding: 0;
}

.close-tooltip-btn:hover {
  background-color: rgba(0, 0, 0, 0.2);
  color: #333;
}

/* 加入行程按钮样式 */
.add-to-plan-btn {
  margin-top: 14px;
  width: 100%;
  padding: 10px 12px;
  background-color: #3399ff;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.add-to-plan-btn:hover {
  background-color: #2288ee;
  transform: translateY(-1px);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.add-to-plan-btn:active {
  background-color: #1177dd;
  transform: translateY(1px);
  box-shadow: none;
}

.add-icon {
  margin-right: 6px;
  font-size: 14px;
  font-weight: bold;
}

/* 触摸设备上的悬停支持 */
@media (hover: hover) {
  .map-marker:hover .marker-icon {
    transform: scale(1.08);
    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.3);
  }

  .marker-selected:hover .marker-icon {
    transform: scale(1.2);
    box-shadow:
      0 4px 12px rgba(0, 0, 0, 0.4),
      0 0 0 2px rgba(255, 255, 255, 0.6);
  }
}

/* 暗模式支持 */
@media (prefers-color-scheme: dark) {
  .marker-icon {
    background-color: #333;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.5);
  }

  .hotel-icon {
    border-color: #5a9dff;
  }

  .spot-icon {
    border-color: #2de58a;
  }

  .transportation-icon {
    border-color: #aaaaaa;
  }

  .marker-tooltip {
    background-color: #222;
    box-shadow: 0 3px 14px rgba(0, 0, 0, 0.6);
    border-color: rgba(60, 60, 60, 0.8);
  }

  .marker-tooltip h3 {
    color: #eee;
  }

  .marker-tooltip p {
    color: #bbb;
  }

  .close-tooltip-btn {
    background-color: rgba(255, 255, 255, 0.15);
    color: #aaa;
  }

  .close-tooltip-btn:hover {
    background-color: rgba(255, 255, 255, 0.25);
    color: #fff;
  }

  .add-to-plan-btn {
    background-color: #4488ff;
  }

  .add-to-plan-btn:hover {
    background-color: #5599ff;
  }

  .add-to-plan-btn:active {
    background-color: #3377ee;
  }
}
</style>
