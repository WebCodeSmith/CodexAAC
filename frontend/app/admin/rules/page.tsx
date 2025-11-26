'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '../../services/api'
import type { ApiResponse } from '../../types/account'
import type { PageContent } from '../../types/common'
import TiptapEditor from '../../components/admin/TiptapEditor'

export default function AdminRulesPage() {
    const router = useRouter()
    const [content, setContent] = useState<string>('')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [success, setSuccess] = useState('')
    const [error, setError] = useState('')

    useEffect(() => {
        const fetchContent = async () => {
            try {
                const response = await api.get<ApiResponse<PageContent>>('/pages/rules', { public: true })
                if (response && response.data) {
                    setContent(response.data.content)
                }
            } catch (err: any) {
                if (err.status === 404) {
                    router.replace('/not-found')
                    return
                }
                setError('Error loading content')
            } finally {
                setLoading(false)
            }
        }
        fetchContent()
    }, [router])

    const handleSave = async () => {
        setSaving(true)
        setError('')
        setSuccess('')
        try {
            const response = await api.put<ApiResponse<PageContent>>('/admin/pages/rules', { content })
            if (response && response.data) {
                setContent(response.data.content)
                setSuccess('Saved successfully')
            }
        } catch (err: any) {
            if (err.status === 404) {
                router.replace('/not-found')
                return
            }
            setError('Error saving content')
        } finally {
            setSaving(false)
        }
    }

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#ffd700] mb-4" />
                <p className="text-[#888]">Loading...</p>
            </div>
        </div>
    )

    return (
        <div className="min-h-screen">
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-[#ffd700] to-[#ffed4e] rounded-xl flex items-center justify-center shadow-lg">
                            <span className="text-3xl">📜</span>
                        </div>
                        <div>
                            <h1 className="text-4xl font-bold text-[#ffd700] mb-2">Edit Rules Page</h1>
                            <p className="text-[#888]">Edit the rules content for the information page</p>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-900/30 border-2 border-red-600 rounded-lg p-4 mb-6">
                        <p className="text-red-400">{error}</p>
                    </div>
                )}

                {success && (
                    <div className="bg-green-900/30 border-2 border-green-600 rounded-lg p-4 mb-4">
                        <p className="text-green-300">{success}</p>
                    </div>
                )}

                <div className="bg-[#252525]/95 backdrop-blur-sm rounded-xl border-2 border-[#505050]/70 p-6 shadow-2xl">
                    <label className="block text-[#e0e0e0] font-semibold mb-2">Rules Content</label>
                    <div className="mb-4">
                        <TiptapEditor 
                            value={content} 
                            onChange={setContent}
                            placeholder="Enter rules content here..."
                        />
                    </div>

                    <div className="flex gap-4 justify-end">
                        <button
                            onClick={() => router.push('/admin')}
                            className="px-6 py-3 bg-[#404040] hover:bg-[#505050] text-white rounded-lg font-bold transition-all"
                        >
                            Back
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-6 py-3 bg-[#ffd700] hover:bg-[#ffd33d] rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
