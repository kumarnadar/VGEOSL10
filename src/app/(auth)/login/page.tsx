'use client'

import { useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
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
      <div className="hidden md:flex md:w-1/2 flex-col items-center justify-center bg-primary px-12">
        <Image
          src="/vg-logo.svg"
          alt="Value Global"
          width={240}
          height={60}
          className="brightness-0 invert mb-8"
          priority
        />
        <p className="text-primary-foreground/80 text-lg font-medium text-center">
          Built on Integrity. Focused on Impact.
        </p>
      </div>

      {/* Mobile header strip */}
      <div className="flex md:hidden w-full flex-col">
        <div className="flex items-center justify-center bg-primary px-6 py-6">
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
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>EOS L10 Platform</CardTitle>
              <CardDescription>Enter your email to receive a login link.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email-mobile">Email</Label>
                  <Input
                    id="email-mobile"
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
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right panel - login form (desktop) */}
      <div className="hidden md:flex md:w-1/2 items-center justify-center bg-background px-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>EOS L10 Platform</CardTitle>
            <CardDescription>Enter your email to receive a login link.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
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
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
