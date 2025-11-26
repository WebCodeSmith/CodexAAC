'use client'

import type { CharacterDetails, EquipmentItem } from '../../types/character'
import { getItemImageUrl } from '../../utils/item'
import { makeOutfit } from '../../utils/outfit'

const formatNumber = (num: number): string => num.toLocaleString('pt-BR')

interface EquipmentSlotProps {
  item: EquipmentItem | null
  placeholder: string
  placeholderSize?: 'base' | 'lg'
}

function EquipmentSlot({ item, placeholder, placeholderSize = 'base' }: EquipmentSlotProps) {
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement
    target.style.display = 'none'
    const placeholderEl = target.nextElementSibling as HTMLElement
    if (placeholderEl) placeholderEl.style.display = 'block'
  }

  return (
    <div className="w-10 h-10 bg-[#3a3a3a] border border-[#1a1a1a] rounded flex items-center justify-center shadow-inner relative">
      {item ? (
        <img
          src={getItemImageUrl(item.itemId)}
          alt={`Item ${item.itemId}`}
          className="w-full h-full object-contain"
          onError={handleImageError}
        />
      ) : null}
      <div
        className={`text-white opacity-30 ${item ? 'hidden' : 'block'} ${
          placeholderSize === 'lg' ? 'text-lg' : 'text-base'
        }`}
      >
        {placeholder}
      </div>
    </div>
  )
}

export default function CharacterDetailsSection({ character }: { character: CharacterDetails }) {
  const healthPercent = character.healthMax > 0 ? (character.health / character.healthMax) * 100 : 0
  const manaPercent = character.manaMax > 0 ? (character.mana / character.manaMax) * 100 : 0

  const equipmentMap = (() => {
    if (!character.equipment) return new Map<number, EquipmentItem>()
    const map = new Map<number, EquipmentItem>()
    character.equipment.forEach(item => {
      map.set(item.slot, item)
    })
    return map
  })()

  const getItemForSlot = (slot: number): EquipmentItem | null => equipmentMap.get(slot) || null

  return (
    <div className="bg-[#252525]/95 backdrop-blur-sm rounded-xl border-2 border-[#505050]/70 p-6 shadow-2xl">
      <h2 className="text-[#ffd700] text-xl sm:text-2xl font-bold mb-4 pb-3 border-b border-[#404040]/40">
        Character Details
      </h2>

      <div className="space-y-4">
        <div className="flex gap-4 items-start">
          <div>
            <h3 className="text-[#d0d0d0] text-xs font-medium mb-1.5">Current outfit:</h3>
            <div className="inline-flex justify-center items-center bg-[#1a1a1a] rounded p-1.5 border border-[#404040]/40">
              <img
                src={makeOutfit({
                  id: character.lookType,
                  addons: character.lookAddons,
                  head: character.lookHead,
                  body: character.lookBody,
                  legs: character.lookLegs,
                  feet: character.lookFeet,
                })}
                alt={`${character.name} outfit`}
                className="w-12 h-12 object-contain"
              />
            </div>
          </div>
          <div className="flex-1 space-y-2">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[#d0d0d0] text-xs font-medium">Health:</span>
                <span className="text-[#d0d0d0] text-xs">
                  {formatNumber(character.health)}/{formatNumber(character.healthMax)} ({Math.round(healthPercent)}%)
                </span>
              </div>
              <div className="w-full bg-[#1a1a1a] rounded-full h-2.5 border border-[#404040] overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-red-600 to-red-500 transition-all duration-300"
                  style={{ width: `${healthPercent}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[#d0d0d0] text-xs font-medium">Mana:</span>
                <span className="text-[#d0d0d0] text-xs">
                  {formatNumber(character.mana)}/{formatNumber(character.manaMax)} ({Math.round(manaPercent)}%)
                </span>
              </div>
              <div className="w-full bg-[#1a1a1a] rounded-full h-2.5 border border-[#404040] overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 to-blue-500 transition-all duration-300"
                  style={{ width: `${manaPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-[#404040]/40">
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-4">
            <div className="text-center">
              <div className="text-[#888] text-xs mb-1">Level</div>
              <div className="text-[#ffd700] font-bold text-lg">{character.level}</div>
            </div>
            <div className="text-center">
              <div className="text-[#888] text-xs mb-1">ML</div>
              <div className="text-[#d0d0d0] font-semibold">{character.magicLevel}</div>
            </div>
            <div className="text-center">
              <div className="text-[#888] text-xs mb-1">Fist</div>
              <div className="text-[#d0d0d0] font-semibold">{character.skillFist}</div>
            </div>
            <div className="text-center">
              <div className="text-[#888] text-xs mb-1">Club</div>
              <div className="text-[#d0d0d0] font-semibold">{character.skillClub}</div>
            </div>
            <div className="text-center">
              <div className="text-[#888] text-xs mb-1">Sword</div>
              <div className="text-[#d0d0d0] font-semibold">{character.skillSword}</div>
            </div>
            <div className="text-center">
              <div className="text-[#888] text-xs mb-1">Axe</div>
              <div className="text-[#d0d0d0] font-semibold">{character.skillAxe}</div>
            </div>
            <div className="text-center">
              <div className="text-[#888] text-xs mb-1">Dist</div>
              <div className="text-[#d0d0d0] font-semibold">{character.skillDist}</div>
            </div>
            <div className="text-center">
              <div className="text-[#888] text-xs mb-1">Def</div>
              <div className="text-[#d0d0d0] font-semibold">{character.skillDef}</div>
            </div>
            <div className="text-center">
              <div className="text-[#888] text-xs mb-1">Fish</div>
              <div className="text-[#d0d0d0] font-semibold">{character.skillFish}</div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-[#404040]/40">
          <div className="bg-[#1f1f1f]/80 border-2 border-[#404040]/60 rounded-lg p-3 shadow-lg">
            <h3 className="text-[#ffd700] text-sm font-bold mb-2 text-center">Inventory:</h3>
            <div className="flex gap-1.5 justify-center mb-2">
              <div className="flex flex-col gap-1.5 mt-[1rem]">
                <EquipmentSlot item={getItemForSlot(2)} placeholder="💎" placeholderSize="lg" />
                <EquipmentSlot item={null} placeholder="🧤" />
                <EquipmentSlot item={getItemForSlot(9)} placeholder="💍" />
              </div>

              <div className="flex flex-col gap-1.5">
                <EquipmentSlot item={getItemForSlot(1)} placeholder="⛑️" />
                <EquipmentSlot item={getItemForSlot(4)} placeholder="🛡️" />
                <EquipmentSlot item={getItemForSlot(7)} placeholder="👖" />
                <EquipmentSlot item={getItemForSlot(8)} placeholder="👢" />
              </div>

              <div className="flex flex-col gap-1.5 mt-[1rem]">
                <EquipmentSlot item={getItemForSlot(3)} placeholder="🎒" />
                <EquipmentSlot item={null} placeholder="🧤" />
                <EquipmentSlot item={getItemForSlot(10)} placeholder="➡️" />
              </div>
            </div>

            <div className="flex gap-2 mt-2">
              <div className="bg-[#3a3a3a] border border-[#2a2a2a] rounded px-2 py-1.5 flex-1 text-center">
                <span className="text-white text-xs font-medium">Soul: {formatNumber(character.soul || 0)}</span>
              </div>
              <div className="bg-[#3a3a3a] border border-[#2a2a2a] rounded px-2 py-1.5 flex-1 text-center">
                <span className="text-white text-xs font-medium">Cap: {formatNumber(character.cap || 0)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}