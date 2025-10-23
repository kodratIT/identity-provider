"use client"
import React, { useState, useEffect } from "react";
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Home,
  Monitor,
  Users,
  ChevronDown,
  ChevronsRight,
  Moon,
  Sun,
  Bell,
  Settings,
  HelpCircle,
  User,
  Building2,
  Shield,
  Key,
  FileText,
  ShieldCheck,
  LogOut,
} from "lucide-react";
import { useUser } from '@/hooks/useUser'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface NavItem {
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  href: string;
  notifs?: number;
}

export function CollapsibleDashboardLayout({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);
  const [open, setOpen] = useState(true);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname()
  const router = useRouter()
  const { profile, activeTenant, tenants, switchTenant } = useUser()

  // Initialize dark mode from localStorage on mount
  useEffect(() => {
    setMounted(true)
    const savedTheme = localStorage.getItem('theme')
    const isDarkMode = savedTheme === 'dark' || 
      (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)
    setIsDark(isDarkMode)
    
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [])

  // Update dark mode when state changes
  useEffect(() => {
    if (!mounted) return
    
    if (isDark) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [isDark, mounted]);

  const isSuperAdmin = activeTenant?.role_name === 'super_admin'

  // Main navigation items
  const mainNavigation: NavItem[] = [
    { Icon: Home, title: "Dashboard", href: "/dashboard" },
    { Icon: Users, title: "Users", href: "/users" },
    { Icon: Building2, title: "Tenants", href: "/tenants" },
    { Icon: Shield, title: "Roles & Permissions", href: "/roles" },
    { Icon: Key, title: "Applications", href: "/applications" },
    { Icon: Monitor, title: "Sessions", href: "/sessions" },
    { Icon: FileText, title: "Audit Logs", href: "/audit-logs" },
  ];

  // Account navigation items
  const accountNavigation: NavItem[] = [
    { Icon: User, title: "Profile", href: "/profile" },
    { Icon: Settings, title: "Settings", href: "/settings" },
  ];

  // Super admin navigation
  const superAdminNavigation: NavItem[] = [
    { Icon: ShieldCheck, title: "Super Admin", href: "/admin" },
  ];

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  // Prevent flash of unstyled content
  if (!mounted) {
    return null
  }

  return (
    <div className={`flex min-h-screen w-full ${isDark ? 'dark' : ''}`}>
      <div className="flex w-full bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
        {/* Sidebar */}
        <nav
          className={`sticky top-0 h-screen shrink-0 border-r transition-all duration-300 ease-in-out ${
            open ? 'w-64' : 'w-16'
          } border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-2 shadow-sm overflow-y-auto`}
        >
          {/* Title Section */}
          <div className="mb-6 border-b border-gray-200 dark:border-gray-800 pb-4">
            <div className="flex cursor-pointer items-center justify-between rounded-md p-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800">
              <div className="flex items-center gap-3">
                <div className="grid size-10 shrink-0 place-content-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-sm">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                {open && (
                  <div className={`transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'}`}>
                    <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Identity Provider
                    </span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400">
                      School Ecosystem
                    </span>
                  </div>
                )}
              </div>
              {open && (
                <ChevronDown className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              )}
            </div>
          </div>

          {/* Tenant Switcher */}
          {activeTenant && open && (
            <div className="mb-4 px-2">
              {tenants.length > 1 ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="w-full rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-left">
                      <div className="flex items-center">
                        <Building2 className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {activeTenant.tenant_name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {activeTenant.role_name}
                          </p>
                        </div>
                        <ChevronDown className="ml-2 h-4 w-4 text-gray-500 flex-shrink-0" />
                      </div>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    <DropdownMenuLabel>Switch Tenant</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {tenants.map((tenant) => (
                      <DropdownMenuItem
                        key={tenant.tenant_id}
                        onClick={() => switchTenant(tenant)}
                        className={cn(
                          'cursor-pointer',
                          tenant.tenant_id === activeTenant.tenant_id && 'bg-blue-50 dark:bg-blue-900/20'
                        )}
                      >
                        <Building2 className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {tenant.tenant_name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {tenant.role_name}
                          </p>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3">
                  <div className="flex items-center">
                    <Building2 className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {activeTenant.tenant_name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {activeTenant.role_name}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Super Admin Section */}
          {isSuperAdmin && (
            <>
              <div className="space-y-1 mb-2">
                {superAdminNavigation.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`relative flex h-11 w-full items-center rounded-md transition-all duration-200 ${
                        isActive
                          ? "bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-300 shadow-sm border-l-2 border-red-500"
                          : "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800"
                      }`}
                    >
                      <div className="grid h-full w-12 place-content-center">
                        <item.Icon className="h-4 w-4" />
                      </div>
                      {open && (
                        <span className="text-sm font-medium">
                          {item.title}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
              {open && <div className="border-b border-gray-200 dark:border-gray-800 mb-4"></div>}
            </>
          )}

          {/* Main Navigation */}
          <div className="space-y-1 mb-8">
            {mainNavigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex h-11 w-full items-center rounded-md transition-all duration-200 ${
                    isActive 
                      ? "bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 shadow-sm border-l-2 border-blue-500" 
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200"
                  }`}
                >
                  <div className="grid h-full w-12 place-content-center">
                    <item.Icon className="h-4 w-4" />
                  </div>
                  {open && (
                    <span className="text-sm font-medium">
                      {item.title}
                    </span>
                  )}
                  {item.notifs && open && (
                    <span className="absolute right-3 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 dark:bg-blue-600 text-xs text-white font-medium">
                      {item.notifs}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>

          {/* Account Section */}
          {open && (
            <div className="border-t border-gray-200 dark:border-gray-800 pt-4 space-y-1 mb-16">
              <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Account
              </div>
              {accountNavigation.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`relative flex h-11 w-full items-center rounded-md transition-all duration-200 ${
                      isActive 
                        ? "bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 shadow-sm border-l-2 border-blue-500" 
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200"
                    }`}
                  >
                    <div className="grid h-full w-12 place-content-center">
                      <item.Icon className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium">
                      {item.title}
                    </span>
                  </Link>
                )
              })}
              
              {/* Logout */}
              <button
                onClick={handleLogout}
                className="relative flex h-11 w-full items-center rounded-md transition-all duration-200 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 dark:hover:text-red-300"
              >
                <div className="grid h-full w-12 place-content-center">
                  <LogOut className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium">
                  Logout
                </span>
              </button>
            </div>
          )}

          {/* Toggle Button */}
          <button
            onClick={() => setOpen(!open)}
            className="absolute bottom-0 left-0 right-0 border-t border-gray-200 dark:border-gray-800 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <div className="flex items-center p-3">
              <div className="grid size-10 place-content-center">
                <ChevronsRight
                  className={`h-4 w-4 transition-transform duration-300 text-gray-500 dark:text-gray-400 ${
                    open ? "rotate-180" : ""
                  }`}
                />
              </div>
              {open && (
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  Hide
                </span>
              )}
            </div>
          </button>
        </nav>

        {/* Main Content */}
        <div className="flex-1 bg-gray-50 dark:bg-gray-950 overflow-auto">
          {/* Header */}
          <div className="sticky top-0 z-10 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 py-4 shadow-sm">
            <div className="flex items-center justify-between">
              {/* Tenant Info - Mobile */}
              {activeTenant && (
                <div className="flex items-center gap-2 lg:hidden">
                  <Building2 className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">{activeTenant.tenant_name}</span>
                </div>
              )}
              
              <div className="flex-1"></div>

              {/* Header Actions */}
              <div className="flex items-center gap-3">
                <button className="relative p-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
                  <Bell className="h-5 w-5" />
                  <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></span>
                </button>
                
                <button
                  onClick={() => setIsDark(!isDark)}
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                >
                  {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>
                
                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                      <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
                        {profile?.full_name?.charAt(0) || 'U'}
                      </div>
                      <ChevronDown className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium">{profile?.full_name || 'User'}</p>
                        <p className="text-xs text-muted-foreground">{profile?.email}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push('/profile')}>
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/settings')}>
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-red-600 dark:text-red-400">
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
          
          {/* Main Content */}
          <div className="p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
