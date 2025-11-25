export interface Outfit {
  lookType: number
  lookHead: number
  lookBody: number
  lookLegs: number
  lookFeet: number
  lookAddons: number
}

export interface Character extends Outfit {
  id: number
  name: string
  vocation: string
  level: number
  world: string
  status: 'online' | 'offline'
}

export interface CharacterDetails extends Outfit {
  name: string
  sex: string
  vocation: string
  level: number
  residence: string
  guildName?: string
  guildRank?: string
  lastSeen: number
  created: number
  accountStatus: string
  status: string
  health: number
  healthMax: number
  mana: number
  manaMax: number
  magicLevel: number
  skillFist: number
  skillClub: number
  skillSword: number
  skillAxe: number
  skillDist: number
  skillDef: number
  skillFish: number
  soul?: number
  cap?: number
  equipment?: EquipmentItem[]
}

export interface EquipmentItem {
  slot: number
  itemId: number
  count: number
}

export interface OnlinePlayer extends Outfit {
  name: string
  level: number
  vocation: string
}

export interface Death {
  time: number
  level: number
  killedBy: string
  isPlayer: boolean
}

export interface CharacterDetailsResponse {
  character: CharacterDetails
  deaths: Death[]
}

export interface ApiResponse<T> {
  message: string
  status: string
  data: T
}

export interface CharactersApiResponse extends ApiResponse<Character[]> {}

export interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface OnlinePlayersResponse {
  players: OnlinePlayer[]
  pagination: PaginationInfo
}
