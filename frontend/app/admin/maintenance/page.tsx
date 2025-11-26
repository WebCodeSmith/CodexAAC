'use client'

import { useState, useEffect, useCallback, memo } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '../../services/api'
import type { ApiResponse } from '../../types/account'
import type { MaintenanceStatus } from '../../types/maintenance'

// Memoized StatusBadge component to avoid re-renders
const StatusBadge = memo(({ enabled }: { enabled: boolean }) => (
    <div className={`px-4 py-2 rounded-lg font-semibold ${
        enabled 
            ? 'bg-red-900/30 text-red-400 border border-red-600' 
            : 'bg-green-900/30 text-green-400 border border-green-600'
    }`}>
        {enabled ? 'Maintenance Active' : 'Server Online'}
    </div>
))
StatusBadge.displayName = 'StatusBadge'

export default function MaintenancePage() {
    const router = useRouter()
    const [status, setStatus] = useState<MaintenanceStatus>({ enabled: false })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')

    const fetchStatus = useCallback(async () => {
        try {
            const response = await api.get<ApiResponse<MaintenanceStatus>>('/admin/maintenance')
            if (response && response.data) {
                setStatus(response.data)
                setMessage(response.data.message || '')
            }
        } catch (err: any) {
            if (err.status === 404) {
                router.replace('/not-found')
                return
            }
            setError('Error loading maintenance status')
        } finally {
            setLoading(false)
        }
    }, [router])

    useEffect(() => {
        fetchStatus()
    }, [fetchStatus])

    const handleToggle = useCallback(async () => {
        setSaving(true)
        setError('')
        try {
            const response = await api.post<ApiResponse<MaintenanceStatus>>('/admin/maintenance', {
                enabled: !status.enabled,
                message: message.trim(),
            })
            if (response && response.data) {
                setStatus(response.data)
            }
        } catch (err: any) {
            if (err.status === 404) {
                router.replace('/not-found')
                return
            }
            setError('Error updating maintenance status')
        } finally {
            setSaving(false)
        }
    }, [status.enabled, message, router])

    const handleMessageChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setMessage(e.target.value)
    }, [])

    const handleBackToDashboard = useCallback(() => {
        router.push('/admin')
    }, [router])

    const lastUpdatedText = status.updatedAt ? new Date(status.updatedAt).toLocaleString() : ''

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#ffd700] mb-4"></div>
                    <p className="text-[#888]">Loading...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen">
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-[#ffd700] to-[#ffed4e] rounded-xl flex items-center justify-center shadow-lg">
                            <span className="text-3xl">🔧</span>
                        </div>
                        <div>
                            <h1 className="text-4xl font-bold text-[#ffd700] mb-2">Maintenance Mode</h1>
                            <p className="text-[#888]">Control server maintenance status</p>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-900/30 border-2 border-red-600 rounded-lg p-4 mb-6">
                        <p className="text-red-400">{error}</p>
                    </div>
                )}

                <div className="bg-[#252525]/95 backdrop-blur-sm rounded-xl border-2 border-[#505050]/70 p-8 shadow-2xl">
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-2xl font-bold text-[#ffd700]">Current Status</h2>
                            <StatusBadge enabled={status.enabled} />
                        </div>

                        {status.updatedAt && lastUpdatedText && (
                            <p className="text-[#888] text-sm">Last updated: {lastUpdatedText}</p>
                        )}
                    </div>

                    <div className="mb-6">
                        <label className="block text-[#e0e0e0] font-semibold mb-2">
                            Maintenance Message (optional)
                        </label>
                        <textarea
                            value={message}
                            onChange={handleMessageChange}
                            placeholder="Enter a custom message for users during maintenance..."
                            className="w-full bg-[#1a1a1a] border-2 border-[#404040] rounded-lg px-4 py-3 text-[#e0e0e0] focus:outline-none focus:border-[#ffd700] transition-all min-h-[120px] resize-y"
                            disabled={saving}
                        />
                        <p className="text-[#888] text-sm mt-2">
                            This message will be displayed to users when maintenance is active.
                        </p>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={handleToggle}
                            disabled={saving}
                            className={`px-6 py-3 rounded-lg font-bold transition-all ${
                                status.enabled
                                    ? 'bg-green-600 hover:bg-green-700 text-white'
                                    : 'bg-red-600 hover:bg-red-700 text-white'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {saving ? 'Saving...' : status.enabled ? 'Disable Maintenance' : 'Enable Maintenance'}
                        </button>
                        <button
                            onClick={handleBackToDashboard}
                            className="px-6 py-3 bg-[#404040] hover:bg-[#505050] text-white rounded-lg font-bold transition-all"
                        >
                            Back to Dashboard
                        </button>
                    </div>

                    {status.enabled && (
                        <div className="mt-6 p-4 bg-yellow-900/20 border border-yellow-600/50 rounded-lg">
                            <p className="text-yellow-400 text-sm">
                                ⚠️ <strong>Warning:</strong> Maintenance mode is active. All non-admin users will be redirected to the maintenance page.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

