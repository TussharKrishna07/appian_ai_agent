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
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>Chat History</h2>
        </div>
        <div className="new-chat">
          <button onClick={createNewChat}>
            <span>+</span> New Chat
          </button>
        </div>
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
      </aside>

      <main className="main-content">
        <header className="app-header">
          <h1>AI Assistant - {chatThreads.find(t => t.id === currentThreadId)?.name || 'Chat'}</h1>
        </header>

        <div className="chat-window" ref={chatHistoryRef}>
          {chatHistory.length === 0 && !isLoading && (
            <div className="empty-chat">
              <div className="welcome-container">
                <h2>Welcome! 👋</h2>
                <p>How can I help you today?</p>
              </div>
            </div>
          )}

          {chatHistory.map((msg, index) => (
            <div key={index} className={`message ${msg.role}`}>
              <div className="message-inner">
                <span className="avatar">
                  {msg.role === 'user' ? '👤' : '🤖'}
                </span>
                <div className="message-content">
                  <ReactMarkdown 
                    components={{
                      a: ({node, ...props}) => (
                        <a target="_blank" rel="noopener noreferrer" {...props} />
                      )
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                  {msg.image && (
                    <img 
                      src={msg.image} 
                      alt="Uploaded" 
                      className="uploaded-image" 
                    />
                  )}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="message assistant">
              <div className="message-inner">
                <span className="avatar">🤖</span>
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <footer className="chat-input-area">
          <div className="input-container">
            {imagePreview && (
              <div className="image-preview">
                <img src={imagePreview} alt="Preview" />
                <button onClick={handleRemoveImage} className="remove-image">
                  ×
                </button>
              </div>
            )}
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Message AI Assistant..."
              disabled={isLoading}
              rows="1"
            />
            <div className="actions">
              <label className="file-input">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  disabled={isLoading}
                />
                📎
              </label>
              <button 
                onClick={sendMessage} 
                disabled={isLoading || (!message.trim() && !image)}
                className="send-button"
              >
                {isLoading ? '⏳' : '➤'}
              </button>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

export default App;
