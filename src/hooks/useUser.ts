'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './useAuth'

interface UserProfile {
  id: string
  full_name: string | null
  avatar_url: string | null
  email: string
}

interface UserTenant {
  tenant_id: string
  tenant_name: string
  role_name: string
  role_id: string
}

export function useUser() {
  const { user, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [tenants, setTenants] = useState<UserTenant[]>([])
  const [activeTenant, setActiveTenant] = useState<UserTenant | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!user) {
      setProfile(null)
      setTenants([])
      setActiveTenant(null)
      setLoading(false)
      return
    }

    async function loadUserData() {
      try {
        // Load profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user!.id)
          .single()

        if (profileData) {
          setProfile({
            id: profileData.id,
            full_name: profileData.full_name,
            avatar_url: profileData.avatar_url,
            email: user!.email!,
          })
        }

        // Load user tenants
        const { data: tenantsData } = await supabase
          .from('user_tenants')
          .select(`
            tenant_id,
            tenants (
              id,
              name
            ),
            roles (
              id,
              name
            )
          `)
          .eq('user_id', user!.id)
          .eq('is_active', true)

        if (tenantsData) {
          const formattedTenants = tenantsData.map((ut: any) => ({
            tenant_id: ut.tenant_id,
            tenant_name: ut.tenants.name,
            role_name: ut.roles.name,
            role_id: ut.roles.id,
          }))
          setTenants(formattedTenants)
          
          // Load active tenant from localStorage or use first
          const savedTenant = localStorage.getItem('activeTenant')
          if (savedTenant) {
            const parsed = JSON.parse(savedTenant)
            const found = formattedTenants.find((t: UserTenant) => t.tenant_id === parsed.tenant_id)
            if (found) {
              setActiveTenant(found)
            } else if (formattedTenants.length > 0) {
              setActiveTenant(formattedTenants[0])
            }
          } else if (formattedTenants.length > 0) {
            setActiveTenant(formattedTenants[0])
          }
        }
      } catch (error) {
        console.error('Error loading user data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadUserData()
  }, [user, supabase])

  const switchTenant = (tenant: UserTenant) => {
    setActiveTenant(tenant)
    // Store in localStorage for persistence
    localStorage.setItem('activeTenant', JSON.stringify(tenant))
  }

  return {
    profile,
    tenants,
    activeTenant,
    switchTenant,
    loading: authLoading || loading,
  }
}
