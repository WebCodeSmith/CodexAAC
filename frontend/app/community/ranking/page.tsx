'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '../../services/api'
import type { ApiResponse } from '../../types/account'
import type { RankingResponse, RankingType } from '../../types/ranking'
import { makeOutfit } from '../../utils/outfit'

const RANKING_TYPES: { type: RankingType; label: string; icon: string }[] = [
  { type: 'level', label: 'Level', icon: '⬆️' },
  { type: 'magiclevel', label: 'Magic Level', icon: '✨' },
  { type: 'club', label: 'Club', icon: '🔨' },
  { type: 'axe', label: 'Axe', icon: '🪓' },
  { type: 'sword', label: 'Sword', icon: '⚔️' },
  { type: 'shielding', label: 'Shielding', icon: '🛡️' },
  { type: 'distance', label: 'Distance', icon: '🏹' },
  { type: 'fist', label: 'Fist', icon: '👊' },
  { type: 'fishing', label: 'Fishing', icon: '🎣' },
]

const VOCATIONS = [
  { value: 'all', label: 'All Vocations' },
  { value: 'sorcerer', label: 'Sorcerer' },
  { value: 'druid', label: 'Druid' },
  { value: 'paladin', label: 'Paladin' },
  { value: 'knight', label: 'Knight' },
]

export default function RankingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [ranking, setRanking] = useState<RankingResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const rankingType = (searchParams.get('type') || 'level') as RankingType
  const vocation = searchParams.get('vocation') || 'all'

  const fetchRanking = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({
        type: rankingType,
        vocation,
        page: currentPage.toString(),
        limit: '50',
      })
      if (search) {
        params.append('search', search)
      }

      const response = await api.get<ApiResponse<RankingResponse>>(
        `/ranking?${params.toString()}`,
        { public: true }
      )
      if (response && response.data) {
        setRanking(response.data)
      }
    } catch (err: any) {
      setError(err.message || 'Error loading ranking')
    } finally {
      setLoading(false)
    }
  }, [rankingType, vocation, currentPage, search])

  useEffect(() => {
    fetchRanking()
  }, [fetchRanking])

  const handleTypeChange = (type: RankingType) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('type', type)
    params.delete('page')
    router.push(`/community/ranking?${params.toString()}`)
    setCurrentPage(1)
  }

  const handleVocationChange = (voc: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('vocation', voc)
    params.delete('page')
    router.push(`/community/ranking?${params.toString()}`)
    setCurrentPage(1)
  }

  const handleSearch = () => {
    setCurrentPage(1)
    fetchRanking()
  }

  const getValueLabel = () => {
    const typeMap: Record<RankingType, string> = {
      level: 'Level',
      magiclevel: 'ML',
      club: 'Club',
      axe: 'Axe',
      sword: 'Sword',
      shielding: 'Shielding',
      distance: 'Distance',
      fist: 'Fist',
      fishing: 'Fishing',
    }
    return typeMap[rankingType] || 'Value'
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-[#ffd700] to-[#ffed4e] rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-3xl">🏆</span>
            </div>
            <div>
              <h1 className="text-4xl font-bold text-[#ffd700] mb-2">Ranking</h1>
              <p className="text-[#888]">Top players by different categories</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/30 border-2 border-red-600 rounded-lg p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        <div className="bg-[#252525]/95 backdrop-blur-sm rounded-xl border-2 border-[#404040]/60 p-6 shadow-2xl mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="md:col-span-2">
              <div className="flex flex-wrap gap-2">
                {RANKING_TYPES.map((item) => (
                  <button
                    key={item.type}
                    onClick={() => handleTypeChange(item.type)}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                      rankingType === item.type
                        ? 'bg-[#ffd700] text-[#0a0a0a] shadow-lg'
                        : 'bg-[#1a1a1a] text-[#e0e0e0] hover:bg-[#2a2a2a]'
                    }`}
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={vocation}
                onChange={(e) => handleVocationChange(e.target.value)}
                className="flex-1 bg-[#1a1a1a] border border-[#404040] rounded-lg px-3 py-2 text-[#e0e0e0] focus:outline-none focus:border-[#ffd700]"
              >
                {VOCATIONS.map((voc) => (
                  <option key={voc.value} value={voc.value}>
                    {voc.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2 mb-6">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search player name..."
              className="flex-1 bg-[#1a1a1a] border border-[#404040] rounded-lg px-4 py-2 text-[#e0e0e0] placeholder-[#666] focus:outline-none focus:border-[#ffd700]"
            />
            <button
              onClick={handleSearch}
              className="px-6 py-2 bg-[#ffd700] hover:bg-[#ffed4e] text-[#0a0a0a] rounded-lg font-bold transition-all"
            >
              Search
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#ffd700] mb-4" />
              <p className="text-[#888]">Loading ranking...</p>
            </div>
          </div>
        ) : ranking && ranking.players.length > 0 ? (
          <>
            <div className="bg-[#252525]/95 backdrop-blur-sm rounded-xl border-2 border-[#404040]/60 shadow-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#1a1a1a] border-b-2 border-[#404040]">
                    <tr>
                      <th className="px-6 py-4 text-left text-[#ffd700] font-bold text-sm uppercase tracking-wide">#</th>
                      <th className="px-6 py-4 text-left text-[#ffd700] font-bold text-sm uppercase tracking-wide">Player</th>
                      <th className="px-6 py-4 text-left text-[#ffd700] font-bold text-sm uppercase tracking-wide">Vocation</th>
                      {rankingType === 'level' && (
                        <th className="px-6 py-4 text-right text-[#ffd700] font-bold text-sm uppercase tracking-wide">Level</th>
                      )}
                      <th className="px-6 py-4 text-right text-[#ffd700] font-bold text-sm uppercase tracking-wide">{getValueLabel()}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranking.players.map((player, index) => (
                      <tr
                        key={`${player.name}-${index}`}
                        className="border-b border-[#404040]/30 hover:bg-[#1a1a1a]/50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <span className={`text-lg font-bold ${
                              player.rank === 1 ? 'text-[#ffd700]' :
                              player.rank === 2 ? 'text-[#c0c0c0]' :
                              player.rank === 3 ? 'text-[#cd7f32]' :
                              'text-[#888]'
                            }`}>
                              {player.rank === 1 ? '🥇' : player.rank === 2 ? '🥈' : player.rank === 3 ? '🥉' : player.rank}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Link
                            href={`/characters/${player.name}`}
                            className="flex items-center gap-3 hover:text-[#ffd700] transition-colors group"
                          >
                            <div className="w-12 h-12 flex items-end justify-start flex-shrink-0 bg-[#0a0a0a]/50 rounded border border-[#404040]/30 overflow-hidden pb-1">
                              {player.lookType > 0 ? (
                                <img
                                  src={makeOutfit({
                                    id: player.lookType,
                                    addons: player.lookAddons,
                                    head: player.lookHead,
                                    body: player.lookBody,
                                    legs: player.lookLegs,
                                    feet: player.lookFeet,
                                  })}
                                  alt={player.name}
                                  className="w-full h-full object-contain object-bottom"
                                  style={{ transform: 'scale(1.5) translateX(-8px) translateY(-6px)' }}
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                  }}
                                />
                              ) : (
                                <span className="text-2xl">👤</span>
                              )}
                            </div>
                            <span className="font-semibold text-white group-hover:text-[#ffd700]">
                              {player.name}
                            </span>
                          </Link>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[#e0e0e0]">{player.vocation}</span>
                        </td>
                        {rankingType === 'level' && (
                          <td className="px-6 py-4 text-right">
                            <span className="text-[#e0e0e0] font-semibold">{player.level}</span>
                          </td>
                        )}
                        <td className="px-6 py-4 text-right">
                          <span className="text-[#ffd700] font-bold">{player.value}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {ranking && ranking.pagination && ranking.pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-[#1a1a1a] border border-[#404040] rounded-lg text-[#e0e0e0] hover:bg-[#2a2a2a] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-[#e0e0e0]">
                  Page {ranking.pagination.page} of {ranking.pagination.totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(ranking.pagination.totalPages, p + 1))}
                  disabled={currentPage === ranking.pagination.totalPages}
                  className="px-4 py-2 bg-[#1a1a1a] border border-[#404040] rounded-lg text-[#e0e0e0] hover:bg-[#2a2a2a] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="bg-[#252525]/95 backdrop-blur-sm rounded-xl border-2 border-[#404040]/60 p-12 text-center">
            <p className="text-[#888] text-lg">No players found</p>
          </div>
        )}
      </div>
    </div>
  )
}

