'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface LoginFormProps {
  idPrefix: string
  email: string
  setEmail: (email: string) => void
  loading: boolean
  message: string
  handleLogin: (e: React.FormEvent) => void
}

function LoginForm({ idPrefix, email, setEmail, loading, message, handleLogin }: LoginFormProps) {
  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-email`}>Email</Label>
        <Input
          id={`${idPrefix}-email`}
          type="email"
          placeholder="you@valueglobal.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Sending...' : 'Send Login Link'}
      </Button>
      {message && (
        <p className="text-sm text-center text-muted-foreground">{message}</p>
      )}
    </form>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageContent />
    </Suspense>
  )
}

function LoginPageContent() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const searchParams = useSearchParams()
  const isDeactivated = searchParams.get('deactivated') === 'true'
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setMessage(error.message)
    } else {
      setMessage('Check your email for the login link.')
    }
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel - VG branding */}
      <div className="hidden md:flex md:w-1/2 flex-col items-center justify-center bg-primary px-12 relative overflow-hidden geo-pattern">
        <Image
          src="/vg-logo.svg"
          alt="Value Global"
          width={240}
          height={60}
          className="brightness-0 invert mb-8 animate-fade-in"
          style={{ animationDelay: '200ms', opacity: 0 }}
          priority
        />
        <p
          className="text-primary-foreground/80 text-lg font-medium text-center animate-fade-in-up"
          style={{ animationDelay: '500ms', opacity: 0 }}
        >
          Built on Integrity. Focused on Impact.
        </p>
        <p
          className="text-primary-foreground/50 text-sm mt-4 animate-fade-in-up"
          style={{ animationDelay: '700ms', opacity: 0 }}
        >
          EOS L10 Meeting Platform
        </p>
      </div>

      {/* Mobile header strip */}
      <div className="flex md:hidden w-full flex-col">
        <div className="flex items-center justify-center bg-primary px-6 py-6 geo-pattern">
          <Image
            src="/vg-logo.svg"
            alt="Value Global"
            width={160}
            height={40}
            className="brightness-0 invert"
            priority
          />
        </div>

        {/* Mobile form */}
        <div className="flex flex-1 items-center justify-center bg-background px-6 py-12">
          <Card className="w-full max-w-md animate-fade-in-up">
            <CardHeader>
              <CardTitle>EOS L10 Platform</CardTitle>
              <CardDescription>Enter your email to receive a login link.</CardDescription>
            </CardHeader>
            <CardContent>
              {isDeactivated && (
                <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  Your account has been deactivated. Contact your administrator.
                </div>
              )}
              <LoginForm
                idPrefix="mobile"
                email={email}
                setEmail={setEmail}
                loading={loading}
                message={message}
                handleLogin={handleLogin}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right panel - login form (desktop) */}
      <div className="hidden md:flex md:w-1/2 flex-col items-center justify-center bg-background px-12">
        <div className="w-12 h-1 bg-primary rounded-full mb-6" />
        <div className="animate-fade-in" style={{ animationDelay: '300ms', opacity: 0 }}>
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>EOS L10 Platform</CardTitle>
              <CardDescription>Enter your email to receive a login link.</CardDescription>
            </CardHeader>
            <CardContent>
              {isDeactivated && (
                <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  Your account has been deactivated. Contact your administrator.
                </div>
              )}
              <LoginForm
                idPrefix="desktop"
                email={email}
                setEmail={setEmail}
                loading={loading}
                message={message}
                handleLogin={handleLogin}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
