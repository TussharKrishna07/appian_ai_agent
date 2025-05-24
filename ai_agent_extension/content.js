// Remove the import line and define browserAPI directly
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

// Global state
const state = {
  port: null,
  selectedText: '',
  pageText: '',
  isCapturing: false,
  captureStartPos: null,
  captureEndPos: null,
  overlay: null,
  selectionBox: null
};

function connectToExtension() {
  // Only create connection if it doesn't exist or is disconnected
  if (!state.port || state.port.disconnected) {
    try {
      state.port = browserAPI.runtime.connect({ name: 'content-script' });
      state.port.onDisconnect.addListener(() => {
        state.port.disconnected = true;
      });
    } catch (error) {
      console.error('Connection error:', error);
    }
  }
}

function sanitizeContent(text) {
  // Remove potentially dangerous characters/scripts
  return text
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/[^\w\s.,!?-]/g, ' ')
    .trim();
}

function getPageContent() {
  const selectedText = window.getSelection().toString().trim();
  let content = '';
  
  if (selectedText) {
    state.selectedText = selectedText;
    content = selectedText;
  } else {
    content = Array.from(document.body.getElementsByTagName('*'))
      .filter(element => {
        const style = window.getComputedStyle(element);
        return style.display !== 'none' && 
               style.visibility !== 'hidden' && 
               !element.hidden;
      })
      .map(element => {
        return Array.from(element.childNodes)
          .filter(node => node.nodeType === Node.TEXT_NODE)
          .map(node => node.textContent.trim())
          .join(' ');
      })
      .filter(text => text.length > 0)
      .join('\n')
      .replace(/[\s\n]+/g, ' ')
      .trim();
    
    state.pageText = content;
  }
  
  return sanitizeContent(content);
}

// Screen capture functions
function startScreenCapture() {
  console.log('Starting screen capture...');
  
  if (state.isCapturing) {
    console.log('Already capturing, returning');
    return;
  }
  
  state.isCapturing = true;
  
  // Create overlay
  state.overlay = document.createElement('div');
  state.overlay.className = 'chat-extension-capture-overlay';
  
  // Create instructions
  const instructions = document.createElement('div');
  instructions.className = 'chat-extension-capture-instructions';
  instructions.textContent = 'Click and drag to select an area to capture';
  
  // Create cancel button
  const cancelButton = document.createElement('button');
  cancelButton.className = 'chat-extension-capture-cancel';
  cancelButton.textContent = 'Cancel';
  cancelButton.addEventListener('click', cancelScreenCapture);
  
  // Create selection box
  state.selectionBox = document.createElement('div');
  state.selectionBox.className = 'chat-extension-selection-box';
  state.selectionBox.style.display = 'none';
  state.selectionBox.style.position = 'fixed';
  state.selectionBox.style.pointerEvents = 'none';
  state.selectionBox.style.zIndex = '999998';
  
  // Add event listeners
  state.overlay.addEventListener('mousedown', handleMouseDown);
  state.overlay.addEventListener('mousemove', handleMouseMove);
  state.overlay.addEventListener('mouseup', handleMouseUp);
  
  // Prevent page scrolling during capture
  document.body.style.overflow = 'hidden';
  
  // Add elements to page
  document.body.appendChild(state.overlay);
  document.body.appendChild(instructions);
  document.body.appendChild(cancelButton);
  document.body.appendChild(state.selectionBox);
  
  console.log('Screen capture overlay created');
}

function cancelScreenCapture() {
  console.log('Canceling screen capture...');
  
  if (!state.isCapturing) return;
  
  state.isCapturing = false;
  state.captureStartPos = null;
  state.captureEndPos = null;
  
  // Remove overlay elements
  if (state.overlay) {
    state.overlay.remove();
    state.overlay = null;
  }
  
  // Remove instructions and cancel button
  const instructions = document.querySelector('.chat-extension-capture-instructions');
  const cancelButton = document.querySelector('.chat-extension-capture-cancel');
  if (instructions) instructions.remove();
  if (cancelButton) cancelButton.remove();
  
  if (state.selectionBox) {
    state.selectionBox.remove();
    state.selectionBox = null;
  }
  
  // Restore page scrolling
  document.body.style.overflow = '';
  
  console.log('Screen capture canceled');
}

function handleMouseDown(e) {
  e.preventDefault();
  e.stopPropagation();
  
  // Get viewport coordinates
  state.captureStartPos = {
    x: e.clientX,
    y: e.clientY
  };
  
  // Show selection box at exact cursor position
  state.selectionBox.style.display = 'block';
  state.selectionBox.style.left = e.clientX + 'px';
  state.selectionBox.style.top = e.clientY + 'px';
  state.selectionBox.style.width = '0px';
  state.selectionBox.style.height = '0px';
}

function handleMouseMove(e) {
  if (!state.captureStartPos) return;
  
  e.preventDefault();
  e.stopPropagation();
  
  // Get current viewport coordinates
  const currentX = e.clientX;
  const currentY = e.clientY;
  
  // Calculate box dimensions and position
  const left = Math.min(state.captureStartPos.x, currentX);
  const top = Math.min(state.captureStartPos.y, currentY);
  const width = Math.abs(currentX - state.captureStartPos.x);
  const height = Math.abs(currentY - state.captureStartPos.y);
  
  // Update selection box position and size with pixel precision
  state.selectionBox.style.left = Math.round(left) + 'px';
  state.selectionBox.style.top = Math.round(top) + 'px';
  state.selectionBox.style.width = Math.round(width) + 'px';
  state.selectionBox.style.height = Math.round(height) + 'px';
}

function handleMouseUp(e) {
  if (!state.captureStartPos) return;
  
  e.preventDefault();
  e.stopPropagation();
  
  state.captureEndPos = {
    x: e.clientX,
    y: e.clientY
  };
  
  // Calculate capture area with exact coordinates
  const left = Math.min(state.captureStartPos.x, state.captureEndPos.x);
  const top = Math.min(state.captureStartPos.y, state.captureEndPos.y);
  const width = Math.abs(state.captureEndPos.x - state.captureStartPos.x);
  const height = Math.abs(state.captureEndPos.y - state.captureStartPos.y);
  
  // Minimum size check
  if (width < 10 || height < 10) {
    console.log('Selection too small, canceling');
    cancelScreenCapture();
    return;
  }
  
  console.log('Sending capture request with area:', { left, top, width, height });
  
  // Send capture request to background
  const captureData = {
    left: Math.round(left),
    top: Math.round(top),
    width: Math.round(width),
    height: Math.round(height),
    devicePixelRatio: window.devicePixelRatio || 1
  };
  
  browserAPI.runtime.sendMessage({
    action: 'captureScreen',
    data: captureData
  }).then(() => {
    console.log('Capture request sent successfully');
  }).catch(error => {
    console.error('Error sending capture request:', error);
  });
  
  cancelScreenCapture();
}

// Message listener
browserAPI.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request);
  
  if (request.action === 'getContent') {
    connectToExtension();
    sendResponse({ content: getPageContent() });
    return true;
  } else if (request.action === 'startCapture') {
    console.log('Starting capture from message');
    startScreenCapture();
    sendResponse({ success: true });
    return true;
  }
});

// Log that content script is loaded
console.log('Chat extension content script loaded');