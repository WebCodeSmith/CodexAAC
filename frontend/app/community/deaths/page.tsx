'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '../../services/api'
import type { ApiResponse } from '../../types/account'
import type { Death, DeathsResponse } from '../../types/deaths'
import { makeOutfit } from '../../utils/outfit'
import { formatDateTime } from '../../utils/date'
import type { JSX } from 'react'

export default function DeathsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [deaths, setDeaths] = useState<DeathsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const currentPage = parseInt(searchParams.get('page') || '1', 10)

  const fetchDeaths = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '50',
      })
      if (search) {
        params.append('search', search)
      }

      const response = await api.get<ApiResponse<DeathsResponse>>(
        `/deaths?${params.toString()}`,
        { public: true }
      )
      if (response?.data) {
        setDeaths(response.data)
      }
    } catch (err: any) {
      setError(err.message || 'Error loading deaths')
    } finally {
      setLoading(false)
    }
  }, [currentPage, search])

  useEffect(() => {
    fetchDeaths()
  }, [fetchDeaths])

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', newPage.toString())
    router.push(`/community/deaths?${params.toString()}`)
  }

  const handleSearch = () => {
    const params = new URLSearchParams()
    if (search) {
      params.set('search', search)
    }
    params.delete('page')
    router.push(`/community/deaths?${params.toString()}`)
  }

  const formatDeathDescription = (death: Death): JSX.Element => {
    const parts: string[] = []
    const segments = death.killedBy.split(', ')
    
    segments.forEach((segment) => {
      if (segment.includes(' e ')) {
        const [before, ...after] = segment.split(' e ')
        if (before) parts.push(before.trim())
        after.forEach(a => parts.push(a.trim()))
      } else {
        parts.push(segment.trim())
      }
    })

    const action = death.isPlayer ? 'Killed' : 'Died'
    const levelText = `at level ${death.level} by`
    
    return (
      <span>
        {action} {levelText}{' '}
        {parts.map((part, idx) => {
          const isPlayerName = /^[A-Z][a-zA-Z\s]+$/.test(part) && !/^(A|An|The)\s/.test(part)
          
          return (
            <span key={idx}>
              {isPlayerName ? (
                <Link
                  href={`/characters/${part}`}
                  className="text-[#3b82f6] hover:text-[#60a5fa] hover:underline"
                >
                  {part}
                </Link>
              ) : (
                <span>{part}</span>
              )}
              {idx < parts.length - 2 && ', '}
              {idx === parts.length - 2 && ' and '}
            </span>
          )
        })}
      </span>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-[#8b0000] to-[#cc0000] rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-3xl">💀</span>
            </div>
            <div>
              <h1 className="text-4xl font-bold text-[#ffd700] mb-2">Latest Deaths</h1>
              <p className="text-[#888]">Recent player deaths on the server</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/30 border-2 border-red-600 rounded-lg p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        <div className="bg-[#252525]/95 backdrop-blur-sm rounded-xl border-2 border-[#404040]/60 p-6 shadow-2xl mb-6">
          <div className="flex gap-2 mb-6">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search by player name..."
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
              <p className="text-[#888]">Loading deaths...</p>
            </div>
          </div>
        ) : deaths?.deaths && deaths.deaths.length > 0 ? (
          <>
            <div className="bg-[#252525]/95 backdrop-blur-sm rounded-xl border-2 border-[#404040]/60 shadow-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#1a1a1a] border-b-2 border-[#404040]">
                    <tr>
                      <th className="px-6 py-4 text-left text-[#ffd700] font-bold text-sm uppercase tracking-wide">Player</th>
                      <th className="px-6 py-4 text-left text-[#ffd700] font-bold text-sm uppercase tracking-wide">Level</th>
                      <th className="px-6 py-4 text-left text-[#ffd700] font-bold text-sm uppercase tracking-wide">Death</th>
                      <th className="px-6 py-4 text-left text-[#ffd700] font-bold text-sm uppercase tracking-wide">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deaths.deaths?.map((death, index) => (
                      <tr
                        key={`${death.playerName}-${death.time}-${index}`}
                        className="border-b border-[#404040]/30 hover:bg-[#1a1a1a]/50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <Link
                            href={`/characters/${death.playerName}`}
                            className="flex items-center gap-3 hover:text-[#ffd700] transition-colors group"
                          >
                            <div className="w-12 h-12 flex items-end justify-start flex-shrink-0 bg-[#0a0a0a]/50 rounded border border-[#404040]/30 overflow-hidden pb-1">
                              {death.lookType > 0 ? (
                                <img
                                  src={makeOutfit({
                                    id: death.lookType,
                                    addons: death.lookAddons,
                                    head: death.lookHead,
                                    body: death.lookBody,
                                    legs: death.lookLegs,
                                    feet: death.lookFeet,
                                  })}
                                  alt={death.playerName}
                                  className="w-full h-full object-contain object-bottom"
                                  style={{ transform: 'scale(1.5) translateX(-8px) translateY(-6px)' }}
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[#666] text-xs">
                                  No outfit
                                </div>
                              )}
                            </div>
                            <span className="font-semibold text-[#e0e0e0] group-hover:text-[#ffd700]">
                              {death.playerName}
                            </span>
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-[#e0e0e0]">
                          {death.level}
                        </td>
                        <td className="px-6 py-4 text-[#e0e0e0]">
                          {formatDeathDescription(death)}
                        </td>
                        <td className="px-6 py-4 text-[#888] text-sm">
                          {formatDateTime(death.time)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {deaths?.pagination && deaths.pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-[#1a1a1a] border border-[#404040] rounded-lg text-[#e0e0e0] hover:bg-[#2a2a2a] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-[#e0e0e0]">
                  Page {currentPage} of {deaths.pagination.totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(Math.min(deaths.pagination.totalPages, currentPage + 1))}
                  disabled={currentPage === deaths.pagination.totalPages}
                  className="px-4 py-2 bg-[#1a1a1a] border border-[#404040] rounded-lg text-[#e0e0e0] hover:bg-[#2a2a2a] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="bg-[#252525]/95 backdrop-blur-sm rounded-xl border-2 border-[#404040]/60 p-12 text-center">
            <p className="text-[#888] text-lg">No deaths found</p>
          </div>
        )}
      </div>
    </div>
  )
}

