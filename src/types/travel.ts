// 定义类型
export interface Position {
  x: number // 百分比位置
  y: number // 百分比位置
}

export interface Hotel {
  id: number
  name: string
  location: string
  price: string
  position: Position
}

export interface Spot {
  id: number
  name: string
  location: string
  rating: number
  position: Position
}

export interface Transportation {
  id: number
  type: string
  route: string
  frequency: string
  position: Position
}

// 统一计划项类型
export interface PlanItem {
  id: string // 唯一标识符，包括类型前缀和原始ID
  type: 'hotel' | 'spot' | 'transportation' // 项目类型
  originalId: number // 原始ID
  sortOrder: number // 排序顺序
  data: Hotel | Spot | Transportation // 原始数据
}

// 更新旅游计划接口
export interface TravelPlan {
  items: PlanItem[] // 统一的计划项数组，不再按类型分类
}
