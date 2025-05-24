<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'

const props = defineProps<{
  images: string[]
  autoPlay?: boolean
  autoPlayInterval?: number
  showIndicators?: boolean
  showArrows?: boolean
}>()

const currentIndex = ref(0)
const isTransitioning = ref(false)
const carouselContainer = ref<HTMLElement | null>(null)
const imageTrack = ref<HTMLElement | null>(null)
const autoPlayTimer = ref<number | null>(null)

// 触摸相关
const touchStartX = ref(0)
const touchEndX = ref(0)
const isDragging = ref(false)
const dragOffset = ref(0)

// 获取滑动位置
const getSlidePosition = (index: number) => {
  return -(index * 100)
}

// 更新轨道位置
const updateTrackPosition = (withTransition = true) => {
  if (!imageTrack.value) return

  const translateX = getSlidePosition(currentIndex.value) + dragOffset.value

  if (withTransition) {
    imageTrack.value.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
  } else {
    imageTrack.value.style.transition = 'none'
  }

  imageTrack.value.style.transform = `translateX(${translateX}%)`
}

// 前进到下一张
const nextImage = () => {
  if (isTransitioning.value || props.images.length <= 1) return

  isTransitioning.value = true
  currentIndex.value = (currentIndex.value + 1) % props.images.length
  dragOffset.value = 0

  updateTrackPosition(true)

  setTimeout(() => {
    isTransitioning.value = false
  }, 300)
}

// 后退到上一张
const prevImage = () => {
  if (isTransitioning.value || props.images.length <= 1) return

  isTransitioning.value = true
  currentIndex.value = currentIndex.value === 0 ? props.images.length - 1 : currentIndex.value - 1
  dragOffset.value = 0

  updateTrackPosition(true)

  setTimeout(() => {
    isTransitioning.value = false
  }, 300)
}

// 跳转到指定图片
const goToImage = (index: number) => {
  if (isTransitioning.value || index === currentIndex.value) return

  isTransitioning.value = true
  currentIndex.value = index
  dragOffset.value = 0

  updateTrackPosition(true)

  setTimeout(() => {
    isTransitioning.value = false
  }, 300)
}

// 自动播放
const startAutoPlay = () => {
  if (!props.autoPlay || props.images.length <= 1) return

  autoPlayTimer.value = window.setInterval(() => {
    nextImage()
  }, props.autoPlayInterval || 3000)
}

const stopAutoPlay = () => {
  if (autoPlayTimer.value) {
    clearInterval(autoPlayTimer.value)
    autoPlayTimer.value = null
  }
}

// 触摸事件处理
const handleTouchStart = (e: TouchEvent) => {
  if (isTransitioning.value) return

  touchStartX.value = e.touches[0].clientX
  touchEndX.value = e.touches[0].clientX
  isDragging.value = true
  dragOffset.value = 0
  stopAutoPlay()
}

const handleTouchMove = (e: TouchEvent) => {
  if (!isDragging.value || isTransitioning.value) return

  touchEndX.value = e.touches[0].clientX
  const deltaX = touchEndX.value - touchStartX.value
  const containerWidth = carouselContainer.value?.offsetWidth || 1

  // 计算拖拽偏移百分比
  dragOffset.value = (deltaX / containerWidth) * 100

  // 限制拖拽范围
  const maxOffset = 30 // 最大拖拽距离为30%
  dragOffset.value = Math.max(-maxOffset, Math.min(maxOffset, dragOffset.value))

  updateTrackPosition(false)
}

const handleTouchEnd = () => {
  if (!isDragging.value) return

  const deltaX = touchStartX.value - touchEndX.value
  const threshold = 50

  isDragging.value = false

  if (Math.abs(deltaX) > threshold) {
    if (deltaX > 0) {
      nextImage()
    } else {
      prevImage()
    }
  } else {
    // 回弹到当前位置
    dragOffset.value = 0
    updateTrackPosition(true)
  }

  if (props.autoPlay) {
    startAutoPlay()
  }
}

// 鼠标事件处理（桌面端）
const handleMouseEnter = () => {
  stopAutoPlay()
}

const handleMouseLeave = () => {
  if (props.autoPlay) {
    startAutoPlay()
  }
}

// 键盘事件处理
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'ArrowLeft') {
    prevImage()
  } else if (e.key === 'ArrowRight') {
    nextImage()
  }
}

// 监听图片变化，重置索引
watch(
  () => props.images,
  () => {
    currentIndex.value = 0
    dragOffset.value = 0
    stopAutoPlay()
    if (props.autoPlay) {
      nextTick(() => {
        updateTrackPosition(false)
        startAutoPlay()
      })
    }
  },
)

// 监听当前索引变化，更新位置
watch(currentIndex, () => {
  nextTick(() => {
    updateTrackPosition(false)
  })
})

onMounted(() => {
  updateTrackPosition(false)

  if (props.autoPlay) {
    startAutoPlay()
  }

  // 添加键盘事件监听
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  stopAutoPlay()
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="image-carousel" @mouseenter="handleMouseEnter" @mouseleave="handleMouseLeave">
    <div
      ref="carouselContainer"
      class="carousel-container"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
    >
      <!-- 图片轨道 -->
      <div ref="imageTrack" class="image-track">
        <div v-for="(image, index) in images" :key="index" class="image-slide">
          <img :src="image" :alt="`图片 ${index + 1}`" class="carousel-image" draggable="false" />
        </div>
      </div>

      <!-- 导航箭头 -->
      <template v-if="showArrows !== false && images.length > 1">
        <button class="carousel-arrow prev-arrow" @click="prevImage" :disabled="isTransitioning">
          <span class="arrow-icon">‹</span>
        </button>
        <button class="carousel-arrow next-arrow" @click="nextImage" :disabled="isTransitioning">
          <span class="arrow-icon">›</span>
        </button>
      </template>
    </div>

    <!-- 指示器 -->
    <div v-if="showIndicators !== false && images.length > 1" class="carousel-indicators">
      <button
        v-for="(_, index) in images"
        :key="index"
        class="indicator"
        :class="{ active: index === currentIndex }"
        @click="goToImage(index)"
        :disabled="isTransitioning"
      >
        <span class="indicator-dot"></span>
      </button>
    </div>

    <!-- 图片计数器 -->
    <div v-if="images.length > 1" class="image-counter">
      {{ currentIndex + 1 }} / {{ images.length }}
    </div>
  </div>
</template>

<style scoped>
.image-carousel {
  position: relative;
  width: 100%;
  background-color: #000;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.carousel-container {
  position: relative;
  width: 100%;
  height: 300px;
  overflow: hidden;
  cursor: grab;
}

.carousel-container:active {
  cursor: grabbing;
}

/* 图片轨道 - 关键的滑动实现 */
.image-track {
  display: flex;
  width: 100%;
  height: 100%;
  will-change: transform;
}

.image-slide {
  flex: none;
  width: 100%;
  height: 100%;
  position: relative;
}

.carousel-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  user-select: none;
  -webkit-user-drag: none;
}

/* 导航箭头 */
.carousel-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 44px;
  height: 44px;
  background-color: rgba(0, 0, 0, 0.5);
  border: none;
  border-radius: 50%;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  z-index: 10;
  font-size: 0;
}

.carousel-arrow:hover {
  background-color: rgba(0, 0, 0, 0.7);
  transform: translateY(-50%) scale(1.1);
}

.carousel-arrow:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: translateY(-50%);
}

.prev-arrow {
  left: 15px;
}

.next-arrow {
  right: 15px;
}

.arrow-icon {
  font-size: 24px;
  font-weight: bold;
  line-height: 1;
}

/* 指示器 */
.carousel-indicators {
  position: absolute;
  bottom: 15px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  z-index: 10;
}

.indicator {
  width: 12px;
  height: 12px;
  border: none;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  padding: 0;
  transition: all 0.2s;
}

.indicator.active {
  background-color: rgba(255, 255, 255, 0.9);
  transform: scale(1.2);
}

.indicator:hover {
  background-color: rgba(255, 255, 255, 0.8);
}

.indicator:disabled {
  cursor: not-allowed;
}

.indicator-dot {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 50%;
}

/* 图片计数器 */
.image-counter {
  position: absolute;
  top: 15px;
  right: 15px;
  background-color: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
  z-index: 10;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .carousel-container {
    height: 250px;
  }

  .carousel-arrow {
    width: 36px;
    height: 36px;
  }

  .prev-arrow {
    left: 10px;
  }

  .next-arrow {
    right: 10px;
  }

  .arrow-icon {
    font-size: 20px;
  }

  .carousel-indicators {
    bottom: 10px;
  }

  .indicator {
    width: 10px;
    height: 10px;
  }

  .image-counter {
    top: 10px;
    right: 10px;
    font-size: 0.75rem;
  }
}

/* 暗模式支持 */
@media (prefers-color-scheme: dark) {
  .image-carousel {
    background-color: #1a1a1a;
  }

  .carousel-arrow {
    background-color: rgba(255, 255, 255, 0.2);
  }

  .carousel-arrow:hover {
    background-color: rgba(255, 255, 255, 0.3);
  }

  .indicator {
    background-color: rgba(255, 255, 255, 0.3);
  }

  .indicator.active {
    background-color: rgba(255, 255, 255, 0.8);
  }

  .image-counter {
    background-color: rgba(255, 255, 255, 0.2);
  }
}

/* 无障碍支持 */
.carousel-arrow:focus,
.indicator:focus {
  outline: 2px solid #3399ff;
  outline-offset: 2px;
}

/* 减少动画的用户偏好支持 */
@media (prefers-reduced-motion: reduce) {
  .image-track {
    transition: none !important;
  }
}

/* 滑动性能优化 */
.image-track {
  backface-visibility: hidden;
  perspective: 1000px;
  transform-style: preserve-3d;
}

.carousel-image {
  backface-visibility: hidden;
}
</style>
