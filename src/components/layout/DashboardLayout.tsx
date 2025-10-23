'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard,
  Users,
  Settings,
  Building2,
  Shield,
  Menu,
  LogOut,
  User,
  FileText,
  Key,
  Monitor,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useUser } from '@/hooks/useUser'
import { useAuth } from '@/hooks/useAuth'

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

const navigation: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Users', href: '/users', icon: Users },
  { title: 'Tenants', href: '/tenants', icon: Building2 },
  { title: 'Roles & Permissions', href: '/roles', icon: Shield },
  { title: 'Applications', href: '/applications', icon: Key },
  { title: 'Sessions', href: '/sessions', icon: Monitor },
  { title: 'Audit Logs', href: '/audit-logs', icon: FileText },
  { title: 'Profile', href: '/profile', icon: User },
  { title: 'Settings', href: '/settings', icon: Settings },
]

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const { profile, activeTenant, tenants, switchTenant } = useUser()
  const { signOut } = useAuth()

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 flex-col border-r bg-white lg:flex">
        <div className="flex h-16 items-center border-b px-6">
          <Building2 className="mr-2 h-6 w-6 text-blue-600" />
          <span className="text-xl font-bold">Identity Provider</span>
        </div>
        
        {/* Tenant Switcher */}
        {activeTenant && (
          <div className="border-b p-4">
            {tenants.length > 1 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-full rounded-lg bg-blue-50 p-3 hover:bg-blue-100 transition-colors">
                    <div className="flex items-center">
                      <Building2 className="mr-2 h-4 w-4 text-blue-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {activeTenant.tenant_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {activeTenant.role_name}
                        </p>
                      </div>
                      <svg className="ml-2 h-4 w-4 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64">
                  <DropdownMenuLabel>Switch Tenant</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {tenants.map((tenant) => (
                    <DropdownMenuItem
                      key={tenant.tenant_id}
                      onClick={() => switchTenant(tenant)}
                      className={cn(
                        'cursor-pointer',
                        tenant.tenant_id === activeTenant.tenant_id && 'bg-blue-50'
                      )}
                    >
                      <div className="flex items-center w-full">
                        <Building2 className="mr-2 h-4 w-4 text-blue-600" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {tenant.tenant_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {tenant.role_name}
                          </p>
                        </div>
                        {tenant.tenant_id === activeTenant.tenant_id && (
                          <svg className="ml-2 h-4 w-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="rounded-lg bg-blue-50 p-3">
                <div className="flex items-center">
                  <Building2 className="mr-2 h-4 w-4 text-blue-600" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {activeTenant.tenant_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {activeTenant.role_name}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                )}
              >
                <Icon className="h-5 w-5" />
                {item.title}
              </Link>
            )
          })}
        </nav>

        {/* User Profile */}
        <div className="border-t p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white text-sm font-medium">
              {profile?.full_name
                ?.split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {profile?.full_name || 'User'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {profile?.email}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={() => signOut()}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="flex flex-1 flex-col overflow-hidden lg:hidden">
        <header className="flex h-16 items-center justify-between border-b bg-white px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Menu className="h-6 w-6" />
          </Button>
          <span className="text-lg font-semibold">Identity Provider</span>
          <div className="w-10" /> {/* Spacer */}
        </header>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="border-b bg-white p-4">
            <nav className="space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href
                const Icon = item.icon
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium',
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {item.title}
                  </Link>
                )
              })}
            </nav>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto p-6">{children}</div>
        </main>
      </div>

      {/* Desktop Main Content */}
      <div className="hidden flex-1 flex-col overflow-hidden lg:flex">
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto p-6">{children}</div>
        </main>
      </div>
    </div>
  )
}
