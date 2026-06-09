import React, { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useI18n } from '../i18n/useI18n'

// ─── Markdown minimal : gras **texte** et sauts de ligne ───────────────────
function MiniMarkdown({ text }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return (
    <span>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**')
          ? <strong key={i}>{p.slice(2, -2)}</strong>
          : p.split('\n').map((line, j) => (
              <span key={j}>{line}{j < p.split('\n').length - 1 && <br />}</span>
            ))
      )}
    </span>
  )
}

export default function AgentAide() {
  const { langue } = useI18n()
  const ar = langue === 'ar'

  const [ouvert, setOuvert] = useState(false)
  const [messages, setMessages] = useState([]) // { role: 'user'|'assistant', content: string }
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState('')
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Scroll automatique vers le bas
  useEffect(() => {
    if (ouvert) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, ouvert])

  // Focus sur l'input à l'ouverture
  useEffect(() => {
    if (ouvert) setTimeout(() => inputRef.current?.focus(), 100)
  }, [ouvert])

  async function envoyer() {
    const texte = input.trim()
    if (!texte || loading) return
    setInput('')
    setErreur('')

    const nouveauxMessages = [...messages, { role: 'user', content: texte }]
    setMessages(nouveauxMessages)
    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error(ar ? 'غير موثق' : 'Non authentifié')

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-aide`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ messages: nouveauxMessages }),
        }
      )

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur serveur')

      setMessages([...nouveauxMessages, { role: 'assistant', content: data.reply }])
    } catch (err) {
      setErreur(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      envoyer()
    }
  }

  function reinitialiser() {
    setMessages([])
    setErreur('')
    setInput('')
  }

  // ── Styles ────────────────────────────────────────────────────────────────
  const S = {
    boutonFlottant: {
      position: 'fixed',
      bottom: 24,
      right: 24,
      zIndex: 9999,
      width: 52,
      height: 52,
      borderRadius: '50%',
      background: 'var(--accent, #c8401a)',
      color: 'white',
      border: 'none',
      boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
      cursor: 'pointer',
      fontSize: '1.4rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'transform 0.15s',
    },
    overlay: {
      position: 'fixed',
      bottom: 88,
      right: 24,
      zIndex: 9998,
      width: 360,
      maxHeight: '72vh',
      background: 'var(--paper, #fff)',
      borderRadius: 16,
      boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      border: '1px solid var(--border, #e5e7eb)',
      direction: ar ? 'rtl' : 'ltr',
    },
    header: {
      background: 'var(--accent, #c8401a)',
      color: 'white',
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    corps: {
      flex: 1,
      overflowY: 'auto',
      padding: '12px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    },
    bulleUser: {
      alignSelf: ar ? 'flex-start' : 'flex-end',
      background: 'var(--accent, #c8401a)',
      color: 'white',
      padding: '8px 12px',
      borderRadius: ar ? '16px 16px 16px 4px' : '16px 16px 4px 16px',
      maxWidth: '82%',
      fontSize: '0.88rem',
      lineHeight: 1.5,
    },
    bulleAssistant: {
      alignSelf: ar ? 'flex-end' : 'flex-start',
      background: 'var(--surface, #f3f4f6)',
      color: 'var(--ink, #1f2937)',
      padding: '8px 12px',
      borderRadius: ar ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
      maxWidth: '88%',
      fontSize: '0.88rem',
      lineHeight: 1.6,
    },
    pied: {
      padding: '10px 12px',
      borderTop: '1px solid var(--border, #e5e7eb)',
      display: 'flex',
      gap: 8,
      alignItems: 'flex-end',
    },
    textarea: {
      flex: 1,
      resize: 'none',
      border: '1px solid var(--border, #e5e7eb)',
      borderRadius: 10,
      padding: '8px 10px',
      fontSize: '0.88rem',
      fontFamily: 'inherit',
      outline: 'none',
      maxHeight: 100,
      background: 'var(--paper, #fff)',
      color: 'var(--ink, #1f2937)',
      direction: 'auto',
    },
    btnEnvoyer: {
      background: 'var(--accent, #c8401a)',
      color: 'white',
      border: 'none',
      borderRadius: 10,
      padding: '8px 14px',
      cursor: 'pointer',
      fontSize: '1rem',
      fontWeight: 700,
      opacity: loading ? 0.6 : 1,
    },
  }

  const suggestions = ar
    ? ['كيف أضيف تلميذاً؟', 'كيف أطبع القائمة؟', 'ما معنى الفوج المجمّد؟']
    : ['Comment ajouter un élève ?', 'Comment imprimer ?', 'C\'est quoi un groupe gelé ?']

  return (
    <>
      {/* Bouton flottant */}
      <button
        className="no-print"
        style={S.boutonFlottant}
        onClick={() => setOuvert(o => !o)}
        title={ar ? 'مساعدة' : 'Aide'}
      >
        {ouvert ? '✕' : '?'}
      </button>

      {/* Fenêtre chat */}
      {ouvert && (
        <div style={S.overlay} className="no-print">
          {/* En-tête */}
          <div style={S.header}>
            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
              🎓 {ar ? 'مساعد التطبيق' : "Assistant d'aide"}
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              {messages.length > 0 && (
                <button
                  onClick={reinitialiser}
                  style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 6, color: 'white', cursor: 'pointer', padding: '2px 8px', fontSize: '0.78rem' }}
                  title={ar ? 'محادثة جديدة' : 'Nouvelle conversation'}
                >
                  {ar ? 'جديد' : 'Nouveau'}
                </button>
              )}
              <button
                onClick={() => setOuvert(false)}
                style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1 }}
              >✕</button>
            </div>
          </div>

          {/* Corps */}
          <div style={S.corps}>
            {/* Message de bienvenue */}
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', padding: '16px 8px' }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>🎓</div>
                <p style={{ fontSize: '0.88rem', color: 'var(--ink-muted)', marginBottom: 16 }}>
                  {ar
                    ? 'مرحباً! كيف يمكنني مساعدتك في استخدام التطبيق؟'
                    : 'Bonjour ! Comment puis-je vous aider à utiliser l\'application ?'}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => { setInput(s); inputRef.current?.focus() }}
                      style={{
                        background: 'var(--surface, #f3f4f6)',
                        border: '1px solid var(--border, #e5e7eb)',
                        borderRadius: 8,
                        padding: '6px 12px',
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        color: 'var(--ink)',
                        textAlign: ar ? 'right' : 'left',
                      }}
                    >{s}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map((m, i) => (
              <div
                key={i}
                style={m.role === 'user' ? S.bulleUser : S.bulleAssistant}
              >
                {m.role === 'assistant'
                  ? <MiniMarkdown text={m.content} />
                  : m.content}
              </div>
            ))}

            {/* Indicateur de chargement */}
            {loading && (
              <div style={{ ...S.bulleAssistant, color: 'var(--ink-muted)' }}>
                <span style={{ letterSpacing: 2 }}>···</span>
              </div>
            )}

            {/* Erreur */}
            {erreur && (
              <div style={{ fontSize: '0.8rem', color: 'var(--danger, #dc2626)', textAlign: 'center', padding: '4px 8px' }}>
                ⚠ {erreur}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Pied — zone de saisie */}
          <div style={S.pied}>
            <textarea
              ref={inputRef}
              rows={1}
              style={S.textarea}
              placeholder={ar ? 'اكتب سؤالك…' : 'Posez votre question…'}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              style={S.btnEnvoyer}
              onClick={envoyer}
              disabled={!input.trim() || loading}
            >
              {ar ? '↩' : '↵'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
