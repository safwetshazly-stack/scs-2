'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { userAPI, bookmarkAPI } from '@/services/api'
import { Bookmark, BookOpen, Users, Book, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { EmptyState } from '@/components/ui'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

export default function BookmarksPage() {
  const qc = useQueryClient()

  const { data: bookmarks = [], isLoading } = useQuery({
    queryKey: ['bookmarks'],
    queryFn: () => bookmarkAPI.getAll().then(r => r.data),
  })

  const removeMutation = useMutation({
    mutationFn: ({ id, type }: { id: string; type: string }) =>
      bookmarkAPI.remove(id, type),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookmarks'] })
      toast.success('تم الحذف من المحفوظات')
    },
  })

  const getIcon = (type: string) => {
    if (type === 'course') return <BookOpen size={18} className="text-brand-500" />
    if (type === 'community') return <Users size={18} className="text-emerald-500" />
    return <Book size={18} className="text-amber-500" />
  }

  const getLink = (bookmark: any) => {
    if (bookmark.resourceType === 'course') return `/main/courses/${bookmark.resourceId}`
    if (bookmark.resourceType === 'community') return `/main/communities/${bookmark.resourceId}`
    return `/main/books`
  }

  const getLabel = (type: string) => {
    const map: Record<string, string> = { course: 'كورس', community: 'مجتمع', book: 'كتاب' }
    return map[type] || type
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <h1 className="font-display font-bold text-2xl text-[var(--text)] mb-6 flex items-center gap-2">
        <Bookmark size={22} className="text-brand-500" /> المحفوظات
      </h1>

      {isLoading && (
        <div className="space-y-3">
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className="skeleton h-16 rounded-2xl" />
          ))}
        </div>
      )}

      {!isLoading && bookmarks.length === 0 && (
        <EmptyState
          icon={<Bookmark size={32} />}
          title="لا توجد محفوظات"
          description="احفظ الكورسات والكتب والمجتمعات التي تهمك للعودة إليها لاحقاً"
          action={<Link href="/main/courses" className="btn-primary">استكشف الكورسات</Link>}
        />
      )}

      <div className="space-y-3">
        {bookmarks.map((bookmark: any, i: number) => (
          <motion.div
            key={bookmark.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="card p-4 flex items-center gap-4 group"
          >
            <div className="w-10 h-10 rounded-xl bg-[var(--bg-secondary)] flex items-center justify-center flex-shrink-0">
              {getIcon(bookmark.resourceType)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-[var(--text)] truncate">
                {bookmark.resourceId}
              </p>
              <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                {getLabel(bookmark.resourceType)}
              </p>
            </div>
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Link href={getLink(bookmark)} className="btn-primary text-xs px-3 py-1.5">
                عرض
              </Link>
              <button
                onClick={() => removeMutation.mutate({
                  id: bookmark.resourceId,
                  type: bookmark.resourceType,
                })}
                className="p-2 rounded-lg text-[var(--text-tertiary)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
