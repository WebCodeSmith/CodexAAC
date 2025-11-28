import { Outfit } from './character'

export interface Death extends Outfit {
  playerName: string
  level: number
  killedBy: string
  isPlayer: boolean
  time: number
}

export interface DeathsResponse {
  deaths: Death[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

