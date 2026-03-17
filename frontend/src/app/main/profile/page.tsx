'use client'
import { useAuthStore } from '@/store/auth.store'
import { redirect } from 'next/navigation'

export default function ProfileRedirectPage() {
  const { user } = useAuthStore()
  if (user) redirect(`/main/profile/${user.username}`)
  redirect('/auth/login')
}
