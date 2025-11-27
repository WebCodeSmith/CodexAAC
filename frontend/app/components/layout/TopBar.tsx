'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'

interface DropdownItem {
  label: string
  href: string
  icon?: string
}

interface NavItem {
  label: string
  href?: string
  icon: string
  dropdown?: DropdownItem[]
}

const navItems: NavItem[] = [
  {
    label: 'Home Page',
    href: '/',
    icon: '🏠',
  },
  {
    label: 'Contribute',
    icon: '💡',
    dropdown: [
      { label: 'Donate', href: '/contribute/donate', icon: '💰' },
      { label: 'Report Bug', href: '/contribute/bug', icon: '🐛' },
      { label: 'Suggest Feature', href: '/contribute/suggest', icon: '💭' },
    ],
  },
  {
    label: 'Resources',
    icon: '📚',
    dropdown: [
      { label: 'Wiki', href: '/resources/wiki', icon: '📖' },
      { label: 'Guides', href: '/resources/guides', icon: '📝' },
      { label: 'Tools', href: '/resources/tools', icon: '🔧' },
      { label: 'Downloads', href: '/resources/downloads', icon: '⬇️' },
    ],
  },
  {
    label: 'Account',
    icon: '👤',
    dropdown: [
      { label: 'Login', href: '/login', icon: '🔐' },
      { label: 'Create Account', href: '/create-account', icon: '✨' },
      { label: 'Recover Account', href: '/account/recover', icon: '🔑' },
      { label: 'Download Client', href: '/download', icon: '⬇️' },
    ],
  },
  {
    label: 'Information',
    icon: 'ℹ️',
    dropdown: [
      { label: 'About', href: '/information/about', icon: '📋' },
      { label: 'Server Info', href: '/server-info', icon: '🖥️' },
      { label: 'Rules', href: '/information/rules', icon: '📜' },
      { label: 'FAQ', href: '/information/faq', icon: '❓' },
    ],
  },
  {
    label: 'Support',
    icon: '🆘',
    dropdown: [
      { label: 'Help Center', href: '/support/help', icon: '💬' },
      { label: 'Contact', href: '/support/contact', icon: '📧' },
      { label: 'Ticket System', href: '/support/tickets', icon: '🎫' },
    ],
  },
  {
    label: 'Community',
    icon: '👥',
    dropdown: [
      { label: 'Online Players', href: '/players-online', icon: '👤' },
      { label: 'Ranking', href: '/community/ranking', icon: '🏆' },
      { label: 'Guilds', href: '/guilds', icon: '🛡️' },
      { label: 'Houses', href: '/community/houses', icon: '🏠' },
      { label: 'Latest Deaths', href: '/community/deaths', icon: '💀' },
    ],
  },
]

export default function TopBar() {
  const router = useRouter()
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const { isAuthenticated } = useAuth()
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      let clickedInside = false

      Object.keys(dropdownRefs.current).forEach((key) => {
        const ref = dropdownRefs.current[key]
        if (ref && ref.contains(target)) {
          clickedInside = true
        }
      })

      if (!clickedInside) {
        setOpenDropdown(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleDropdownToggle = (label: string) => {
    setOpenDropdown(openDropdown === label ? null : label)
  }

  return (
    <div className="relative z-20" data-topbar>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="bg-[#252525]/95 backdrop-blur-md border-2 border-[#404040]/60 rounded-lg shadow-xl">
          <nav className="flex items-center justify-center gap-4 sm:gap-6 lg:gap-8 py-3 flex-wrap">
            {navItems.map((item) => (
              <div
                key={item.label}
                className="relative"
                ref={(el) => {
                  dropdownRefs.current[item.label] = el
                }}
              >
                {item.dropdown ? (
                  <>
                    <button
                      onClick={() => handleDropdownToggle(item.label)}
                      className="flex items-center gap-2 text-[#e0e0e0] hover:text-[#ffd700] text-sm transition-colors font-medium"
                    >
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                      <span className="text-xs">▼</span>
                    </button>
                    {openDropdown === item.label && (
                      <div className="absolute top-full left-0 mt-2 w-48 bg-[#252525] border-2 border-[#404040]/60 rounded-lg shadow-xl z-50 overflow-hidden">
                        {item.label === 'Account' && isAuthenticated && (
                          <button
                            onClick={(e) => {
                              e.preventDefault()
                              setOpenDropdown(null)
                              router.push('/account')
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-[#e0e0e0] hover:bg-[#1f1f1f] hover:text-[#ffd700] transition-colors border-b border-[#404040]/60"
                          >
                            <span>👤</span>
                            <span className="text-sm">Account Management</span>
                          </button>
                        )}
                        {item.dropdown
                          .filter((dropdownItem) => {
                            if (isAuthenticated) {
                              return dropdownItem.label !== 'Create Account' && dropdownItem.label !== 'Login'
                            }
                            return true
                          })
                          .map((dropdownItem) => (
                            <button
                              key={dropdownItem.label}
                              onClick={(e) => {
                                e.preventDefault()
                                setOpenDropdown(null)
                                router.push(dropdownItem.href)
                              }}
                              className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-[#e0e0e0] hover:bg-[#1f1f1f] hover:text-[#ffd700] transition-colors"
                            >
                              {dropdownItem.icon && <span>{dropdownItem.icon}</span>}
                              <span className="text-sm">{dropdownItem.label}</span>
                            </button>
                          ))}
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    href={item.href || '#'}
                    className="flex items-center gap-2 text-[#e0e0e0] hover:text-[#ffd700] text-sm transition-colors font-medium"
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                )}
              </div>
            ))}
          </nav>
        </div>
      </div>
    </div>
  )
}
