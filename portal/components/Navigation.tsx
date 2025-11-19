'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useUserRoles } from '@/hooks/useVault'
import {
  Home,
  Settings,
  TrendingUp,
  Users,
  Shield,
  AlertCircle
} from 'lucide-react'

export function Navigation() {
  const pathname = usePathname()
  const roles = useUserRoles()

  const navItems = [
    { href: '/user', label: 'Dashboard', icon: Home, show: true },
    { href: '/admin', label: 'Admin', icon: Settings, show: roles.isAdmin },
    { href: '/aum-updater', label: 'AUM Updater', icon: TrendingUp, show: roles.isAumUpdater },
    { href: '/processor', label: 'Processor', icon: Users, show: roles.isProcessor },
    { href: '/guardian', label: 'Guardian', icon: Shield, show: roles.isGuardian },
  ]

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-primary-600" />
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                Hedge Fund Portal
              </span>
            </Link>

            <div className="hidden md:flex space-x-4">
              {navItems.map((item) => {
                if (!item.show) return null
                const Icon = item.icon
                const isActive = pathname.startsWith(item.href)

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-primary-50 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                        : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>

          <div className="flex items-center">
            <ConnectButton />
          </div>
        </div>
      </div>
    </nav>
  )
}
