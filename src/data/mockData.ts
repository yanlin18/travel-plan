import type { Hotel, Spot, Transportation } from '../types/travel'

// 模拟酒店数据
export const hotels: Hotel[] = [
  { id: 1, name: '海景酒店', location: '市中心', price: '¥680/晚', position: { x: 25, y: 35 } },
  { id: 2, name: '山顶度假村', location: '山区', price: '¥520/晚', position: { x: 75, y: 20 } },
]

// 模拟景点数据
export const spots: Spot[] = [
  { id: 1, name: '历史博物馆', location: '东部', rating: 4.5, position: { x: 65, y: 40 } },
  { id: 2, name: '海滩公园', location: '南部', rating: 4.7, position: { x: 30, y: 70 } },
  { id: 3, name: '古城墙', location: '西部', rating: 4.3, position: { x: 15, y: 55 } },
]

// 模拟交通数据
export const transportations: Transportation[] = [
  { id: 1, type: '公交', route: '1路', frequency: '每15分钟一班', position: { x: 40, y: 45 } },
  { id: 2, type: '地铁', route: 'A线', frequency: '每10分钟一班', position: { x: 55, y: 65 } },
]
