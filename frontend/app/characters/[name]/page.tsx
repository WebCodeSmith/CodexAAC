'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '../../services/api'
import { formatDateTime } from '../../utils/date'
import CharacterDetailsSection from '../../components/character/CharacterDetails'
import type { JSX } from 'react'
import type { CharacterDetails, Death, CharacterDetailsResponse } from '../../types/character'

export default function CharacterDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const characterName = params.name as string

  const [character, setCharacter] = useState<CharacterDetails | null>(null)
  const [deaths, setDeaths] = useState<Death[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchCharacterDetails = useCallback(async () => {
    if (!characterName) return

    try {
      setLoading(true)
      setError('')
      const response = await api.get<{ data: CharacterDetailsResponse }>(`/characters/${characterName}`, { public: true })
      setCharacter(response.data.character)
      setDeaths(response.data.deaths || [])
    } catch (err: any) {
      setError(err.message || 'Character not found')
    } finally {
      setLoading(false)
    }
  }, [characterName])

  useEffect(() => {
    fetchCharacterDetails()
  }, [fetchCharacterDetails])


  const formatDeathDescription = useCallback((death: Death): JSX.Element => {
    const parts: string[] = []
    const segments = death.killedBy.split(', ')
    
    segments.forEach((segment, idx) => {
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
  }, [])

  if (loading) {
    return (
      <div>
        <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <div className="text-[#ffd700] text-2xl font-bold mb-4">Loading character...</div>
            <div className="text-[#d0d0d0]">Please wait</div>
          </div>
        </main>
      </div>
    )
  }

  if (error || !character) {
    return (
      <div>
        <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="bg-red-900/30 border border-red-700 rounded-lg p-6 text-center">
              <h1 className="text-red-300 text-2xl font-bold mb-2">Character Not Found</h1>
              <p className="text-red-200 mb-4">{error || 'The character you are looking for does not exist.'}</p>
              <Link
                href="/"
                className="inline-block bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold py-2 px-4 rounded-lg transition-all"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div>
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl sm:text-4xl font-bold">
              <span className="text-[#ffd700]">CHARACTERS</span>
            </h1>
            <Link
              href="/"
              className="text-[#3b82f6] hover:text-[#60a5fa] text-sm hover:underline"
            >
              ← Back to Home
            </Link>
          </div>

          {/* Character Information */}
          <div className="bg-[#252525]/95 backdrop-blur-sm rounded-xl border-2 border-[#505050]/70 p-6 shadow-2xl">
            <h2 className="text-[#ffd700] text-xl sm:text-2xl font-bold mb-6 pb-3 border-b border-[#404040]/40">
              Character Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-[#888] text-sm">Name:</span>
                <p className="text-[#e0e0e0] font-medium">{character.name}</p>
              </div>
              <div>
                <span className="text-[#888] text-sm">Sex:</span>
                <p className="text-[#e0e0e0] font-medium capitalize">{character.sex}</p>
              </div>
              <div>
                <span className="text-[#888] text-sm">Vocation:</span>
                <p className="text-[#e0e0e0] font-medium">{character.vocation}</p>
              </div>
              <div>
                <span className="text-[#888] text-sm">Level:</span>
                <p className="text-[#e0e0e0] font-medium">{character.level}</p>
              </div>
              <div>
                <span className="text-[#888] text-sm">Residence:</span>
                <p className="text-[#e0e0e0] font-medium">{character.residence}</p>
              </div>
              {character.guildName && (
                <div>
                  <span className="text-[#888] text-sm">Guild Member:</span>
                  <p className="text-[#e0e0e0] font-medium">
                    {character.guildRank ? `${character.guildRank} of ` : ''}
                    <Link
                      href={`/guilds/${character.guildName}`}
                      className="text-[#3b82f6] hover:text-[#60a5fa] hover:underline"
                    >
                      {character.guildName}
                    </Link>
                  </p>
                </div>
              )}
              <div>
                <span className="text-[#888] text-sm">Account Status:</span>
                <p className={`font-medium ${character.accountStatus === 'VIP Account' ? 'text-green-400' : 'text-[#e0e0e0]'}`}>
                  {character.accountStatus}
                </p>
              </div>
              <div>
                <span className="text-[#888] text-sm">Last Seen:</span>
                <p className="text-[#e0e0e0] font-medium">{formatDateTime(character.lastSeen, 'Nunca')}</p>
              </div>
              <div>
                <span className="text-[#888] text-sm">Created:</span>
                <p className="text-[#e0e0e0] font-medium">{formatDateTime(character.created)}</p>
              </div>
            </div>
          </div>

          {/* Character Details */}
          {character && (
            <CharacterDetailsSection character={character} />
          )}

          {/* Deaths */}
          {deaths.length > 0 && (
            <div className="bg-[#252525]/95 backdrop-blur-sm rounded-xl border-2 border-[#505050]/70 p-6 shadow-2xl">
              <h2 className="text-[#ffd700] text-xl sm:text-2xl font-bold mb-4 pb-3 border-b border-[#404040]/40">
                Deaths
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#404040]/60">
                      <th className="text-left text-[#ffd700] text-sm font-bold py-3 px-2">Date</th>
                      <th className="text-left text-[#ffd700] text-sm font-bold py-3 px-2">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deaths.map((death, idx) => (
                      <tr
                        key={idx}
                        className="border-b border-[#404040]/30 hover:bg-[#1a1a1a]/50 transition-all"
                      >
                        <td className="py-3 px-2 text-[#d0d0d0] text-sm">
                          {formatDateTime(death.time)}
                        </td>
                        <td className="py-3 px-2 text-[#d0d0d0] text-sm">
                          {formatDeathDescription(death)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Search Character */}
          <div className="bg-[#252525]/95 backdrop-blur-sm rounded-xl border-2 border-[#505050]/70 p-6 shadow-2xl">
            <h2 className="text-[#ffd700] text-xl sm:text-2xl font-bold mb-4 pb-3 border-b border-[#404040]/40">
              Search Character
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                const name = formData.get('name') as string
                if (name.trim()) {
                  router.push(`/characters/${name}`)
                }
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                name="name"
                placeholder="Character name"
                className="flex-1 bg-[#1a1a1a] border-2 border-[#404040]/60 rounded-lg px-4 py-3 text-[#e0e0e0] focus:outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/20 transition-all placeholder:text-[#666]"
              />
              <button
                type="submit"
                className="bg-[#ff6600] hover:bg-[#ff7700] text-white font-bold py-3 px-6 rounded-lg transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
              >
                Search
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}

