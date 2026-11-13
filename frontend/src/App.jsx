import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import './App.css'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'
const TOKEN_KEY = 'talkpdf_token'

async function api(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY)
  const headers = { ...(options.headers || {}) }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }
  const response = await fetch(`${BACKEND_URL}${path}`, { ...options, headers })
  if (response.status === 401) {
    localStorage.removeItem(TOKEN_KEY)
    window.location.reload()
    throw new Error('Session expired')
  }
  return response
}

function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed')
      }
      localStorage.setItem(TOKEN_KEY, data.token)
      onAuthenticated(data.user)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={submit}>
        <h1 className="brand">TalkPDF</h1>
        <p className="auth-subtitle">
          {mode === 'login' ? 'Sign in to your account' : 'Create a new account'}
        </p>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        <input
          type="password"
          placeholder={mode === 'login' ? 'Password' : 'Password (min 8 characters)'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          required
        />
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={busy}>
          {busy ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Sign up'}
        </button>
        <p className="auth-switch">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login')
              setError('')
            }}
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </form>
    </div>
  )
}

const GREETING = {
  role: 'assistant',
  content: 'Hi! Upload your PDFs, then ask me anything about them.',
}

function AssistantBubble({ content }) {
  return (
    <div className="bubble assistant">
      <div className="bubble-md">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    </div>
  )
}

function ChatApp() {
  const [conversations, setConversations] = useState([])
  const [loadingConversations, setLoadingConversations] = useState(true)
  const [activeId, setActiveId] = useState(null)
  const [messages, setMessages] = useState([])
  const [documents, setDocuments] = useState([])
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [query, setQuery] = useState('')
  const [thinking, setThinking] = useState(false)
  const [popupOpen, setPopupOpen] = useState(false)
  const [attachments, setAttachments] = useState([])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const bottomRef = useRef(null)
  const creatingRef = useRef(null)

  useEffect(() => {
    loadConversations()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking])

  async function loadConversations() {
    const response = await api('/api/conversations')
    if (response.ok) {
      const data = await response.json()
      setConversations(data.conversations)
    }
    setLoadingConversations(false)
  }

  async function openConversation(id) {
    setActiveId(id)
    setMessages([])
    setDocuments([])
    setAttachments([])
    setLoadingMsgs(true)
    try {
      const response = await api(`/api/conversations/${id}/messages`)
      if (!response.ok) {
        return
      }
      const data = await response.json()
      setMessages(data.messages.map((m) => ({ role: m.role, content: m.content })))
      setDocuments(data.documents)
    } finally {
      setLoadingMsgs(false)
    }
  }

  async function ensureConversation() {
    if (creatingRef.current) {
      return creatingRef.current
    }
    if (activeId) {
      return activeId
    }
    creatingRef.current = (async () => {
      const response = await api('/api/conversations', { method: 'POST' })
      if (!response.ok) {
        creatingRef.current = null
        return null
      }
      const data = await response.json()
      setConversations((prev) => [data.conversation, ...prev])
      setActiveId(data.conversation.id)
      creatingRef.current = null
      return data.conversation.id
    })()
    return creatingRef.current
  }

  async function newConversation() {
    const id = await ensureConversation()
    if (id) {
      setMessages([])
      setDocuments([])
      setAttachments([])
      setSidebarOpen(false)
    }
  }

  async function deleteConversation(id) {
    const response = await api(`/api/conversations/${id}`, { method: 'DELETE' })
    if (!response.ok) {
      return
    }
    setConversations((prev) => prev.filter((c) => c.id !== id))
    if (activeId === id) {
      setActiveId(null)
      setMessages([])
      setDocuments([])
      setAttachments([])
    }
  }

  async function ask(event) {
    event.preventDefault()
    const text = query.trim()
    if (!text || thinking) {
      return
    }

    const convId = await ensureConversation()
    if (!convId) {
      return
    }

    setQuery('')
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setThinking(true)
    try {
      const response = await api(`/api/conversations/${convId}/chat`, {
        method: 'POST',
        body: JSON.stringify({ query: text }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Something went wrong')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let answer = ''

      for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        let sep
        while ((sep = buffer.indexOf('\n\n')) !== -1) {
          const rawEvent = buffer.slice(0, sep)
          buffer = buffer.slice(sep + 2)
          const dataLine = rawEvent
            .split('\n')
            .find((line) => line.startsWith('data: '))
          if (!dataLine) {
            continue
          }
          const payload = JSON.parse(dataLine.slice(6))
          if (payload.error) {
            throw new Error(payload.error)
          }
          if (payload.token) {
            answer += payload.token
            setMessages((prev) => {
              const next = [...prev]
              const last = next[next.length - 1]
              if (last?.role === 'assistant') {
                next[next.length - 1] = {
                  role: 'assistant',
                  content: answer,
                }
              } else {
                next.push({ role: 'assistant', content: answer })
              }
              return next
            })
          }
        }
      }
      loadConversations()
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `⚠ ${err.message}` },
      ])
    } finally {
      setThinking(false)
    }
  }

  function onFilesPicked(event) {
    const files = Array.from(event.target.files).filter((file) =>
      file.name.toLowerCase().endsWith('.pdf')
    )
    event.target.value = ''
    if (files.length === 0) {
      return
    }
    setPopupOpen(false)
    files.slice(0, 10).forEach((file) => uploadFile(file))
  }

  async function uploadFile(file) {
    const id = `${file.name}-${Date.now()}-${Math.random().toString(16).slice(2)}`
    setAttachments((prev) => [...prev, { id, name: file.name, status: 'uploading' }])
    try {
      const body = new FormData()
      body.append('file', file)
      const response = await api(`/api/conversations/${activeId}/documents`, {
        method: 'POST',
        body,
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Upload failed')
      }
      setAttachments((prev) => prev.filter((a) => a.id !== id))
      setDocuments((prev) => [data.document, ...prev])
    } catch (err) {
      setAttachments((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, status: 'failed', note: err.message } : a
        )
      )
    }
  }

  const entryMode = !activeId && messages.length === 0 && !loadingMsgs

  return (
    <div className="app">
      <header className="topbar">
        <button
          type="button"
          className="menu-btn"
          onClick={() => setSidebarOpen((open) => !open)}
          aria-label="Toggle chats"
        >
          ☰
        </button>
        <h1 className="brand">TalkPDF</h1>
      </header>

      <div className="body">
        {sidebarOpen && (
          <aside className="sidebar">
            <button type="button" className="new-chat-btn" onClick={newConversation}>
              + New chat
            </button>
            <ul className="conversation-list">
              {loadingConversations ? (
                <li className="skeleton-row" />
              ) : (
                conversations.map((c) => (
                  <li
                    key={c.id}
                    className={c.id === activeId ? 'active' : ''}
                    onClick={() => {
                      openConversation(c.id)
                      setSidebarOpen(false)
                    }}
                  >
                    <span className="conv-title">{c.title || 'New chat'}</span>
                    <button
                      type="button"
                      className="conv-delete"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteConversation(c.id)
                      }}
                      aria-label="Delete chat"
                    >
                      ✕
                    </button>
                  </li>
                ))
              )}
            </ul>
            <button
              type="button"
              className="logout-btn"
              onClick={() => {
                localStorage.removeItem(TOKEN_KEY)
                window.location.reload()
              }}
            >
              Sign out
            </button>
          </aside>
        )}

        <div className={`chat-col${entryMode ? ' entry' : ''}`}>
          {entryMode ? (
            <main className="entry-window">
              <h2 className="entry-title">What can I help you with?</h2>
              <p className="entry-hint">
                Type below to start a new chat. Upload PDFs with the + button.
              </p>
            </main>
          ) : (
            <main className="chat-window">
              {loadingMsgs ? (
                <>
                  <div className="bubble skeleton" />
                  <div className="bubble skeleton short" />
                  <div className="bubble skeleton" />
                </>
              ) : (
                <>
                  {messages.length === 0 && (
                    <div className="bubble assistant">
                      <p className="bubble-text">{GREETING.content}</p>
                    </div>
                  )}
                  {messages.map((message, index) =>
                    message.role === 'assistant' ? (
                      <AssistantBubble key={index} content={message.content} />
                    ) : (
                      <div key={index} className="bubble user">
                        <p className="bubble-text">{message.content}</p>
                      </div>
                    )
                  )}
                  {thinking && messages[messages.length - 1]?.role !== 'assistant' && (
                    <div className="bubble assistant typing">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  )}
                </>
              )}
              <div ref={bottomRef} />
            </main>
          )}

          <div className="doc-chips">
            {documents.map((d) => (
              <span key={d.id} className="doc-chip" title={d.filename}>
                <span className="chip-name">{d.filename}</span>
                <span className="chip-state ok">✓</span>
              </span>
            ))}
            {attachments.map((a) => (
              <span
                key={a.id}
                className={`doc-chip ${a.status}`}
                title={a.note || a.name}
              >
                {a.status === 'uploading' && <span className="chip-dot" />}
                <span className="chip-name">{a.name}</span>
                {a.status === 'ready' && <span className="chip-state ok">✓</span>}
                {a.status === 'failed' && <span className="chip-state fail">✕</span>}
              </span>
            ))}
          </div>

          <form className="composer" onSubmit={ask}>
            <button
              type="button"
              className="plus-btn"
              onClick={async () => {
                await ensureConversation()
                setPopupOpen(true)
              }}
              aria-label="Attach documents"
            >
              +
            </button>
            <input
              type="text"
              placeholder="Ask anything..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={thinking}
              autoFocus
            />
            <button type="submit" disabled={thinking || !query.trim()}>
              Send
            </button>
          </form>
        </div>
      </div>

      {popupOpen && (
        <div className="modal-overlay" onClick={() => setPopupOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>Upload documents</h2>
              <button
                type="button"
                className="modal-close"
                onClick={() => setPopupOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <label className="dropzone">
              <input
                type="file"
                accept=".pdf,application/pdf"
                multiple
                onChange={onFilesPicked}
              />
              <span className="dropzone-title">Choose PDF files</span>
              <span className="dropzone-hint">Multiple files allowed, up to 10</span>
            </label>
          </div>
        </div>
      )}
    </div>
  )
}

function App() {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(() =>
    Boolean(localStorage.getItem(TOKEN_KEY))
  )

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      return
    }
    api('/api/auth/me')
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data) {
          setUser(data.user)
        } else {
          localStorage.removeItem(TOKEN_KEY)
        }
      })
      .catch(() => {})
      .finally(() => setChecking(false))
  }, [])

  if (checking) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <div className="skeleton auth-skeleton" />
        </div>
      </div>
    )
  }
  if (!user) {
    return <AuthScreen onAuthenticated={setUser} />
  }
  return <ChatApp />
}

export default App
