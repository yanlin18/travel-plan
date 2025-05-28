<script setup lang="ts">
import { ref, onMounted, watch, onBeforeUnmount, computed } from 'vue'
import type { Hotel, Spot, Transportation } from '../types/travel'
import MapMarker from './MapMarker.vue'
import FoldingButton from './FoldingButton.vue'

// 定义标签点类型接口
interface LabelPoint {
  x: number
  y: number
  originalY: number
  number: number
}

// 定义路径计算结果接口
interface RoutePathResult {
  path: string
  labels: LabelPoint[]
}

const props = defineProps<{
  hotels: Hotel[]
  spots: Spot[]
  transportations: Transportation[]
  showHotels: boolean
  showSpots: boolean
  showTransportation: boolean
  activeTooltipType: string | null
  activeTooltipId: number | null
  planItems: { items: Array<{ id: string; type: string; originalId: number; sortOrder: number }> }
}>()

const emit = defineEmits<{
  (e: 'filterChange', payload: { type: string; selected: boolean }): void
  (e: 'toggleSelectItem', type: string, item: Hotel | Spot | Transportation, event: Event): void
  (
    e: 'startDrag',
    type: string,
    item: Hotel | Spot | Transportation,
    event: MouseEvent | TouchEvent,
  ): void
  (e: 'clearSelection'): void
  (e: 'addItemToPlan', type: string, item: Hotel | Spot | Transportation): void
}>()

// 检查项目是否已被选中
const isItemSelected = (type: string, id: number): boolean => {
  const result = props.activeTooltipType === type && props.activeTooltipId === id
  // 当结果为 true 时进行日志记录
  if (result) {
    console.log(
      '项目被选中:',
      type,
      id,
      '当前状态:',
      props.activeTooltipType,
      props.activeTooltipId,
    )
  }
  return result
}

// 处理标记点击事件
const handleMarkerToggle = (type: string, item: Hotel | Spot | Transportation, event: Event) => {
  console.log('TravelMap 点击事件触发:', type, item.id)
  emit('toggleSelectItem', type, item, event)
}

// 处理标记添加到行程事件
const handleAddToPlan = (type: string, item: Hotel | Spot | Transportation) => {
  console.log('TravelMap 添加到行程事件触发:', type, item.id)
  emit('addItemToPlan', type, item)
}

// 处理拖拽开始事件
const handleMarkerDrag = (
  type: string,
  item: Hotel | Spot | Transportation,
  event: MouseEvent | TouchEvent,
) => {
  emit('startDrag', type, item, event)
}

// 地图控制变量
const mapContainer = ref<HTMLElement | null>(null)
const mapInner = ref<HTMLElement | null>(null)
const mapScale = ref(1)
const mapTranslateX = ref(0)
const mapTranslateY = ref(0)
const isPinching = ref(false)
const isMoving = ref(false)
const initialDistance = ref(0)
const initialScale = ref(1)
const pinchStart = ref({ x: 0, y: 0 })
const lastTouchCenter = ref({ x: 0, y: 0 })
const touchStartTime = ref(0)
const lastTouchTime = ref(0)
const velocity = ref({ x: 0, y: 0 })
const mapSize = ref({ width: 0, height: 0 })
const isInertiaActive = ref(false)
const inertiaFrame = ref<number | null>(null)

// 双指缩放和平移功能改进
const handleTouchStart = (e: TouchEvent) => {
  if (isInertiaActive.value && inertiaFrame.value !== null) {
    cancelAnimationFrame(inertiaFrame.value)
    isInertiaActive.value = false
  }

  touchStartTime.value = Date.now()

  if (e.touches.length === 2) {
    // 双指操作，准备缩放
    isPinching.value = true
    isMoving.value = false
    const touch1 = e.touches[0]
    const touch2 = e.touches[1]

    // 计算两指间距离
    initialDistance.value = Math.hypot(
      touch1.clientX - touch2.clientX,
      touch1.clientY - touch2.clientY,
    )

    // 记录初始缩放比例
    initialScale.value = mapScale.value

    // 记录触摸中心点
    pinchStart.value = {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2,
    }

    lastTouchCenter.value = { ...pinchStart.value }
  } else if (e.touches.length === 1) {
    // 单指拖动
    isPinching.value = false
    isMoving.value = true

    // 记录起始位置
    lastTouchCenter.value = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    }

    velocity.value = { x: 0, y: 0 }
  }
}

const handleTouchMove = (e: TouchEvent) => {
  const now = Date.now()
  const elapsed = now - lastTouchTime.value
  lastTouchTime.value = now

  if (isPinching.value && e.touches.length === 2) {
    const touch1 = e.touches[0]
    const touch2 = e.touches[1]

    // 计算新的距离
    const newDistance = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY)

    // 获取容器尺寸
    const containerRect = mapContainer.value?.getBoundingClientRect()
    if (!containerRect || !mapInner.value) return

    // 计算最小缩放比例，确保地图至少填满容器
    const minScaleX = containerRect.width / mapInner.value.clientWidth
    const minScaleY = containerRect.height / mapInner.value.clientHeight
    const minScale = Math.max(minScaleX, minScaleY, 0.5) // 最小不低于0.5

    // 计算新的缩放比例，限制最大最小值
    const newScale = Math.min(
      Math.max(initialScale.value * (newDistance / initialDistance.value), minScale),
      3,
    )

    // 计算新的触摸中心点
    const newCenter = {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2,
    }

    // 更新平移位置
    if (newScale !== mapScale.value) {
      // 计算平移增量
      const dx = newCenter.x - lastTouchCenter.value.x
      const dy = newCenter.y - lastTouchCenter.value.y

      // 更新平移
      mapTranslateX.value += dx
      mapTranslateY.value += dy

      // 更新缩放
      mapScale.value = newScale

      // 检查边界
      checkMapBounds()

      // 更新最后的触摸中心点
      lastTouchCenter.value = newCenter
    }
  } else if (isMoving.value && e.touches.length === 1) {
    // 单指移动
    const touch = e.touches[0]
    const newCenter = {
      x: touch.clientX,
      y: touch.clientY,
    }

    // 计算移动增量
    const dx = newCenter.x - lastTouchCenter.value.x
    const dy = newCenter.y - lastTouchCenter.value.y

    // 根据时间计算速度（用于惯性滚动）
    if (elapsed > 0) {
      velocity.value.x = (dx / elapsed) * 15
      velocity.value.y = (dy / elapsed) * 15
    }

    // 更新平移位置
    mapTranslateX.value += dx
    mapTranslateY.value += dy

    // 检查边界
    checkMapBounds()

    // 更新最后的触摸位置
    lastTouchCenter.value = newCenter
  }
}

// 添加边界检查
const checkMapBounds = () => {
  if (!mapContainer.value || !mapInner.value) return

  // 获取容器和地图内容的大小
  const containerRect = mapContainer.value.getBoundingClientRect()
  const containerWidth = containerRect.width
  const containerHeight = containerRect.height

  // 获取缩放后的地图尺寸
  const scaledMapWidth = mapInner.value.clientWidth * mapScale.value
  const scaledMapHeight = mapInner.value.clientHeight * mapScale.value

  // 计算地图尺寸
  mapSize.value = {
    width: mapInner.value.clientWidth,
    height: mapInner.value.clientHeight,
  }

  // 计算允许的最大边界 - 限制边界使地图填满容器
  let maxX, maxY

  // 如果缩放后的地图尺寸小于容器，则将地图居中显示
  if (scaledMapWidth <= containerWidth) {
    // 地图比容器窄，居中显示
    mapTranslateX.value = 0
    maxX = 0
  } else {
    // 地图比容器宽，限制平移范围，使地图边缘不超出容器
    maxX = (scaledMapWidth - containerWidth) / 2
    mapTranslateX.value = Math.max(Math.min(mapTranslateX.value, maxX), -maxX)
  }

  if (scaledMapHeight <= containerHeight) {
    // 地图比容器矮，居中显示
    mapTranslateY.value = 0
    maxY = 0
  } else {
    // 地图比容器高，限制平移范围，使地图边缘不超出容器
    maxY = (scaledMapHeight - containerHeight) / 2
    mapTranslateY.value = Math.max(Math.min(mapTranslateY.value, maxY), -maxY)
  }

  // 限制缩放范围，确保不会缩放过小导致出现大面积空白
  // 计算最小缩放比例，使地图至少能覆盖容器
  const minScaleX = containerWidth / mapSize.value.width
  const minScaleY = containerHeight / mapSize.value.height
  const minScale = Math.max(minScaleX, minScaleY)

  // 如果当前缩放比例小于最小缩放比例，则调整为最小缩放比例
  if (mapScale.value < minScale) {
    mapScale.value = minScale
    // 重新居中
    mapTranslateX.value = 0
    mapTranslateY.value = 0
  }
}

// 增加惯性滚动效果
const startInertiaScroll = () => {
  if (Math.abs(velocity.value.x) < 0.5 && Math.abs(velocity.value.y) < 0.5) return

  isInertiaActive.value = true

  const animate = () => {
    // 移动惯性
    mapTranslateX.value += velocity.value.x
    mapTranslateY.value += velocity.value.y

    // 检查边界
    checkMapBounds()

    // 减少速度（摩擦）
    velocity.value.x *= 0.95
    velocity.value.y *= 0.95

    // 当速度足够小时停止动画
    if (Math.abs(velocity.value.x) < 0.5 && Math.abs(velocity.value.y) < 0.5) {
      isInertiaActive.value = false
      return
    }

    inertiaFrame.value = requestAnimationFrame(animate)
  }

  inertiaFrame.value = requestAnimationFrame(animate)
}

const handleTouchEnd = (e: TouchEvent) => {
  const touchDuration = Date.now() - touchStartTime.value

  if (isMoving.value && touchDuration < 300) {
    // 短时间触摸结束，启动惯性滚动
    startInertiaScroll()
  }

  isPinching.value = false
  isMoving.value = false
}

// 初始化地图状态
const initMapState = () => {
  if (!mapContainer.value || !mapInner.value) return

  // 获取容器和地图内容的尺寸
  const containerRect = mapContainer.value.getBoundingClientRect()
  const mapWidth = mapInner.value.clientWidth
  const mapHeight = mapInner.value.clientHeight

  // 计算初始缩放比例，确保地图填满容器
  const scaleX = containerRect.width / mapWidth
  const scaleY = containerRect.height / mapHeight
  const initialScale = Math.max(scaleX, scaleY)

  // 应用初始缩放和居中
  mapScale.value = initialScale
  mapTranslateX.value = 0
  mapTranslateY.value = 0

  // 更新地图尺寸
  mapSize.value = {
    width: mapWidth,
    height: mapHeight,
  }
}

// 重置地图视图
const resetMapView = () => {
  // 调用初始化函数恢复默认状态
  initMapState()

  // 应用平滑过渡效果
  if (mapInner.value) {
    mapInner.value.style.transition = 'transform 0.3s ease-out'

    // 过渡结束后移除transition属性
    setTimeout(() => {
      if (mapInner.value) {
        mapInner.value.style.transition = ''
      }
    }, 300)
  }
}

// 滚轮缩放功能
const handleWheel = (e: WheelEvent) => {
  e.preventDefault()

  // 当惯性滚动激活时取消它
  if (isInertiaActive.value && inertiaFrame.value !== null) {
    cancelAnimationFrame(inertiaFrame.value)
    isInertiaActive.value = false
  }

  // 计算缩放比例增量
  const delta = e.deltaY ? -e.deltaY : e.detail || 0
  const scaleFactor = delta > 0 ? 1.1 : 1 / 1.1

  // 获取容器尺寸
  const containerRect = mapContainer.value?.getBoundingClientRect()
  if (!containerRect || !mapInner.value) return

  // 计算最小缩放比例，确保地图至少填满容器
  const minScaleX = containerRect.width / mapInner.value.clientWidth
  const minScaleY = containerRect.height / mapInner.value.clientHeight
  const minScale = Math.max(minScaleX, minScaleY, 0.5) // 最小不低于0.5

  // 相对于视口的鼠标位置
  const mouseX = e.clientX
  const mouseY = e.clientY

  // 计算鼠标位置相对于地图内部的位置
  const containerX = mouseX - containerRect.left
  const containerY = mouseY - containerRect.top

  // 计算鼠标在原始地图上的位置（考虑当前的变换）
  const mapX = (containerX - mapTranslateX.value) / mapScale.value
  const mapY = (containerY - mapTranslateY.value) / mapScale.value

  // 计算新的缩放比例，限制最大最小值
  const newScale = Math.min(Math.max(mapScale.value * scaleFactor, minScale), 3)

  // 应用新缩放比例
  if (newScale !== mapScale.value) {
    // 计算新的平移，保持鼠标下方的点不变
    const newTranslateX = containerX - mapX * newScale
    const newTranslateY = containerY - mapY * newScale

    // 更新状态
    mapScale.value = newScale
    mapTranslateX.value = newTranslateX
    mapTranslateY.value = newTranslateY

    // 检查边界
    checkMapBounds()
  }
}

// 路线显示控制
const showRouteLine = ref(false)

// 切换路线显示状态
const toggleRouteLine = () => {
  showRouteLine.value = !showRouteLine.value
}

// 计算路线点位置
const getRoutePoints = () => {
  if (!props.planItems || !props.planItems.items.length) return []

  // 根据sortOrder排序
  const sortedItems = [...props.planItems.items].sort((a, b) => a.sortOrder - b.sortOrder)

  // 获取每个点的位置信息
  return sortedItems
    .map((item) => {
      // 根据类型和originalId找到对应的数据项
      let targetItem = null

      if (item.type === 'hotel') {
        targetItem = props.hotels.find((h) => h.id === item.originalId)
      } else if (item.type === 'spot') {
        targetItem = props.spots.find((s) => s.id === item.originalId)
      } else if (item.type === 'transportation') {
        targetItem = props.transportations.find((t) => t.id === item.originalId)
      }

      if (targetItem && targetItem.position) {
        // 获取准确位置
        return {
          x: targetItem.position.x,
          y: targetItem.position.y,
          type: item.type,
          id: item.originalId,
        }
      }
      return null
    })
    .filter(Boolean) // 过滤掉无效项
}

// 计算箭头路径
const calculateRoutePath = (): RoutePathResult => {
  const points = getRoutePoints()
  if (points.length < 2) return { path: '', labels: [] }

  // 生成SVG路径
  let path = ''
  // 保存路径点的标签位置
  const labels: LabelPoint[] = []

  // 视觉中心偏移校正 - 向上调整一点以匹配图标真实视觉中心
  const visualCenterOffsetY = -1.2 // 向上偏移1.2个单位

  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i]
    const next = points[i + 1]

    // 确保current和next不为null
    if (!current || !next) continue

    // 应用视觉中心校正
    const startX = current.x
    const startY = current.y + visualCenterOffsetY
    const endX = next.x
    const endY = next.y + visualCenterOffsetY

    // 使用直线路径 - 连接校正后的中心点
    if (i === 0) {
      path += `M${startX},${startY}`
    }
    path += ` L${endX},${endY}`

    // 保存原始标记位置用于显示数字和标记点，但路径连接使用校正后的点
    if (i === 0) {
      labels.push({
        x: current.x,
        y: current.y + visualCenterOffsetY, // 应用视觉中心校正
        originalY: current.y, // 保存原始Y坐标用于标记显示
        number: 1,
      })
    }

    labels.push({
      x: next.x,
      y: next.y + visualCenterOffsetY, // 应用视觉中心校正
      originalY: next.y, // 保存原始Y坐标用于标记显示
      number: i + 2,
    })
  }

  return { path, labels }
}

// 添加计算属性
const routePathData = computed(() => calculateRoutePath())

// 搜索框相关变量
const searchQuery = ref('')
const isSearchFocused = ref(false)

// 处理搜索输入
const handleSearchInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  searchQuery.value = target.value
  // 这里可以后续添加搜索功能
  console.log('搜索内容:', searchQuery.value)
}

// 处理搜索框焦点事件
const handleSearchFocus = () => {
  isSearchFocused.value = true
}

const handleSearchBlur = () => {
  isSearchFocused.value = false
}

// 清空搜索
const clearSearch = () => {
  searchQuery.value = ''
}

// 监听事件和清理
onMounted(() => {
  if (mapContainer.value) {
    // 使用被动事件监听器提高性能
    mapContainer.value.addEventListener('touchstart', handleTouchStart, { passive: true })
    mapContainer.value.addEventListener('touchmove', handleTouchMove, { passive: true })
    mapContainer.value.addEventListener('touchend', handleTouchEnd, { passive: true })
    mapContainer.value.addEventListener('touchcancel', handleTouchEnd, { passive: true })
    mapContainer.value.addEventListener('wheel', handleWheel, { passive: false })

    // 初始化地图状态
    // 延迟一帧确保DOM渲染完成
    requestAnimationFrame(() => {
      initMapState()
    })
  }
})

onBeforeUnmount(() => {
  if (mapContainer.value) {
    mapContainer.value.removeEventListener('touchstart', handleTouchStart)
    mapContainer.value.removeEventListener('touchmove', handleTouchMove)
    mapContainer.value.removeEventListener('touchend', handleTouchEnd)
    mapContainer.value.removeEventListener('touchcancel', handleTouchEnd)
    mapContainer.value.removeEventListener('wheel', handleWheel)
  }

  if (inertiaFrame.value !== null) {
    cancelAnimationFrame(inertiaFrame.value)
  }
})
</script>

<template>
  <div class="left-panel">
    <!-- 左上角的折叠按钮控件 -->
    <div class="control-panel">
      <FoldingButton @filter-change="$emit('filterChange', $event)" />
      <button
        v-if="mapScale !== 1"
        class="reset-map-btn"
        @click="resetMapView"
        aria-label="重置地图"
      >
        <svg viewBox="0 0 24 24" width="24" height="24">
          <path
            fill="currentColor"
            d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"
          />
        </svg>
      </button>
    </div>

    <!-- 地图容器 -->
    <div class="map-container" @click="$emit('clearSelection')" ref="mapContainer">
      <!-- 右上角搜索框 -->
      <div class="search-panel">
        <div class="search-box" :class="{ 'search-focused': isSearchFocused }">
          <svg class="search-icon" viewBox="0 0 24 24" width="18" height="18">
            <path
              fill="currentColor"
              d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z"
            />
          </svg>
          <input
            type="text"
            v-model="searchQuery"
            placeholder="搜索酒店、景点、交通..."
            class="search-input"
            @input="handleSearchInput"
            @focus="handleSearchFocus"
            @blur="handleSearchBlur"
          />
          <button v-if="searchQuery" class="clear-search-btn" @click="clearSearch">
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path
                fill="currentColor"
                d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"
              />
            </svg>
          </button>
        </div>
      </div>

      <!-- 地图背景 -->
      <div
        class="map-inner"
        ref="mapInner"
        :style="{
          transform: `scale(${mapScale}) translate(${mapTranslateX / mapScale}px, ${mapTranslateY / mapScale}px)`,
          touchAction: isPinching || isMoving ? 'none' : 'auto',
        }"
      >
        <div class="map-background"></div>

        <!-- 路线绘制层 - 通过SVG实现 -->
        <svg
          v-if="showRouteLine"
          class="route-line-layer"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <!-- 背景路径 -->
          <path :d="routePathData.path" class="route-path-shadow" fill="none" stroke-width="1.8" />
          <!-- 主路径 -->
          <path :d="routePathData.path" class="route-path" fill="none" stroke-width="1.4" />
          <!-- 虚线装饰效果 -->
          <path
            :d="routePathData.path"
            class="route-path-dash"
            fill="none"
            stroke-width="0.7"
            stroke-dasharray="1,1.5"
          />
          <!-- 标记点 - 使用原始位置显示数字标记 -->
          <g v-for="(label, index) in routePathData.labels" :key="index">
            <!-- 外圈光晕 -->
            <circle :cx="label.x" :cy="label.originalY" r="2" class="route-point-glow" />
            <!-- 主圆圈 -->
            <circle
              :cx="label.x"
              :cy="label.originalY"
              r="1.3"
              class="route-point-marker"
              stroke="#fff"
              stroke-width="0.2"
            />
            <!-- 线条连接点指示 - 显示在校正后的位置 -->
            <circle :cx="label.x" :cy="label.y" r="0.4" class="route-point-center" />
            <!-- 序号文本 - 使用原始位置 -->
            <text
              :x="label.x"
              :y="label.originalY"
              text-anchor="middle"
              dominant-baseline="central"
              class="route-point-text"
            >
              {{ label.number }}
            </text>
          </g>
        </svg>

        <!-- 酒店标记 -->
        <MapMarker
          v-if="showHotels"
          v-for="hotel in hotels"
          :key="`hotel-${hotel.id}`"
          type="hotel"
          :item="hotel"
          :is-selected="isItemSelected('hotel', hotel.id)"
          @toggle-select="handleMarkerToggle"
          @start-drag="handleMarkerDrag"
          @add-to-plan="handleAddToPlan"
        />

        <!-- 景点标记 -->
        <MapMarker
          v-if="showSpots"
          v-for="spot in spots"
          :key="`spot-${spot.id}`"
          type="spot"
          :item="spot"
          :is-selected="isItemSelected('spot', spot.id)"
          @toggle-select="handleMarkerToggle"
          @start-drag="handleMarkerDrag"
          @add-to-plan="handleAddToPlan"
        />

        <!-- 交通标记 -->
        <MapMarker
          v-if="showTransportation"
          v-for="transportation in transportations"
          :key="`transportation-${transportation.id}`"
          type="transportation"
          :item="transportation"
          :is-selected="isItemSelected('transportation', transportation.id)"
          @toggle-select="handleMarkerToggle"
          @start-drag="handleMarkerDrag"
          @add-to-plan="handleAddToPlan"
        />
      </div>

      <!-- 地图控制说明 -->
      <div class="map-controls-info" v-if="mapScale !== 1">
        <div class="control-tip">双指缩放 | 单指平移</div>
      </div>

      <!-- 路线显示控制按钮 -->
      <button
        class="route-control-btn"
        @click="toggleRouteLine"
        :class="{ 'route-active': showRouteLine }"
      >
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path
            fill="currentColor"
            d="M3,11H5V13H3V11M11,5H13V9H11V5M9,11H13V15H11V13H9V11M15,11H17V13H19V11H21V13H19V15H21V19H19V21H17V19H13V17H15V15H17V13H15V11M19,19V15H17V19H19Z"
          />
        </svg>
        <span>路线</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.left-panel {
  flex: 2;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.map-container {
  flex: 1;
  position: relative;
  overflow: hidden; /* 防止地图内容溢出容器 */
  background-color: #f5f5f5;
  border-radius: 12px;
  box-shadow: inset 0 0 15px rgba(0, 0, 0, 0.12);
  touch-action: none; /* 防止浏览器默认的触摸行为 */
  height: 100%;
  width: 100%;
  /* 提升性能 */
  will-change: transform;
  -webkit-overflow-scrolling: touch;
}

.map-inner {
  position: absolute;
  width: 100%;
  height: 100%;
  transform-origin: center center; /* 以中心为基准进行变换 */
  will-change: transform; /* 优化性能 */
  display: flex;
  align-items: center;
  justify-content: center;
  /* 添加平滑过渡 */
  transition: transform 0.1s ease-out;
}

.map-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: url('@/assets/map-background.jpg');
  background-size: cover;
  background-position: center;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
}

.control-panel {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 10;
  display: flex;
  gap: 12px;
}

/* 搜索框面板样式 */
.search-panel {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 10;
}

.search-box {
  display: flex;
  align-items: center;
  background-color: white;
  border-radius: 25px;
  padding: 8px 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
  border: 2px solid transparent;
  width: 280px;
  max-width: calc(100vw - 100px);
}

.search-box.search-focused {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  border-color: #3399ff;
  transform: translateY(-1px);
}

.search-icon {
  color: #666;
  margin-right: 8px;
  flex-shrink: 0;
  transition: color 0.2s;
}

.search-focused .search-icon {
  color: #3399ff;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 14px;
  color: #333;
  background: transparent;
  min-width: 0;
}

.search-input::placeholder {
  color: #999;
  transition: color 0.2s;
}

.search-focused .search-input::placeholder {
  color: #bbb;
}

.clear-search-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  margin-left: 8px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  transition: all 0.2s;
  flex-shrink: 0;
}

.clear-search-btn:hover {
  background-color: #f0f0f0;
  color: #333;
}

.clear-search-btn:active {
  transform: scale(0.95);
}

.reset-map-btn {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background-color: white;
  border: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.reset-map-btn:hover {
  background-color: #f5f5f5;
  transform: scale(1.05);
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.3);
}

.reset-map-btn:active {
  background-color: #e0e0e0;
  transform: scale(0.95);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}

.map-controls-info {
  position: absolute;
  bottom: 15px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  opacity: 0.9;
  transition: opacity 0.3s;
  pointer-events: none;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.control-tip {
  white-space: nowrap;
  font-weight: 500;
}

/* 媒体查询 */
@media (max-width: 768px) {
  .map-controls-info {
    font-size: 12px;
    padding: 5px 12px;
    bottom: 12px;
  }

  .control-panel {
    top: 10px;
    left: 10px;
    gap: 10px;
  }

  .reset-map-btn {
    width: 38px;
    height: 38px;
  }

  /* 移动端搜索框样式 */
  .search-panel {
    top: 10px;
    right: 10px;
  }

  .search-box {
    width: 240px;
    max-width: calc(100vw - 80px);
    padding: 6px 12px;
  }

  .search-input {
    font-size: 13px;
  }
}

@media (prefers-color-scheme: dark) {
  .map-background {
    background-color: #1a2639;
    background-image:
      linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
  }

  .map-container {
    background-color: #121212;
    box-shadow: inset 0 0 15px rgba(0, 0, 0, 0.3);
  }

  .reset-map-btn {
    background-color: #333;
    color: #eee;
  }

  .reset-map-btn:hover {
    background-color: #444;
  }

  .reset-map-btn:active {
    background-color: #222;
  }

  .map-controls-info {
    background-color: rgba(0, 0, 0, 0.7);
  }

  /* 暗色模式搜索框样式 */
  .search-box {
    background-color: #2d2d2d;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }

  .search-box.search-focused {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    border-color: #4488ff;
  }

  .search-icon {
    color: #aaa;
  }

  .search-focused .search-icon {
    color: #4488ff;
  }

  .search-input {
    color: #eee;
  }

  .search-input::placeholder {
    color: #777;
  }

  .search-focused .search-input::placeholder {
    color: #999;
  }

  .clear-search-btn {
    color: #aaa;
  }

  .clear-search-btn:hover {
    background-color: #404040;
    color: #eee;
  }

  /* 暗色模式路线控制按钮样式 */
  .route-control-btn {
    background-color: #333;
    color: #eee;
  }

  .route-control-btn.route-active {
    background-color: #2ecc71;
    color: white;
    box-shadow: 0 3px 12px rgba(46, 204, 113, 0.3);
  }

  .route-path {
    stroke: #2ecc71;
  }

  .route-path-shadow {
    stroke: rgba(0, 0, 0, 0.4);
  }

  .route-path-dash {
    stroke: rgba(255, 255, 255, 0.5);
  }

  .route-point-glow {
    fill: rgba(46, 204, 113, 0.3);
  }

  .route-point-marker {
    fill: #2ecc71;
  }
}

/* 路线图层样式 */
.route-line-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 5;
  transform-origin: top left;
}

/* 路径主线样式 */
.route-path {
  stroke: #2ecc71;
  stroke-linecap: round;
  stroke-linejoin: round;
  filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.1));
}

/* 路径阴影效果 */
.route-path-shadow {
  stroke: rgba(0, 0, 0, 0.15);
  stroke-linecap: round;
  stroke-linejoin: round;
  filter: blur(0.8px);
}

/* 路径虚线装饰 */
.route-path-dash {
  stroke: rgba(255, 255, 255, 0.9);
  stroke-linecap: round;
  stroke-linejoin: round;
  opacity: 0.8;
}

/* 标记点光晕效果 */
.route-point-glow {
  fill: rgba(46, 204, 113, 0.25);
  filter: blur(0.4px);
}

/* 标记点样式 */
.route-point-marker {
  fill: #2ecc71;
  filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.2));
}

/* 文本样式 */
.route-point-text {
  fill: white;
  font-size: 0.9px;
  font-weight: bold;
  user-select: none;
  filter: drop-shadow(0 0.2px 0.2px rgba(0, 0, 0, 0.3));
}

/* 路线控制按钮样式优化 */
.route-control-btn {
  position: absolute;
  bottom: 15px;
  right: 15px;
  background-color: white;
  border: none;
  border-radius: 20px;
  display: flex;
  align-items: center;
  padding: 6px 12px;
  gap: 5px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  transition: all 0.2s;
  z-index: 10;
  font-size: 13px;
  color: #666;
}

.route-control-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.2);
}

.route-control-btn.route-active {
  background-color: #2ecc71;
  color: white;
  box-shadow: 0 3px 12px rgba(46, 204, 113, 0.3);
}

/* 添加中心点样式 */
.route-point-center {
  fill: white;
  stroke: none;
}
</style>
