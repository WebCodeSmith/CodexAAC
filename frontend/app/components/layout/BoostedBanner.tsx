'use client'

import { useEffect, useState } from 'react'
import { boostedService, type BoostedResponse } from '../../services/boosted'
import { makeOutfit } from '../../utils/outfit'

export default function BoostedBanner() {
  const [boosted, setBoosted] = useState<BoostedResponse | null>(null)

  useEffect(() => {
    boostedService.getBoosted()
      .then(setBoosted)
      .catch(err => console.error('Error fetching boosted data:', err))
  }, [])

  if (!boosted || (!boosted.boss && !boosted.creature)) {
    return null
  }

  return (
    <div className="flex items-end gap-2">
      {boosted.boss && (
        <div className="flex items-center gap-3 bg-[#252525]/95 backdrop-blur-sm rounded-t-lg border-2 border-[#404040]/60 px-4 py-2.5 shadow-[-2px_-2px_5px_rgba(0,0,0,0.2)]">
          <div className="w-9 h-9 flex items-center justify-center flex-shrink-0">
            {boosted.boss.lookType > 0 ? (
              <img
                src={makeOutfit({
                  id: boosted.boss.lookType,
                  addons: boosted.boss.lookAddons,
                  head: boosted.boss.lookHead,
                  body: boosted.boss.lookBody,
                  legs: boosted.boss.lookLegs,
                  feet: boosted.boss.lookFeet,
                })}
                alt={boosted.boss.boostName || 'Boosted Boss'}
                className="w-full h-full object-contain transform scale-125"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            ) : (
              <span className="text-[#ff6b6b] text-lg">👹</span>
            )}
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[#ff6b6b] text-[11px] font-bold uppercase tracking-wider">Boosted Boss</span>
            <span className="text-white font-medium text-sm truncate max-w-[110px]">
              {boosted.boss.boostName || 'Unknown'}
            </span>
          </div>
        </div>
      )}

      {boosted.creature && (
        <div className="flex items-center gap-3 bg-[#252525]/95 backdrop-blur-sm rounded-t-lg border-2 border-[#404040]/60 px-4 py-2.5 shadow-[-2px_-2px_5px_rgba(0,0,0,0.2)]">
          <div className="w-9 h-9 flex items-center justify-center flex-shrink-0">
            {boosted.creature.lookType > 0 ? (
              <img
                src={makeOutfit({
                  id: boosted.creature.lookType,
                  addons: boosted.creature.lookAddons,
                  head: boosted.creature.lookHead,
                  body: boosted.creature.lookBody,
                  legs: boosted.creature.lookLegs,
                  feet: boosted.creature.lookFeet,
                })}
                alt={boosted.creature.boostName || 'Boosted Creature'}
                className="w-full h-full object-contain transform scale-125"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            ) : (
              <span className="text-[#4ecdc4] text-lg">🐉</span>
            )}
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[#4ecdc4] text-[11px] font-bold uppercase tracking-wider">Boosted Creature</span>
            <span className="text-white font-medium text-sm truncate max-w-[110px]">
              {boosted.creature.boostName || 'Unknown'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

