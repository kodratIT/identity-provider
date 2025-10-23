import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/rbac/permissions'

// POST /api/users/invite - Invite a user to the tenant
export async function POST(request: Request) {
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

    const body = await request.json()
    const { email, full_name, role_id, tenant_id } = body

    // Validate required fields
    if (!email || !full_name || !role_id || !tenant_id) {
      return NextResponse.json(
        { error: 'email, full_name, role_id, and tenant_id are required' },
        { status: 400 }
      )
    }

    // Check if user is admin
    const adminCheck = await isAdmin(user.id, tenant_id)
    if (!adminCheck) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      )
    }

    // Check if email already exists
    const { data: existingUser } = await supabase.auth.admin.listUsers()
    const userExists = existingUser.users.find((u) => u.email === email)

    if (userExists) {
      // User exists, check if already in this tenant
      const { data: existingMembership } = await supabase
        .from('user_tenants')
        .select('id')
        .eq('user_id', userExists.id)
        .eq('tenant_id', tenant_id)
        .single()

      if (existingMembership) {
        return NextResponse.json(
          { error: 'User is already a member of this tenant' },
          { status: 409 }
        )
      }

      // Add existing user to tenant
      const { error: addError } = await supabase.from('user_tenants').insert({
        user_id: userExists.id,
        tenant_id,
        role_id,
        is_active: true,
      })

      if (addError) throw addError

      return NextResponse.json({
        message: 'Existing user added to tenant successfully',
        user: { email, full_name },
      })
    }

    // Create new user via Supabase Auth
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      email_confirm: false, // User will confirm via email
      user_metadata: { full_name },
    })

    if (createError) throw createError

    // Add user to tenant
    const { error: addError } = await supabase.from('user_tenants').insert({
      user_id: newUser.user.id,
      tenant_id,
      role_id,
      is_active: true,
    })

    if (addError) throw addError

    // Send invitation email (handled by Supabase)
    const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email)

    if (inviteError) {
      console.error('Error sending invite:', inviteError)
      // Don't fail the request, user is already created
    }

    return NextResponse.json(
      {
        message: 'User invited successfully',
        user: { email, full_name },
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error inviting user:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to invite user' },
      { status: 500 }
    )
  }
}
