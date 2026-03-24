'use client'
import { useState, useRef, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { communityAPI } from '@/services/api'
import { useAuthStore } from '@/store/auth.store'
import { useSocket } from '@/components/providers'
import { Hash, Megaphone, FileText, Users, Settings, Plus, Send, Paperclip, LogOut, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { cn, formatRelativeTime } from '@/lib/utils'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'

const CHANNEL_ICONS: Record<string, any> = {
  TEXT: Hash, ANNOUNCEMENTS: Megaphone, FILES: FileText,
}

export default function CommunityPage() {
  const { slug } = useParams<{ slug: string }>()
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const socket = useSocket()
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { data: community, isLoading } = useQuery({
    queryKey: ['community', slug],
    queryFn: () => communityAPI.getBySlug(slug).then(r => r.data),
  })

  const { data: channels = [] } = useQuery({
    queryKey: ['community-channels', community?.id],
    queryFn: () => communityAPI.getChannels(community!.id).then(r => r.data),
    enabled: !!community?.id && community?.isMember,
  })

  const { data: messages = [], refetch: refetchMessages } = useQuery({
    queryKey: ['channel-messages', activeChannelId],
    queryFn: () => communityAPI.getChannelMessages(activeChannelId!).then(r => r.data),
    enabled: !!activeChannelId,
    refetchInterval: false,
  })

  const joinMutation = useMutation({
    mutationFn: () => communityAPI.join(community!.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['community', slug] }); toast.success('انضممت!') },
  })

  const leaveMutation = useMutation({
    mutationFn: () => communityAPI.leave(community!.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['community', slug] }); toast.success('غادرت المجتمع') },
  })

  useEffect(() => {
    if (channels.length > 0 && !activeChannelId) setActiveChannelId(channels[0].id)
  }, [channels])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!socket || !community?.id) return
    socket.on('channel:message', ({ channelId, message }: any) => {
      if (channelId === activeChannelId) {
        qc.setQueryData(['channel-messages', activeChannelId], (old: any[] = []) => [...old, message])
      }
    })
    return () => { socket.off('channel:message') }
  }, [socket, community?.id, activeChannelId])

  const sendMessage = () => {
    if (!input.trim() || !activeChannelId || !community?.id) return
    socket?.emit('channel:message', { channelId: activeChannelId, communityId: community.id, content: input.trim() })
    setInput('')
  }

  if (isLoading) return <div className="flex-1 flex items-center justify-center"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
  if (!community) return <div className="p-8 text-center text-[var(--text-secondary)]">المجتمع غير موجود</div>

  const activeChannel = channels.find((c: any) => c.id === activeChannelId)

  return (
    <div className="flex h-full overflow-hidden">
      {/* Channels Sidebar */}
      <div className="w-60 flex-shrink-0 bg-[var(--bg-secondary)] border-l border-[var(--border)] flex flex-col">
        {/* Community Header */}
        <div className="p-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold">{community.name[0]}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm text-[var(--text)] truncate">{community.name}</h3>
              <p className="text-xs text-[var(--text-tertiary)]">{community._count?.members || community.membersCount} عضو</p>
            </div>
          </div>
        </div>

        {/* Join/Leave */}
        {!community.isMember ? (
          <div className="p-3 border-b border-[var(--border)]">
            <button onClick={() => joinMutation.mutate()} className="btn-primary w-full justify-center text-xs py-2" disabled={joinMutation.isPending}>
              انضم للمجتمع
            </button>
          </div>
        ) : null}

        {/* Channels */}
        <div className="flex-1 overflow-y-auto p-2">
          <p className="text-xs font-semibold text-[var(--text-tertiary)] px-2 mb-2 uppercase tracking-wide">القنوات</p>
          {channels.map((ch: any) => {
            const Icon = CHANNEL_ICONS[ch.type] || Hash
            return (
              <button key={ch.id} onClick={() => setActiveChannelId(ch.id)}
                className={cn('flex items-center gap-2 w-full px-2.5 py-2 rounded-xl text-sm transition-colors',
                  activeChannelId === ch.id ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600' : 'text-[var(--text-secondary)] hover:bg-[var(--bg)] hover:text-[var(--text)]'
                )}>
                <Icon size={15} className="flex-shrink-0" />
                <span className="truncate">{ch.name}</span>
              </button>
            )
          })}
        </div>

        {/* Bottom */}
        {community.isMember && (
          <div className="p-3 border-t border-[var(--border)] space-y-1">
            <Link href={`/main/communities/${slug}/members`} className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs text-[var(--text-secondary)] hover:bg-[var(--bg)] hover:text-[var(--text)] transition-colors">
              <Users size={14} /> الأعضاء
            </Link>
            {community.memberRole === 'OWNER' || community.memberRole === 'ADMIN' ? (
              <Link href={`/main/communities/${slug}/settings`} className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs text-[var(--text-secondary)] hover:bg-[var(--bg)] hover:text-[var(--text)] transition-colors">
                <Settings size={14} /> الإعدادات
              </Link>
            ) : (
              <button onClick={() => leaveMutation.mutate()} className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 w-full transition-colors">
                <LogOut size={14} /> مغادرة
              </button>
            )}
          </div>
        )}
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeChannel ? (
          <>
            {/* Channel Header */}
            <div className="h-14 flex items-center gap-3 px-5 border-b border-[var(--border)] bg-[var(--bg)] flex-shrink-0">
              {(() => { const Icon = CHANNEL_ICONS[activeChannel.type] || Hash; return <Icon size={18} className="text-[var(--text-tertiary)]" /> })()}
              <span className="font-semibold text-[var(--text)]">{activeChannel.name}</span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="text-center py-16 text-[var(--text-tertiary)] text-sm">
                  <Hash size={40} className="mx-auto mb-3 opacity-30" />
                  <p>لا توجد رسائل بعد. كن أول من يتحدث!</p>
                </div>
              )}
              {messages.map((msg: any) => (
                <motion.div key={msg.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-3 group">
                  <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center flex-shrink-0 text-brand-600 font-bold text-xs mt-0.5">
                    {msg.sender?.profile?.avatar ? <img src={msg.sender.profile.avatar} className="w-full h-full object-cover rounded-full" alt={msg.sender?.username || 'User avatar'} /> : msg.sender?.username?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium text-sm text-[var(--text)]">{msg.sender?.username}</span>
                      <span className="text-xs text-[var(--text-tertiary)]">{formatRelativeTime(msg.createdAt)}</span>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed break-words">{msg.content}</p>
                  </div>
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            {community.isMember && (
              <div className="p-3 bg-[var(--bg)] border-t border-[var(--border)]">
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] focus-within:border-brand-400 transition-colors">
                  <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
                    placeholder={`رسالة في #${activeChannel.name}`}
                    className="flex-1 bg-transparent text-sm text-[var(--text)] placeholder-[var(--text-tertiary)] outline-none"
                  />
                  <button onClick={sendMessage} disabled={!input.trim()}
                    className={cn('w-8 h-8 rounded-lg flex items-center justify-center transition-all', input.trim() ? 'bg-brand-500 text-white hover:bg-brand-600' : 'text-[var(--text-tertiary)]')}
                    aria-label="إرسال الرسالة">
                    <Send size={15} />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[var(--text-tertiary)]">
            <div className="text-center">
              <Hash size={48} className="mx-auto mb-3 opacity-20" />
              <p>اختر قناة للبدء</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
