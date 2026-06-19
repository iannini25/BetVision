'use client'

import { useState, useRef, useEffect } from 'react'
import { animate } from 'animejs'
import { ProbBar } from '@/components/ui/prob-bar'
import { prefersReducedMotion } from '@/lib/motion'

type Message = {
  role: 'user' | 'assistant'
  text: string
  bars?: { label: string; value: number }[]
  source?: string
}

const INITIAL_MSG: Message = {
  role: 'assistant',
  text: 'Ola! Sou o agente BetV. Posso analisar qualquer jogo de hoje, avaliar odds que voce colar, ou mostrar onde o modelo enxerga valor. O que quer saber?',
}

const SUGGESTIONS = [
  'Quem e o favorito hoje?',
  'O arbitro de ARG x MAR da muito cartao?',
  'Onde o modelo ve valor hoje?',
]

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MSG])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const animatedCount = useRef(0)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, typing])

  // Animate only the bubbles added since the last render: slide up + fade, from the
  // correct side. Reduced motion shows them in place (no per-bubble animation).
  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const bubbles = list.querySelectorAll<HTMLElement>('[data-bubble]')
    const fresh = Array.from(bubbles).slice(animatedCount.current)
    animatedCount.current = bubbles.length
    if (!fresh.length || prefersReducedMotion()) return

    const anim = animate(fresh, {
      opacity: [0, 1],
      translateY: [10, 0],
      duration: 420,
      ease: 'out(3)',
    })
    return () => {
      anim.revert()
    }
  }, [messages])

  async function sendMessage(text: string) {
    if (!text.trim() || typing) return

    setMessages((prev) => [...prev, { role: 'user', text }])
    setInput('')
    setTyping(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sessionId }),
      })

      if (!res.ok) throw new Error('Chat request failed')

      const data = await res.json()
      if (data.sessionId) setSessionId(data.sessionId)

      setMessages((prev) => [...prev, {
        role: 'assistant',
        text: data.response,
        source: 'Informacao estatistica, nao recomendacao de aposta.',
      }])
    } catch {
      setMessages((prev) => [...prev, {
        role: 'assistant',
        text: 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.',
      }])
    } finally {
      setTyping(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col px-8 py-0 animate-screenIn min-h-0">
      <div className="flex-1 flex flex-col max-w-[780px] w-full mx-auto bg-bg-secondary border border-border rounded-card overflow-hidden min-h-[480px]">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          <div className="w-[34px] h-[34px] bg-brand-gradient rounded-xl flex items-center justify-center">
            <span className="font-display font-bold text-white text-sm">B</span>
          </div>
          <div className="flex flex-col gap-px">
            <span className="font-display font-bold text-[15px]">Agente BetV</span>
            <span className="flex items-center gap-1.5 text-[11.5px] text-accent-green-text">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-green" />
              online · dados ao vivo
            </span>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto flex flex-col gap-3.5 p-5">
          <div ref={listRef} className="flex flex-col gap-3.5">
            {messages.map((m, i) => {
              // The user's last bubble stays dimmed while the agent is composing a reply.
              const pendingSend = typing && m.role === 'user' && i === messages.length - 1
              return (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    data-bubble
                    className={`max-w-[82%] rounded-2xl px-4 py-3 flex flex-col gap-2.5 transition-opacity duration-300 will-change-transform ${
                      m.role === 'user'
                        ? 'bg-brand-gradient text-white'
                        : 'bg-bg-card border border-border-input text-text-primary'
                    } ${pendingSend ? 'opacity-60' : 'opacity-100'}`}
                  >
                    <span className="text-[13.5px] leading-relaxed whitespace-pre-line">{m.text}</span>
                    {m.bars?.map((b, j) => <ProbBar key={j} label={b.label} value={b.value} />)}
                    {m.source && <span className="text-[10.5px] text-text-muted border-t border-border-subtle pt-1.5">{m.source}</span>}
                  </div>
                </div>
              )
            })}
          </div>
          {typing && (
            <div className="flex justify-start">
              <div className="bg-bg-card border border-border-input rounded-2xl px-4 py-3.5 flex gap-1.5 items-center">
                {[0, 0.15, 0.3].map((delay, i) => (
                  <span key={i} className="w-[7px] h-[7px] rounded-full bg-brand-light animate-typingDot" style={{ animationDelay: `${delay}s` }} />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 px-5 pb-3 overflow-x-auto">
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => sendMessage(s)} className="flex-none bg-[rgba(139,92,246,0.08)] border border-border rounded-pill px-4 py-2 text-[12.5px] text-text-secondary cursor-pointer transition-all whitespace-nowrap hover:border-border-hover hover:text-text-primary">
              {s}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2.5 px-5 py-3.5 border-t border-border">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
            placeholder="Pergunte sobre qualquer jogo de hoje..."
            className="flex-1 bg-bg-card border border-border-input rounded-input px-4 py-3 text-sm text-text-primary outline-none focus:border-brand-violet transition-colors"
          />
          <button onClick={() => sendMessage(input)} aria-label="Enviar" className="w-11 h-11 rounded-input bg-brand-gradient flex items-center justify-center cursor-pointer transition-transform hover:-translate-y-px active:scale-95 flex-none">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h13M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>
        <div className="px-5 pb-3">
          <span className="text-[10.5px] text-text-muted">
            Conteudo informativo e estatistico. Nao e recomendacao de aposta. Aposte com responsabilidade.
          </span>
        </div>
      </div>
    </div>
  )
}
