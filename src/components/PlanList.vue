<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import type { TravelPlan, PlanItem, Hotel, Spot, Transportation } from '../types/travel'
import IconHotel from './icons/IconHotel.vue'
import IconSpot from './icons/IconSpot.vue'
import IconTransportation from './icons/IconTransportation.vue'

// 添加类型断言函数
const asHotel = (data: any): Hotel => data as Hotel
const asSpot = (data: any): Spot => data as Spot
const asTransportation = (data: any): Transportation => data as Transportation

const props = defineProps<{
  planItems: TravelPlan
  isExpanded: boolean
}>()

const emit = defineEmits<{
  (e: 'togglePlan'): void
  (e: 'removeItem', id: string): void
  (e: 'clearPlan'): void
  (e: 'savePlan'): void
  (e: 'updateOrder', newOrder: string[]): void
}>()

// 拖拽排序相关变量
let draggedItem: HTMLElement | null = null
let draggedItemId: string = ''
let itemElements: HTMLElement[] = []
let touchStartY = 0
let initialY = 0
let currentIndex = -1
const isTouchDevice = ref(false)
const userHasInteracted = ref(false)

// 清空确认对话框
const showConfirm = ref(false)

const confirmClear = () => {
  if (props.planItems.items.length === 0) return
  showConfirm.value = true
}

const cancelClear = () => {
  showConfirm.value = false
}

const doClear = () => {
  emit('clearPlan')
  showConfirm.value = false
}

// 提供视觉反馈
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

// 记录用户交互状态
const markUserInteraction = () => {
  userHasInteracted.value = true
}

// 检测是否为触摸设备
const checkTouchDevice = () => {
  isTouchDevice.value = 'ontouchstart' in window || navigator.maxTouchPoints > 0
}

// 初始化拖拽功能
const initDragAndDrop = () => {
  const planItemsContainer = document.querySelector('.plan-items')
  if (!planItemsContainer) return

  // 使用requestAnimationFrame确保DOM已经完全渲染
  window.requestAnimationFrame(() => {
    // 获取所有可拖拽项
    itemElements = Array.from(planItemsContainer.querySelectorAll('.plan-item')) as HTMLElement[]

    // 根据设备类型添加不同的事件监听器
    itemElements.forEach((item) => {
      // 清除所有旧的事件监听器
      item.removeEventListener('dragstart', handleDragStart)
      item.removeEventListener('dragover', handleDragOver)
      item.removeEventListener('drop', handleDrop)
      item.removeEventListener('dragend', handleDragEnd)
      item.removeEventListener('touchstart', handleTouchStart)

      if (isTouchDevice.value) {
        // 触摸设备使用触摸事件
        item.setAttribute('draggable', 'false')
        item.addEventListener('touchstart', handleTouchStart, { passive: true })
      } else {
        // 桌面设备使用拖放API
        item.setAttribute('draggable', 'true')
        item.addEventListener('dragstart', handleDragStart)
        item.addEventListener('dragover', handleDragOver)
        item.addEventListener('drop', handleDrop)
        item.addEventListener('dragend', handleDragEnd)
      }
    })
  })
}

// 桌面拖拽事件处理 //

// 拖拽开始
const handleDragStart = (e: DragEvent) => {
  if (!e.target) return

  draggedItem = e.target as HTMLElement
  draggedItemId = draggedItem.getAttribute('data-id') || ''

  // 设置拖拽时的视觉效果
  setTimeout(() => {
    if (draggedItem) draggedItem.classList.add('dragging')
  }, 0)
}

// 拖拽经过其他元素时
const handleDragOver = (e: DragEvent) => {
  e.preventDefault()
  const target = e.target as HTMLElement
  const item = target.closest('.plan-item') as HTMLElement

  if (!item || !draggedItem || item === draggedItem) return

  // 计算是否应该放在目标项的前面或后面
  const rect = item.getBoundingClientRect()
  const y = e.clientY - rect.top
  const height = rect.height
  const isBelow = y > height / 2

  // 临时改变视觉顺序
  const container = item.parentElement
  if (container) {
    if (isBelow) {
      container.insertBefore(draggedItem, item.nextSibling)
    } else {
      container.insertBefore(draggedItem, item)
    }
  }
}

// 放置时
const handleDrop = (e: DragEvent) => {
  e.preventDefault()

  // 获取新顺序并发送更新事件
  updateItemOrder()
}

// 拖拽结束
const handleDragEnd = () => {
  if (draggedItem) {
    draggedItem.classList.remove('dragging')
    draggedItem = null

    // 获取新顺序并发送更新事件
    updateItemOrder()
  }
}

// 移动端触摸事件处理 //

// 用于记录当前腾出空位的索引
let placeholderIndex = -1

// 触摸移动
const handleTouchMove = (e: TouchEvent) => {
  if (!draggedItem || !e.touches.length) return
  e.preventDefault()

  const touch = e.touches[0]
  const clientY = touch.clientY

  // 计算拖拽距离（相对于起始触摸位置的偏移）
  const offsetY = clientY - touchStartY

  // 实时应用变换，确保拖拽项目严格跟随手指移动
  draggedItem.style.transform = `translateY(${offsetY}px)`
  draggedItem.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.2)'
  draggedItem.style.zIndex = '100'

  // 获取拖拽项目当前的位置
  const draggedRect = draggedItem.getBoundingClientRect()
  const draggedMiddle = draggedRect.top + draggedRect.height / 2
  const draggedHeight = draggedRect.height

  // 默认保持当前位置
  let newPlaceholderIndex = currentIndex

  // 向上拖动：查找应该插入的位置
  if (offsetY < 0) {
    // 从上往下遍历当前位置之前的项目
    for (let i = currentIndex - 1; i >= 0; i--) {
      const item = itemElements[i]
      const rect = item.getBoundingClientRect()

      // 如果拖拽项的中点小于当前项的中点，就把占位符放在这个位置
      if (draggedMiddle < rect.top + rect.height / 2) {
        newPlaceholderIndex = i
      } else {
        // 一旦不满足条件就退出循环
        break
      }
    }
  }
  // 向下拖动：查找应该插入的位置
  else if (offsetY > 0) {
    // 从下往上遍历当前位置之后的项目
    for (let i = currentIndex + 1; i < itemElements.length; i++) {
      const item = itemElements[i]
      const rect = item.getBoundingClientRect()

      // 如果拖拽项的中点大于当前项的中点，就把占位符放在这个位置
      if (draggedMiddle > rect.top + rect.height / 2) {
        newPlaceholderIndex = i
      } else {
        // 一旦不满足条件就退出循环
        break
      }
    }
  }

  // 只有在空位索引变化时才更新位置，减少闪烁
  if (newPlaceholderIndex !== placeholderIndex) {
    const oldPlaceholderIndex = placeholderIndex
    placeholderIndex = newPlaceholderIndex

    // 使用requestAnimationFrame确保视觉更新的平滑性
    window.requestAnimationFrame(() => {
      // 先重置所有项目的样式
      itemElements.forEach((item, index) => {
        if (item === draggedItem) return

        // 重置之前的变换
        if (oldPlaceholderIndex !== currentIndex) {
          item.style.transform = ''
        }

        // 设置过渡时间
        item.style.transition = 'transform 0.3s cubic-bezier(0.2, 0, 0, 1)'
      })

      // 延迟一帧应用新的变换，确保过渡效果平滑
      setTimeout(() => {
        // 应用新的变换
        itemElements.forEach((item, index) => {
          if (item === draggedItem) return

          if (placeholderIndex > currentIndex) {
            // 向下拖动：当前位置到目标位置之间的项目向上移动一格
            if (index > currentIndex && index <= placeholderIndex) {
              item.style.transform = `translateY(-${draggedHeight}px)`
            }
          } else if (placeholderIndex < currentIndex) {
            // 向上拖动：目标位置到当前位置之间的项目向下移动一格
            if (index < currentIndex && index >= placeholderIndex) {
              item.style.transform = `translateY(${draggedHeight}px)`
            }
          }
        })

        // 提供视觉反馈
        if (oldPlaceholderIndex !== currentIndex) {
          provideVisualFeedback()
        }
      }, 5)
    })
  }
}

// 触摸开始
const handleTouchStart = (e: TouchEvent) => {
  // 记录用户交互
  markUserInteraction()

  // 如果触摸的是删除按钮，不启动拖拽
  const target = e.target as HTMLElement
  if (target.closest('.remove-item-btn')) return

  if (!e.target || e.touches.length !== 1) return

  // 获取被拖拽的元素
  draggedItem = target.closest('.plan-item') as HTMLElement

  if (!draggedItem) return

  draggedItemId = draggedItem.getAttribute('data-id') || ''

  // 记录起始触摸位置
  touchStartY = e.touches[0].clientY

  // 记录元素初始位置
  const rect = draggedItem.getBoundingClientRect()
  initialY = rect.top

  // 确保我们有最新的元素列表
  const container = draggedItem.parentElement
  if (container) {
    // 刷新元素列表，确保顺序正确
    itemElements = Array.from(container.querySelectorAll('.plan-item')) as HTMLElement[]

    // 找到当前选中项的索引
    currentIndex = itemElements.indexOf(draggedItem)

    // 重置所有项目的样式，确保从干净状态开始
    itemElements.forEach((item) => {
      if (item !== draggedItem) {
        item.style.transform = ''
        item.style.transition = 'transform 0.3s cubic-bezier(0.2, 0, 0, 1)'
      }
    })
  }

  // 重置交换位置索引
  placeholderIndex = currentIndex

  // 重置任何正在进行的动画
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
  lastMoveTime = 0

  // 禁用过渡效果，确保拖拽时立即响应
  draggedItem.style.transition = 'none'

  // 为拖动的元素添加样式
  draggedItem.classList.add('dragging')

  // 添加触摸移动和结束的事件监听器
  document.addEventListener('touchmove', handleTouchMove, { passive: false })
  document.addEventListener('touchend', handleTouchEnd, { passive: true })

  // 视觉反馈
  provideVisualFeedback()
}

// 用于跟踪上次位置更新
let lastMoveTime = 0
let animationFrameId: number | null = null

// 触摸结束
const handleTouchEnd = () => {
  if (!draggedItem) return

  // 保存最终空位索引和引用
  const finalPlaceholderIndex = placeholderIndex
  const container = draggedItem.parentElement
  const draggedItemRef = draggedItem // 创建引用以防后面被清空

  // 如果没有位置变化，直接恢复原状
  if (finalPlaceholderIndex === currentIndex) {
    resetDragState(draggedItemRef)
    return
  }

  // 计算最终位置
  let targetPosition = { top: 0, left: 0 }
  try {
    if (finalPlaceholderIndex > currentIndex) {
      // 向下拖动
      const targetItem = itemElements[finalPlaceholderIndex]
      if (targetItem) {
        const targetRect = targetItem.getBoundingClientRect()
        targetPosition = { top: targetRect.top, left: targetRect.left }
      }
    } else {
      // 向上拖动
      const targetItem = itemElements[finalPlaceholderIndex]
      if (targetItem) {
        const targetRect = targetItem.getBoundingClientRect()
        targetPosition = { top: targetRect.top, left: targetRect.left }
      }
    }
  } catch (err) {
    console.error('计算目标位置时出错', err)
  }

  // 先保持其他项目的位移状态不变
  // 给拖拽项添加过渡动画，移动到最终位置
  draggedItemRef.style.transition =
    'transform 0.3s cubic-bezier(0.2, 0, 0, 1), box-shadow 0.3s cubic-bezier(0.2, 0, 0, 1)'
  draggedItemRef.style.boxShadow = ''
  draggedItemRef.style.zIndex = '50' // 稍微降低层级但仍在其他项上面

  // 立即更新DOM结构，但保持视觉位置不变
  if (container) {
    const draggedRect = draggedItemRef.getBoundingClientRect()
    const initialPosition = { top: draggedRect.top, left: draggedRect.left }

    // 先从DOM中移除拖拽项
    if (draggedItemRef.parentNode) {
      draggedItemRef.parentNode.removeChild(draggedItemRef)
    }

    // 添加到新位置
    try {
      if (finalPlaceholderIndex >= itemElements.length - 1) {
        // 拖到列表末尾
        container.appendChild(draggedItemRef)
      } else if (finalPlaceholderIndex > currentIndex) {
        // 向下拖动
        const nextItem = itemElements[finalPlaceholderIndex + 1] || null
        if (nextItem) {
          container.insertBefore(draggedItemRef, nextItem)
        } else {
          container.appendChild(draggedItemRef)
        }
      } else {
        // 向上拖动
        container.insertBefore(draggedItemRef, itemElements[finalPlaceholderIndex])
      }

      // 更新DOM顺序后立即更新itemElements数组
      itemElements = Array.from(container.querySelectorAll('.plan-item')) as HTMLElement[]

      // 更新排序数据
      updateItemOrder()

      // 获取DOM更新后的新位置
      const newRect = draggedItemRef.getBoundingClientRect()
      const offsetX = initialPosition.left - newRect.left
      const offsetY = initialPosition.top - newRect.top

      // 应用相反的transform使视觉位置保持不变
      draggedItemRef.style.transform = `translate(${offsetX}px, ${offsetY}px)`

      // 一帧后将所有项目恢复到最终位置
      requestAnimationFrame(() => {
        // 重置所有其他项目的transform
        itemElements.forEach((item) => {
          if (item !== draggedItemRef) {
            item.style.transition = 'transform 0.3s cubic-bezier(0.2, 0, 0, 1)'
            item.style.transform = ''
          }
        })

        // 拖拽项恢复到实际位置（移除transform）
        requestAnimationFrame(() => {
          draggedItemRef.style.transform = ''

          // 完全清理状态
          draggedItemRef.addEventListener(
            'transitionend',
            () => {
              resetDragState(draggedItemRef)
            },
            { once: true },
          )

          // 为防止transitionend不触发
          setTimeout(() => {
            resetDragState(draggedItemRef)
          }, 350)
        })
      })
    } catch (err) {
      console.error('重排DOM时出错', err)
      resetDragState(draggedItemRef)
    }
  } else {
    resetDragState(draggedItemRef)
  }
}

// 重置拖拽状态的辅助函数
const resetDragState = (item: HTMLElement | null) => {
  // 重置所有项目的样式
  itemElements.forEach((el) => {
    el.style.transform = ''
    el.style.transition = ''
    el.style.zIndex = ''
  })

  // 重置拖拽项
  if (item) {
    item.style.transition = ''
    item.style.transform = ''
    item.style.boxShadow = ''
    item.style.zIndex = ''
    item.classList.remove('dragging')
  }

  // 移除事件监听器
  document.removeEventListener('touchmove', handleTouchMove)
  document.removeEventListener('touchend', handleTouchEnd)

  // 清空状态变量
  draggedItem = null
  draggedItemId = ''
  placeholderIndex = -1

  // 取消任何动画帧
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
}

// 更新项目顺序
const updateItemOrder = () => {
  // 使用requestAnimationFrame确保DOM更新后再处理
  window.requestAnimationFrame(() => {
    // 获取所有项目的ID
    const container = document.querySelector('.plan-items')
    if (!container) return

    const items = Array.from(container.querySelectorAll('.plan-item'))
    const newOrder = items.map((item) => item.getAttribute('data-id') || '')

    // 过滤掉无效ID
    const validOrder = newOrder.filter((id) => id !== '')

    // 发送更新事件
    if (validOrder.length > 0) {
      emit('updateOrder', validOrder)
    }
  })
}

// 初始化防抖变量
let initDebounceTimer: number | null = null

// 监听数据变化，更新拖拽功能
watch(
  () => [props.planItems.items.length, props.isExpanded],
  () => {
    // 使用防抖函数，避免短时间内多次初始化
    if (initDebounceTimer !== null) {
      clearTimeout(initDebounceTimer)
    }

    initDebounceTimer = window.setTimeout(() => {
      initDragAndDrop()
      initDebounceTimer = null
    }, 100)
  },
)

// 当组件加载时初始化
onMounted(() => {
  // 检测设备类型
  checkTouchDevice()

  // 添加全局用户交互监听
  document.addEventListener('touchstart', markUserInteraction, { once: true, passive: true })
  document.addEventListener('mousedown', markUserInteraction, { once: true, passive: true })
  document.addEventListener('click', markUserInteraction, { once: true, passive: true })

  // 延迟初始化拖拽功能，确保DOM已完全渲染
  window.requestAnimationFrame(() => {
    initDragAndDrop()
  })
})
</script>

<template>
  <div class="right-panel">
    <div class="panel-header">
      <h2>我的旅游清单</h2>
      <div class="header-actions">
        <div v-if="planItems.items.length > 0" class="count-badge">
          {{ planItems.items.length }}
        </div>
        <button class="toggle-plan-btn" @click="$emit('togglePlan')">
          <span v-if="isExpanded">−</span>
          <span v-else>+</span>
        </button>
      </div>
    </div>

    <div v-if="isExpanded" class="panel-content">
      <!-- 空清单提示 -->
      <div v-if="planItems.items.length === 0" class="empty-plan">
        <p>您的旅游清单还是空的</p>
        <p>将地图上的图标拖拽到这里，即可开始规划旅行</p>
      </div>

      <!-- 清单项目列表 -->
      <div v-if="planItems.items.length > 0" class="plan-items">
        <!-- 统一渲染所有项目 -->
        <div
          v-for="item in planItems.items"
          :key="item.id"
          :data-id="item.id"
          class="plan-item"
          :class="{
            'item-hotel': item.type === 'hotel',
            'item-spot': item.type === 'spot',
            'item-transport': item.type === 'transportation',
          }"
        >
          <div :class="['plan-item-icon', `${item.type}-color`]">
            <IconHotel v-if="item.type === 'hotel'" />
            <IconSpot v-if="item.type === 'spot'" />
            <IconTransportation v-if="item.type === 'transportation'" />
          </div>
          <div class="plan-item-info">
            <!-- 根据类型显示不同的内容 -->
            <template v-if="item.type === 'hotel'">
              <h4>{{ asHotel(item.data).name }}</h4>
              <p>{{ asHotel(item.data).price }} - {{ asHotel(item.data).location }}</p>
            </template>
            <template v-else-if="item.type === 'spot'">
              <h4>{{ asSpot(item.data).name }}</h4>
              <p>{{ asSpot(item.data).rating }}⭐ - {{ asSpot(item.data).location }}</p>
            </template>
            <template v-else-if="item.type === 'transportation'">
              <h4>
                {{ asTransportation(item.data).type }}: {{ asTransportation(item.data).route }}
              </h4>
              <p>{{ asTransportation(item.data).frequency }}</p>
            </template>
          </div>
          <button
            class="remove-item-btn"
            @click="$emit('removeItem', item.id)"
            aria-label="移除项目"
          >
            ×
          </button>
          <div class="drag-handle" aria-label="拖动调整顺序">⋮⋮</div>
        </div>
      </div>

      <!-- 操作按钮 - 始终显示 -->
      <div class="plan-actions">
        <button
          class="plan-action-btn clear-btn"
          @click="confirmClear"
          :disabled="planItems.items.length === 0"
        >
          清空
        </button>
        <button class="plan-action-btn save-btn" @click="$emit('savePlan')">保存</button>
        <div v-if="showConfirm" class="confirm-dialog">
          <p>确定要清空所有项目吗？</p>
          <div class="confirm-buttons">
            <button @click="cancelClear">取消</button>
            <button class="confirm-yes" @click="doClear">确定</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.right-panel {
  flex: 1;
  background-color: #fff;
  border-left: 1px solid #eee;
  box-shadow: -2px 0 5px rgba(0, 0, 0, 0.05);
  padding: 20px;
  height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  will-change: transform; /* 优化移动端滚动性能 */
  position: relative;
  z-index: 5;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  border-bottom: 2px solid #4caf50;
  padding-bottom: 10px;
  position: sticky;
  top: 0;
  background-color: #fff;
  z-index: 10;
}

.panel-header h2 {
  margin: 0;
  font-size: 1.2rem;
  color: #333;
}

.header-actions {
  display: flex;
  align-items: center;
}

.count-badge {
  background-color: #4caf50;
  color: white;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  margin-right: 8px;
}

.toggle-plan-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #4caf50;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding-right: 5px;
  -webkit-overflow-scrolling: touch; /* 提供iOS的弹性滚动 */
}

.empty-plan {
  color: #999;
  font-style: italic;
  text-align: center;
  padding: 20px;
}

/* 旅游清单样式 */
.plan-items {
  display: flex;
  flex-direction: column;
  gap: 15px;
  width: 100%;
  position: relative; /* 添加相对定位，为绝对定位的拖拽项提供参考 */
}

.plan-item {
  display: flex;
  align-items: center;
  padding: 10px;
  background-color: #f9f9f9;
  border-radius: 8px;
  transition:
    transform 0.3s cubic-bezier(0.2, 0, 0, 1),
    box-shadow 0.3s cubic-bezier(0.2, 0, 0, 1); /* 使用贝塞尔曲线提供更自然的动画 */
  cursor: grab;
  position: relative;
  touch-action: none; /* 防止触摸事件产生滚动 */
  user-select: none; /* 防止文本选择 */
  border-left: 4px solid transparent;
  will-change: transform, box-shadow; /* 提示浏览器这些属性会改变 */
  transform: translateZ(0); /* 启用硬件加速 */
  height: 60px; /* 固定高度，使空位交换更准确 */
  box-sizing: border-box; /* 确保padding不影响总高度 */
}

.item-hotel {
  border-left-color: #3399ff;
}

.item-spot {
  border-left-color: #18cc73;
}

.item-transport {
  border-left-color: #000000;
}

.plan-item:hover {
  background-color: #f0f7f0;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.1);
}

.plan-item.dragging {
  opacity: 0.95; /* 稍微提高不透明度 */
  background-color: #e8f5e9;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2); /* 增强阴影效果 */
  z-index: 100; /* 提高层级，确保始终在顶部 */
  cursor: grabbing;
  transition: none; /* 拖拽时禁用过渡效果，确保跟手 */
  pointer-events: none; /* 避免与其他元素的交互干扰 */
}

.plan-item-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 10px;
  background-color: white;
  padding: 2px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.hotel-color {
  border: 2px solid #3399ff;
}

.spot-color {
  border: 2px solid #18cc73;
}

.transportation-color {
  border: 2px solid #000000;
}

.plan-item-info {
  flex: 1;
  min-width: 0; /* 确保文本可以正确截断 */
  overflow: hidden;
}

.plan-item-info h4 {
  margin: 0 0 4px 0;
  font-size: 0.95rem;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.plan-item-info p {
  margin: 0;
  font-size: 0.8rem;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.remove-item-btn {
  background: none;
  border: none;
  color: #ff5252;
  font-size: 1.2rem;
  font-weight: bold;
  cursor: pointer;
  padding: 0 5px;
  opacity: 0.7;
  transition: all 0.2s;
  z-index: 20; /* 确保按钮在拖拽时仍然可点击 */
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.remove-item-btn:hover {
  opacity: 1;
  transform: scale(1.2);
}

.drag-handle {
  color: #aaa;
  margin-left: 5px;
  cursor: grab;
  font-size: 1.2rem;
  user-select: none;
  z-index: 20; /* 确保拖拽手柄在拖拽时仍然可见 */
  width: 20px;
  display: flex;
  justify-content: center;
}

.plan-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 25px;
  padding-top: 15px;
  border-top: 1px solid #eee;
  position: relative;
}

.plan-action-btn {
  flex: 1;
  padding: 8px 0;
  border: none;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.clear-btn {
  background-color: #f5f5f5;
  color: #666;
  margin-right: 10px;
}

.clear-btn:hover {
  background-color: #e0e0e0;
}

.clear-btn:disabled {
  background-color: #f9f9f9;
  color: #ccc;
  cursor: not-allowed;
}

.save-btn {
  background-color: #4caf50;
  color: white;
}

.save-btn:hover {
  background-color: #45a049;
}

/* 确认对话框 */
.confirm-dialog {
  position: absolute;
  top: -90px;
  left: 0;
  right: 0;
  background-color: white;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
  padding: 15px;
  border-radius: 8px;
  z-index: 30;
  animation: slideUp 0.2s ease-out;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.confirm-dialog p {
  margin: 0 0 10px 0;
  text-align: center;
}

.confirm-buttons {
  display: flex;
  justify-content: space-between;
}

.confirm-buttons button {
  flex: 1;
  padding: 8px 0;
  border: none;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  margin: 0 5px;
}

.confirm-buttons button:first-child {
  background-color: #f5f5f5;
  color: #666;
}

.confirm-yes {
  background-color: #ff5252;
  color: white;
}

/* 移动端优化 */
@media (max-width: 768px) {
  .drag-handle {
    font-size: 1.5rem; /* 增大拖拽手柄以便于触摸 */
    padding: 5px;
  }

  .remove-item-btn {
    font-size: 1.3rem; /* 增大删除按钮以便于触摸 */
    padding: 5px;
  }

  /* 增强按钮可触摸性 */
  .plan-action-btn {
    padding: 10px 0;
    font-size: 1rem;
  }
}

/* 拖拽优化 */
.plan-items:has(.dragging) .plan-item:not(.dragging) {
  transition: transform 0.3s cubic-bezier(0.2, 0, 0, 1); /* 使用贝塞尔曲线提供更自然的动画 */
}

@keyframes itemPulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.02);
  }
  100% {
    transform: scale(1);
  }
}

/* 为提高性能，使用硬件加速 */
.plan-item {
  transform: translateZ(0);
  backface-visibility: hidden;
  perspective: 1000px;
}

/* 低动效模式 */
@media (prefers-reduced-motion: reduce) {
  .plan-item {
    transition: none !important;
  }
}

/* 暗黑模式支持 */
@media (prefers-color-scheme: dark) {
  .right-panel {
    background-color: #1e1e1e;
    color: #e0e0e0;
    border-left-color: #333;
  }

  .panel-header {
    background-color: #2d2d2d;
    color: #fff;
    border-bottom-color: #404040;
  }

  .panel-header h2 {
    color: #fff;
  }

  .toggle-plan-btn {
    background-color: #333;
    color: #e0e0e0;
    border-color: #555;
  }

  .toggle-plan-btn:hover {
    background-color: #404040;
    color: #fff;
  }

  .count-badge {
    background-color: #4488ff;
    color: #fff;
  }

  .panel-content {
    background-color: #1e1e1e;
  }

  .empty-plan {
    color: #aaa;
  }

  .plan-item {
    background-color: #2d2d2d;
    color: #e0e0e0;
    border-left-color: inherit; /* 保持各自类型的颜色 */
  }

  .plan-item:hover {
    background-color: #3d3d3d;
    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.3);
  }

  .plan-item.dragging {
    background-color: #404040;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.5);
  }

  .plan-item-icon {
    background-color: #333;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }

  .plan-item-info h4 {
    color: #fff;
  }

  .plan-item-info p {
    color: #bbb;
  }

  .remove-item-btn {
    color: #ff6b6b;
  }

  .remove-item-btn:hover {
    color: #ff5252;
  }

  .drag-handle {
    color: #777;
  }

  .plan-actions {
    border-top-color: #404040;
  }

  .clear-btn {
    background-color: #333;
    color: #bbb;
  }

  .clear-btn:hover {
    background-color: #404040;
    color: #e0e0e0;
  }

  .clear-btn:disabled {
    background-color: #222;
    color: #555;
  }

  .save-btn {
    background-color: #45a049;
    color: #fff;
  }

  .save-btn:hover {
    background-color: #4caf50;
  }

  .confirm-dialog {
    background-color: #2d2d2d;
    color: #e0e0e0;
    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.3);
  }

  .confirm-buttons button:first-child {
    background-color: #333;
    color: #bbb;
  }

  .confirm-buttons button:first-child:hover {
    background-color: #404040;
    color: #e0e0e0;
  }

  .confirm-yes {
    background-color: #ff5252;
    color: #fff;
  }

  .confirm-yes:hover {
    background-color: #ff6b6b;
  }

  /* 暗黑模式下的酒店、景点、交通颜色保持一致 */
  .item-hotel {
    border-left-color: #4488ff;
  }

  .item-spot {
    border-left-color: #2de58a;
  }

  .item-transport {
    border-left-color: #aaaaaa;
  }

  .hotel-color {
    border-color: #4488ff;
  }

  .spot-color {
    border-color: #2de58a;
  }

  .transport-color {
    border-color: #aaaaaa;
  }
}
</style>
