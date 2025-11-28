'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { api } from '../../services/api'
import { formatDateTime } from '../../utils/date'
import type { ApiResponse } from '../../types/account'
import type { Banishment, BanishmentsResponse, BanishmentType } from '../../types/banishments'

const BANISHMENTS_PER_PAGE = 50

const BANISHMENT_TYPE_LABELS: Record<BanishmentType | 'all', string> = {
    all: 'All',
    account: 'Active Account Bans',
    account_history: 'Ban History',
    ip: 'IP Bans',
}

const BANISHMENT_TYPE_COLORS: Record<BanishmentType, string> = {
    account: 'bg-red-500/20 text-red-400 border-red-500/30',
    account_history: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    ip: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
}

export default function BanishmentsPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [banishments, setBanishments] = useState<Banishment[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [page, setPage] = useState(1)
    const [search, setSearch] = useState('')
    const [banType, setBanType] = useState<BanishmentType | 'all'>('all')
    const [pagination, setPagination] = useState({
        page: 1,
        limit: BANISHMENTS_PER_PAGE,
        total: 0,
        totalPages: 0,
    })

    useEffect(() => {
        const pageParam = searchParams.get('page')
        const searchParam = searchParams.get('search')
        const typeParam = searchParams.get('type')
        
        if (pageParam) {
            const p = parseInt(pageParam, 10)
            if (p > 0) setPage(p)
        }
        if (searchParam) setSearch(searchParam)
        if (typeParam && (typeParam === 'account' || typeParam === 'account_history' || typeParam === 'ip' || typeParam === 'all')) {
            setBanType(typeParam)
        }
    }, [searchParams])

    const fetchBanishments = useCallback(async () => {
        setLoading(true)
        setError('')
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: BANISHMENTS_PER_PAGE.toString(),
            })
            if (search.trim()) {
                params.append('search', search.trim())
            }
            if (banType !== 'all') {
                params.append('type', banType)
            }

            const response = await api.get<ApiResponse<BanishmentsResponse>>(
                `/banishments?${params.toString()}`,
                { public: true }
            )
            if (response && response.data) {
                setBanishments(response.data.banishments || [])
                setPagination(response.data.pagination || {
                    page: 1,
                    limit: BANISHMENTS_PER_PAGE,
                    total: 0,
                    totalPages: 0,
                })
            } else {
                setBanishments([])
            }
        } catch (err: any) {
            setError(err.message || 'Error loading banishments')
        } finally {
            setLoading(false)
        }
    }, [page, search, banType])

    useEffect(() => {
        fetchBanishments()
    }, [fetchBanishments])

    const handleSearch = useCallback((e: React.FormEvent) => {
        e.preventDefault()
        setPage(1)
        const params = new URLSearchParams()
        params.set('page', '1')
        if (search.trim()) params.set('search', search.trim())
        if (banType !== 'all') params.set('type', banType)
        router.push(`/community/banishments?${params.toString()}`)
    }, [search, banType, router])

    const handleTypeChange = useCallback((type: BanishmentType | 'all') => {
        setBanType(type)
        setPage(1)
        const params = new URLSearchParams()
        params.set('page', '1')
        if (search.trim()) params.set('search', search.trim())
        if (type !== 'all') params.set('type', type)
        router.push(`/community/banishments?${params.toString()}`)
    }, [search, router])

    const handlePageChange = useCallback((newPage: number) => {
        setPage(newPage)
        const params = new URLSearchParams()
        params.set('page', newPage.toString())
        if (search.trim()) params.set('search', search.trim())
        if (banType !== 'all') params.set('type', banType)
        router.push(`/community/banishments?${params.toString()}`)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }, [search, banType, router])

    return (
        <div className="min-h-screen">
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-red-600 to-red-800 rounded-xl flex items-center justify-center shadow-lg">
                            <span className="text-3xl">🚫</span>
                        </div>
                        <div>
                            <h1 className="text-4xl font-bold text-[#ffd700] mb-2">Banishments</h1>
                            <p className="text-[#888]">View all account and IP bans</p>
                        </div>
                    </div>
                </div>

                <div className="bg-[#252525]/95 backdrop-blur-sm rounded-xl border-2 border-[#505050]/70 p-6 mb-6 shadow-2xl">
                    <div className="flex flex-wrap gap-2 mb-4">
                        {(['all', 'account', 'account_history', 'ip'] as const).map((type) => (
                            <button
                                key={type}
                                onClick={() => handleTypeChange(type)}
                                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                                    banType === type
                                        ? 'bg-[#ffd700] text-[#1a1a1a] shadow-lg'
                                        : 'bg-[#1f1f1f] text-[#e0e0e0] hover:bg-[#2a2a2a]'
                                }`}
                            >
                                {BANISHMENT_TYPE_LABELS[type]}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={handleSearch} className="flex gap-2">
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by player name..."
                            className="flex-1 px-4 py-2 bg-[#1f1f1f] border-2 border-[#404040] rounded-lg text-[#e0e0e0] focus:outline-none focus:border-[#ffd700] transition-colors"
                        />
                        <button
                            type="submit"
                            className="px-6 py-2 bg-[#ffd700] text-[#1a1a1a] rounded-lg font-medium hover:bg-[#ffed4e] transition-colors"
                        >
                            Search
                        </button>
                    </form>
                </div>

                {error && (
                    <div className="bg-red-500/20 border-2 border-red-500/50 rounded-lg p-4 mb-6 text-red-400">
                        {error}
                    </div>
                )}

                {loading && (
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#ffd700]"></div>
                        <p className="mt-4 text-[#888]">Loading banishments...</p>
                    </div>
                )}

                {!loading && !error && (
                    <>
                        {banishments.length === 0 ? (
                            <div className="bg-[#252525]/95 backdrop-blur-sm rounded-xl border-2 border-[#505050]/70 p-12 text-center">
                                <p className="text-[#888] text-lg">No banishments found</p>
                            </div>
                        ) : (
                            <div className="bg-[#252525]/95 backdrop-blur-sm rounded-xl border-2 border-[#505050]/70 shadow-2xl overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-[#1f1f1f] border-b-2 border-[#404040]">
                                            <tr>
                                                <th className="px-6 py-4 text-left text-sm font-semibold text-[#ffd700]">Type</th>
                                                <th className="px-6 py-4 text-left text-sm font-semibold text-[#ffd700]">Player</th>
                                                <th className="px-6 py-4 text-left text-sm font-semibold text-[#ffd700]">Reason</th>
                                                <th className="px-6 py-4 text-left text-sm font-semibold text-[#ffd700]">Banned By</th>
                                                <th className="px-6 py-4 text-left text-sm font-semibold text-[#ffd700]">Banned At</th>
                                                <th className="px-6 py-4 text-left text-sm font-semibold text-[#ffd700]">Expires At</th>
                                                <th className="px-6 py-4 text-left text-sm font-semibold text-[#ffd700]">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#404040]/50">
                                            {banishments.map((ban, index) => (
                                                <tr
                                                    key={`${ban.type}-${ban.id || index}`}
                                                    className="hover:bg-[#1f1f1f]/50 transition-colors"
                                                >
                                                    <td className="px-6 py-4">
                                                        <span className={`px-3 py-1 rounded-lg text-xs font-medium border ${BANISHMENT_TYPE_COLORS[ban.type]}`}>
                                                            {BANISHMENT_TYPE_LABELS[ban.type]}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-[#e0e0e0] font-medium">
                                                        {ban.accountName}
                                                    </td>
                                                    <td className="px-6 py-4 text-[#e0e0e0] max-w-md truncate" title={ban.reason}>
                                                        {ban.reason}
                                                    </td>
                                                    <td className="px-6 py-4 text-[#888]">
                                                        {ban.bannedByName}
                                                    </td>
                                                    <td className="px-6 py-4 text-[#888] text-sm">
                                                        {formatDateTime(ban.bannedAt, 'Permanent')}
                                                    </td>
                                                    <td className="px-6 py-4 text-[#888] text-sm">
                                                        {formatDateTime(ban.expiresAt, 'Permanent')}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {ban.isActive ? (
                                                            <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-xs font-medium border border-red-500/30">
                                                                Active
                                                            </span>
                                                        ) : (
                                                            <span className="px-3 py-1 bg-gray-500/20 text-gray-400 rounded-lg text-xs font-medium border border-gray-500/30">
                                                                {ban.type === 'account_history' ? 'Expired' : ban.expiresAt === 0 ? 'Permanent' : 'Expired'}
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {pagination && pagination.totalPages > 1 && (
                            <div className="flex items-center justify-center gap-2 mt-6">
                                <button
                                    onClick={() => handlePageChange(page - 1)}
                                    disabled={page === 1}
                                    className="px-4 py-2 bg-[#1f1f1f] border-2 border-[#404040] rounded-lg text-[#e0e0e0] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#2a2a2a] transition-colors"
                                >
                                    Previous
                                </button>
                                <span className="px-4 py-2 text-[#888]">
                                    Page {pagination.page} of {pagination.totalPages}
                                </span>
                                <button
                                    onClick={() => handlePageChange(page + 1)}
                                    disabled={page >= pagination.totalPages}
                                    className="px-4 py-2 bg-[#1f1f1f] border-2 border-[#404040] rounded-lg text-[#e0e0e0] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#2a2a2a] transition-colors"
                                >
                                    Next
                                </button>
                            </div>
                        )}

                        {pagination.total > 0 && (
                            <div className="text-center mt-4 text-[#888] text-sm">
                                Showing {((page - 1) * pagination.limit) + 1} to {Math.min(page * pagination.limit, pagination.total)} of {pagination.total} banishments
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
