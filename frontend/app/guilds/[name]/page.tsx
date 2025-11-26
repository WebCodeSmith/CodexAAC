'use client'

import { useState, useEffect, useCallback, memo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '../../services/api'
import type { ApiResponse } from '../../types/account'
import type { GuildDetails, GuildMember, PendingInviteItem, InvitePlayerRequest, AcceptInviteRequest, LeaveGuildRequest, KickPlayerRequest } from '../../types/guild'

const getRankBadgeColor = (rank: string) => {
    const rankLower = rank.toLowerCase()
    if (rankLower.includes('leader') && !rankLower.includes('vice')) {
        return 'bg-gradient-to-r from-[#ffd700] to-[#ffed4e] text-[#1a1a1a] border-[#ffd700]'
    } else if (rankLower.includes('vice')) {
        return 'bg-gradient-to-r from-[#3b82f6] to-[#60a5fa] text-white border-[#3b82f6]'
    } else {
        return 'bg-[#404040] text-[#e0e0e0] border-[#505050]'
    }
}

// Memoized MemberCard component
const MemberCard = memo(({ 
    member, 
    canKick, 
    isOwner, 
    onKick 
}: { 
    member: GuildMember
    canKick: boolean
    isOwner: boolean
    onKick: (member: GuildMember) => void
}) => (
    <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#404040]/40 hover:border-[#ffd700]/30 transition-all">
        <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-xs font-bold border ${getRankBadgeColor(member.rank)}`}>
                    {member.rank}
                </span>
                <Link
                    href={`/characters/${encodeURIComponent(member.name)}`}
                    className="text-[#3b82f6] hover:text-[#60a5fa] font-semibold transition-colors"
                >
                    {member.name}
                </Link>
            </div>
            <div className="flex items-center gap-2">
                <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                        member.status === 'online'
                            ? 'bg-green-900/30 text-green-400 border border-green-600'
                            : 'bg-[#404040] text-[#888]'
                    }`}
                >
                    {member.status === 'online' ? '● Online' : '○ Offline'}
                </span>
                {canKick && !isOwner && (
                    <button
                        onClick={() => onKick(member)}
                        className="px-2 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded text-xs font-semibold transition-all border border-red-600/30"
                        title="Kick player"
                    >
                        ✕
                    </button>
                )}
            </div>
        </div>
        <div className="flex items-center gap-3 text-sm text-[#888]">
            <span>Level {member.level}</span>
            <span>•</span>
            <span>{member.vocation}</span>
            {member.nick && (
                <>
                    <span>•</span>
                    <span className="text-[#ffd700]">"{member.nick}"</span>
                </>
            )}
        </div>
    </div>
))
MemberCard.displayName = 'MemberCard'

// Memoized PendingInviteCard component
const PendingInviteCard = memo(({ invite }: { invite: PendingInviteItem }) => {
    const inviteDate = new Date(invite.inviteDate * 1000)
    const formattedDate = inviteDate.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    })
    
    return (
        <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#404040]/40">
            <div className="flex items-center justify-between mb-2">
                <Link
                    href={`/characters/${encodeURIComponent(invite.playerName)}`}
                    className="text-[#3b82f6] hover:text-[#60a5fa] font-semibold transition-colors"
                >
                    {invite.playerName}
                </Link>
            </div>
            <div className="flex items-center gap-3 text-sm text-[#888]">
                <span>Level {invite.level}</span>
                <span>•</span>
                <span>{invite.vocation}</span>
            </div>
            <div className="mt-2 text-xs text-[#666]">
                Invited: {formattedDate}
            </div>
        </div>
    )
})
PendingInviteCard.displayName = 'PendingInviteCard'

export default function GuildDetailsPage() {
    const params = useParams()
    const router = useRouter()
    const guildName = params.name as string

    const [guild, setGuild] = useState<GuildDetails | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [showInviteModal, setShowInviteModal] = useState(false)
    const [invitePlayerName, setInvitePlayerName] = useState('')
    const [inviteLoading, setInviteLoading] = useState(false)
    const [inviteError, setInviteError] = useState('') // Separate error state for invite modal
    const [showLeaveModal, setShowLeaveModal] = useState(false) // Modal for leave confirmation
    const [showKickModal, setShowKickModal] = useState(false) // Modal for kick confirmation
    const [playerToKick, setPlayerToKick] = useState<GuildMember | null>(null) // Player to be kicked

    const fetchGuildDetails = useCallback(async () => {
        if (!guildName) return
        
        try {
            setLoading(true)
            setError('')
            const response = await api.get<ApiResponse<GuildDetails>>(
                `/guilds/${encodeURIComponent(guildName)}`
            )
            if (response && response.data) {
                setGuild(response.data)
            }
        } catch (err: any) {
            if (err.status === 404) {
                setError('Guild not found')
            } else {
                setError(err.message || 'Error loading guild details')
            }
        } finally {
            setLoading(false)
        }
    }, [guildName])

    useEffect(() => {
        fetchGuildDetails()
    }, [fetchGuildDetails])

    const sortedMembers = guild?.members
        ? [...guild.members].sort((a, b) => {
            if (a.rankLevel !== b.rankLevel) {
                return b.rankLevel - a.rankLevel
            }
            if (a.level !== b.level) {
                return b.level - a.level
            }
            return a.name.localeCompare(b.name)
        })
        : []

    const sortedPendingInvites = guild?.pendingInvites
        ? [...guild.pendingInvites].sort((a, b) => b.inviteDate - a.inviteDate)
        : []

    const closeInviteModal = useCallback(() => {
        setShowInviteModal(false)
        setInvitePlayerName('')
        setInviteError('')
    }, [])

    const handleInvitePlayer = useCallback(async (e: React.FormEvent) => {
        e.preventDefault()
        if (!invitePlayerName.trim() || !guild) return

        setInviteLoading(true)
        setInviteError('')
        setSuccess('')

        try {
            await api.post<ApiResponse<{ message: string }>>(
                `/guilds/${encodeURIComponent(guild.name)}/invite`,
                { playerName: invitePlayerName.trim() } as InvitePlayerRequest
            )
            setSuccess('Player invited successfully!')
            closeInviteModal()
            fetchGuildDetails()
        } catch (err: any) {
            setInviteError(err.message || 'Error inviting player')
        } finally {
            setInviteLoading(false)
        }
    }, [invitePlayerName, guild, fetchGuildDetails, closeInviteModal])

    const handleAcceptInvite = useCallback(async () => {
        if (!guild) return

        setInviteLoading(true)
        setError('')
        setSuccess('')

        try {
            await api.post<ApiResponse<{ message: string }>>(
                `/guilds/${encodeURIComponent(guild.name)}/accept-invite`,
                { guildName: guild.name } as AcceptInviteRequest
            )
            setSuccess('You have joined the guild successfully!')
            fetchGuildDetails()
        } catch (err: any) {
            setError(err.message || 'Error accepting invite')
        } finally {
            setInviteLoading(false)
        }
    }, [guild, fetchGuildDetails])

    const handleLeaveGuildClick = useCallback(() => {
        setShowLeaveModal(true)
    }, [])

    const handleLeaveGuild = useCallback(async () => {
        if (!guild) return

        setInviteLoading(true)
        setError('')
        setSuccess('')
        setShowLeaveModal(false)

        try {
            await api.post<ApiResponse<{ message: string }>>(
                `/guilds/${encodeURIComponent(guild.name)}/leave`,
                { guildName: guild.name } as LeaveGuildRequest
            )
            setSuccess('You have left the guild successfully!')
            setTimeout(() => {
                router.push('/guilds')
            }, 2000)
        } catch (err: any) {
            setError(err.message || 'Error leaving guild')
        } finally {
            setInviteLoading(false)
        }
    }, [guild, router])

    const closeLeaveModal = useCallback(() => {
        setShowLeaveModal(false)
    }, [])

    const handleKickPlayerClick = useCallback((member: GuildMember) => {
        setPlayerToKick(member)
        setShowKickModal(true)
    }, [])

    const handleKickPlayer = useCallback(async () => {
        if (!guild || !playerToKick) return

        setInviteLoading(true)
        setError('')
        setSuccess('')
        setShowKickModal(false)

        try {
            await api.post<ApiResponse<{ message: string }>>(
                `/guilds/${encodeURIComponent(guild.name)}/kick`,
                { guildName: guild.name, playerName: playerToKick.name } as KickPlayerRequest
            )
            setSuccess(`${playerToKick.name} has been kicked from the guild successfully!`)
            setPlayerToKick(null)
            fetchGuildDetails()
        } catch (err: any) {
            setError(err.message || 'Error kicking player')
        } finally {
            setInviteLoading(false)
        }
    }, [guild, playerToKick, fetchGuildDetails])

    const closeKickModal = useCallback(() => {
        setShowKickModal(false)
        setPlayerToKick(null)
    }, [])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#ffd700] mb-4"></div>
                    <p className="text-[#888]">Loading guild details...</p>
                </div>
            </div>
        )
    }

    if (error || !guild) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="max-w-md mx-auto px-4">
                    <div className="bg-[#252525]/95 backdrop-blur-sm rounded-xl border-2 border-red-600/50 p-8 text-center">
                        <span className="text-6xl mb-4 block">🛡️</span>
                        <h2 className="text-2xl font-bold text-red-400 mb-2">Guild Not Found</h2>
                        <p className="text-[#888] mb-6">{error || 'The guild you are looking for does not exist.'}</p>
                        <Link
                            href="/guilds"
                            className="inline-block px-6 py-3 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg font-bold transition-all"
                        >
                            Back to Guilds
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen">
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Back Button */}
                <Link
                    href="/guilds"
                    className="inline-flex items-center gap-2 text-[#3b82f6] hover:text-[#60a5fa] mb-6 transition-colors"
                >
                    <span>←</span>
                    <span>Back to Guilds</span>
                </Link>

                {/* Success/Error Messages */}
                {success && (
                    <div className="bg-green-900/30 border-2 border-green-600 rounded-lg p-4 mb-6">
                        <p className="text-green-400">{success}</p>
                    </div>
                )}
                {error && (
                    <div className="bg-red-900/30 border-2 border-red-600 rounded-lg p-4 mb-6">
                        <p className="text-red-400">{error}</p>
                    </div>
                )}

                {/* Guild Header */}
                <div className="bg-[#252525]/95 backdrop-blur-sm rounded-xl border-2 border-[#505050]/70 p-8 shadow-2xl mb-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                        <div className="flex items-center gap-6">
                            <div className="w-20 h-20 bg-gradient-to-br from-[#ffd700] to-[#ffed4e] rounded-xl flex items-center justify-center shadow-lg text-5xl">
                                🛡️
                            </div>
                            <div>
                                <h1 className="text-4xl font-bold text-[#ffd700] mb-2">{guild.name}</h1>
                                <div className="flex flex-wrap items-center gap-3">
                                    <span className="px-3 py-1 bg-[#3b82f6]/20 text-[#3b82f6] rounded-lg border border-[#3b82f6]/30 font-semibold">
                                        Level {guild.level}
                                    </span>
                                    <span className="px-3 py-1 bg-[#ffd700]/20 text-[#ffd700] rounded-lg border border-[#ffd700]/30 font-semibold">
                                        {guild.points.toLocaleString()} Points
                                    </span>
                                    <span className="px-3 py-1 bg-[#10b981]/20 text-[#10b981] rounded-lg border border-[#10b981]/30 font-semibold">
                                        {guild.memberCount} Members
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            {guild.hasPendingInvite && !guild.isMember && (
                                <button
                                    onClick={handleAcceptInvite}
                                    disabled={inviteLoading}
                                    className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {inviteLoading ? 'Accepting...' : 'Accept Invite'}
                                </button>
                            )}
                            {guild.isMember && (
                                <button
                                    onClick={handleLeaveGuildClick}
                                    disabled={inviteLoading}
                                    className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {inviteLoading ? 'Leaving...' : 'Leave Guild'}
                                </button>
                            )}
                            {(guild.canInvite === true) && (
                                <button
                                    onClick={() => setShowInviteModal(true)}
                                    className="px-6 py-3 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg font-bold transition-all"
                                >
                                    Invite Player
                                </button>
                            )}
                        </div>
                    </div>

                    {/* MOTD */}
                    {guild.motd && (
                        <div className="mt-6 pt-6 border-t border-[#404040]/60">
                            <h3 className="text-sm font-semibold text-[#888] mb-2 uppercase tracking-wide">Message of the Day</h3>
                            <p className="text-[#e0e0e0] italic">{guild.motd}</p>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content - Members */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Guild Information */}
                        <div className="bg-[#252525]/95 backdrop-blur-sm rounded-xl border-2 border-[#505050]/70 p-6 shadow-2xl">
                            <h2 className="text-2xl font-bold text-[#ffd700] mb-4">Guild Information</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <span className="text-sm text-[#888] block mb-1">Owner</span>
                                    <span className="text-[#e0e0e0] font-medium">{guild.ownerName}</span>
                                </div>
                                <div>
                                    <span className="text-sm text-[#888] block mb-1">Created</span>
                                    <span className="text-[#e0e0e0] font-medium">{guild.createdAt}</span>
                                </div>
                                <div>
                                    <span className="text-sm text-[#888] block mb-1">Balance</span>
                                    <span className="text-[#e0e0e0] font-medium">{guild.balance.toLocaleString()} gold</span>
                                </div>
                                <div>
                                    <span className="text-sm text-[#888] block mb-1">Total Members</span>
                                    <span className="text-[#e0e0e0] font-medium">{guild.memberCount}</span>
                                </div>
                            </div>
                        </div>

                        {/* Members */}
                        <div className="bg-[#252525]/95 backdrop-blur-sm rounded-xl border-2 border-[#505050]/70 p-6 shadow-2xl">
                            <h2 className="text-2xl font-bold text-[#ffd700] mb-6">
                                Members ({sortedMembers.length})
                            </h2>
                            {sortedMembers.length === 0 ? (
                                <p className="text-[#888] text-center py-8">No members found</p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {sortedMembers.map((member) => (
                                        <MemberCard 
                                            key={member.playerId} 
                                            member={member}
                                            canKick={guild.canInvite === true}
                                            isOwner={member.playerId === guild.ownerId}
                                            onKick={handleKickPlayerClick}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar - Pending Invites */}
                    <div className="space-y-6">
                        <div className="bg-[#252525]/95 backdrop-blur-sm rounded-xl border-2 border-[#505050]/70 p-6 shadow-2xl">
                            <h2 className="text-2xl font-bold text-[#ffd700] mb-4">
                                Pending Invites ({sortedPendingInvites.length})
                            </h2>
                            {!guild.pendingInvites || guild.pendingInvites.length === 0 ? (
                                <p className="text-[#888] text-center py-4">No pending invites</p>
                            ) : (
                                <div className="space-y-3">
                                    {sortedPendingInvites.map((invite) => (
                                        <PendingInviteCard key={invite.playerId} invite={invite} />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Invite Modal */}
            {showInviteModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#252525] rounded-xl border-2 border-[#505050]/70 p-6 max-w-md w-full">
                        <h2 className="text-2xl font-bold text-[#ffd700] mb-4">Invite Player</h2>
                        {inviteError && (
                            <div className="bg-red-900/30 border-2 border-red-600 rounded-lg p-3 mb-4">
                                <p className="text-red-400 text-sm">{inviteError}</p>
                            </div>
                        )}
                        <form onSubmit={handleInvitePlayer} className="space-y-4">
                            <div>
                                <label htmlFor="playerName" className="block text-[#e0e0e0] font-semibold mb-2">
                                    Player Name
                                </label>
                                <input
                                    id="playerName"
                                    type="text"
                                    value={invitePlayerName}
                                    onChange={(e) => {
                                        setInvitePlayerName(e.target.value)
                                        if (inviteError) setInviteError('')
                                    }}
                                    placeholder="Enter player name"
                                    className="w-full bg-[#1a1a1a] border-2 border-[#404040] rounded-lg px-4 py-3 text-[#e0e0e0] focus:outline-none focus:border-[#ffd700] transition-all"
                                    required
                                    autoFocus
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="submit"
                                    disabled={inviteLoading || !invitePlayerName.trim()}
                                    className="flex-1 px-6 py-3 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {inviteLoading ? 'Inviting...' : 'Send Invite'}
                                </button>
                                <button
                                    type="button"
                                    onClick={closeInviteModal}
                                    className="px-6 py-3 bg-[#404040] hover:bg-[#505050] text-white rounded-lg font-bold transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Leave Guild Confirmation Modal */}
            {showLeaveModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#252525] rounded-xl border-2 border-red-600/50 p-6 max-w-md w-full">
                        <div className="text-center mb-6">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-900/30 rounded-full mb-4">
                                <span className="text-3xl">⚠️</span>
                            </div>
                            <h2 className="text-2xl font-bold text-[#ffd700] mb-2">Leave Guild</h2>
                            <p className="text-[#e0e0e0]">
                                Are you sure you want to leave <span className="font-semibold text-[#ffd700]">{guild?.name}</span>?
                            </p>
                            <p className="text-[#888] text-sm mt-2">
                                This action cannot be undone. You will need to be invited again to rejoin.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={handleLeaveGuild}
                                disabled={inviteLoading}
                                className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {inviteLoading ? 'Leaving...' : 'Yes, Leave Guild'}
                            </button>
                            <button
                                type="button"
                                onClick={closeLeaveModal}
                                disabled={inviteLoading}
                                className="px-6 py-3 bg-[#404040] hover:bg-[#505050] text-white rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Kick Player Confirmation Modal */}
            {showKickModal && playerToKick && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#252525] rounded-xl border-2 border-red-600/50 p-6 max-w-md w-full">
                        <div className="text-center mb-6">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-900/30 rounded-full mb-4">
                                <span className="text-3xl">⚠️</span>
                            </div>
                            <h2 className="text-2xl font-bold text-[#ffd700] mb-2">Kick Player</h2>
                            <p className="text-[#e0e0e0]">
                                Are you sure you want to kick <span className="font-semibold text-[#ffd700]">{playerToKick.name}</span> from <span className="font-semibold text-[#ffd700]">{guild?.name}</span>?
                            </p>
                            <p className="text-[#888] text-sm mt-2">
                                This action cannot be undone. The player will need to be invited again to rejoin.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={handleKickPlayer}
                                disabled={inviteLoading}
                                className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {inviteLoading ? 'Kicking...' : 'Yes, Kick Player'}
                            </button>
                            <button
                                type="button"
                                onClick={closeKickModal}
                                disabled={inviteLoading}
                                className="px-6 py-3 bg-[#404040] hover:bg-[#505050] text-white rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

