'use client'
import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { userAPI } from '@/services/api'
import { useAuthStore } from '@/store/auth.store'
import { Users, BookOpen, Globe, Github, Link as LinkIcon, MapPin, GraduationCap, UserPlus, UserCheck, MessageCircle } from 'lucide-react'
import Link from 'next/link'
import { formatNumber, formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>()
  const { user: me } = useAuthStore()
  const qc = useQueryClient()

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', username],
    queryFn: () => userAPI.getProfile(username).then(r => r.data),
  })

  const followMutation = useMutation({
    mutationFn: () => profile?.isFollowing ? userAPI.unfollow(profile.id) : userAPI.follow(profile!.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['profile', username] }); toast.success(profile?.isFollowing ? 'إلغاء المتابعة' : 'متابعة!') },
  })

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
  if (!profile) return <div className="p-8 text-center text-[var(--text-secondary)]">المستخدم غير موجود</div>

  const isMe = me?.id === profile.id

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      {/* Cover + Avatar */}
      <div className="card overflow-hidden mb-6">
        {/* Dynamic background image from user profile - using CSS variable */}
        {/* eslint-disable-next-line @next/next/no-css-tagged-template-literal */}
        <div className="h-36 bg-gradient-to-br from-brand-400 to-brand-600 profile-cover" style={profile.profile?.coverImage ? { '--cover-image': `url('${profile.profile.coverImage}')` } as React.CSSProperties : {}} />
        <div className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-10 mb-4">
            <div className="w-20 h-20 rounded-full border-4 border-[var(--bg)] bg-brand-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg overflow-hidden">
              {profile.profile?.avatar ? <img src={profile.profile.avatar} className="w-full h-full object-cover" alt={profile.username || 'User avatar'} /> : profile.username[0].toUpperCase()}
            </div>
            <div className="flex gap-2 mt-12">
              {isMe ? (
                <Link href="/main/settings" className="btn-secondary text-sm px-4 py-2">تعديل الملف</Link>
              ) : (
                <>
                  <button onClick={() => followMutation.mutate()} disabled={followMutation.isPending} className={profile.isFollowing ? 'btn-secondary text-sm px-4 py-2' : 'btn-primary text-sm px-4 py-2'}>
                    {profile.isFollowing ? <><UserCheck size={15} /> متابَع</> : <><UserPlus size={15} /> متابعة</>}
                  </button>
                  <Link href="/main/chat" className="btn-secondary text-sm px-4 py-2"><MessageCircle size={15} /></Link>
                </>
              )}
            </div>
          </div>

          <h1 className="font-display font-bold text-xl text-[var(--text)]">{profile.username}</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1 mb-3">{profile.role === 'INSTRUCTOR' ? '👨‍🏫 معلم' : '🎓 طالب'}</p>
          {profile.profile?.bio && <p className="text-[var(--text-secondary)] text-sm mb-4 leading-relaxed">{profile.profile.bio}</p>}

          {/* Meta */}
          <div className="flex flex-wrap gap-4 text-sm text-[var(--text-secondary)] mb-4">
            {profile.profile?.country && <span className="flex items-center gap-1.5"><MapPin size={14} />{profile.profile.country}</span>}
            {profile.profile?.university && <span className="flex items-center gap-1.5"><GraduationCap size={14} />{profile.profile.university}</span>}
            {profile.profile?.website && <a href={profile.profile.website} target="_blank" className="flex items-center gap-1.5 text-brand-500 hover:underline"><Globe size={14} />موقعه</a>}
          </div>

          {/* Skills */}
          {profile.profile?.skills?.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {profile.profile.skills.map((s: string) => <span key={s} className="badge-blue text-xs">{s}</span>)}
            </div>
          )}

          {/* Stats */}
          <div className="flex gap-6 pt-4 border-t border-[var(--border)]">
            {[
              { v: formatNumber(profile._count?.followers || 0), l: 'متابع' },
              { v: formatNumber(profile._count?.following || 0), l: 'يتابع' },
              { v: formatNumber(profile._count?.enrollments || 0), l: 'كورس' },
              ...(profile.role === 'INSTRUCTOR' ? [{ v: formatNumber(profile._count?.coursesCreated || 0), l: 'كورس نشرته' }] : []),
            ].map(({ v, l }) => (
              <div key={l} className="text-center">
                <p className="font-display font-bold text-lg text-[var(--text)]">{v}</p>
                <p className="text-xs text-[var(--text-tertiary)]">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
