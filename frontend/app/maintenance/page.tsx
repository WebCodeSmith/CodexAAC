'use client'

import Link from 'next/link'
import { useEffect, useState, useCallback } from 'react'
import { api } from '../services/api'
import type { MaintenanceData } from '../types/maintenance'
import type { ApiResponse } from '../types/account'

const DEFAULT_MESSAGE = 'We are currently performing scheduled maintenance to improve your experience. Please check back soon.'

export default function MaintenancePage() {
    const [message, setMessage] = useState<string>('')

    const fetchMaintenanceMessage = useCallback(async () => {
        try {
            const response = await api.get<ApiResponse<MaintenanceData>>('/maintenance/status', {
                public: true, // Public endpoint, no auth required
            })
            if (response && response.data?.maintenance && response.data?.message) {
                setMessage(response.data.message)
            }
        } catch (err) {
        }
    }, [])

    useEffect(() => {
        fetchMaintenanceMessage()
    }, [fetchMaintenanceMessage])

    const displayMessage = message || DEFAULT_MESSAGE

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#1a1a1a]">
            {/* Background with illustration */}
            <div className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat bg-background-image"></div>
            <div className="fixed inset-0 z-0 bg-gradient-overlay opacity-60"></div>
            <div className="fixed inset-0 z-0 bg-[#1a1a1a]/60"></div>
            
            <div className="relative z-10 max-w-2xl mx-auto px-4">
                <div className="bg-[#252525]/95 backdrop-blur-sm rounded-xl border-2 border-[#505050]/70 p-12 shadow-2xl text-center">
                    <div className="mb-6">
                        <span className="text-8xl">🔧</span>
                    </div>

                    <h1 className="text-5xl font-bold mb-4">
                        <span className="text-[#ffd700]">Maintenance</span>
                    </h1>

                    <h2 className="text-2xl font-bold text-[#e0e0e0] mb-6">
                        Server Under Maintenance
                    </h2>

                    <p className="text-[#b0b0b0] text-lg mb-8 leading-relaxed">
                        {displayMessage}
                    </p>

                    <div className="flex flex-col items-center gap-4">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#ffd700]"></div>
                        <p className="text-[#888] text-sm">We'll be back shortly...</p>
                    </div>

                    <div className="mt-8 pt-8 border-t border-[#404040]/60">
                        <p className="text-[#888] text-sm mb-4">Follow us for updates:</p>
                        <div className="flex flex-wrap gap-3 justify-center">
                            <Link href="/" className="text-[#3b82f6] hover:text-[#60a5fa] text-sm transition-colors">
                                Home
                            </Link>
                            <span className="text-[#404040]">•</span>
                            <Link href="/download" className="text-[#3b82f6] hover:text-[#60a5fa] text-sm transition-colors">
                                Download
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

