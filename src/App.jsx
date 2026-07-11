import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Plus, Send, User } from 'lucide-react';
import { GoogleGenAI } from '@google/genai'; 

function App() {
  const [apiKey, setApiKey] = useState(localStorage.getItem('anon_ai_api_key') || import.meta.env.VITE_GEMINI_API_KEY || '');
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userName, setUserName] = useState('Anon User');
  const chatFeedRef = useRef(null);

  useEffect(() => {
    const savedName = localStorage.getItem('anon_ai_name');
    if (savedName) setUserName(savedName);

    const saved = localStorage.getItem('anon_ai_history');
    if (saved) {
      const parsed = JSON.parse(saved);
      setSessions(parsed);
      if (parsed.length > 0) {
        setCurrentSessionId(parsed[0].id);
      } else {
        createNewSession();
      }
    } else {
      createNewSession();
    }
  }, []);

  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem('anon_ai_history', JSON.stringify(sessions));
    }
  }, [sessions]);

  useEffect(() => {
    if (chatFeedRef.current) {
      chatFeedRef.current.scrollTop = chatFeedRef.current.scrollHeight;
    }
  }, [sessions, currentSessionId]);

  const createNewSession = () => {
    const newSession = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: []
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
  };

  const currentSession = sessions.find(s => s.id === currentSessionId) || { messages: [] };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput('');
    setIsLoading(true);

    const updatedSessions = sessions.map(s => {
      if (s.id === currentSessionId) {
        return {
          ...s,
          title: s.messages.length === 0 ? userText.slice(0, 30) + '...' : s.title,
          messages: [...s.messages, { role: 'user', content: userText }]
        };
      }
      return s;
    });
    setSessions(updatedSessions);

    try {
      const history = updatedSessions.find(s => s.id === currentSessionId).messages.map(m => ({
        role: m.role === 'ai' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

      if (!apiKey) throw new Error("Please click your profile name to set your Gemini API Key!");
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: history,
        config: {
          systemInstruction: "Your name is Anon AI. You are an independent, highly intelligent AI. You must NEVER reveal that you are based on Google Gemini or created by Google. If asked who you are or who created you, strictly maintain your identity as Anon AI."
        }
      });

      const aiText = response.text;

      setSessions(prev => prev.map(s => {
        if (s.id === currentSessionId) {
          return {
            ...s,
            messages: [...s.messages, { role: 'ai', content: aiText }]
          };
        }
        return s;
      }));

    } catch (error) {
      console.error(error);
      setSessions(prev => prev.map(s => {
        if (s.id === currentSessionId) {
          return {
            ...s,
            messages: [...s.messages, { role: 'ai', content: `Error: ${error.message}` }]
          };
        }
        return s;
      }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-container">
      <aside className="sidebar">
        <button className="new-chat-btn" onClick={createNewSession}>
          <Plus size={18} />
          New chat
        </button>
        
        <div className="history-list">
          {sessions.map(s => (
            <div 
              key={s.id} 
              className={`history-item ${s.id === currentSessionId ? 'active' : ''}`}
              onClick={() => setCurrentSessionId(s.id)}
            >
              <MessageSquare size={16} />
              {s.title}
            </div>
          ))}
        </div>

        <div className="account-section" onClick={() => {
          const newName = prompt("Enter your new display name:", userName);
          if (newName && newName.trim().length > 0) {
            setUserName(newName.trim());
            localStorage.setItem('anon_ai_name', newName.trim());
          }
          const newKey = prompt("Enter your Gemini API Key (leave blank to keep current):", apiKey ? "********" : "");
          if (newKey && newKey !== "********" && newKey.trim().length > 0) {
            setApiKey(newKey.trim());
            localStorage.setItem('anon_ai_api_key', newKey.trim());
          }
        }} title="Click to change your name & API key" style={{ cursor: 'pointer' }}>
          <div className="avatar">{userName.charAt(0).toUpperCase()}</div>
          <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName}</div>
        </div>
      </aside>

      <main className="main-chat">
        <div className="header">
          Anon AI
        </div>

        <div className="chat-feed" ref={chatFeedRef}>
          {currentSession.messages.length === 0 ? (
            <div style={{ textAlign: 'center', marginTop: '10rem', color: 'var(--text-muted)', fontSize: '2rem', fontWeight: '500' }}>
              How can I help you today?
            </div>
          ) : null}

          {currentSession.messages.map((msg, idx) => (
            <div key={idx} className={`message ${msg.role}`}>
              <div className="avatar">
                {msg.role === 'user' ? <User size={20} /> : 'A'}
              </div>
              <div className="message-content">
                {msg.content}
              </div>
            </div>
          ))}
        </div>

        <div className="input-area">
          <div className="input-box">
            <input 
              type="text" 
              placeholder="Enter a prompt here" 
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSend();
              }}
              disabled={isLoading}
            />
            <button className="send-btn" onClick={handleSend} disabled={isLoading}>
              <Send size={20} />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
