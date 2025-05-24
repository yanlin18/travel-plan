<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Hotel, Spot, Transportation } from '../types/travel'
import { hotels, spots, transportations } from '../data/mockData'
import IconHotel from '@/components/icons/IconHotel.vue'
import IconSpot from '@/components/icons/IconSpot.vue'
import IconTransportation from '@/components/icons/IconTransportation.vue'
import ImageCarousel from '@/components/ImageCarousel.vue'

const route = useRoute()
const router = useRouter()

const item = ref<Hotel | Spot | Transportation | null>(null)
const itemType = ref<string>('')
const loading = ref(true)
const error = ref('')

// 获取详细信息
const loadItemDetail = () => {
  const type = route.params.type as string
  const id = parseInt(route.params.id as string)

  if (!type || !id) {
    error.value = '参数错误'
    loading.value = false
    return
  }

  itemType.value = type

  let dataSource: (Hotel | Spot | Transportation)[] = []

  switch (type) {
    case 'hotel':
      dataSource = hotels
      break
    case 'spot':
      dataSource = spots
      break
    case 'transportation':
      dataSource = transportations
      break
    default:
      error.value = '未知的类型'
      loading.value = false
      return
  }

  const foundItem = dataSource.find((item) => item.id === id)
  if (foundItem) {
    item.value = foundItem
  } else {
    error.value = '未找到相关信息'
  }

  loading.value = false
}

// 返回主页
const goBack = () => {
  router.push('/')
}

// 根据类型获取图标组件
const getIconComponent = () => {
  switch (itemType.value) {
    case 'hotel':
      return IconHotel
    case 'spot':
      return IconSpot
    case 'transportation':
      return IconTransportation
    default:
      return IconHotel
  }
}

// 获取类型名称
const getTypeName = () => {
  switch (itemType.value) {
    case 'hotel':
      return '酒店'
    case 'spot':
      return '景点'
    case 'transportation':
      return '交通'
    default:
      return ''
  }
}

// 获取主要信息
const getMainInfo = () => {
  if (!item.value) return {}

  if (itemType.value === 'hotel') {
    const hotel = item.value as Hotel
    return {
      price: hotel.price,
      checkIn: hotel.checkIn,
      checkOut: hotel.checkOut,
      amenities: hotel.amenities,
    }
  } else if (itemType.value === 'spot') {
    const spot = item.value as Spot
    return {
      rating: spot.rating,
      openingHours: spot.openingHours,
      ticketPrice: spot.ticketPrice,
      features: spot.features,
    }
  } else if (itemType.value === 'transportation') {
    const trans = item.value as Transportation
    return {
      route: trans.route,
      frequency: trans.frequency,
      operatingHours: trans.operatingHours,
      ticketPrice: trans.ticketPrice,
      stations: trans.stations,
    }
  }
  return {}
}

onMounted(() => {
  loadItemDetail()
})
</script>

<template>
  <div class="detail-view">
    <!-- 顶部导航栏 -->
    <header class="detail-header">
      <button class="back-btn" @click="goBack">
        <span class="back-icon">←</span>
        返回
      </button>
      <h1 class="header-title">{{ getTypeName() }}详情</h1>
    </header>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>加载中...</p>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="error-container">
      <p class="error-message">{{ error }}</p>
      <button class="retry-btn" @click="goBack">返回首页</button>
    </div>

    <!-- 详细内容 -->
    <div v-else-if="item" class="detail-content">
      <!-- 标题区域 -->
      <div class="title-section">
        <div class="icon-container">
          <component :is="getIconComponent()" class="detail-icon" />
        </div>
        <div class="title-info">
          <h2 class="item-name">
            <span v-if="itemType === 'hotel' || itemType === 'spot'">{{
              (item as Hotel | Spot).name
            }}</span>
            <span v-else-if="itemType === 'transportation'"
              >{{ (item as Transportation).type }} {{ (item as Transportation).route }}</span
            >
          </h2>
          <p class="item-location">
            📍
            <span v-if="itemType === 'hotel' || itemType === 'spot'">{{
              (item as Hotel | Spot).location
            }}</span>
            <span v-else-if="itemType === 'transportation'">{{
              (item as Transportation).route
            }}</span>
          </p>
        </div>
      </div>

      <!-- 图片轮播 -->
      <ImageCarousel
        :images="item.images"
        :auto-play="true"
        :auto-play-interval="4000"
        :show-indicators="true"
        :show-arrows="true"
      />

      <!-- 基本信息卡片 -->
      <div class="info-card">
        <h3 class="card-title">基本信息</h3>
        <div class="info-grid">
          <!-- 酒店信息 -->
          <template v-if="itemType === 'hotel'">
            <div class="info-item">
              <span class="info-label">💰 价格：</span>
              <span class="info-value price-highlight">{{ (item as Hotel).price }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">🕒 入住时间：</span>
              <span class="info-value">{{ (item as Hotel).checkIn }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">🕐 退房时间：</span>
              <span class="info-value">{{ (item as Hotel).checkOut }}</span>
            </div>
          </template>

          <!-- 景点信息 -->
          <template v-if="itemType === 'spot'">
            <div class="info-item">
              <span class="info-label">⭐ 评分：</span>
              <span class="info-value rating-highlight">{{ (item as Spot).rating }} ⭐</span>
            </div>
            <div class="info-item">
              <span class="info-label">🕒 开放时间：</span>
              <span class="info-value">{{ (item as Spot).openingHours }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">🎫 门票价格：</span>
              <span class="info-value price-highlight">{{ (item as Spot).ticketPrice }}</span>
            </div>
          </template>

          <!-- 交通信息 -->
          <template v-if="itemType === 'transportation'">
            <div class="info-item">
              <span class="info-label">🚌 路线：</span>
              <span class="info-value">{{ (item as Transportation).route }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">⏰ 班次频率：</span>
              <span class="info-value">{{ (item as Transportation).frequency }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">🕒 运营时间：</span>
              <span class="info-value">{{ (item as Transportation).operatingHours }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">💰 票价：</span>
              <span class="info-value price-highlight">{{
                (item as Transportation).ticketPrice
              }}</span>
            </div>
          </template>

          <div class="info-item">
            <span class="info-label">📞 联系方式：</span>
            <span class="info-value">{{ item.contact }}</span>
          </div>
          <div class="info-item" v-if="item.website">
            <span class="info-label">🌐 官方网站：</span>
            <a :href="item.website" target="_blank" class="website-link">{{ item.website }}</a>
          </div>
        </div>
      </div>

      <!-- 描述卡片 -->
      <div class="info-card">
        <h3 class="card-title">详细介绍</h3>
        <div class="description-content">
          <p class="description">{{ item.description }}</p>
        </div>
      </div>

      <!-- 特色服务/设施 -->
      <div class="info-card">
        <h3 class="card-title">
          <span v-if="itemType === 'hotel'">🏨 酒店设施</span>
          <span v-else-if="itemType === 'spot'">✨ 景点特色</span>
          <span v-else-if="itemType === 'transportation'">🚏 经停站点</span>
        </h3>
        <div class="features-grid">
          <template v-if="itemType === 'hotel'">
            <div v-for="amenity in (item as Hotel).amenities" :key="amenity" class="feature-tag">
              {{ amenity }}
            </div>
          </template>
          <template v-else-if="itemType === 'spot'">
            <div v-for="feature in (item as Spot).features" :key="feature" class="feature-tag">
              {{ feature }}
            </div>
          </template>
          <template v-else-if="itemType === 'transportation'">
            <div
              v-for="(station, index) in (item as Transportation).stations"
              :key="station"
              class="station-tag"
            >
              <span class="station-number">{{ index + 1 }}</span>
              {{ station }}
            </div>
          </template>
        </div>
      </div>

      <!-- 实用信息卡片 -->
      <div class="info-card">
        <h3 class="card-title">
          <span v-if="itemType === 'hotel'">💡 温馨提示</span>
          <span v-else-if="itemType === 'spot'">📝 游览须知</span>
          <span v-else-if="itemType === 'transportation'">🚇 乘车指南</span>
        </h3>
        <div class="tips-content">
          <template v-if="itemType === 'hotel'">
            <div class="tip-item">
              <span class="tip-icon">🎯</span>
              <span>建议提前预订，特别是节假日期间</span>
            </div>
            <div class="tip-item">
              <span class="tip-icon">🚗</span>
              <span>酒店提供免费停车场，车位有限请提前告知</span>
            </div>
            <div class="tip-item">
              <span class="tip-icon">📱</span>
              <span>支持线上办理入住手续，节省等待时间</span>
            </div>
          </template>
          <template v-else-if="itemType === 'spot'">
            <div class="tip-item">
              <span class="tip-icon">🎫</span>
              <span>建议提前在线购票，可享受优惠价格</span>
            </div>
            <div class="tip-item">
              <span class="tip-icon">📷</span>
              <span>部分区域禁止拍照，请遵守参观规定</span>
            </div>
            <div class="tip-item">
              <span class="tip-icon">👥</span>
              <span>提供专业导览服务，建议团体游客提前预约</span>
            </div>
          </template>
          <template v-else-if="itemType === 'transportation'">
            <div class="tip-item">
              <span class="tip-icon">💳</span>
              <span>支持交通卡、手机支付等多种付费方式</span>
            </div>
            <div class="tip-item">
              <span class="tip-icon">⏰</span>
              <span>高峰期班次更加频繁，避开拥堵时段出行</span>
            </div>
            <div class="tip-item">
              <span class="tip-icon">📱</span>
              <span>可下载官方APP查看实时班次信息</span>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.detail-view {
  background-color: #f5f5f5;
  /* 移动端滚动优化 */
  -webkit-overflow-scrolling: touch;
  overflow-y: auto;
  position: relative;
  width: 100%;
  /* 确保页面内容可以正常滚动 */
  height: auto;
  min-height: 100vh;
}

.detail-header {
  background-color: #3399ff;
  color: white;
  padding: 15px 20px;
  display: flex;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.back-btn {
  background: none;
  border: none;
  color: white;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  transition: background-color 0.2s;
}

.back-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.back-icon {
  font-size: 18px;
  font-weight: bold;
}

.header-title {
  margin: 0 0 0 20px;
  font-size: 1.2rem;
  font-weight: 600;
}

.loading-container,
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: 20px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #3399ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 15px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.error-message {
  color: #e74c3c;
  font-size: 1.1rem;
  margin-bottom: 15px;
}

.retry-btn {
  background-color: #3399ff;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
}

.detail-content {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.title-section {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.icon-container {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background-color: #f8f9fa;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20px;
  border: 3px solid #3399ff;
}

.detail-icon {
  width: 30px;
  height: 30px;
}

.item-name {
  margin: 0 0 8px 0;
  font-size: 1.8rem;
  color: #333;
  font-weight: 600;
}

.item-location {
  margin: 0;
  color: #666;
  font-size: 1rem;
}

.info-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.card-title {
  margin: 0 0 20px 0;
  font-size: 1.3rem;
  color: #333;
  font-weight: 600;
  border-bottom: 2px solid #3399ff;
  padding-bottom: 10px;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 15px;
}

.info-item {
  display: flex;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.info-item:last-child {
  border-bottom: none;
}

.info-label {
  font-weight: 600;
  color: #555;
  min-width: 100px;
  margin-right: 15px;
}

.info-value {
  color: #333;
  flex: 1;
}

.website-link {
  color: #3399ff;
  text-decoration: none;
}

.website-link:hover {
  text-decoration: underline;
}

.description {
  line-height: 1.6;
  color: #555;
  font-size: 1rem;
  margin: 0;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
}

.feature-tag {
  background-color: #2d3748;
  color: #90cdf4;
  padding: 8px 12px;
  border-radius: 20px;
  text-align: center;
  font-size: 0.9rem;
  font-weight: 500;
  border: 1px solid #4a5568;
}

/* 价格高亮样式 */
.price-highlight {
  color: #e74c3c;
  font-weight: 600;
  font-size: 1.05rem;
}

/* 评分高亮样式 */
.rating-highlight {
  color: #f39c12;
  font-weight: 600;
  font-size: 1.05rem;
}

/* 描述内容样式 */
.description-content {
  padding: 10px 0;
}

.description {
  line-height: 1.8;
  color: #555;
  font-size: 1rem;
  margin: 0;
  text-align: justify;
}

/* 站点标签样式 */
.station-tag {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background-color: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
  transition: all 0.2s;
}

.station-tag:hover {
  background-color: #e3f2fd;
  border-color: #bbdefb;
}

.station-number {
  width: 24px;
  height: 24px;
  background-color: #3399ff;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 600;
  margin-right: 12px;
  flex-shrink: 0;
}

/* 提示内容样式 */
.tips-content {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.tip-item {
  display: flex;
  align-items: flex-start;
  padding: 12px 16px;
  background-color: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #3399ff;
  transition: all 0.2s;
}

.tip-item:hover {
  background-color: #e3f2fd;
  transform: translateX(5px);
}

.tip-icon {
  font-size: 1.2rem;
  margin-right: 12px;
  flex-shrink: 0;
}

.tip-item span:last-child {
  line-height: 1.5;
  color: #555;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .detail-view {
    /* 确保移动端滚动正常 */
    -webkit-overflow-scrolling: touch;
    overflow-y: auto;
    height: auto;
    min-height: 100vh;
    /* 移除可能影响滚动的属性 */
    position: relative;
    /* 确保内容宽度不会导致横向滚动 */
    width: 100%;
    max-width: 100vw;
    overflow-x: hidden;
  }

  .detail-content {
    padding: 15px;
    /* 确保内容区域有足够的底部间距 */
    padding-bottom: 60px;
    /* 防止内容被截断 */
    box-sizing: border-box;
    width: 100%;
  }

  .detail-header {
    /* 确保顶部导航栏在移动端不会影响滚动 */
    position: sticky;
    top: 0;
    z-index: 100;
    /* 添加移动端触摸优化 */
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
    /* 确保导航栏宽度正确 */
    width: 100%;
    box-sizing: border-box;
  }

  .title-section {
    flex-direction: column;
    text-align: center;
    padding: 15px;
  }

  .icon-container {
    margin-right: 0;
    margin-bottom: 15px;
  }

  .item-name {
    font-size: 1.5rem;
    /* 防止长文本导致布局问题 */
    word-wrap: break-word;
    overflow-wrap: break-word;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  .info-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
    /* 增加移动端触摸区域 */
    padding: 16px 0;
  }

  .info-label {
    min-width: auto;
    margin-right: 0;
  }

  .features-grid {
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    /* 确保网格不会导致溢出 */
    max-width: 100%;
  }

  /* 移动端按钮优化 */
  .back-btn {
    padding: 12px 16px;
    font-size: 16px;
    /* 增加触摸区域 */
    min-height: 44px;
    min-width: 44px;
    /* 确保按钮在移动端容易点击 */
    touch-action: manipulation;
  }

  /* 移动端文本优化 */
  .description {
    /* 改善移动端文本阅读体验 */
    line-height: 1.6;
    font-size: 0.95rem;
  }

  /* 移动端站点标签优化 */
  .station-tag {
    padding: 10px 12px;
    margin-bottom: 8px;
  }

  /* 移动端提示项优化 */
  .tip-item {
    padding: 12px;
    margin-bottom: 8px;
  }

  /* 移动端卡片优化 */
  .info-card {
    padding: 16px;
    margin-bottom: 16px;
    /* 防止卡片导致横向滚动 */
    max-width: 100%;
    box-sizing: border-box;
  }
}

/* 暗模式支持 */
@media (prefers-color-scheme: dark) {
  .detail-view {
    background-color: #121212;
  }

  .title-section,
  .info-card {
    background-color: #1e1e1e;
    color: #e0e0e0;
  }

  .item-name {
    color: #ffffff;
  }

  .item-location {
    color: #aaaaaa;
  }

  .card-title {
    color: #ffffff;
    border-bottom-color: #4488ff;
  }

  .info-label {
    color: #bbbbbb;
  }

  .info-value {
    color: #e0e0e0;
  }

  .info-item {
    border-bottom-color: #333333;
  }

  .description {
    color: #cccccc;
  }

  .feature-tag {
    background-color: #2d3748;
    color: #90cdf4;
    border-color: #4a5568;
  }

  .price-highlight {
    color: #ff6b6b;
  }

  .rating-highlight {
    color: #ffd93d;
  }

  .station-tag {
    background-color: #2d3748;
    border-color: #4a5568;
    color: #e0e0e0;
  }

  .station-tag:hover {
    background-color: #3d4852;
    border-color: #5a6876;
  }

  .station-number {
    background-color: #4488ff;
  }

  .tip-item {
    background-color: #2d3748;
    border-left-color: #4488ff;
    color: #e0e0e0;
  }

  .tip-item:hover {
    background-color: #3d4852;
  }

  .tip-item span:last-child {
    color: #cccccc;
  }
}
</style>
