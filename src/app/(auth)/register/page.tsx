'use client'

import { useState, useId } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import Link from 'next/link'
import { Building2, CheckCircle2 } from 'lucide-react'

export default function RegisterPage() {
  const id = useId()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      setLoading(false)
      return
    }

    if (!agreeTerms) {
      setError('Please agree to the terms and conditions')
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) throw error

      setSuccess(true)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
    } catch (error: any) {
      setError(error.message)
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
        {/* Logo */}
        <div className="mb-8 flex items-center gap-2">
          <div className="rounded-lg bg-blue-600 p-2">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-bold">Identity Provider</span>
        </div>

        {/* Success Card */}
        <div className="w-full max-w-[400px] rounded-xl border bg-background p-6 shadow-lg shadow-black/5">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Check your email</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                We've sent you a confirmation email. Please click the link to verify your account.
              </p>
            </div>
            <Button asChild variant="outline" className="w-full mt-4">
              <Link href="/login">Back to Login</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-8">
      {/* Logo */}
      <div className="mb-8 flex items-center gap-2">
        <div className="rounded-lg bg-blue-600 p-2">
          <Building2 className="h-6 w-6 text-white" />
        </div>
        <span className="text-2xl font-bold">Identity Provider</span>
      </div>

      {/* Register Card */}
      <div className="w-full max-w-[400px] rounded-xl border bg-background p-6 shadow-lg shadow-black/5">
        {/* Header with Icon */}
        <div className="flex flex-col items-center gap-2 mb-6">
          <div
            className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border"
            aria-hidden="true"
          >
            <svg
              className="stroke-zinc-800 dark:stroke-zinc-100"
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 32 32"
              aria-hidden="true"
            >
              <circle cx="16" cy="16" r="12" fill="none" strokeWidth="8" />
            </svg>
          </div>
          <div className="text-center">
            <h1 className="text-lg font-semibold tracking-tight">Create an account</h1>
            <p className="text-sm text-muted-foreground">
              Enter your information to get started.
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-200">
            {error}
          </div>
        )}

        {/* Register Form */}
        <form onSubmit={handleRegister} className="space-y-5">
          <div className="space-y-4">
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor={`${id}-name`}>Full Name</Label>
              <Input
                id={`${id}-name`}
                placeholder="John Doe"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor={`${id}-email`}>Email</Label>
              <Input
                id={`${id}-email`}
                placeholder="hi@yourcompany.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor={`${id}-password`}>Password</Label>
              <Input
                id={`${id}-password`}
                placeholder="Enter your password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Must be at least 8 characters
              </p>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor={`${id}-confirm-password`}>Confirm Password</Label>
              <Input
                id={`${id}-confirm-password`}
                placeholder="Confirm your password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Terms Agreement */}
          <div className="flex items-start gap-2">
            <Checkbox
              id={`${id}-terms`}
              checked={agreeTerms}
              onCheckedChange={(checked) => setAgreeTerms(checked as boolean)}
              className="mt-0.5"
            />
            <Label htmlFor={`${id}-terms`} className="font-normal text-muted-foreground text-sm leading-5">
              I agree to the{' '}
              <Link href="/terms" className="text-primary underline hover:no-underline">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-primary underline hover:no-underline">
                Privacy Policy
              </Link>
            </Label>
          </div>

          {/* Sign Up Button */}
          <Button type="submit" className="w-full bg-black text-white" disabled={loading}>
            {loading ? 'Creating account...' : 'Create account'}
          </Button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5 before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
          <span className="text-xs text-muted-foreground">Or</span>
        </div>

        {/* Google Sign Up */}
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleGoogleSignup}
        >
          Sign up with Google
        </Button>

        {/* Sign In Link */}
        <p className="mt-5 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="text-primary underline hover:no-underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
