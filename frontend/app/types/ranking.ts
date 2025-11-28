import type { Outfit, PaginationInfo } from './character'

export interface RankingPlayer extends Outfit {
  rank: number
  name: string
  vocation: string
  level: number
  value: number
}

export interface RankingResponse {
  type: string
  vocation: string
  pagination: PaginationInfo
  players: RankingPlayer[]
}

export type RankingType = 
  | 'level' 
  | 'magiclevel' 
  | 'club' 
  | 'axe' 
  | 'sword' 
  | 'shielding' 
  | 'distance' 
  | 'fist' 
  | 'fishing'


