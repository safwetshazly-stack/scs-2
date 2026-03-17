'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { communityAPI } from '@/services/api'
import { useAuthStore } from '@/store/auth.store'
import { Search, Plus, Users, Hash, Lock, Globe, TrendingUp, Star } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { cn, formatNumber } from '@/lib/utils'
import toast from 'react-hot-toast'

const TABS = [
  { id: 'explore', label: 'استكشف' },
  { id: 'mine', label: 'مجتمعاتي' },
  { id: 'trending', label: 'الأكثر نشاطاً' },
]

export default function CommunitiesPage() {
  const [tab, setTab] = useState('explore')
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const { user } = useAuthStore()
  const router = useRouter()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['communities', tab, search],
    queryFn: () => communityAPI.getAll({ search: search || undefined, limit: 24 }).then(r => r.data),
  })

  const joinMutation = useMutation({
    mutationFn: (id: string) => communityAPI.join(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['communities'] }); toast.success('انضممت للمجتمع!') },
  })

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-[var(--text)]">المجتمعات</h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">انضم وتفاعل مع الطلاب في تخصصك</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary gap-2">
          <Plus size={16} /> إنشاء مجتمع
        </button>
      </div>

      {/* Search + Tabs */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ابحث عن مجتمع..."
            className="input-field pr-10 w-full"
          />
        </div>
        <div className="flex bg-[var(--bg-secondary)] rounded-xl p-1 gap-1">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-all',
                tab === t.id ? 'bg-[var(--bg)] text-[var(--text)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
              )}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => <div key={i} className="skeleton h-40 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.communities?.map((c: any, i: number) => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="card card-hover p-5 group cursor-pointer"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center flex-shrink-0 shadow-md">
                  {c.avatar ? <img src={c.avatar} alt={c.name} className="w-full h-full object-cover rounded-2xl" /> : <span className="text-white font-bold text-lg">{c.name[0]}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-[var(--text)] truncate">{c.name}</h3>
                    {c.isPrivate ? <Lock size={12} className="text-[var(--text-tertiary)] flex-shrink-0" /> : <Globe size={12} className="text-emerald-500 flex-shrink-0" />}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-[var(--text-tertiary)]">
                    <span className="flex items-center gap-1"><Users size={11} />{formatNumber(c.membersCount)}</span>
                    <span className="flex items-center gap-1"><Hash size={11} />{c._count?.channels || 0} قناة</span>
                  </div>
                </div>
              </div>
              {c.description && <p className="text-[var(--text-secondary)] text-xs leading-relaxed line-clamp-2 mb-4">{c.description}</p>}
              <div className="flex items-center gap-2">
                <Link href={`/main/communities/${c.slug}`} className="btn-secondary flex-1 justify-center text-xs py-2">
                  عرض
                </Link>
                {!c.isPrivate && (
                  <button onClick={() => joinMutation.mutate(c.id)}
                    className="btn-primary flex-1 justify-center text-xs py-2"
                    disabled={joinMutation.isPending}>
                    انضم
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && <CreateCommunityModal onClose={() => setShowCreate(false)} />}
    </div>
  )
}

function CreateCommunityModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [loading, setLoading] = useState(false)
  const qc = useQueryClient()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    try {
      const { data } = await communityAPI.create({ name, description, isPrivate })
      qc.invalidateQueries({ queryKey: ['communities'] })
      toast.success('تم إنشاء المجتمع!')
      onClose()
      router.push(`/main/communities/${data.slug}`)
    } catch { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="card w-full max-w-md p-6">
        <h2 className="font-display font-bold text-xl text-[var(--text)] mb-6">إنشاء مجتمع جديد</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-2">اسم المجتمع *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="مثال: مطوري React العرب" className="input-field w-full" required minLength={3} maxLength={50} />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-2">الوصف</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="وصف مختصر للمجتمع..." className="input-field w-full resize-none" rows={3} maxLength={500} />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)} className="w-4 h-4 rounded accent-brand-500" />
            <span className="text-sm text-[var(--text)]">مجتمع خاص (بدعوة فقط)</span>
          </label>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">إلغاء</button>
            <button type="submit" disabled={loading || !name.trim()} className="btn-primary flex-1 justify-center">
              {loading ? 'جاري الإنشاء...' : 'إنشاء'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
