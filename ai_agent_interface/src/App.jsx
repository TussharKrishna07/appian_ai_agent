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

  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [chatHistory]);

  // Add new useEffect to restore chat history on component mount
  useEffect(() => {
    const restoreChatHistory = async () => {
      try {
        const res = await fetch('http://localhost:5000/chat?thread_id=1', {
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
          }
        }
      } catch (error) {
        console.error('Failed to restore chat history:', error);
      }
    };

    restoreChatHistory();
  }, []); // Empty dependency array means this runs once on mount

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

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>Chat History</h2>
        </div>
        <div className="new-chat">
          <button onClick={() => setChatHistory([])}>
            <span>+</span> New Chat
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="app-header">
          <h1>AI Assistant</h1>
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
