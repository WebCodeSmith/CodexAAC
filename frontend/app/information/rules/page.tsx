'use client'

import { useEffect, useState } from 'react'
import { api } from '../../services/api'
import type { ApiResponse } from '../../types/account'
import type { PageContent } from '../../types/common'

export default function RulesPage() {
    const [content, setContent] = useState<string>('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        const fetchContent = async () => {
            try {
                const response = await api.get<ApiResponse<PageContent>>('/pages/rules', { public: true })
                if (response && response.data) {
                    setContent(response.data.content)
                }
            } catch (err) {
                setError('Error loading rules')
            } finally {
                setLoading(false)
            }
        }
        fetchContent()
    }, [])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#ffd700] mb-4" />
                    <p className="text-[#888]">Loading...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen">
            <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-6">
                    <h1 className="text-4xl font-bold text-[#ffd700] mb-2">Rules</h1>
                    <p className="text-[#888]">Official server rules (updated by admins)</p>
                </div>

                {error && (
                    <div className="bg-red-900/30 border-2 border-red-600 rounded-lg p-4 mb-6">
                        <p className="text-red-400">{error}</p>
                    </div>
                )}

                <div className="prose prose-invert max-w-none bg-[#252525]/95 backdrop-blur-sm rounded-xl border-2 border-[#505050]/70 p-6 shadow-2xl">
                    <div dangerouslySetInnerHTML={{ __html: content || '<p>No rules defined.</p>' }} />
                </div>
            </div>
        </div>
    )
}
