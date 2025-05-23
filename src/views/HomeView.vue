<script setup lang="ts">
import { ref, watch, onMounted, provide, computed, onBeforeUnmount } from 'vue'
import type { Hotel, Spot, Transportation, TravelPlan, PlanItem } from '../types/travel'
import { hotels, spots, transportations } from '../data/mockData'
import TravelMap from '@/components/TravelMap.vue'
import PlanList from '@/components/PlanList.vue'
import DragGhost from '@/components/DragGhost.vue'
import IconHotel from '@/components/icons/IconHotel.vue'
import IconSpot from '@/components/icons/IconSpot.vue'
import IconTransportation from '@/components/icons/IconTransportation.vue'

import '../styles/homeStyles.css'

// App状态
const isLoading = ref(true)
const hasNetworkError = ref(false)
const isOnline = ref(navigator.onLine)
const hasUnsavedChanges = ref(false)
const showMobileTips = ref(true) // 控制移动端提示显示

// 控制内容的显示状态
const showHotels = ref(true)
const showSpots = ref(true)
const showTransportation = ref(true)

// 控制右侧旅游清单的折叠状态
const isPlanExpanded = ref(true)

// 切换旅游清单的显示/隐藏
const togglePlan = () => {
  isPlanExpanded.value = !isPlanExpanded.value
}

// 记录当前活跃的提示框
const activeTooltipType = ref<string | null>(null)
const activeTooltipId = ref<number | null>(null)

// 处理过滤器变化
const handleFilterChange = (payload: { type: string; selected: boolean }) => {
  // 根据类型和状态更新显示
  if (payload.type === 'hotel') {
    showHotels.value = !payload.selected
  } else if (payload.type === 'spot') {
    showSpots.value = !payload.selected
  } else if (payload.type === 'transportation') {
    showTransportation.value = !payload.selected
  }
}

// 切换选择状态
const toggleSelectItem = (type: string, item: Hotel | Spot | Transportation, event?: Event) => {
  // 阻止事件冒泡，防止触发地图的点击事件
  event?.stopPropagation()

  // 确保 item 不是 undefined
  if (!item) {
    console.error('toggleSelectItem 收到了 undefined 项目')
    return
  }

  const itemId = item.id
  console.log('toggleSelectItem 被调用:', type, itemId, item)

  // 如果点击的是已经选中的图标，则清除选中状态
  if (activeTooltipType.value === type && activeTooltipId.value === itemId) {
    activeTooltipType.value = null
    activeTooltipId.value = null
    console.log('已取消选中:', type, itemId)
    return
  }

  // 选中当前点击的图标
  activeTooltipType.value = type
  activeTooltipId.value = itemId
  console.log('已选中:', type, itemId, '当前状态:', activeTooltipType.value, activeTooltipId.value)
}

// 拖拽相关状态
const isDragging = ref(false)
const draggedItem = ref<Hotel | Spot | Transportation | null>(null)
const draggedItemType = ref<string | null>('hotel') // 初始给一个默认值，避免类型检查错误
const dragPosition = ref({ x: 0, y: 0 })
const dragOffset = ref({ x: 0, y: 0 })

// 旅游清单
const planItems = ref<TravelPlan>({
  items: [],
})

// 生成唯一ID和获取下一个排序顺序
const getNextSortOrder = () => {
  return planItems.value.items.length > 0
    ? Math.max(...planItems.value.items.map((item) => item.sortOrder)) + 1
    : 0
}

// 检测是否为移动设备
const isMobileDevice = ref(false)
// 用户是否已经与页面交互的标记
const userHasInteracted = ref(false)

// 记录用户交互状态
const markUserInteraction = () => {
  userHasInteracted.value = true
}

// 提供视觉反馈的函数
const provideVisualFeedback = () => {
  try {
    // 检查是否已存在反馈元素
    const existingFeedback = document.querySelector('.visual-feedback')
    if (existingFeedback) {
      return // 避免创建多个反馈元素
    }

    // 创建临时元素显示反馈
    const feedback = document.createElement('div')
    feedback.className = 'visual-feedback'
    document.body.appendChild(feedback)

    // 0.5秒后移除
    setTimeout(() => {
      if (feedback.parentNode) {
        feedback.parentNode.removeChild(feedback)
      }
    }, 500)
  } catch (error) {
    console.error('提供视觉反馈时出错:', error)
  }
}

// 将函数提供给子组件
provide('markUserInteraction', markUserInteraction)
provide('userHasInteracted', userHasInteracted)
provide('provideVisualFeedback', provideVisualFeedback)

// App状态持久化
const persistAppState = () => {
  try {
    const stateToSave = {
      planItems: planItems.value,
      lastSaved: new Date().toISOString(),
    }
    localStorage.setItem('travel-plan', JSON.stringify(stateToSave))
    hasUnsavedChanges.value = false
    console.log('旅行计划已保存到本地存储')
  } catch (e) {
    console.error('保存到本地存储失败:', e)
  }
}

// 自动保存计划（使用去抖动处理）
let saveTimeout: number | null = null
const debouncedSave = () => {
  hasUnsavedChanges.value = true

  if (saveTimeout) {
    clearTimeout(saveTimeout)
  }

  saveTimeout = window.setTimeout(() => {
    persistAppState()
  }, 3000) // 3秒后自动保存
}

// 保存计划到localStorage - 简化版本，避免重复逻辑
const saveToLocalStorage = () => {
  // 只设置标记，实际保存由 debouncedSave 完成
  hasUnsavedChanges.value = true
  debouncedSave()
}

// 监听计划变化，自动保存
watch(
  () => planItems.value,
  () => {
    debouncedSave()
  },
  { deep: true },
)

// 网络状态变化处理
const handleNetworkChange = () => {
  isOnline.value = navigator.onLine

  if (isOnline.value && hasUnsavedChanges.value) {
    // 重新联网时，尝试将本地数据同步到服务器（未来功能）
    persistAppState()
  }
}

// 开始拖拽
const startDrag = (
  type: string,
  item: Hotel | Spot | Transportation,
  event: MouseEvent | TouchEvent,
) => {
  // 确保 item 不是 undefined
  if (!item) {
    console.error('startDrag 收到了 undefined 项目')
    return
  }

  // 记录用户已交互
  markUserInteraction()

  // 阻止事件冒泡和默认行为
  event.stopPropagation()
  event.preventDefault()

  // 记录被拖拽的项目
  draggedItem.value = item
  draggedItemType.value = type
  isDragging.value = true

  // 对于长按触发的拖拽，由于没有实际的触摸位置，
  // 我们使用标记在屏幕上的位置作为初始拖拽位置
  const markerId = `marker-${type}-${item.id}`
  const markerElement = document.getElementById(markerId)

  let clientX: number, clientY: number
  let rect: DOMRect

  // 获取标记元素的位置
  if (markerElement) {
    rect = markerElement.getBoundingClientRect()

    // 如果是触摸事件且有有效的触摸位置
    if ('touches' in event && event.touches.length > 0) {
      clientX = event.touches[0].clientX
      clientY = event.touches[0].clientY
    } else if ('clientX' in event) {
      // 鼠标事件
      clientX = event.clientX
      clientY = event.clientY
    } else {
      // 没有事件坐标，使用标记中心位置
      clientX = rect.left + rect.width / 2
      clientY = rect.top + rect.height / 2
    }

    // 记录鼠标/触摸点与元素左上角的偏移量
    dragOffset.value = {
      x: clientX - rect.left,
      y: clientY - rect.top,
    }

    // 设置初始拖拽位置
    dragPosition.value = {
      x: clientX - dragOffset.value.x,
      y: clientY - dragOffset.value.y,
    }

    // 提供视觉反馈
    provideVisualFeedback()

    // 添加移动和结束事件监听器
    document.addEventListener('mousemove', handleDragMove)
    document.addEventListener('touchmove', handleDragMove, { passive: false })
    document.addEventListener('mouseup', handleDragEnd)
    document.addEventListener('touchend', handleDragEnd, { passive: true })
  } else {
    console.error('无法找到标记元素:', markerId)
    isDragging.value = false
    draggedItem.value = null
    draggedItemType.value = null
  }
}

// 处理拖拽移动
const handleDragMove = (event: MouseEvent | TouchEvent) => {
  if (!isDragging.value || !draggedItem.value) return

  let clientX: number, clientY: number

  // 兼容鼠标事件和触摸事件
  if ('touches' in event && event.touches.length > 0) {
    clientX = event.touches[0].clientX
    clientY = event.touches[0].clientY
    // 防止页面滚动
    event.preventDefault()
  } else if ('clientX' in event && 'clientY' in event) {
    clientX = event.clientX
    clientY = event.clientY
  } else {
    // 无法获取位置数据，忽略此次移动
    return
  }

  // 更新拖拽位置
  dragPosition.value = {
    x: clientX - dragOffset.value.x,
    y: clientY - dragOffset.value.y,
  }
}

// 处理拖拽结束
const handleDragEnd = (event: MouseEvent | TouchEvent) => {
  if (!isDragging.value) return

  try {
    // 检查是否拖拽到了旅游清单区域
    const rightPanel = document.querySelector('.right-panel') as HTMLElement
    if (rightPanel) {
      const rect = rightPanel.getBoundingClientRect()
      let clientX: number, clientY: number

      // 兼容鼠标事件和触摸事件
      if ('changedTouches' in event && event.changedTouches.length > 0) {
        clientX = event.changedTouches[0].clientX
        clientY = event.changedTouches[0].clientY
      } else if ('clientX' in event) {
        clientX = event.clientX
        clientY = event.clientY
      } else {
        // 无法获取位置信息，结束处理
        return
      }

      // 判断释放位置是否在旅游清单区域内
      if (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom &&
        draggedItem.value
      ) {
        // 添加到旅游清单
        addToPlan()
      }
    }
  } catch (error) {
    console.error('拖拽结束处理出错:', error)
  } finally {
    // 重置拖拽状态
    isDragging.value = false
    draggedItemType.value = 'hotel' // 重置为默认值
    draggedItem.value = null

    // 移除事件监听器
    document.removeEventListener('mousemove', handleDragMove)
    document.removeEventListener('touchmove', handleDragMove)
    document.removeEventListener('mouseup', handleDragEnd)
    document.removeEventListener('touchend', handleDragEnd)
  }
}

// 直接添加项目到行程(从地图标记)
const addItemToPlan = (type: string, item: Hotel | Spot | Transportation) => {
  try {
    // 验证类型是否有效
    if (!['hotel', 'spot', 'transportation'].includes(type)) {
      console.warn('无效的项目类型:', type)
      return
    }

    // 创建一个新的计划项
    const newPlanItem: PlanItem = {
      id: `${type}-${item.id}-${Date.now()}`, // 使用时间戳确保唯一性
      type: type as 'hotel' | 'spot' | 'transportation',
      originalId: item.id,
      sortOrder: getNextSortOrder(),
      data: item,
    }

    // 添加到数组中
    planItems.value.items.push(newPlanItem)

    // 提供视觉反馈
    provideVisualFeedback()

    // 保存到本地存储
    saveToLocalStorage()

    console.log('已直接添加到行程:', type, item.id)
  } catch (error) {
    console.error('添加项目时出错:', error)
  }
}

// 添加项目到旅游清单
const addToPlan = () => {
  if (!draggedItem.value || !draggedItemType.value) {
    console.warn('无法添加项目：拖拽信息不完整')
    return
  }

  try {
    const item = draggedItem.value
    const type = draggedItemType.value

    // 验证类型是否有效
    if (!['hotel', 'spot', 'transportation'].includes(type)) {
      console.warn('无效的项目类型:', type)
      return
    }

    // 创建一个新的计划项，允许重复添加
    const newPlanItem: PlanItem = {
      id: `${type}-${item.id}-${Date.now()}`, // 使用时间戳确保唯一性
      type: type as 'hotel' | 'spot' | 'transportation',
      originalId: item.id,
      sortOrder: getNextSortOrder(),
      data: item,
    }

    // 添加到数组中
    planItems.value.items.push(newPlanItem)

    // 添加项目时提供成功反馈
    provideVisualFeedback()

    // 保存到本地存储
    saveToLocalStorage()
  } catch (error) {
    console.error('添加项目时出错:', error)
  }
}

// 从旅游清单中移除项目
const removeFromPlan = (id: string) => {
  planItems.value.items = planItems.value.items.filter((item) => item.id !== id)
  // 保存到本地存储
  saveToLocalStorage()
}

// 更新计划项排序
const updatePlanItemOrder = (newOrder: string[]) => {
  // 根据新的顺序ID数组更新排序值
  newOrder.forEach((id, index) => {
    const item = planItems.value.items.find((item) => item.id === id)
    if (item) {
      item.sortOrder = index
    }
  })
  // 对数组排序
  planItems.value.items.sort((a, b) => a.sortOrder - b.sortOrder)

  // 保存到本地存储
  saveToLocalStorage()
}

// 清空旅游清单
const clearPlan = () => {
  planItems.value.items = []
  // 保存到本地存储
  saveToLocalStorage()
}

// 保存计划
const savePlan = () => {
  // 使用优化后的持久化函数保存数据
  persistAppState()

  // 提供视觉反馈
  const saveButton = document.querySelector('.save-btn') as HTMLElement
  if (saveButton) {
    const originalText = saveButton.textContent
    const originalBackground = saveButton.style.backgroundColor

    saveButton.textContent = '✓ 已保存'
    saveButton.style.backgroundColor = '#45a049'

    // 2秒后恢复按钮原始状态
    setTimeout(() => {
      saveButton.textContent = originalText
      saveButton.style.backgroundColor = originalBackground
    }, 2000)
  }
}

// 清除地图上所有标记的选中状态
const clearSelection = () => {
  activeTooltipType.value = null
  activeTooltipId.value = null
}

// 添加页面重载方法
const reloadPage = () => {
  window.location.reload()
}

// 监听触摸触发事件
const handleTouchStart = (e: TouchEvent) => {
  // 触摸处理逻辑...
}

// 清单和非清单项目的分类计数
const itemCounts = computed(() => {
  return {
    hotels: planItems.value.items.filter((item) => item.type === 'hotel').length,
    spots: planItems.value.items.filter((item) => item.type === 'spot').length,
    transportation: planItems.value.items.filter((item) => item.type === 'transportation').length,
  }
})

// 应用初始化
onMounted(async () => {
  // 显示加载状态
  isLoading.value = true

  try {
    // 模拟从API加载数据的过程
    await new Promise((resolve) => setTimeout(resolve, 500))

    // 检测触摸能力
    isMobileDevice.value = 'ontouchstart' in window || navigator.maxTouchPoints > 0

    // 设置移动端提示15秒后自动隐藏
    if (isMobileDevice.value) {
      setTimeout(() => {
        showMobileTips.value = false
      }, 15000)
    }

    // 初始化拖拽区域
    const mapContainer = document.querySelector('.map-container')
    if (mapContainer) {
      // 禁用上下文菜单，而不是使用preventDefault
      mapContainer.addEventListener('contextmenu', (e) => e.preventDefault(), { passive: false })
      mapContainer.addEventListener('touchstart', handleTouchStart as EventListener, {
        passive: true,
      })
    }

    // 添加全局用户交互监听 - 使用捕获阶段确保最早捕获用户交互
    const markInteraction = () => {
      userHasInteracted.value = true
      console.log('用户已交互，启用振动功能')
    }

    document.addEventListener('touchstart', markInteraction as EventListener, {
      once: true,
      passive: true,
      capture: true,
    })

    // 特别为移动设备添加触摸监听
    if (isMobileDevice.value) {
      document.body.addEventListener(
        'touchstart',
        () => {
          userHasInteracted.value = true
        },
        { once: true, passive: true },
      )
    }

    // 添加离线状态监听
    window.addEventListener('online', handleNetworkChange)
    window.addEventListener('offline', handleNetworkChange)

    // 尝试从本地存储加载保存的旅游计划
    try {
      const savedData = localStorage.getItem('travel-plan')
      if (savedData) {
        const parsed = JSON.parse(savedData)

        // 处理新版本数据格式
        if (parsed.planItems?.items) {
          planItems.value = parsed.planItems
        }
        // 处理旧版本数据格式
        else if (parsed.items) {
          planItems.value = parsed
        }
        // 处理更早的数据格式
        else if (parsed.hotels || parsed.spots || parsed.transportations) {
          // 将旧格式转换为新格式
          const newItems: PlanItem[] = []
          let sortOrder = 0

          parsed.hotels?.forEach((hotel: Hotel) => {
            newItems.push({
              id: `hotel-${hotel.id}-${Date.now() + sortOrder}`,
              type: 'hotel',
              originalId: hotel.id,
              sortOrder: sortOrder++,
              data: hotel,
            })
          })

          parsed.spots?.forEach((spot: Spot) => {
            newItems.push({
              id: `spot-${spot.id}-${Date.now() + sortOrder}`,
              type: 'spot',
              originalId: spot.id,
              sortOrder: sortOrder++,
              data: spot,
            })
          })

          parsed.transportations?.forEach((trans: Transportation) => {
            newItems.push({
              id: `transportation-${trans.id}-${Date.now() + sortOrder}`,
              type: 'transportation',
              originalId: trans.id,
              sortOrder: sortOrder++,
              data: trans,
            })
          })

          planItems.value.items = newItems
        }
      }
    } catch (e) {
      console.error('从本地存储加载失败:', e)
    }
  } catch (error) {
    console.error('初始化失败:', error)
    hasNetworkError.value = true
  } finally {
    // 加载状态隐藏时添加动画
    setTimeout(() => {
      isLoading.value = false
    }, 800)
  }
})

// 组件卸载前清理
onBeforeUnmount(() => {
  // 卸载前保存状态
  persistAppState()

  // 移除事件监听器
  window.removeEventListener('online', handleNetworkChange)
  window.removeEventListener('offline', handleNetworkChange)

  // 清理任何定时器
  if (saveTimeout) {
    clearTimeout(saveTimeout)
  }
})
</script>

<template>
  <div class="home">
    <!-- 加载状态 -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <p>加载中...</p>
    </div>

    <!-- 离线状态提示 -->
    <div v-if="!isOnline" class="offline-notice">
      <span>网络连接不可用，当前使用本地数据</span>
    </div>

    <!-- 网络错误提示 -->
    <div v-if="hasNetworkError" class="error-notice">
      <span>加载数据时出现问题</span>
      <button @click="reloadPage">重试</button>
    </div>

    <!-- 左栏：地图上显示景点、酒店和交通 -->
    <TravelMap
      :hotels="hotels"
      :spots="spots"
      :transportations="transportations"
      :show-hotels="showHotels"
      :show-spots="showSpots"
      :show-transportation="showTransportation"
      :active-tooltip-type="activeTooltipType"
      :active-tooltip-id="activeTooltipId"
      :plan-items="planItems"
      @filter-change="handleFilterChange"
      @toggle-select-item="toggleSelectItem"
      @start-drag="startDrag"
      @clear-selection="clearSelection"
      @add-item-to-plan="addItemToPlan"
    />

    <!-- 右栏：旅游清单 -->
    <PlanList
      :plan-items="planItems"
      :is-expanded="isPlanExpanded"
      @toggle-plan="togglePlan"
      @remove-item="removeFromPlan"
      @clear-plan="clearPlan"
      @save-plan="savePlan"
      @update-order="updatePlanItemOrder"
    />

    <!-- 拖拽虚影 -->
    <DragGhost
      :type="draggedItemType as 'hotel' | 'spot' | 'transportation'"
      :position="dragPosition"
      :is-dragging="isDragging"
    >
      <IconHotel v-if="draggedItemType === 'hotel'" />
      <IconSpot v-if="draggedItemType === 'spot'" />
      <IconTransportation v-if="draggedItemType === 'transportation'" />
    </DragGhost>

    <!-- 移动端操作提示 -->
    <div v-if="isMobileDevice && showMobileTips" class="mobile-tips">
      <button class="close-tips-btn" @click="showMobileTips = false">×</button>
      <p>点击图标：查看详情</p>
      <p>长按图标：拖拽到清单</p>
      <p>长按清单项：调整顺序</p>
    </div>
  </div>
</template>

<style>
/* 移动端操作提示 */
.mobile-tips {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: rgba(76, 175, 80, 0.9);
  color: white;
  padding: 10px;
  font-size: 14px;
  text-align: center;
  z-index: 1000;
  display: flex;
  justify-content: space-around;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.2);
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.close-tips-btn {
  position: absolute;
  top: 5px;
  right: 10px;
  background: none;
  border: none;
  color: white;
  font-size: 18px;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.8;
}

.close-tips-btn:hover {
  opacity: 1;
}

/* 加载状态 */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.9);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #4caf50;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* 离线提示 */
.offline-notice {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background-color: rgba(255, 152, 0, 0.9);
  color: white;
  padding: 8px;
  font-size: 13px;
  text-align: center;
  z-index: 2000;
}

/* 错误提示 */
.error-notice {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background-color: rgba(244, 67, 54, 0.9);
  color: white;
  padding: 8px;
  font-size: 13px;
  text-align: center;
  z-index: 2000;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
}

.error-notice button {
  background-color: white;
  border: none;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  cursor: pointer;
  color: #f44336;
}

/* 移动设备优化样式 */
@media (max-width: 768px) {
  /* 这里可以添加移动设备特有的样式 */
}

/* 支持暗模式 */
@media (prefers-color-scheme: dark) {
  .loading-overlay {
    background-color: rgba(18, 18, 18, 0.9);
  }

  .loading-overlay p {
    color: #e0e0e0;
  }

  .loading-spinner {
    border: 3px solid #333333;
    border-top: 3px solid #4caf50;
  }
}

.mobile-tips p {
  margin: 0;
  padding: 5px 0;
}

@media (min-width: 769px) {
  .mobile-tips {
    display: none;
  }
}

.visual-feedback {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(76, 175, 80, 0.15);
  z-index: 9000;
  pointer-events: none;
  animation: flashFeedback 0.5s ease-out;
}

@keyframes flashFeedback {
  0% {
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}
</style>
