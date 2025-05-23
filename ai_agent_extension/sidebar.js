let capturedImageBlob = null;
let isImageUsed = false;

console.log('Sidebar script loaded');

document.addEventListener('DOMContentLoaded', () => {
  console.log('Sidebar DOM loaded');
  const closeBtn = document.getElementById('close-sidebar');
  const sendBtn = document.getElementById('send-message');
  const captureScreenBtn = document.getElementById('capture-screen-btn');
  const uploadBtn = document.getElementById('upload-btn');
  const fileInput = document.getElementById('file-input');
  const messageInput = document.getElementById('message-input');
  
  if (closeBtn) {
    closeBtn.addEventListener('click', closeSidebar);
    console.log('Close button event listener added');
  }
  if (sendBtn) {
    sendBtn.addEventListener('click', sendMessage);
    console.log('Send button event listener added');
  }
  if (captureScreenBtn) {
    captureScreenBtn.addEventListener('click', captureScreen);
    console.log('Capture screen button event listener added');
  }
  if (uploadBtn) {
    uploadBtn.addEventListener('click', uploadImage);
    console.log('Upload button event listener added');
  }
  if (fileInput) {
    fileInput.addEventListener('change', handleFileSelect);
    console.log('File input event listener added');
  }
  
  if (messageInput) {
    messageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
    console.log('Message input event listener added');
  }

  // Load chat history when sidebar loads
  loadChatHistory();
});

// Listen for messages from parent window
window.addEventListener('message', (event) => {
  console.log('Sidebar received message:', event.data);
  if (event.data.action === 'setImage') {
    displayCapturedImage(event.data.imageData);
  } else if (event.data.action === 'refreshChatHistory') {
    console.log('SIDEBAR: Refreshing chat history due to tab change/refresh');
    loadChatHistory();
  }
});

async function loadChatHistory() {
  console.log('SIDEBAR: Loading chat history from backend...');
  
  try {
    const response = await fetch('http://localhost:5000/chat?thread_id=1', {
      method: 'GET'
    });
    
    if (!response.ok) {
      console.error('SIDEBAR: Failed to fetch chat history:', response.status);
      // Add welcome message if no history or error
      addWelcomeMessage();
      return;
    }
    
    const data = await response.json();
    console.log('SIDEBAR: Chat history received:', data);
    
    // Clear existing messages first
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
      chatMessages.innerHTML = '';
    }
    
    if (data.messages && data.messages.length > 0) {
      // Display all messages from history
      data.messages.forEach(message => {
        const imageUrl = message.image || null;
        addMessageToChat(message.role, message.content, imageUrl);
      });
      console.log('SIDEBAR: ✅ Chat history loaded successfully');
    } else {
      // Add welcome message if no history
      addWelcomeMessage();
    }
    
  } catch (error) {
    console.error('SIDEBAR: Error loading chat history:', error);
    // Add welcome message on error
    addWelcomeMessage();
  }
}

function addWelcomeMessage() {
  addMessageToChat('assistant', 'Hi! I can help you find similar fashion items. Capture a screen area or upload an image to get started.');
}

function displayCapturedImage(imageDataUrl) {
  console.log('SIDEBAR: Displaying captured image');
  
  removeTemporaryMessages();
  
  const img = document.getElementById('captured-image');
  const container = document.getElementById('image-preview-container');
  
  if (img && container) {
    img.src = imageDataUrl;
    container.style.display = 'block';
    
    dataURLtoBlob(imageDataUrl).then(blob => {
      capturedImageBlob = new File([blob], 'captured-fashion-item.png', {
        type: 'image/png',
        lastModified: Date.now()
      });
      isImageUsed = false;
      console.log('SIDEBAR: Image blob ready for sending:', capturedImageBlob);
    });
  }
}

function removeTemporaryMessages() {
  console.log('SIDEBAR: Removing temporary messages');
  const chatMessages = document.getElementById('chat-messages');
  const messages = chatMessages.querySelectorAll('.message.user');
  
  messages.forEach(message => {
    const messageText = message.textContent.trim();
    console.log('SIDEBAR: Checking message text:', messageText);
    
    if (messageText === '📸 Capturing screen area...' || 
        messageText === '📁 Uploading image...' ||
        messageText === '📸 Starting screen capture...') {
      console.log('SIDEBAR: Removing temporary placeholder message:', messageText);
      message.remove();
    }
  });
}

function captureScreen() {
  console.log('SIDEBAR: Capture screen button clicked');
  addMessageToChat('user', '📸 Capturing screen area...', null);
  window.parent.postMessage({ action: 'startNewCapture' }, '*');
}

function uploadImage() {
  console.log('SIDEBAR: Upload button clicked');
  addMessageToChat('user', '📁 Uploading image...', null);
  document.getElementById('file-input').click();
}

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) {
    removeTemporaryMessages();
    return;
  }
  
  console.log('SIDEBAR: File selected:', file.name, file.type, file.size);
  
  if (!file.type.startsWith('image/')) {
    removeTemporaryMessages();
    addMessageToChat('assistant', 'Please select a valid image file (JPEG, PNG, GIF, etc.)');
    return;
  }
  
  if (file.size > 10 * 1024 * 1024) {
    removeTemporaryMessages();
    addMessageToChat('assistant', 'Image file is too large. Please select an image smaller than 10MB.');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = (e) => {
    displayUploadedImage(e.target.result, file);
  };
  reader.onerror = () => {
    removeTemporaryMessages();
    addMessageToChat('assistant', 'Error reading the image file. Please try again.');
  };
  reader.readAsDataURL(file);
  
  event.target.value = '';
}

function displayUploadedImage(imageDataUrl, originalFile) {
  console.log('SIDEBAR: Displaying uploaded image');
  
  removeTemporaryMessages();
  
  const img = document.getElementById('captured-image');
  const container = document.getElementById('image-preview-container');
  
  if (img && container) {
    img.src = imageDataUrl;
    container.style.display = 'block';
    
    capturedImageBlob = new File([originalFile], originalFile.name, {
      type: originalFile.type,
      lastModified: originalFile.lastModified
    });
    isImageUsed = false;
    
    console.log('SIDEBAR: Uploaded image ready for sending:', capturedImageBlob);
  }
}

function dataURLtoBlob(dataURL) {
  return new Promise((resolve) => {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    resolve(new Blob([u8arr], { type: mime }));
  });
}

function closeSidebar() {
  console.log('SIDEBAR: 🔒 Close button clicked - sending close message to parent');
  window.parent.postMessage({ action: 'closeSidebar' }, '*');
}

async function sendMessage() {
  const messageInput = document.getElementById('message-input');
  const message = messageInput.value.trim();
  
  console.log('SIDEBAR: Send message called with:', message);
  console.log('SIDEBAR: capturedImageBlob:', capturedImageBlob);
  console.log('SIDEBAR: isImageUsed:', isImageUsed);
  
  if (!message && (!capturedImageBlob || isImageUsed)) {
    console.log('SIDEBAR: No message to send - returning early');
    return;
  }
  
  const shouldSendImage = capturedImageBlob && !isImageUsed;
  const imageUrlForChat = shouldSendImage ? document.getElementById('captured-image').src : null;
  
  console.log('SIDEBAR: shouldSendImage:', shouldSendImage);
  console.log('SIDEBAR: imageUrlForChat:', imageUrlForChat);
  
  // Add user message to chat
  addMessageToChat('user', message, imageUrlForChat);
  messageInput.value = '';
  
  showLoading(true);
  
  try {
    const formData = new FormData();
    
    if (message) {
      formData.append('message', message);
      console.log('SIDEBAR: Added message to FormData:', message);
    }
    
    if (shouldSendImage) {
      formData.append('image', capturedImageBlob);
      isImageUsed = true;
      console.log('SIDEBAR: Added image to FormData:', capturedImageBlob.name, capturedImageBlob.size);
      
      // Hide image after sending
      setTimeout(() => {
        const container = document.getElementById('image-preview-container');
        if (container) {
          container.style.display = 'none';
        }
      }, 1000);
    }
    
    console.log('SIDEBAR: Sending request to backend...');
    console.log('SIDEBAR: FormData contents:');
    for (let [key, value] of formData.entries()) {
      console.log(`SIDEBAR: ${key}:`, value);
    }
    
    const response = await fetch('http://localhost:5000/chat', {
      method: 'POST',
      body: formData
    });
    
    console.log('SIDEBAR: Response status:', response.status);
    console.log('SIDEBAR: Response ok:', response.ok);
    
    if (!response.ok) {
      let errorText = 'Network error';
      try {
        const errorData = await response.json();
        errorText = errorData.error || errorText;
        console.log('SIDEBAR: Error data:', errorData);
      } catch (parseError) {
        errorText = response.statusText || errorText;
        console.log('SIDEBAR: Error parsing response:', parseError);
      }
      throw new Error(errorText);
    }
    
    const data = await response.json();
    console.log('SIDEBAR: Response data:', data);
    
    const replyContent = typeof data.reply === 'string' ? data.reply : 'No valid response.';
    addMessageToChat('assistant', replyContent);
    
  } catch (error) {
    console.error('SIDEBAR: Error sending message:', error);
    addMessageToChat('assistant', `Error: ${error.message}`);
  } finally {
    showLoading(false);
  }
}

function addMessageToChat(role, content, imageUrl = null) {
  console.log('SIDEBAR: Adding message to chat:', role, content);
  const chatMessages = document.getElementById('chat-messages');
  
  if (!chatMessages) {
    console.error('SIDEBAR: Chat messages container not found');
    return;
  }
  
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}`;
  
  let messageContent = '';
  
  if (imageUrl && role === 'user') {
    messageContent += `<img src="${imageUrl}" alt="Fashion item" />`;
  }
  
  if (content) {
    // Process markdown links
    const processedContent = content.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
    );
    messageContent += `<div class="message-text">${processedContent}</div>`;
  }
  
  messageDiv.innerHTML = messageContent;
  chatMessages.appendChild(messageDiv);
  
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showLoading(show) {
  const loading = document.getElementById('loading');
  const sendBtn = document.getElementById('send-message');
  const captureScreenBtn = document.getElementById('capture-screen-btn');
  const uploadBtn = document.getElementById('upload-btn');
  
  if (loading) {
    loading.style.display = show ? 'block' : 'none';
  }
  
  if (sendBtn) {
    sendBtn.disabled = show;
  }
  
  if (captureScreenBtn) {
    captureScreenBtn.disabled = show;
  }
  
  if (uploadBtn) {
    uploadBtn.disabled = show;
  }
}