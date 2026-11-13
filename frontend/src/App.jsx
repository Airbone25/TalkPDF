import { useEffect, useRef, useState } from 'react'
import './App.css'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'

const GREETING = {
  role: 'assistant',
  content: 'Hi! Upload your PDFs, then ask me anything about them.',
}

function App() {
  const [messages, setMessages] = useState([])
  const [query, setQuery] = useState('')
  const [thinking, setThinking] = useState(false)
  const [docsPanelOpen, setDocsPanelOpen] = useState(false)
  const [docs, setDocs] = useState([])
  const [uploading, setUploading] = useState(false)
  const [pickedCount, setPickedCount] = useState(0)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking])

  async function ask(event) {
    event.preventDefault()
    const text = query.trim()
    if (!text || thinking) {
      return
    }

    setQuery('')
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setThinking(true)
    try {
      const response = await fetch(`${BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: text }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong')
      }
      setMessages((prev) => [...prev, { role: 'assistant', content: data.answer }])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `⚠ ${err.message}` },
      ])
    } finally {
      setThinking(false)
    }
  }

  async function uploadDocs(event) {
    event.preventDefault()
    const files = new FormData(event.currentTarget).getAll('files')
    if (files.length === 0 || uploading) {
      return
    }

    setUploading(true)
    try {
      const body = new FormData()
      files.forEach((file) => body.append('files', file))
      const response = await fetch(`${BACKEND_URL}/api/upload`, {
        method: 'POST',
        body,
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Upload failed')
      }
      setDocs((prev) => [
        ...prev.filter((d) => !data.results.some((r) => r.name === d.name)),
        ...data.results.map((r) => ({
          name: r.name,
          ready: r.status === 'embedded',
          note: r.status === 'embedded' ? 'ready to chat' : `failed: ${r.error}`,
        })),
      ])
      setPickedCount(0)
      event.target.reset()
    } catch (err) {
      setDocs((prev) => [
        ...prev,
        { name: 'upload', ready: false, note: err.message },
      ])
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <h1 className="brand">TalkPDF</h1>
        <button
          type="button"
          className="docs-toggle"
          onClick={() => setDocsPanelOpen((open) => !open)}
        >
          {docsPanelOpen ? 'Close' : `Docs${docs.length ? ` (${docs.length})` : ''}`}
        </button>
      </header>

      {docsPanelOpen && (
        <section className="docs-panel">
          <form className="docs-form" onSubmit={uploadDocs}>
            <input
              type="file"
              name="files"
              accept=".pdf,application/pdf"
              multiple
              onChange={(e) => setPickedCount(e.target.files.length)}
              disabled={uploading}
            />
            <button type="submit" className="upload-btn" disabled={uploading}>
              {uploading ? 'Uploading...' : `Upload${pickedCount ? ` (${pickedCount})` : ''}`}
            </button>
          </form>
          {docs.length > 0 && (
            <ul className="docs-list">
              {docs.map((doc) => (
                <li key={doc.name} className={doc.ready ? 'ok' : 'fail'}>
                  <span className="doc-name">{doc.name}</span>
                  <span className="doc-note">{doc.note}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <main className="chat-window">
        {messages.length === 0 ? (
          <div className="bubble assistant">
            <p className="bubble-text">{GREETING.content}</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div key={index} className={`bubble ${message.role}`}>
              <p className="bubble-text">{message.content}</p>
            </div>
          ))
        )}
        {thinking && (
          <div className="bubble assistant typing">
            <span></span>
            <span></span>
            <span></span>
          </div>
        )}
        <div ref={bottomRef} />
      </main>

      <form className="composer" onSubmit={ask}>
        <input
          type="text"
          placeholder="Ask about your documents..."
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
  )
}

export default App
