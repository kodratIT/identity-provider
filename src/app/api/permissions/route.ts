import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/permissions - Get all permissions
export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all permissions
    const { data: permissions, error } = await supabase
      .from('permissions')
      .select('*')
      .order('resource')
      .order('action')

    if (error) throw error

    // Group by resource
    const grouped = (permissions || []).reduce((acc: any, permission) => {
      if (!acc[permission.resource]) {
        acc[permission.resource] = []
      }
      acc[permission.resource].push(permission)
      return acc
    }, {})

    return NextResponse.json({
      permissions: permissions || [],
      grouped,
    })
  } catch (error: any) {
    console.error('Error fetching permissions:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch permissions' },
      { status: 500 }
    )
  }
}
