'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { aiAPI } from '@/services/api'
import { useAuthStore } from '@/store/auth.store'
import {
  Bot, Send, Plus, Trash2, Code, FileText,
  Image, BarChart3, Sparkles, Copy, Check,
  ChevronDown, Paperclip, Mic
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

const TASK_TYPES = [
  { id: 'chat', label: 'دردشة', icon: Bot },
  { id: 'code', label: 'كود', icon: Code },
  { id: 'summary', label: 'تلخيص', icon: FileText },
  { id: 'analysis', label: 'تحليل', icon: BarChart3 },
]

const QUICK_PROMPTS = [
  'لخص لي كتاباً',
  'اشرح مفهوماً برمجياً',
  'أنشئ خطة دراسية',
  'راجع كودي',
  'ترجم نصاً',
  'أنشئ أسئلة اختبار',
]

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
  modelUsed?: string
}

export default function AIPage() {
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [taskType, setTaskType] = useState('chat')
  const [isStreaming, setIsStreaming] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const queryClient = useQueryClient()

  const { data: conversations } = useQuery({
    queryKey: ['ai-conversations'],
    queryFn: () => aiAPI.getConversations().then((r) => r.data),
  })

  const { data: messages = [] } = useQuery({
    queryKey: ['ai-messages', activeConvId],
    queryFn: () => aiAPI.getMessages(activeConvId!).then((r) => r.data),
    enabled: !!activeConvId,
  })

  const createConversation = useMutation({
    mutationFn: (title?: string) => aiAPI.createConversation(title).then((r) => r.data),
    onSuccess: (conv) => {
      setActiveConvId(conv.id)
      queryClient.invalidateQueries({ queryKey: ['ai-conversations'] })
    },
  })

  const sendMessage = useMutation({
    mutationFn: (data: { message: string; taskType: string }) =>
      aiAPI.sendMessage(activeConvId!, data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-messages', activeConvId] })
      setIsStreaming(false)
    },
    onError: () => setIsStreaming(false),
  })

  const deleteConversation = useMutation({
    mutationFn: (id: string) => aiAPI.deleteConversation(id),
    onSuccess: (_, id) => {
      if (activeConvId === id) setActiveConvId(null)
      queryClient.invalidateQueries({ queryKey: ['ai-conversations'] })
    },
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    const trimmed = input.trim()
    if (!trimmed || isStreaming) return

    let convId = activeConvId
    if (!convId) {
      const conv = await createConversation.mutateAsync(trimmed.slice(0, 50))
      convId = conv.id
    }

    setInput('')
    setIsStreaming(true)
    sendMessage.mutate({ message: trimmed, taskType })

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const copyMessage = (id: string, content: string) => {
    navigator.clipboard.writeText(content)
    setCopiedId(id)
    toast.success('تم النسخ')
    setTimeout(() => setCopiedId(null), 2000)
  }

  const autoResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'
  }

  return (
    <div className="flex h-full">
      {/* Conversations Sidebar */}
      <div className="w-64 flex-shrink-0 border-l border-[var(--border)] bg-[var(--bg)] flex flex-col hidden md:flex">
        <div className="p-3 border-b border-[var(--border)]">
          <button
            onClick={() => createConversation.mutate()}
            className="btn-primary w-full justify-center text-sm py-2.5"
          >
            <Plus size={16} />
            محادثة جديدة
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations?.map((conv: any) => (
            <div
              key={conv.id}
              onClick={() => setActiveConvId(conv.id)}
              className={cn(
                'flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer group transition-colors',
                activeConvId === conv.id
                  ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600'
                  : 'hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
              )}
            >
              <Bot size={14} className="flex-shrink-0" />
              <span className="flex-1 text-xs truncate">{conv.title || 'محادثة جديدة'}</span>
              <button
                onClick={(e) => { e.stopPropagation(); deleteConversation.mutate(conv.id) }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:text-red-500 transition-all"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          {!conversations?.length && (
            <p className="text-center text-xs text-[var(--text-tertiary)] py-8">
              لا توجد محادثات بعد
            </p>
          )}
        </div>
      </div>

      {/* Main Chat */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-[var(--border)] bg-[var(--bg)]">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-brand-500 flex items-center justify-center">
            <Bot size={18} className="text-white" />
          </div>
          <div>
            <div className="font-semibold text-sm text-[var(--text)]">SCS AI</div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              <span className="text-xs text-emerald-500">متصل دائماً</span>
            </div>
          </div>

          {/* Task Type Selector */}
          <div className="flex items-center gap-1 mr-auto bg-[var(--bg-secondary)] rounded-xl p-1">
            {TASK_TYPES.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTaskType(id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  taskType === id
                    ? 'bg-[var(--bg)] text-[var(--text)] shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
                )}
              >
                <Icon size={12} />
                <span className="hidden sm:block">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {!activeConvId && !messages.length ? (
            /* Welcome Screen */
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-500 to-brand-500 flex items-center justify-center mb-6 animate-float"
              >
                <Bot size={36} className="text-white" />
              </motion.div>
              <h2 className="font-display font-bold text-2xl text-[var(--text)] mb-3">كيف يمكنني مساعدتك؟</h2>
              <p className="text-[var(--text-secondary)] mb-8 max-w-md">
                أنا SCS AI، مساعدك التعليمي الذكي. اسألني عن أي شيء — من تلخيص الكتب إلى كتابة الكود.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-lg">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => { setInput(prompt); textareaRef.current?.focus() }}
                    className="px-4 py-2.5 rounded-xl text-sm text-[var(--text-secondary)] bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-brand-300 hover:text-brand-500 transition-all text-right"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg: Message) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn('flex gap-3', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}
                >
                  {/* Avatar */}
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
                    msg.role === 'user'
                      ? 'bg-brand-500'
                      : 'bg-gradient-to-br from-purple-500 to-brand-500'
                  )}>
                    {msg.role === 'user'
                      ? <span className="text-white text-xs font-bold">أ</span>
                      : <Bot size={14} className="text-white" />
                    }
                  </div>

                  {/* Bubble */}
                  <div className={cn('group max-w-2xl', msg.role === 'user' ? 'items-end' : 'items-start', 'flex flex-col gap-1')}>
                    <div className={msg.role === 'user' ? 'chat-bubble-out' : 'chat-bubble-in prose-scs'}>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-xs text-[var(--text-tertiary)]">
                        {new Date(msg.createdAt).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {msg.modelUsed && (
                        <span className="badge-blue text-[10px] px-1.5 py-0.5">{msg.modelUsed}</span>
                      )}
                      <button onClick={() => copyMessage(msg.id, msg.content)} className="p-1 rounded hover:bg-[var(--bg-secondary)] transition-colors">
                        {copiedId === msg.id ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} className="text-[var(--text-tertiary)]" />}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}

              {isStreaming && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-brand-500 flex items-center justify-center flex-shrink-0">
                    <Bot size={14} className="text-white" />
                  </div>
                  <div className="chat-bubble-in">
                    <div className="flex items-center gap-1.5 py-1">
                      <div className="w-1.5 h-1.5 bg-[var(--text-tertiary)] rounded-full animate-bounce" />
                      <div className="w-1.5 h-1.5 bg-[var(--text-tertiary)] rounded-full animate-bounce delay-100" />
                      <div className="w-1.5 h-1.5 bg-[var(--text-tertiary)] rounded-full animate-bounce delay-200" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Area */}
        <div className="p-3 sm:p-4 bg-[var(--bg)] border-t border-[var(--border)]">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-2 p-2 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-500/10 transition-all">
              <button className="btn-ghost p-2 rounded-xl flex-shrink-0 self-end mb-0.5">
                <Paperclip size={17} />
              </button>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={autoResize}
                onKeyDown={handleKeyDown}
                placeholder="اسأل SCS AI أي شيء... (Shift+Enter للسطر الجديد)"
                rows={1}
                className="flex-1 bg-transparent text-sm text-[var(--text)] placeholder-[var(--text-tertiary)] outline-none resize-none max-h-40 py-2"
                style={{ direction: 'rtl' }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isStreaming}
                className={cn(
                  'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 self-end mb-0.5 transition-all',
                  input.trim() && !isStreaming
                    ? 'bg-brand-500 text-white hover:bg-brand-600 hover:shadow-glow'
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] cursor-not-allowed'
                )}
              >
                <Send size={16} />
              </button>
            </div>
            <p className="text-center text-xs text-[var(--text-tertiary)] mt-2">
              SCS AI يستخدم GPT-4, Claude, وDeepSeek — يختار الأفضل تلقائياً
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
