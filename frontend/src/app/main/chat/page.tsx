'use client'
import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { chatAPI, userAPI } from '@/services/api'
import { useAuthStore } from '@/store/auth.store'
import { useSocket } from '@/components/providers'
import { Search, Plus, Send, Paperclip, MoreVertical, Phone, Video, Image, File, Smile, ArrowLeft } from 'lucide-react'
import { cn, formatRelativeTime, formatTime } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

export default function ChatPage() {
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [searchUser, setSearchUser] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimer = useRef<NodeJS.Timeout>()
  const { user } = useAuthStore()
  const socket = useSocket()
  const qc = useQueryClient()

  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => chatAPI.getConversations().then(r => r.data),
  })

  const { data: messages = [] } = useQuery({
    queryKey: ['messages', activeConvId],
    queryFn: () => chatAPI.getMessages(activeConvId!).then(r => r.data),
    enabled: !!activeConvId,
  })

  const { data: userSearch = [] } = useQuery({
    queryKey: ['user-search', searchUser],
    queryFn: () => userAPI.getProfile(searchUser).then(r => [r.data]).catch(() => []),
    enabled: searchUser.length > 2,
  })

  const startConv = useMutation({
    mutationFn: (userId: string) => chatAPI.getOrCreateConversation(userId).then(r => r.data),
    onSuccess: (conv) => { setActiveConvId(conv.id); setSearchUser(''); qc.invalidateQueries({ queryKey: ['conversations'] }) },
  })

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  useEffect(() => {
    if (!socket) return
    socket.on('message:new', (msg: any) => {
      if (msg.conversationId === activeConvId) {
        qc.setQueryData(['messages', activeConvId], (old: any[] = []) => [...old, msg])
      }
      qc.invalidateQueries({ queryKey: ['conversations'] })
    })
    socket.on('typing:start', ({ userId: uid, conversationId: cid }: any) => {
      if (cid === activeConvId && uid !== user?.id) setIsTyping(true)
    })
    socket.on('typing:stop', ({ conversationId: cid }: any) => {
      if (cid === activeConvId) setIsTyping(false)
    })
    return () => { socket.off('message:new'); socket.off('typing:start'); socket.off('typing:stop') }
  }, [socket, activeConvId])

  const sendMessage = () => {
    const trimmed = input.trim()
    if (!trimmed || !activeConvId) return
    socket?.emit('message:send', { conversationId: activeConvId, content: trimmed })
    setInput('')
  }

  const handleTyping = (val: string) => {
    setInput(val)
    if (!activeConvId) return
    socket?.emit('typing:start', { conversationId: activeConvId })
    clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => socket?.emit('typing:stop', { conversationId: activeConvId }), 1500)
  }

  const activeConv = conversations.find((c: any) => c.id === activeConvId)
  const otherMember = activeConv?.members?.find((m: any) => m.userId !== user?.id)

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar */}
      <div className="w-72 flex-shrink-0 border-l border-[var(--border)] bg-[var(--bg)] flex flex-col">
        <div className="p-4 border-b border-[var(--border)]">
          <h2 className="font-display font-bold text-lg text-[var(--text)] mb-3">الرسائل</h2>
          <div className="relative">
            <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
            <input
              value={searchUser}
              onChange={e => setSearchUser(e.target.value)}
              placeholder="ابحث عن مستخدم..."
              className="input-field pr-9 text-sm py-2"
            />
          </div>
          {searchUser.length > 2 && userSearch.length > 0 && (
            <div className="mt-2 card p-1 shadow-card-hover">
              {userSearch.map((u: any) => (
                <button key={u.id} onClick={() => startConv.mutate(u.id)}
                  className="flex items-center gap-3 w-full px-3 py-2 rounded-xl hover:bg-[var(--bg-secondary)] transition-colors">
                  <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 text-xs font-bold flex-shrink-0">
                    {u.username[0].toUpperCase()}
                  </div>
                  <span className="text-sm text-[var(--text)]">{u.username}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 && (
            <div className="text-center py-12 px-4">
              <div className="w-12 h-12 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center mx-auto mb-3">
                <Send size={20} className="text-[var(--text-tertiary)]" />
              </div>
              <p className="text-sm text-[var(--text-tertiary)]">لا توجد محادثات بعد</p>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">ابحث عن مستخدم للبدء</p>
            </div>
          )}
          {conversations.map((conv: any) => {
            const other = conv.members?.find((m: any) => m.userId !== user?.id)
            const lastMsg = conv.messages?.[0]
            return (
              <button key={conv.id} onClick={() => setActiveConvId(conv.id)}
                className={cn('flex items-center gap-3 w-full p-3 mx-1 rounded-xl transition-colors text-right',
                  activeConvId === conv.id ? 'bg-brand-50 dark:bg-brand-900/20' : 'hover:bg-[var(--bg-secondary)]'
                )}>
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 font-bold text-sm">
                    {other?.user?.username?.[0]?.toUpperCase() || conv.name?.[0] || '?'}
                  </div>
                </div>
                <div className="flex-1 min-w-0 text-right">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-[var(--text-tertiary)]">{lastMsg ? formatRelativeTime(lastMsg.createdAt) : ''}</p>
                    <p className="font-medium text-sm text-[var(--text)] truncate">{conv.type === 'GROUP' ? conv.name : other?.user?.username}</p>
                  </div>
                  <p className="text-xs text-[var(--text-tertiary)] truncate mt-0.5">
                    {lastMsg ? (lastMsg.sender?.username === user?.username ? 'أنت: ' : '') + lastMsg.content : 'ابدأ المحادثة'}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Chat Window */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeConvId ? (
          <>
            {/* Header */}
            <div className="h-14 flex items-center gap-3 px-5 bg-[var(--bg)] border-b border-[var(--border)] flex-shrink-0">
              <div className="w-9 h-9 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 font-bold text-sm flex-shrink-0">
                {otherMember?.user?.username?.[0]?.toUpperCase() || activeConv?.name?.[0] || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-[var(--text)]">{activeConv?.type === 'GROUP' ? activeConv.name : otherMember?.user?.username}</p>
                {isTyping && <p className="text-xs text-brand-500 animate-pulse">يكتب الآن...</p>}
              </div>
              <div className="flex items-center gap-1">
                <button className="btn-ghost p-2 rounded-xl"><Phone size={17} /></button>
                <button className="btn-ghost p-2 rounded-xl"><Video size={17} /></button>
                <button className="btn-ghost p-2 rounded-xl"><MoreVertical size={17} /></button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {messages.map((msg: any) => {
                const isMe = msg.senderId === user?.id
                return (
                  <motion.div key={msg.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                    className={cn('flex items-end gap-2', isMe ? 'flex-row-reverse' : 'flex-row')}>
                    {!isMe && (
                      <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 text-xs font-bold flex-shrink-0 mb-1">
                        {msg.sender?.username?.[0]?.toUpperCase()}
                      </div>
                    )}
                    <div className="max-w-xs lg:max-w-md">
                      {msg.replyTo && (
                        <div className="text-xs px-3 py-1.5 bg-[var(--bg-secondary)] rounded-lg mb-1 border-r-2 border-brand-500">
                          <span className="text-brand-500 font-medium">{msg.replyTo.sender?.username}</span>
                          <p className="text-[var(--text-tertiary)] truncate">{msg.replyTo.content}</p>
                        </div>
                      )}
                      <div className={isMe ? 'chat-bubble-out' : 'chat-bubble-in'}>
                        <p className="text-sm leading-relaxed break-words">{msg.content}</p>
                      </div>
                      <p className={cn('text-[10px] text-[var(--text-tertiary)] mt-0.5', isMe ? 'text-left' : 'text-right')}>
                        {formatTime(msg.createdAt)}
                      </p>
                    </div>
                  </motion.div>
                )
              })}
              {isTyping && (
                <div className="flex items-end gap-2">
                  <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 text-xs font-bold flex-shrink-0" />
                  <div className="chat-bubble-in py-3 px-4">
                    <div className="flex items-center gap-1">
                      {[0, 1, 2].map(i => <div key={i} className="w-1.5 h-1.5 bg-[var(--text-tertiary)] rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />)}
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 bg-[var(--bg)] border-t border-[var(--border)]">
              <div className="flex items-end gap-2 px-3 py-2 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] focus-within:border-brand-400 transition-colors">
                <button className="btn-ghost p-1.5 rounded-lg flex-shrink-0 self-end mb-0.5"><Paperclip size={16} /></button>
                <textarea
                  value={input}
                  onChange={e => handleTyping(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
                  placeholder="اكتب رسالة..."
                  rows={1}
                  className="flex-1 bg-transparent text-sm text-[var(--text)] placeholder-[var(--text-tertiary)] outline-none resize-none max-h-32 py-1"
                />
                <button onClick={sendMessage} disabled={!input.trim()}
                  className={cn('w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 self-end mb-0.5 transition-all',
                    input.trim() ? 'bg-brand-500 text-white hover:bg-brand-600' : 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]')}>
                  <Send size={14} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center mx-auto mb-4">
                <Send size={32} className="text-[var(--text-tertiary)] opacity-50" />
              </div>
              <p className="font-semibold text-[var(--text)]">اختر محادثة</p>
              <p className="text-sm text-[var(--text-tertiary)] mt-1">أو ابحث عن مستخدم لبدء محادثة جديدة</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
