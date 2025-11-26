'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '../services/api'
import type { ApiResponse } from '../types/account'
import type { Character } from '../types/character'
import type { CreateGuildResponse } from '../types/guild'

const GUILD_NAME_MIN_LENGTH = 3
const GUILD_NAME_MAX_LENGTH = 20
const GUILD_NAME_REGEX = /^[a-zA-Z0-9\s]+$/
const MOTD_MAX_LENGTH = 255

export default function CreateGuildPage() {
    const router = useRouter()
    const [characters, setCharacters] = useState<Character[]>([])
    const [loadingCharacters, setLoadingCharacters] = useState(true)
    const [formData, setFormData] = useState({
        guildName: '',
        characterName: '',
        motd: '',
    })
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const [loading, setLoading] = useState(false)

    const fetchCharacters = useCallback(async () => {
        try {
            setLoadingCharacters(true)
            const response = await api.get<ApiResponse<Character[]>>('/characters')
            if (response && response.data) {
                setCharacters(response.data)
                setFormData(prev => {
                    if (response.data.length > 0 && !prev.characterName) {
                        return { ...prev, characterName: response.data[0].name }
                    }
                    return prev
                })
            }
        } catch (err: any) {
            if (err.status !== 401) {
                setError('Error loading characters')
            }
        } finally {
            setLoadingCharacters(false)
        }
    }, [])

    useEffect(() => {
        fetchCharacters()
    }, [fetchCharacters])

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: value
        }))
        if (error) {
            setError('')
        }
    }, [error])

    const validateForm = useCallback((data: typeof formData) => {
        if (!data.guildName || !data.characterName) {
            setError('Please fill in all required fields')
            return false
        }

        if (data.guildName.length < GUILD_NAME_MIN_LENGTH || data.guildName.length > GUILD_NAME_MAX_LENGTH) {
            setError(`Guild name must be between ${GUILD_NAME_MIN_LENGTH} and ${GUILD_NAME_MAX_LENGTH} characters`)
            return false
        }

        if (!GUILD_NAME_REGEX.test(data.guildName)) {
            setError('Guild name must contain only letters, numbers, and spaces')
            return false
        }

        if (data.motd && data.motd.length > MOTD_MAX_LENGTH) {
            setError(`Message of the Day must be at most ${MOTD_MAX_LENGTH} characters`)
            return false
        }

        return true
    }, [])

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setSuccess(false)

        if (!validateForm(formData)) {
            return
        }

        setLoading(true)

        try {
            const response = await api.post<ApiResponse<CreateGuildResponse>>('/guilds', {
                name: formData.guildName.trim(),
                characterName: formData.characterName,
                motd: formData.motd.trim() || undefined,
            })

            if (response && response.data) {
                setSuccess(true)
                setTimeout(() => {
                    router.push(`/guilds/${encodeURIComponent(response.data.name)}`)
                }, 2000)
            }
        } catch (err: any) {
            if (err.status !== 401) {
                setError(err.message || 'Error creating guild. Please try again.')
            }
        } finally {
            setLoading(false)
        }
    }, [formData, validateForm, router])

    const availableCharacters = characters

    if (loadingCharacters) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#ffd700] mb-4"></div>
                    <p className="text-[#888]">Loading characters...</p>
                </div>
            </div>
        )
    }

    if (characters.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="max-w-md mx-auto px-4">
                    <div className="bg-[#252525]/95 backdrop-blur-sm rounded-xl border-2 border-[#505050]/70 p-8 text-center">
                        <span className="text-6xl mb-4 block">🛡️</span>
                        <h2 className="text-2xl font-bold text-[#ffd700] mb-2">No Characters Found</h2>
                        <p className="text-[#888] mb-6">You need at least one character to create a guild.</p>
                        <Link
                            href="/create-character"
                            className="inline-block px-6 py-3 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg font-bold transition-all"
                        >
                            Create Character
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center py-8">
            <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Back Button */}
                <Link
                    href="/guilds"
                    className="inline-flex items-center gap-2 text-[#3b82f6] hover:text-[#60a5fa] mb-6 transition-colors"
                >
                    <span>←</span>
                    <span>Back to Guilds</span>
                </Link>

                {/* Header */}
                <div className="mb-8 text-center">
                    <div className="flex items-center justify-center gap-4 mb-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-[#ffd700] to-[#ffed4e] rounded-xl flex items-center justify-center shadow-lg">
                            <span className="text-3xl">🛡️</span>
                        </div>
                        <div>
                            <h1 className="text-4xl font-bold text-[#ffd700] mb-2">Create Guild</h1>
                            <p className="text-[#888]">Start your own guild and build a community</p>
                        </div>
                    </div>
                </div>

                {success && (
                    <div className="bg-green-900/30 border-2 border-green-600 rounded-lg p-4 mb-6">
                        <p className="text-green-400">
                            ✅ Guild created successfully! Redirecting to your guild page...
                        </p>
                    </div>
                )}

                {error && (
                    <div className="bg-red-900/30 border-2 border-red-600 rounded-lg p-4 mb-6">
                        <p className="text-red-400">{error}</p>
                    </div>
                )}

                {/* Create Guild Form */}
                <div className="bg-[#252525]/95 backdrop-blur-sm rounded-xl border-2 border-[#505050]/70 p-8 shadow-2xl w-full">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Guild Name */}
                        <div>
                            <label htmlFor="guildName" className="block text-[#e0e0e0] font-semibold mb-2">
                                Guild Name <span className="text-red-400">*</span>
                            </label>
                            <input
                                id="guildName"
                                name="guildName"
                                type="text"
                                value={formData.guildName}
                                onChange={handleChange}
                                placeholder="Enter guild name (3-20 characters)"
                                className="w-full bg-[#1a1a1a] border-2 border-[#404040] rounded-lg px-4 py-3 text-[#e0e0e0] focus:outline-none focus:border-[#ffd700] transition-all placeholder:text-[#666]"
                                disabled={loading || success}
                                required
                                minLength={GUILD_NAME_MIN_LENGTH}
                                maxLength={GUILD_NAME_MAX_LENGTH}
                            />
                            <p className="text-[#888] text-sm mt-2">
                                Guild name must be between {GUILD_NAME_MIN_LENGTH} and {GUILD_NAME_MAX_LENGTH} characters
                            </p>
                        </div>

                        {/* Character Selection */}
                        <div>
                            <label htmlFor="characterName" className="block text-[#e0e0e0] font-semibold mb-2">
                                Character <span className="text-red-400">*</span>
                            </label>
                            <select
                                id="characterName"
                                name="characterName"
                                value={formData.characterName}
                                onChange={handleChange}
                                className="w-full bg-[#1a1a1a] border-2 border-[#404040] rounded-lg px-4 py-3 text-[#e0e0e0] focus:outline-none focus:border-[#ffd700] transition-all"
                                disabled={loading || success || availableCharacters.length === 0}
                                required
                            >
                                <option value="">Select a character</option>
                                {availableCharacters.map((char) => (
                                    <option key={char.id} value={char.name}>
                                        {char.name} - Level {char.level} {char.vocation}
                                    </option>
                                ))}
                            </select>
                            <p className="text-[#888] text-sm mt-2">
                                Select the character that will be the guild owner. This character must not be in another guild.
                            </p>
                        </div>

                        {/* Message of the Day (Optional) */}
                        <div>
                            <label htmlFor="motd" className="block text-[#e0e0e0] font-semibold mb-2">
                                Message of the Day (Optional)
                            </label>
                            <textarea
                                id="motd"
                                name="motd"
                                value={formData.motd}
                                onChange={handleChange}
                                placeholder="Enter a welcome message for your guild members..."
                                className="w-full bg-[#1a1a1a] border-2 border-[#404040] rounded-lg px-4 py-3 text-[#e0e0e0] focus:outline-none focus:border-[#ffd700] transition-all placeholder:text-[#666] min-h-[120px] resize-y"
                                disabled={loading || success}
                                maxLength={MOTD_MAX_LENGTH}
                            />
                            <p className="text-[#888] text-sm mt-2">
                                {formData.motd.length}/{MOTD_MAX_LENGTH} characters
                            </p>
                        </div>

                        {/* Submit Button */}
                        <div className="flex gap-4">
                            <button
                                type="submit"
                                disabled={loading || success || availableCharacters.length === 0}
                                className="flex-1 px-6 py-3 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Creating Guild...' : success ? 'Guild Created!' : 'Create Guild'}
                            </button>
                            <Link
                                href="/guilds"
                                className="px-6 py-3 bg-[#404040] hover:bg-[#505050] text-white rounded-lg font-bold transition-all"
                            >
                                Cancel
                            </Link>
                        </div>
                    </form>

                    {/* Info Box */}
                    <div className="mt-6 p-4 bg-blue-900/20 border border-blue-600/50 rounded-lg">
                        <p className="text-blue-400 text-sm">
                            <strong>ℹ️ Note:</strong> When you create a guild, your character will automatically become the Leader. 
                            Default ranks (Leader, Vice Leader, Member) will be created automatically.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

