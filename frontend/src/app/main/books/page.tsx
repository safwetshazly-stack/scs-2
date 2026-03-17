'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { bookAPI } from '@/services/api'
import { useAuthStore } from '@/store/auth.store'
import { Search, BookOpen, Star, Download, ShoppingCart, Library } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { cn, formatNumber } from '@/lib/utils'
import toast from 'react-hot-toast'

const TABS = [{ id: 'all', label: 'جميع الكتب' }, { id: 'library', label: 'مكتبتي' }]

export default function BooksPage() {
  const [tab, setTab] = useState('all')
  const [search, setSearch] = useState('')
  const { user } = useAuthStore()
  const qc = useQueryClient()

  const { data: booksData, isLoading } = useQuery({
    queryKey: ['books', search],
    queryFn: () => bookAPI.getAll({ search: search || undefined, limit: 24 }).then(r => r.data),
    enabled: tab === 'all',
  })

  const { data: library = [], isLoading: libLoading } = useQuery({
    queryKey: ['book-library'],
    queryFn: () => bookAPI.getMyLibrary().then(r => r.data),
    enabled: tab === 'library' && !!user,
  })

  const purchaseMutation = useMutation({
    mutationFn: (id: string) => bookAPI.purchase(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['books'] }); qc.invalidateQueries({ queryKey: ['book-library'] }); toast.success('أضيف الكتاب لمكتبتك!') },
  })

  const books = tab === 'all' ? booksData?.books || [] : library
  const loading = tab === 'all' ? isLoading : libLoading

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-[var(--text)]">الكتب</h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">اكتشف وتحميل الكتب التعليمية</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث عن كتاب..." className="input-field pr-9 text-sm py-2 w-full" />
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

      {loading ? (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {Array(10).fill(0).map((_, i) => <div key={i} className="skeleton h-56 rounded-2xl" />)}
        </div>
      ) : books.length === 0 ? (
        <div className="text-center py-16">
          <Library size={48} className="mx-auto mb-4 text-[var(--text-tertiary)] opacity-40" />
          <p className="text-[var(--text-secondary)]">{tab === 'library' ? 'مكتبتك فارغة' : 'لا توجد كتب'}</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {books.map((book: any, i: number) => (
            <motion.div key={book.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="card card-hover group flex flex-col">
              <div className="h-44 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-900/40 flex items-center justify-center overflow-hidden rounded-t-2xl">
                {book.coverImage ? <img src={book.coverImage} alt={book.title} className="w-full h-full object-cover" /> : <BookOpen size={40} className="text-amber-300 dark:text-amber-700 group-hover:scale-110 transition-transform" />}
              </div>
              <div className="p-4 flex flex-col flex-1">
                <h3 className="font-semibold text-sm text-[var(--text)] line-clamp-2 mb-1 leading-snug">{book.title}</h3>
                <p className="text-[var(--text-tertiary)] text-xs mb-2">{book.author?.username}</p>
                <div className="flex items-center gap-1 mb-3">
                  <Star size={11} className="fill-amber-400 text-amber-400" />
                  <span className="text-xs text-[var(--text)]">{book.rating?.toFixed(1) || '—'}</span>
                </div>
                <div className="flex items-center justify-between mt-auto">
                  <span className="font-display font-bold text-sm text-brand-500">{book.price === 0 ? 'مجاني' : `$${book.price}`}</span>
                  {tab === 'library' ? (
                    <button className="flex items-center gap-1 text-xs btn-primary px-3 py-1.5">
                      <Download size={12} /> تحميل
                    </button>
                  ) : (
                    <button onClick={() => purchaseMutation.mutate(book.id)} disabled={purchaseMutation.isPending}
                      className="flex items-center gap-1 text-xs btn-primary px-3 py-1.5">
                      {book.price === 0 ? (<><Download size={12} /> احصل عليه</>) : (<><ShoppingCart size={12} /> شراء</>)}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
