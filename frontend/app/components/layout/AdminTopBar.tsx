'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useRef, useEffect, useCallback, memo } from 'react'

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

// Moved outside component to avoid recreation on every render
const adminNavItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/admin',
    icon: '⚡',
  },
  {
    label: 'Accounts',
    icon: '👥',
    dropdown: [
      { label: 'Manage Accounts', href: '/admin', icon: '📋' },
      { label: 'Statistics', href: '/admin', icon: '📊' },
    ],
  },
  {
    label: 'Characters',
    icon: '🎮',
    dropdown: [
      { label: 'List Characters', href: '/admin/characters', icon: '👤' },
      { label: 'Bans', href: '/admin/bans', icon: '🚫' },
    ],
  },
  {
    label: 'Server',
    icon: '🖥️',
    dropdown: [
      { label: 'Settings', href: '/admin/server', icon: '⚙️' },
      { label: 'Logs', href: '/admin/logs', icon: '📝' },
    ],
  },
  {
    label: 'System',
    icon: '🔧',
    dropdown: [
      { label: 'Maintenance', href: '/admin/maintenance', icon: '🔧' },
      { label: 'Backup', href: '/admin/backup', icon: '💾' },
    ],
  },
  {
    label: 'Content',
    icon: '📄',
    dropdown: [
      { label: 'Rules', href: '/admin/rules', icon: '📜' },
    ],
  },
  {
    label: 'Back to Site',
    href: '/',
    icon: '🏠',
  },
]

// Memoized NavItem component to avoid re-renders
const NavItemComponent = memo(({ item, openDropdown, onToggle, onNavigate }: {
  item: NavItem
  openDropdown: string | null
  onToggle: (label: string) => void
  onNavigate: (href: string) => void
}) => {
  const dropdownRef = useRef<HTMLDivElement | null>(null)

  return (
    <div
      className="relative"
      ref={dropdownRef}
    >
      {item.dropdown ? (
        <>
          <button
            onClick={() => onToggle(item.label)}
            className="flex items-center gap-2 text-[#e0e0e0] hover:text-[#ffd700] text-sm transition-colors font-medium"
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
            <span className="text-xs">▼</span>
          </button>
          {openDropdown === item.label && (
            <div className="absolute top-full left-0 mt-2 w-48 bg-[#252525] border-2 border-[#ffd700]/30 rounded-lg shadow-xl z-50 overflow-hidden">
              {item.dropdown.map((dropdownItem) => (
                <button
                  key={dropdownItem.label}
                  onClick={(e) => {
                    e.preventDefault()
                    onToggle(item.label)
                    onNavigate(dropdownItem.href)
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
  )
})
NavItemComponent.displayName = 'NavItemComponent'

export default function AdminTopBar() {
  const router = useRouter()
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const handleClickOutside = useCallback((event: MouseEvent) => {
    const target = event.target as Node
    const container = containerRef.current

    if (container && !container.contains(target)) {
      setOpenDropdown(null)
    }
  }, [])

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [handleClickOutside])

  const handleDropdownToggle = useCallback((label: string) => {
    setOpenDropdown(prev => prev === label ? null : label)
  }, [])

  const handleNavigate = useCallback((href: string) => {
    router.push(href)
  }, [router])

  return (
    <div className="relative z-20" ref={containerRef}>
      {/* Admin Navigation Menu */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="bg-[#252525]/95 backdrop-blur-md border-2 border-[#ffd700]/30 rounded-lg shadow-xl">
          <nav className="flex items-center justify-center gap-4 sm:gap-6 lg:gap-8 py-3 flex-wrap">
            {adminNavItems.map((item) => (
              <NavItemComponent
                key={item.label}
                item={item}
                openDropdown={openDropdown}
                onToggle={handleDropdownToggle}
                onNavigate={handleNavigate}
              />
            ))}
          </nav>
        </div>
      </div>
    </div>
  )
}

