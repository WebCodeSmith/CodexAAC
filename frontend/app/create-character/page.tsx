'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '../services/api'

const vocations = [
  { value: 'sorcerer', label: 'Sorcerer', icon: '🧙' },
  { value: 'druid', label: 'Druid', icon: '🌿' },
  { value: 'paladin', label: 'Paladin', icon: '🏹' },
  { value: 'knight', label: 'Knight', icon: '⚔️' },
]

const NAME_REGEX = /^[a-zA-Z\s]+$/
const CHARACTER_NAME_MIN_LENGTH = 3
const CHARACTER_NAME_MAX_LENGTH = 20

export default function CreateCharacterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    characterName: '',
    vocation: '',
    sex: 'male',
    townId: 0,
    agreeToTerms: false,
  })

  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [towns, setTowns] = useState<{ id: number; name: string }[]>([])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (name === 'townId' ? Number(value) : value)
    }))
    if (error) {
      setError('')
    }
  }, [error])

  const validateForm = useCallback((data: typeof formData) => {
    if (!data.characterName || !data.vocation) {
      setError('Please fill in all fields')
      return false
    }

    if (towns.length > 1 && !data.townId) {
      setError('Please select a town')
      return false
    }

    if (!data.agreeToTerms) {
      setError('You must agree to the Privacy Terms and the Rules')
      return false
    }

    if (data.characterName.length < CHARACTER_NAME_MIN_LENGTH || data.characterName.length > CHARACTER_NAME_MAX_LENGTH) {
      setError(`Character name must be between ${CHARACTER_NAME_MIN_LENGTH} and ${CHARACTER_NAME_MAX_LENGTH} characters`)
      return false
    }

    if (!NAME_REGEX.test(data.characterName)) {
      setError('Character name must contain only letters')
      return false
    }

    return true
  }, [towns])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (!validateForm(formData)) {
      return
    }

    setLoading(true)

    try {
      await api.post('/characters', {
        name: formData.characterName,
        vocation: formData.vocation,
        sex: formData.sex,
        town_id: formData.townId,
      })

      setSuccess(true)
      setTimeout(() => {
        router.push('/account')
      }, 1500)
    } catch (err: any) {
      setError(err.message || 'Error creating character. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [formData, validateForm])

  useEffect(() => {
    let mounted = true
      ; (async () => {
        try {
          const data = await api.get('/towns', { public: true })
          if (mounted && Array.isArray(data)) {
            setTowns(data as any)
            if ((data as any).length === 1) {
              setFormData(prev => ({ ...prev, townId: (data as any)[0].id }))
            }
          }
        } catch (err) {
          // ignore; sites can fallback to default town
        }
      })()
    return () => { mounted = false }
  }, [])

  return (
    <div>
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold mb-2">
              <span className="text-[#ffd700]">Create</span>
              <span className="text-[#3b82f6]"> Character</span>
            </h1>
            <p className="text-[#d0d0d0] text-sm">Create your character and start your adventure</p>
          </div>

          {/* Create Character Form */}
          <div className="bg-[#252525]/95 backdrop-blur-sm rounded-xl border-2 border-[#505050]/70 p-6 sm:p-8 shadow-2xl ring-2 ring-[#ffd700]/10">
            {error && (
              <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded text-red-300 text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-green-900/30 border border-green-700 rounded text-green-300 text-sm">
                Character created successfully! Redirecting to your account...
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Character Name */}
              <div>
                <label htmlFor="characterName" className="block text-[#e0e0e0] text-sm font-medium mb-2">
                  Character Name *
                </label>
                <input
                  id="characterName"
                  name="characterName"
                  type="text"
                  value={formData.characterName}
                  onChange={handleChange}
                  className="w-full bg-[#1a1a1a] border-2 border-[#404040]/60 rounded-lg px-4 py-3 text-[#e0e0e0] focus:outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/20 transition-all placeholder:text-[#666]"
                  placeholder="Enter character name"
                  disabled={loading}
                />
                <p className="mt-1 text-xs text-[#666]">Between {CHARACTER_NAME_MIN_LENGTH} and {CHARACTER_NAME_MAX_LENGTH} characters, letters only</p>
              </div>

              {/* Sex Selection */}
              <div>
                <label className="block text-[#e0e0e0] text-sm font-medium mb-3">
                  Sex *
                </label>
                <div className="flex gap-4">
                  <label className="flex-1 cursor-pointer">
                    <input
                      type="radio"
                      name="sex"
                      value="male"
                      checked={formData.sex === 'male'}
                      onChange={handleChange}
                      className="sr-only peer"
                      disabled={loading}
                    />
                    <div className="bg-[#1a1a1a] border-2 border-[#404040]/60 rounded-lg p-4 text-center transition-all peer-checked:border-[#3b82f6] peer-checked:bg-[#3b82f6]/10 hover:border-[#505050]">
                      <div className="text-3xl mb-2">👨</div>
                      <span className="text-[#e0e0e0] text-sm font-medium">Male</span>
                    </div>
                  </label>
                  <label className="flex-1 cursor-pointer">
                    <input
                      type="radio"
                      name="sex"
                      value="female"
                      checked={formData.sex === 'female'}
                      onChange={handleChange}
                      className="sr-only peer"
                      disabled={loading}
                    />
                    <div className="bg-[#1a1a1a] border-2 border-[#404040]/60 rounded-lg p-4 text-center transition-all peer-checked:border-[#3b82f6] peer-checked:bg-[#3b82f6]/10 hover:border-[#505050]">
                      <div className="text-3xl mb-2">👩</div>
                      <span className="text-[#e0e0e0] text-sm font-medium">Female</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Vocation Selection */}
              <div>
                <label htmlFor="vocation" className="block text-[#e0e0e0] text-sm font-medium mb-3">
                  Vocation *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {vocations.map((voc) => (
                    <label key={voc.value} className="cursor-pointer">
                      <input
                        type="radio"
                        name="vocation"
                        value={voc.value}
                        checked={formData.vocation === voc.value}
                        onChange={handleChange}
                        className="sr-only peer"
                        disabled={loading}
                      />
                      <div className="bg-[#1a1a1a] border-2 border-[#404040]/60 rounded-lg p-4 text-center transition-all peer-checked:border-[#ffd700] peer-checked:bg-[#ffd700]/10 hover:border-[#505050]">
                        <div className="text-2xl mb-1">{voc.icon}</div>
                        <span className="text-[#e0e0e0] text-sm font-medium">{voc.label}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Town Selection */}
              {towns.length > 1 && (
                <div>
                  <label htmlFor="town" className="block text-[#e0e0e0] text-sm font-medium mb-2">Town *</label>
                  <select
                    id="town"
                    name="townId"
                    value={formData.townId}
                    onChange={handleChange}
                    className="w-full bg-[#1a1a1a] border-2 border-[#404040]/60 rounded-lg px-4 py-3 text-[#e0e0e0] focus:outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/20 transition-all"
                    disabled={loading}
                  >
                    <option value={0}>Select Town</option>
                    {towns.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Terms and Conditions */}
              <div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="agreeToTerms"
                    checked={formData.agreeToTerms}
                    onChange={handleChange}
                    className="mt-1 w-4 h-4 text-[#ffd700] bg-[#1a1a1a] border-2 border-[#404040]/60 rounded focus:ring-2 focus:ring-[#ffd700]/20 focus:ring-offset-0 cursor-pointer"
                    disabled={loading}
                  />
                  <span className="text-[#d0d0d0] text-sm">
                    I agree to the{' '}
                    <Link href="/legal/privacy" className="text-[#ffd700] hover:underline" target="_blank">
                      Privacy Terms
                    </Link>
                    {' '}and the{' '}
                    <Link href="/legal/terms" className="text-[#ffd700] hover:underline" target="_blank">
                      Rules
                    </Link>
                    .
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#ffd700] hover:bg-[#ffed4e] text-[#0a0a0a] font-bold py-3 px-4 rounded-lg transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating character...' : 'Create Character'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link
                href="/account"
                className="text-[#d0d0d0] hover:text-[#ffd700] text-sm transition-colors"
              >
                Back to Account Management
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

