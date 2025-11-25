// Server configuration service
// Fetches server information from config.lua via backend API

import { api } from './api'

export interface ServerConfig {
  serverName: string
  worldType: string
  ip: string
  loginPort: number
  gamePort: number
  rateExp: number
  rateSkill: number
  rateMagic: number
  rateLoot: number
  rateSpawn: number
  mapName: string
  mapAuthor: string
  houseRentPeriod: string
  maxPlayers: number
  ownerName: string
  ownerEmail: string
  url: string
  location: string
  protectionLevel: number
  lowLevelBonusExp: number
  rateUseStages: boolean
  fragDuration: number
  redSkullDuration: number
  blackSkullDuration: number
  dayKillsToRedSkull: number
  weekKillsToRedSkull: number
  monthKillsToRedSkull: number
  minLevelToCreateGuild?: number
}

let cachedConfig: ServerConfig | null = null
let configPromise: Promise<ServerConfig> | null = null

export const serverService = {
  /**
   * Get server configuration (with caching and promise deduplication)
   * Returns cached config if available, otherwise fetches from API
   */
  async getConfig(): Promise<ServerConfig> {
    if (cachedConfig) {
      return cachedConfig
    }

    if (configPromise) {
      return configPromise
    }

    configPromise = api.get<{ message: string; status: string; data: ServerConfig }>('/server/config', { public: true })
      .then(response => {
        cachedConfig = response.data
        return response.data
      })
      .finally(() => {
        configPromise = null
      })

    return configPromise
  },

  /**
   * Clear cache (useful if config is reloaded on server)
   */
  clearCache(): void {
    cachedConfig = null
    configPromise = null
  },

  /**
   * Get server name (convenience method)
   * Returns cached server name or fetches if needed
   */
  async getServerName(): Promise<string> {
    const config = await this.getConfig()
    return config.serverName || 'CodexAAC'
  },
}

export interface Stage {
  minLevel: number
  maxLevel?: number
  multiplier: number
}

export interface StagesConfig {
  experienceStages: Stage[]
  skillsStages: Stage[]
  magicLevelStages: Stage[]
}

let cachedStages: StagesConfig | null = null
let stagesPromise: Promise<StagesConfig> | null = null

export const stagesService = {
  /**
   * Get stages configuration (with caching and promise deduplication)
   */
  async getStages(): Promise<StagesConfig> {
    if (cachedStages) {
      return cachedStages
    }

    if (stagesPromise) {
      return stagesPromise
    }

    stagesPromise = api.get<{ message: string; status: string; data: StagesConfig }>('/server/stages', { public: true })
      .then(response => {
        cachedStages = response.data
        return response.data
      })
      .finally(() => {
        stagesPromise = null
      })

    return stagesPromise
  },

  clearCache(): void {
    cachedStages = null
    stagesPromise = null
  },
}

