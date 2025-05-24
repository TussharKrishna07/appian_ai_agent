import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import './App.css';

function App() {
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const chatHistoryRef = useRef(null);
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [currentThreadId, setCurrentThreadId] = useState('1');
  const [chatThreads, setChatThreads] = useState([
    { id: '1', name: 'Chat 1', createdAt: new Date().toISOString() }
  ]);
  const [theme, setTheme] = useState('light');
  const [sidebarToggled, setSidebarToggled] = useState(false);

  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [chatHistory]);

  // Load chat history when thread changes
  useEffect(() => {
    const restoreChatHistory = async () => {
      try {
        const res = await fetch(`http://localhost:5000/chat?thread_id=${currentThreadId}`, {
          method: 'GET',
        });

        if (res.ok) {
          const data = await res.json();
          if (data.messages && data.messages.length > 0) {
            // Convert base64 images back to object URLs for display
            const restoredMessages = data.messages.map(msg => {
              if (msg.image && msg.image.startsWith('data:image')) {
                // Convert base64 to blob URL for consistent display
                const byteCharacters = atob(msg.image.split(',')[1]);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                  byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: 'image/jpeg' });
                const imageUrl = URL.createObjectURL(blob);
                
                return { ...msg, image: imageUrl };
              }
              return msg;
            });
            setChatHistory(restoredMessages);
          } else {
            setChatHistory([]);
          }
        }
      } catch (error) {
        console.error('Failed to restore chat history:', error);
        setChatHistory([]);
      }
    };

    restoreChatHistory();
  }, [currentThreadId]);

  const sendMessage = async () => {
    const trimmed = message.trim();
    if (!trimmed && !image || isLoading) return;

    // Store the image URL in chat history instead of just the name
    const imageUrl = image ? URL.createObjectURL(image) : null;
    const newMessage = { role: 'user', content: trimmed, image: imageUrl };
    setChatHistory(prev => [...prev, newMessage]);
    setMessage('');
    setIsLoading(true);

    try {
      const formData = new FormData();
      if (trimmed) {
        formData.append('message', trimmed);
      }
      if (image) {
        formData.append('image', image);
      }
      // Add thread_id to form data
      formData.append('thread_id', currentThreadId);

      const res = await fetch('http://localhost:5000/chat', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        let errorText = 'Network error';
        try {
          const errorData = await res.json();
          errorText = errorData.error || errorText;
        } catch {
          errorText = res.statusText || errorText;
        }
        throw new Error(errorText);
      }

      const data = await res.json();
      const replyContent = typeof data.reply === 'string' ? data.reply : 'No valid response.';
      setChatHistory(prev => [...prev, { role: 'assistant', content: replyContent }]);
    } catch (error) {
      setChatHistory(prev => [...prev, { role: 'assistant', content: `Error: ${error.message}` }]);
    } finally {
      setIsLoading(false);
      setImage(null);
      setImagePreview(null); // Clear preview after sending
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage(file);
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  const handleRemoveImage = () => {
    setImage(null);
    setImagePreview(null);
  };

  const categories = [
    { id: 'fashion', name: 'Fashion', icon: '👚' },
    { id: 'electronics', name: 'Electronics', icon: '📱' },
    { id: 'home', name: 'Home Decor', icon: '🏠' },
    { id: 'beauty', name: 'Beauty', icon: '💄' },
    { id: 'sports', name: 'Sports', icon: '⚽' },
  ];

  const quickActions = [
    { text: "Find similar fashion items", icon: "👕" },
    { text: "Help me complete this outfit", icon: "✨" },
    { text: "Suggest home decor items", icon: "🏠" },
    { text: "Find gadget accessories", icon: "📱" }
  ];

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  const createNewChat = () => {
    // Generate new thread ID by incrementing the highest existing ID
    const existingIds = chatThreads.map(thread => parseInt(thread.id));
    const newThreadId = (Math.max(...existingIds) + 1).toString();
    
    // Create new chat thread
    const newThread = {
      id: newThreadId,
      name: `Chat ${newThreadId}`,
      createdAt: new Date().toISOString()
    };
    
    // Add to threads list
    setChatThreads(prev => [...prev, newThread]);
    
    // Switch to new thread
    setCurrentThreadId(newThreadId);
    
    // Clear current chat history (will be loaded from backend in useEffect)
    setChatHistory([]);
  };

  const switchToThread = (threadId) => {
    setCurrentThreadId(threadId);
    // Chat history will be loaded automatically by useEffect
  };

  const formatThreadName = (thread) => {
    const date = new Date(thread.createdAt);
    return `${thread.name} - ${date.toLocaleDateString()}`;
  };

  return (
    <div className="app-container" style={{ height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside className="sidebar" style={{ flexShrink: 0, width: '280px' }}>
        <div className="sidebar-header">
          <div className="sidebar-title">🛍️ ShopSmarter</div>
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>

        <div className="sidebar-content" style={{ overflowY: 'auto', flex: 1 }}>
          <div className="section-title">Chat History</div>
          <div className="chat-threads">
            {chatThreads.map((thread) => (
              <button
                key={thread.id}
                className={`thread-button ${currentThreadId === thread.id ? 'active' : ''}`}
                onClick={() => switchToThread(thread.id)}
              >
                {formatThreadName(thread)}
              </button>
            ))}
          </div>

          <div className="section-title">Shop by Category</div>
          <div className="action-list-vertical">
            {categories.map((category, index) => (
              <button
                key={index}
                className="action-btn-sidebar"
                onClick={() => setMessage(`Show me ${category.name} products`)}
              >
                <span className="action-icon">{category.icon}</span>
                <span className="action-text">{category.name}</span>
              </button>
            ))}
          </div>

          <div className="section-title">Quick Actions</div>
          <div className="action-list-vertical">
            {quickActions.map((action, index) => (
              <button
                key={index}
                className="action-btn-sidebar"
                onClick={() => setMessage(action.text)}
              >
                <span className="action-icon">{action.icon}</span>
                <span className="action-text">{action.text}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="sidebar-footer" style={{ flexShrink: 0 }}>
          <button className="new-chat-btn" onClick={createNewChat}>
            <span>+</span> New Conversation
          </button>
        </div>
      </aside>

      {/* Chat Area */}
      <main className="chat-area" style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100vh', 
        flex: 1,
        minWidth: 0
      }}>
        <header className="app-header" style={{ flexShrink: 0 }}>
          <h1>AI Assistant - {chatThreads.find(t => t.id === currentThreadId)?.name || 'Chat'}</h1>
        </header>

        <div 
          className="chat-messages" 
          ref={chatHistoryRef}
          style={{ 
            flex: 1, 
            overflowY: 'auto', 
            minHeight: 0,
            padding: '1rem',
            borderTop: '1px solid var(--border-color, #e0e0e0)',
            borderBottom: '1px solid var(--border-color, #e0e0e0)'
          }}
        >
          {chatHistory.length === 0 && !isLoading && (
            <div className="empty-chat">
              <div className="welcome-container">
                <div className="welcome-icon">🛒</div>
                <h2>Welcome to ShopSmarter! 🎉</h2>
                <p className="welcome-text">
                  I'm your AI shopping assistant.<br />
                  Upload images of products you like, and I'll help you find similar items,
                  complete outfits, or discover complementary products across
                  fashion, home decor, and electronics.
                </p>
                <div className="welcome-features">
                  <div className="feature">
                    <span className="feature-icon">🔍</span>
                    <span>Visual<br />Search</span>
                  </div>
                  <div className="feature">
                    <span className="feature-icon">🎯</span>
                    <span>Smart<br />Recommendations</span>
                  </div>
                  <div className="feature">
                    <span className="feature-icon">💰</span>
                    <span>Price<br />Comparison</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {chatHistory.map((msg, index) => (
            <div key={index} className={`message ${msg.role}`}>
              <div className="message-inner">
                <div className="message-avatar">
                  {msg.role === 'user' ? (
                    <div className="user-avatar">👤</div>
                  ) : (
                    <div className="assistant-avatar">🤖</div>
                  )}
                </div>
                <div className="message-content">
                  <div className="message-header">
                    <span className="message-role">
                      {msg.role === 'user' ? 'You' : 'ShopSmarter AI'}
                    </span>
                    <span className="message-time">
                      {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {msg.image && (
                    <div className="message-image">
                      <img
                        src={msg.image}
                        alt="Uploaded product"
                        className="uploaded-image"
                      />
                    </div>
                  )}
                  <div className="message-text">
                    <ReactMarkdown
                      components={{
                        a: ({ node, ...props }) => (
                          <a target="_blank" rel="noopener noreferrer" className="product-link" {...props} />
                        )
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="message assistant">
              <div className="message-inner">
                <div className="message-avatar">
                  <div className="assistant-avatar">🤖</div>
                </div>
                <div className="message-content">
                  <div className="message-header">
                    <span className="message-role">ShopSmarter AI</span>
                  </div>
                  <div className="typing-container">
                    <div className="typing-indicator">
                      <span></span><span></span><span></span>
                    </div>
                    <span className="typing-text">Analyzing your request...</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div 
          className="chat-input" 
          style={{ 
            flexShrink: 0, 
            minHeight: '80px',
            maxHeight: '200px',
            padding: '1rem',
            borderTop: '1px solid var(--border-color, #e0e0e0)',
            backgroundColor: 'var(--input-bg, #fff)'
          }}
        >
          {imagePreview && (
            <div className="image-preview" style={{ marginBottom: '10px' }}>
              <div className="preview-header">
                <span className="preview-label">📸 Image attached</span>
                <button onClick={handleRemoveImage} className="remove-image">
                  ✕
                </button>
              </div>
              <img src={imagePreview} alt="Preview" style={{ maxHeight: '100px' }} />
            </div>
          )}
          <div className="input-row" style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Describe what you're looking for or upload an image..."
              disabled={isLoading}
              rows="1"
              style={{
                flex: 1,
                minHeight: '40px',
                maxHeight: '100px',
                resize: 'none',
                border: '1px solid var(--border-color, #ddd)',
                borderRadius: '8px',
                padding: '10px',
                fontFamily: 'inherit',
                fontSize: '14px',
                lineHeight: '1.4'
              }}
              className="message-input"
            />
            <div className="input-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <label 
                className="file-input-btn" 
                title="Upload image"
                style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '40px',
                  height: '40px',
                  cursor: 'pointer'
                }}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  disabled={isLoading}
                  style={{ display: 'none' }}
                />
                📎
              </label>
              <button
                onClick={sendMessage}
                disabled={isLoading || (!message.trim() && !image)}
                className="send-button"
                title="Send message"
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: isLoading || (!message.trim() && !image) ? 'not-allowed' : 'pointer'
                }}
              >
                {isLoading ? '⏳' : '🚀'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;