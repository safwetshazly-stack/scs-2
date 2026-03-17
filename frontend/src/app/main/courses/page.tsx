'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { courseAPI } from '@/services/api'
import { Search, Star, Users, Clock, BookOpen, Filter, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { cn, formatNumber } from '@/lib/utils'

const LEVELS = [{ v: '', l: 'الكل' }, { v: 'BEGINNER', l: 'مبتدئ' }, { v: 'INTERMEDIATE', l: 'متوسط' }, { v: 'ADVANCED', l: 'متقدم' }]
const SORT_OPTIONS = [{ v: 'popular', l: 'الأكثر شعبية' }, { v: 'newest', l: 'الأحدث' }, { v: 'rating', l: 'الأعلى تقييماً' }, { v: 'price_asc', l: 'السعر: الأقل' }]

export default function CoursesPage() {
  const [search, setSearch] = useState('')
  const [level, setLevel] = useState('')
  const [sort, setSort] = useState('popular')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['courses', search, level, sort, minPrice, maxPrice, page],
    queryFn: () => courseAPI.getAll({ search: search || undefined, level: level || undefined, sort, minPrice: minPrice || undefined, maxPrice: maxPrice || undefined, page, limit: 12 }).then(r => r.data),
  })

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-[var(--text)]">الكورسات</h1>
        <p className="text-[var(--text-secondary)] text-sm mt-1">{data?.total ? `${formatNumber(data.total)} كورس متاح` : 'اكتشف أفضل الكورسات'}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث عن كورس..." className="input-field pr-9 text-sm py-2 w-full" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {LEVELS.map(({ v, l }) => (
            <button key={v} onClick={() => setLevel(v)}
              className={cn('px-4 py-2 rounded-xl text-sm font-medium transition-all border',
                level === v ? 'bg-brand-500 text-white border-brand-500' : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-brand-300 hover:text-brand-500'
              )}>{l}</button>
          ))}
        </div>
        <select value={sort} onChange={e => setSort(e.target.value)} className="input-field text-sm py-2 w-auto">
          {SORT_OPTIONS.map(({ v, l }) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array(8).fill(0).map((_, i) => <div key={i} className="skeleton rounded-2xl h-64" />)}
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {data?.courses?.map((course: any, i: number) => (
              <motion.div key={course.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Link href={`/main/courses/${course.slug}`} className="course-card block h-full">
                  <div className="h-40 bg-gradient-to-br from-brand-50 to-brand-100 dark:from-brand-900/20 dark:to-brand-900/40 relative overflow-hidden">
                    {course.thumbnail ? (
                      <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen size={40} className="text-brand-300 dark:text-brand-700" />
                      </div>
                    )}
                    <span className="absolute top-3 right-3 badge-blue text-xs">{course.language}</span>
                    <span className="absolute bottom-3 left-3 text-xs px-2 py-0.5 rounded-lg bg-[var(--bg)]/90 text-[var(--text-secondary)]">
                      {course.level === 'BEGINNER' ? 'مبتدئ' : course.level === 'INTERMEDIATE' ? 'متوسط' : 'متقدم'}
                    </span>
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    <h3 className="font-semibold text-sm text-[var(--text)] line-clamp-2 mb-2 leading-snug">{course.title}</h3>
                    <p className="text-[var(--text-tertiary)] text-xs mb-3">{course.instructor?.username}</p>
                    <div className="flex items-center gap-1 mb-3">
                      <Star size={12} className="fill-amber-400 text-amber-400" />
                      <span className="text-xs font-medium text-[var(--text)]">{course.rating?.toFixed(1) || '—'}</span>
                      <span className="text-[var(--text-tertiary)] text-xs">({formatNumber(course._count?.enrollments || 0)})</span>
                    </div>
                    <div className="flex items-center justify-between mt-auto">
                      <span className="font-display font-bold text-brand-500">{course.price === 0 ? 'مجاني' : `$${course.price}`}</span>
                      <span className="text-xs text-[var(--text-tertiary)] flex items-center gap-1">
                        <Clock size={11} />{Math.round((course.totalDuration || 0) / 3600)}س
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Pagination */}
          {data?.total > 12 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary px-4 py-2 text-sm">السابق</button>
              <span className="text-sm text-[var(--text-secondary)]">صفحة {page}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={data.courses?.length < 12} className="btn-secondary px-4 py-2 text-sm">التالي</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
