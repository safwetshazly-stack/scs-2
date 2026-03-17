'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import { useDebounce } from '@/hooks'
import { Search, BookOpen, Users, User, Book, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

const TABS = ['الكل', 'كورسات', 'مجتمعات', 'مستخدمون', 'كتب']

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState('الكل')
  const debouncedQuery = useDebounce(query, 350)

  const { data, isLoading } = useQuery({
    queryKey: ['global-search', debouncedQuery],
    queryFn: () => api.get(`/search?q=${encodeURIComponent(debouncedQuery)}`).then(r => r.data),
    enabled: debouncedQuery.length >= 2,
  })

  const hasResults = data && (data.courses?.length || data.communities?.length || data.users?.length || data.books?.length)

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6">
      <h1 className="font-display font-bold text-2xl text-[var(--text)] mb-6">البحث</h1>

      {/* Search Input */}
      <div className="relative mb-6">
        <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
        <input
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="ابحث عن كورس، مجتمع، مستخدم، أو كتاب..."
          className="input-field pr-12 py-4 text-base w-full"
        />
        {isLoading && <Loader2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-500 animate-spin" />}
      </div>

      {/* Tabs */}
      {hasResults && (
        <div className="flex gap-1 bg-[var(--bg-secondary)] p-1 rounded-xl mb-6 w-fit overflow-x-auto no-scrollbar">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn('px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
                tab === t ? 'bg-[var(--bg)] text-[var(--text)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
              )}>{t}</button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {query.length < 2 && (
        <div className="text-center py-20">
          <Search size={48} className="mx-auto text-[var(--text-tertiary)] opacity-20 mb-4" />
          <p className="text-[var(--text-secondary)]">اكتب على الأقل حرفين للبحث</p>
        </div>
      )}

      {/* No results */}
      {query.length >= 2 && !isLoading && !hasResults && (
        <div className="text-center py-20">
          <p className="text-[var(--text-secondary)]">لم يتم العثور على نتائج لـ "{query}"</p>
        </div>
      )}

      {/* Results */}
      {hasResults && (
        <div className="space-y-8">
          {/* Courses */}
          {(tab === 'الكل' || tab === 'كورسات') && data.courses?.length > 0 && (
            <section>
              <h2 className="flex items-center gap-2 font-display font-semibold text-lg text-[var(--text)] mb-4">
                <BookOpen size={18} className="text-brand-500" /> الكورسات
              </h2>
              <div className="space-y-3">
                {data.courses.map((c: any, i: number) => (
                  <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <Link href={`/main/courses/${c.slug}`} className="flex items-center gap-4 p-4 card card-hover">
                      <div className="w-12 h-12 rounded-xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center flex-shrink-0">
                        <BookOpen size={20} className="text-brand-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-[var(--text)] truncate">{c.title}</p>
                        <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{c.instructor?.username} • ⭐ {c.rating?.toFixed(1)}</p>
                      </div>
                      <span className="text-sm font-bold text-brand-500 flex-shrink-0">{c.price === 0 ? 'مجاني' : `$${c.price}`}</span>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {/* Communities */}
          {(tab === 'الكل' || tab === 'مجتمعات') && data.communities?.length > 0 && (
            <section>
              <h2 className="flex items-center gap-2 font-display font-semibold text-lg text-[var(--text)] mb-4">
                <Users size={18} className="text-emerald-500" /> المجتمعات
              </h2>
              <div className="space-y-3">
                {data.communities.map((c: any, i: number) => (
                  <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <Link href={`/main/communities/${c.slug}`} className="flex items-center gap-4 p-4 card card-hover">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                        {c.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-[var(--text)] truncate">{c.name}</p>
                        <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{c.membersCount} عضو</p>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {/* Users */}
          {(tab === 'الكل' || tab === 'مستخدمون') && data.users?.length > 0 && (
            <section>
              <h2 className="flex items-center gap-2 font-display font-semibold text-lg text-[var(--text)] mb-4">
                <User size={18} className="text-purple-500" /> المستخدمون
              </h2>
              <div className="space-y-3">
                {data.users.map((u: any, i: number) => (
                  <motion.div key={u.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <Link href={`/main/profile/${u.username}`} className="flex items-center gap-4 p-4 card card-hover">
                      <div className="w-12 h-12 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 font-bold text-lg flex-shrink-0">
                        {u.profile?.avatar ? <img src={u.profile.avatar} className="w-full h-full object-cover rounded-full" alt="" /> : u.username[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-[var(--text)]">{u.username}</p>
                        {u.profile?.bio && <p className="text-xs text-[var(--text-tertiary)] truncate mt-0.5">{u.profile.bio}</p>}
                      </div>
                      <span className="text-xs text-[var(--text-tertiary)] flex-shrink-0">{u.role === 'INSTRUCTOR' ? '👨‍🏫 معلم' : '🎓 طالب'}</span>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {/* Books */}
          {(tab === 'الكل' || tab === 'كتب') && data.books?.length > 0 && (
            <section>
              <h2 className="flex items-center gap-2 font-display font-semibold text-lg text-[var(--text)] mb-4">
                <Book size={18} className="text-amber-500" /> الكتب
              </h2>
              <div className="space-y-3">
                {data.books.map((b: any, i: number) => (
                  <motion.div key={b.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <Link href={`/main/books`} className="flex items-center gap-4 p-4 card card-hover">
                      <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center flex-shrink-0">
                        <Book size={20} className="text-amber-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-[var(--text)] truncate">{b.title}</p>
                        <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{b.author?.username}</p>
                      </div>
                      <span className="text-sm font-bold text-amber-500 flex-shrink-0">{b.price === 0 ? 'مجاني' : `$${b.price}`}</span>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
