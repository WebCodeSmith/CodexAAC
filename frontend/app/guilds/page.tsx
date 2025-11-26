'use client'

import { useState, useEffect, useCallback, memo } from 'react'
import Link from 'next/link'
import { api } from '../services/api'
import type { ApiResponse } from '../types/account'
import type { GuildListItem, GuildsResponse } from '../types/guild'

const GUILDS_PER_PAGE = 20

// Memoized GuildCard component to avoid re-renders
const GuildCard = memo(({ guild }: { guild: GuildListItem }) => (
    <Link
        href={`/guilds/${encodeURIComponent(guild.name)}`}
        className="group"
    >
        <div className="bg-[#252525]/95 backdrop-blur-sm rounded-xl border-2 border-[#505050]/70 p-6 shadow-2xl hover:border-[#ffd700]/50 transition-all transform hover:scale-[1.02] h-full flex flex-col">
            {/* Guild Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                    <h3 className="text-2xl font-bold text-[#ffd700] group-hover:text-[#ffed4e] transition-colors mb-1">
                        {guild.name}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-[#888]">
                        <span className="px-2 py-1 bg-[#3b82f6]/20 text-[#3b82f6] rounded border border-[#3b82f6]/30">
                            Level {guild.level}
                        </span>
                    </div>
                </div>
                <div className="text-4xl">🛡️</div>
            </div>

            {/* Guild Info */}
            <div className="space-y-2 mb-4 flex-1">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-[#888]">Owner:</span>
                    <span className="text-[#e0e0e0] font-medium">{guild.ownerName}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                    <span className="text-[#888]">Members:</span>
                    <span className="text-[#e0e0e0] font-medium">{guild.memberCount}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                    <span className="text-[#888]">Points:</span>
                    <span className="text-[#ffd700] font-bold">{guild.points.toLocaleString()}</span>
                </div>
            </div>

            {/* View Details Link */}
            <div className="pt-4 border-t border-[#404040]/60">
                <div className="text-[#3b82f6] text-sm font-medium group-hover:text-[#60a5fa] transition-colors flex items-center gap-2">
                    View Details
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                </div>
            </div>
        </div>
    </Link>
))
GuildCard.displayName = 'GuildCard'

export default function GuildsPage() {
    const [guilds, setGuilds] = useState<GuildListItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [page, setPage] = useState(1)
    const [search, setSearch] = useState('')
    const [pagination, setPagination] = useState({
        page: 1,
        limit: GUILDS_PER_PAGE,
        total: 0,
        totalPages: 0,
    })

    const fetchGuilds = useCallback(async () => {
        setLoading(true)
        setError('')
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: GUILDS_PER_PAGE.toString(),
            })
            if (search.trim()) {
                params.append('search', search.trim())
            }

            const response = await api.get<ApiResponse<GuildsResponse>>(
                `/guilds?${params.toString()}`,
                { public: true }
            )
            if (response && response.data) {
                setGuilds(response.data.guilds || [])
                setPagination(response.data.pagination || {
                    page: 1,
                    limit: GUILDS_PER_PAGE,
                    total: 0,
                    totalPages: 0,
                })
            } else {
                setGuilds([])
            }
        } catch (err: any) {
            setError(err.message || 'Error loading guilds')
        } finally {
            setLoading(false)
        }
    }, [page, search])

    useEffect(() => {
        fetchGuilds()
    }, [fetchGuilds])

    const handleSearch = useCallback((e: React.FormEvent) => {
        e.preventDefault()
        setPage(1)
    }, [])

    const handlePageChange = useCallback((newPage: number) => {
        setPage(newPage)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }, [])

    const handleSearchInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value)
    }, [])

    const paginationInfo = pagination.total
        ? {
            start: ((page - 1) * pagination.limit) + 1,
            end: Math.min(page * pagination.limit, pagination.total),
            total: pagination.total
          }
        : null

    return (
        <div className="min-h-screen">
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-[#ffd700] to-[#ffed4e] rounded-xl flex items-center justify-center shadow-lg">
                            <span className="text-3xl">🛡️</span>
                        </div>
                        <div>
                            <h1 className="text-4xl font-bold text-[#ffd700] mb-2">Guilds</h1>
                            <p className="text-[#888]">Explore all guilds in the server</p>
                        </div>
                    </div>
                    <Link
                        href="/create-guild"
                        className="px-6 py-3 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg font-bold transition-all flex items-center gap-2 shadow-lg"
                    >
                        <span>+</span>
                        <span>Create Guild</span>
                    </Link>
                </div>
            </div>

                {error && (
                    <div className="bg-red-900/30 border-2 border-red-600 rounded-lg p-4 mb-6">
                        <p className="text-red-400">{error}</p>
                    </div>
                )}

                {/* Search Bar */}
                <div className="bg-[#252525]/95 backdrop-blur-sm rounded-xl border-2 border-[#505050]/70 p-6 shadow-2xl mb-6">
                    <form onSubmit={handleSearch} className="flex gap-2">
                        <input
                            type="text"
                            value={search}
                            onChange={handleSearchInputChange}
                            placeholder="Search guilds by name..."
                            className="flex-1 bg-[#1a1a1a] border-2 border-[#404040] rounded-lg px-4 py-3 text-[#e0e0e0] focus:outline-none focus:border-[#ffd700] transition-all placeholder:text-[#666]"
                        />
                        <button
                            type="submit"
                            className="px-6 py-3 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg font-bold transition-all"
                        >
                            Search
                        </button>
                    </form>
                </div>

                {/* Guilds Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Array.from({ length: 6 }, (_, i) => (
                            <div key={i} className="bg-[#252525]/95 rounded-xl p-6 animate-pulse border-2 border-[#505050]/70">
                                <div className="h-6 bg-[#404040] rounded w-3/4 mb-4"></div>
                                <div className="h-4 bg-[#404040] rounded w-1/2 mb-2"></div>
                                <div className="h-4 bg-[#404040] rounded w-1/2"></div>
                            </div>
                        ))}
                    </div>
                ) : !guilds || guilds.length === 0 ? (
                    <div className="bg-[#252525]/95 backdrop-blur-sm rounded-xl border-2 border-[#505050]/70 p-12 text-center">
                        <span className="text-6xl mb-4 block">🛡️</span>
                        <h3 className="text-2xl font-bold text-[#ffd700] mb-2">No Guilds Found</h3>
                        <p className="text-[#888]">
                            {search ? 'Try a different search term' : 'No guilds have been created yet'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                        {guilds.map((guild) => (
                            <GuildCard key={guild.id} guild={guild} />
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {paginationInfo && pagination.totalPages > 1 && (
                    <div className="bg-[#252525]/95 backdrop-blur-sm rounded-xl border-2 border-[#505050]/70 p-6 shadow-2xl">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                            <p className="text-[#888] text-sm">
                                Showing <span className="text-[#ffd700] font-bold">{paginationInfo.start}</span> to{' '}
                                <span className="text-[#ffd700] font-bold">{paginationInfo.end}</span> of{' '}
                                <span className="text-[#ffd700] font-bold">{paginationInfo.total}</span> guilds
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handlePageChange(page - 1)}
                                    disabled={page === 1}
                                    className="px-4 py-2 bg-[#404040] hover:bg-[#505050] text-white rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Previous
                                </button>
                                <div className="px-4 py-2 bg-[#1a1a1a] border-2 border-[#404040] rounded-lg text-[#e0e0e0] font-bold">
                                    Page {page} of {pagination.totalPages}
                                </div>
                                <button
                                    onClick={() => handlePageChange(page + 1)}
                                    disabled={page >= pagination.totalPages}
                                    className="px-4 py-2 bg-[#404040] hover:bg-[#505050] text-white rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

