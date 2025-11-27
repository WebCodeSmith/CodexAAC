import { api } from './api'

export interface BoostedBoss {
  boostName: string
  raceId: string
  lookType: number
  lookHead: number
  lookBody: number
  lookLegs: number
  lookFeet: number
  lookAddons: number
  lookMount?: number
}

export interface BoostedCreature {
  boostName: string
  raceId: string
  lookType: number
  lookHead: number
  lookBody: number
  lookLegs: number
  lookFeet: number
  lookAddons: number
  lookMount?: number
}

export interface BoostedResponse {
  boss?: BoostedBoss
  creature?: BoostedCreature
}

let cachedBoosted: BoostedResponse | null = null
let boostedPromise: Promise<BoostedResponse> | null = null

export const boostedService = {
  /**
   * Get boosted boss and creature (with caching and promise deduplication)
   * Returns cached data if available, otherwise fetches from API
   */
  async getBoosted(): Promise<BoostedResponse> {
    if (cachedBoosted) {
      return cachedBoosted
    }

    if (boostedPromise) {
      return boostedPromise
    }

    boostedPromise = api.get<BoostedResponse>('/boosted', { public: true })
      .then(response => {
        cachedBoosted = response
        return response
      })
      .finally(() => {
        boostedPromise = null
      })

    return boostedPromise
  },

  /**
   * Clear cache (useful if boosted data is updated on server)
   */
  clearCache(): void {
    cachedBoosted = null
    boostedPromise = null
  },
}

