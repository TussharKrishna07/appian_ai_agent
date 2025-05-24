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
            maxHeight: imagePreview ? '350px' : '120px',
            padding: '1rem',
            borderTop: '1px solid var(--border-color, #e0e0e0)',
            backgroundColor: 'var(--input-bg, #fff)',
            display: 'flex',
            flexDirection: 'column',
            transition: 'max-height 0.3s ease-in-out'
          }}
        >
          {imagePreview && (
            <div className="image-preview" style={{ 
              marginBottom: '12px',
              flexShrink: 0,
              maxHeight: '220px',
              overflow: 'hidden',
              animation: 'fadeIn 0.3s ease-in-out'
            }}>
              <div className="preview-header" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px',
                fontSize: '12px',
                color: 'var(--text-secondary, #666)',
                fontWeight: '500'
              }}>
                <span className="preview-label">📸 Image ready to send</span>
                <button 
                  onClick={handleRemoveImage} 
                  className="remove-image" 
                  style={{
                    background: 'rgba(244, 67, 54, 0.1)',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '14px',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    color: '#f44336',
                    transition: 'all 0.2s ease',
                    fontWeight: '600',
                    minWidth: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onMouseEnter={(e) => e.target.style.background = 'rgba(244, 67, 54, 0.2)'}
                  onMouseLeave={(e) => e.target.style.background = 'rgba(244, 67, 54, 0.1)'}
                >
                  ✕
                </button>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '8px',
                backgroundColor: '#f8f9fa',
                borderRadius: '12px',
                border: '1px solid #e9ecef'
              }}>
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  style={{ 
                    maxHeight: '180px',
                    maxWidth: '100%',
                    width: 'auto',
                    height: 'auto',
                    objectFit: 'contain',
                    borderRadius: '8px',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
                    transition: 'transform 0.2s ease'
                  }} 
                  onMouseEnter={(e) => e.target.style.transform = 'scale(1.02)'}
                  onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                />
              </div>
            </div>
          )}
          <div className="input-row" style={{ 
            display: 'flex', 
            gap: '12px', 
            alignItems: 'flex-end',
            flexShrink: 0
          }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <textarea
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  // Auto-resize textarea
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 80) + 'px';
                }}
                onKeyPress={handleKeyPress}
                placeholder="Describe what you're looking for or upload an image..."
                disabled={isLoading}
                rows="1"
                style={{
                  width: '100%',
                  minHeight: '44px',
                  maxHeight: '80px',
                  resize: 'none',
                  border: '2px solid var(--border-color, #e0e0e0)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  fontFamily: 'inherit',
                  fontSize: '14px',
                  lineHeight: '1.5',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  backgroundColor: isLoading ? '#f5f5f5' : '#fff',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }}
                className="message-input"
                onFocus={(e) => e.target.style.borderColor = '#4285f4'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border-color, #e0e0e0)'}
              />
              {isLoading && (
                <div style={{
                  position: 'absolute',
                  right: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '12px',
                  color: '#666',
                  fontWeight: '500'
                }}>
                  Processing...
                </div>
              )}
            </div>
            <div className="input-actions" style={{ 
              display: 'flex', 
              gap: '8px', 
              alignItems: 'flex-end',
              paddingBottom: '2px'
            }}>
              <label 
                className="file-input-btn" 
                title="Upload image"
                style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '44px',
                  height: '44px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  borderRadius: '12px',
                  backgroundColor: '#f8f9fa',
                  border: '2px solid #e9ecef',
                  transition: 'all 0.2s ease',
                  fontSize: '18px',
                  opacity: isLoading ? 0.5 : 1
                }}
                onMouseEnter={(e) => {
                  if (!isLoading) {
                    e.target.style.backgroundColor = '#e9ecef';
                    e.target.style.borderColor = '#dee2e6';
                  }
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#f8f9fa';
                  e.target.style.borderColor = '#e9ecef';
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
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  border: 'none',
                  cursor: isLoading || (!message.trim() && !image) ? 'not-allowed' : 'pointer',
                  backgroundColor: isLoading || (!message.trim() && !image) ? '#e0e0e0' : '#4285f4',
                  color: '#fff',
                  fontSize: '18px',
                  transition: 'all 0.2s ease',
                  boxShadow: isLoading || (!message.trim() && !image) ? 'none' : '0 2px 8px rgba(66, 133, 244, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => {
                  if (!isLoading && (message.trim() || image)) {
                    e.target.style.backgroundColor = '#3367d6';
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 4px 12px rgba(66, 133, 244, 0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isLoading && (message.trim() || image)) {
                    e.target.style.backgroundColor = '#4285f4';
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 2px 8px rgba(66, 133, 244, 0.3)';
                  }
                }}
              >
                {isLoading ? (
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid #fff',
                    borderTop: '2px solid transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                ) : '🚀'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;