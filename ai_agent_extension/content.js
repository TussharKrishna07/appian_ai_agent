// Prevent multiple loading
if (window.fashionFinderLoaded) {
  console.log('Fashion Finder already loaded, skipping...');
} else {
  window.fashionFinderLoaded = true;
  
  // Global variables
  let sidebarIframe = null;
  let isCapturing = false;
  let captureOverlay = null;
  let sidebarWidth = 400;
  let isAdjusted = false;
  let originalBodyMargin = null;
  let originalBodyWidth = null;
  let originalBodyMaxWidth = null;

  console.log('CONTENT: Fashion Finder content script loaded');

  // Immediately notify background that content script is ready
  function notifyBackgroundReady() {
    chrome.runtime.sendMessage({ 
      action: 'contentScriptReady' 
    }).then((response) => {
      console.log('CONTENT: ✅ Background notified, response:', response);
      if (response && response.sidebarState) {
        console.log('CONTENT: Received sidebar state:', response.sidebarState);
        if (response.sidebarState.isOpen) {
          console.log('CONTENT: 📂 Sidebar should be open on page load');
          sidebarWidth = response.sidebarState.width || 400;
          setTimeout(() => {
            createSidebarIfNeeded();
          }, 200);
        }
      }
    }).catch((error) => {
      console.log('CONTENT: ❌ Error notifying background:', error.message);
    });
  }

  // Call immediately and also after DOM loads
  notifyBackgroundReady();

  // Document ready check
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      console.log('CONTENT: DOM loaded');
      setTimeout(notifyBackgroundReady, 100);
    });
  } else {
    console.log('CONTENT: DOM already loaded');
    setTimeout(notifyBackgroundReady, 100);
  }

  // Document visibility change listener
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      console.log('CONTENT: Tab became visible, checking sidebar state');
      setTimeout(checkGlobalSidebarState, 200);
    }
  });

  // Window focus listener
  window.addEventListener('focus', () => {
    console.log('CONTENT: Window focused, checking sidebar state');
    setTimeout(checkGlobalSidebarState, 200);
  });

  // Message listener
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('CONTENT: 📨 Received message:', request.action, 'with data:', request);
    
    try {
      switch (request.action) {
        case "createSidebar":
          console.log('CONTENT: 🏗️ Creating sidebar...');
          if (request.width) {
            sidebarWidth = request.width;
          }
          createSidebarIfNeeded();
          sendResponse({ success: true });
          break;

        case "globalSidebarStateChanged":
          console.log('CONTENT: 🔄 Global sidebar state changed to:', request.isOpen);
          
          if (request.isOpen && !sidebarIframe) {
            console.log('CONTENT: 📂 Opening sidebar due to global state change');
            sidebarWidth = request.width || 400;
            createSidebarIfNeeded();
          } else if (!request.isOpen && sidebarIframe) {
            // ONLY close if this is a manual close request, not automatic
            if (request.manualClose === true) {
              console.log('CONTENT: ❌ Closing sidebar due to MANUAL global state change');
              closeSidebarLocal();
            } else {
              console.log('CONTENT: 🔒 Ignoring automatic close request - sidebar stays open');
            }
          } else if (request.isOpen && sidebarIframe) {
            console.log('CONTENT: ✅ Sidebar already open, ensuring proper layout');
            ensureProperLayout();
          }
          sendResponse({ success: true });
          break;

        default:
          console.log('CONTENT: ❓ Unknown action:', request.action);
          sendResponse({ error: 'Unknown action' });
      }
    } catch (error) {
      console.error('CONTENT: ❌ Error handling message:', error);
      sendResponse({ error: error.message });
    }
    
    return true;
  });

  function createSidebarIfNeeded() {
    console.log('CONTENT: 🔍 Checking if sidebar creation is needed...');
    
    if (sidebarIframe) {
      console.log('CONTENT: ✅ Sidebar already exists, ensuring visibility and refreshing chat');
      sidebarIframe.style.display = 'block';
      sidebarIframe.style.visibility = 'visible';
      sidebarIframe.style.opacity = '1';
      ensureProperLayout();
      
      // Refresh chat history when sidebar is recreated/restored
      setTimeout(() => {
        if (sidebarIframe && sidebarIframe.contentWindow) {
          sidebarIframe.contentWindow.postMessage({
            action: 'refreshChatHistory'
          }, '*');
        }
      }, 500);
      return;
    }
    
    console.log('CONTENT: 🏗️ Creating new sidebar iframe');
    
    // Create sidebar
    sidebarIframe = document.createElement('iframe');
    sidebarIframe.id = 'fashion-finder-sidebar';
    sidebarIframe.src = chrome.runtime.getURL('sidebar.html');
    sidebarIframe.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      right: 0 !important;
      width: ${sidebarWidth}px !important;
      height: 100vh !important;
      border: none !important;
      border-left: 1px solid #e0e0e0 !important;
      z-index: 2147483647 !important;
      background: white !important;
      transition: width 0.3s ease !important;
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
    `;
    
    // Append to body
    document.body.appendChild(sidebarIframe);
    
    // Adjust page layout
    adjustPageLayout();
    
    // Setup message listener
    setupMessageListener();
    
    // Update global state (but don't trigger notifications to other tabs)
    chrome.runtime.sendMessage({ 
      action: 'setSidebarState', 
      isOpen: true, 
      width: sidebarWidth 
    }).then(() => {
      console.log('CONTENT: ✅ Global state updated for new sidebar');
    }).catch((error) => {
      console.error('CONTENT: ❌ Failed to update global state:', error);
    });

    console.log('CONTENT: ✅ Sidebar created successfully');
  }

  function ensureProperLayout() {
    if (sidebarIframe && sidebarIframe.style.display !== 'none') {
      console.log('CONTENT: 📐 Ensuring proper layout for visible sidebar');
      if (!isAdjusted) {
        adjustPageLayout();
      }
    }
  }

  function adjustPageLayout() {
    console.log('CONTENT: 📐 Adjusting page layout for sidebar');
    
    if (isAdjusted) {
      console.log('CONTENT: Layout already adjusted');
      return;
    }
    
    // Store original values
    originalBodyMargin = document.body.style.marginRight || '';
    originalBodyWidth = document.body.style.width || '';
    originalBodyMaxWidth = document.body.style.maxWidth || '';
    
    // Adjust body to make room for sidebar
    document.body.style.marginRight = sidebarWidth + 'px';
    document.body.style.transition = 'margin-right 0.3s ease';
    
    isAdjusted = true;
    console.log('CONTENT: ✅ Page layout adjusted for sidebar width:', sidebarWidth);
  }

  function restorePageLayout() {
    console.log('CONTENT: 🔄 Restoring original page layout');
    
    if (!isAdjusted) {
      console.log('CONTENT: Layout not adjusted, nothing to restore');
      return;
    }
    
    // Restore original body styles
    document.body.style.marginRight = originalBodyMargin;
    document.body.style.width = originalBodyWidth;
    document.body.style.maxWidth = originalBodyMaxWidth;
    
    isAdjusted = false;
    console.log('CONTENT: ✅ Page layout restored');
  }

  function closeSidebarLocal() {
    console.log('CONTENT: 🔒 Closing sidebar locally (no global update)');
    
    if (sidebarIframe) {
      console.log('CONTENT: Removing sidebar iframe');
      sidebarIframe.remove();
      sidebarIframe = null;
    }
    
    restorePageLayout();
    window.removeEventListener('message', handleSidebarMessages);
    
    console.log('CONTENT: ✅ Sidebar closed locally');
  }

  function closeSidebar() {
    console.log('CONTENT: 🔒 Closing sidebar and updating global state');
    
    if (sidebarIframe) {
      console.log('CONTENT: Removing sidebar iframe');
      sidebarIframe.remove();
      sidebarIframe = null;
    }
    
    restorePageLayout();
    
    // Update global sidebar state to closed with manual close flag
    chrome.runtime.sendMessage({ 
      action: 'setSidebarState', 
      isOpen: false, 
      width: sidebarWidth,
      manualClose: true  // Add this flag to indicate manual close
    }).then(() => {
      console.log('CONTENT: ✅ Global state updated successfully (manual close)');
    }).catch((error) => {
      console.error('CONTENT: ❌ Failed to update global state:', error);
    });
    
    window.removeEventListener('message', handleSidebarMessages);
    
    console.log('CONTENT: ✅ Sidebar closed with global update');
  }

  function setupMessageListener() {
    window.removeEventListener('message', handleSidebarMessages);
    window.addEventListener('message', handleSidebarMessages);
    console.log('CONTENT: 📡 Message listener set up for sidebar communication');
  }

  function handleSidebarMessages(event) {
    console.log('CONTENT: 📨 Received message from sidebar:', event.data.action);
    
    if (event.data.action === 'closeSidebar') {
      console.log('CONTENT: 🔒 Manual sidebar close requested');
      closeSidebar();
    } else if (event.data.action === 'startNewCapture') {
      console.log('CONTENT: 📸 Starting new capture from sidebar');
      startScreenCapture();
    }
  }

  function checkGlobalSidebarState() {
    console.log('CONTENT: 🔍 Checking global sidebar state...');
    
    chrome.runtime.sendMessage({ action: 'getSidebarState' })
      .then((response) => {
        console.log('CONTENT: Global state response:', response);
        
        if (response && response.isOpen && !sidebarIframe) {
          console.log('CONTENT: 📂 Global sidebar is open, creating sidebar in this tab');
          sidebarWidth = response.width || 400;
          createSidebarIfNeeded();
        } else if (response && response.isOpen && sidebarIframe) {
          console.log('CONTENT: ✅ Sidebar already exists and should be open, refreshing chat history');
          ensureProperLayout();
          
          // Refresh chat history when tab becomes active or visible
          setTimeout(() => {
            if (sidebarIframe && sidebarIframe.contentWindow) {
              sidebarIframe.contentWindow.postMessage({
                action: 'refreshChatHistory'
              }, '*');
            }
          }, 500);
        } else if (response && !response.isOpen && sidebarIframe) {
          // ONLY close if this was a manual close, not automatic
          console.log('CONTENT: 🔒 Global sidebar is closed but keeping local sidebar open (no manual close detected)');
          // Don't close automatically - user must manually close
        } else {
          console.log('CONTENT: ✅ Sidebar state is consistent');
        }
      })
      .catch((error) => {
        console.log('CONTENT: No background response or error:', error.message);
      });
  }

  // Rest of the functions (startScreenCapture, createSnippingTool, etc.) remain the same...
  function startScreenCapture() {
    console.log('CONTENT: 🎯 Starting screen capture');
    if (isCapturing) {
      console.log('CONTENT: Already capturing, ignoring request');
      return;
    }
    
    isCapturing = true;
    createSnippingTool();
  }

  function createSnippingTool() {
    console.log('CONTENT: 📸 Creating snipping tool');
    
    // Hide sidebar temporarily for clean capture
    if (sidebarIframe) {
      sidebarIframe.style.display = 'none';
      restorePageLayout();
    }

    setTimeout(() => {
      captureOverlay = document.createElement('div');
      captureOverlay.id = 'fashion-finder-overlay';
      captureOverlay.innerHTML = `
        <div class="capture-instructions">
          <h3>📸 Select Area to Capture</h3>
          <p>Click and drag to select the fashion item</p>
          <button id="cancel-capture">Cancel</button>
        </div>
      `;
      
      captureOverlay.style.cssText = `
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        background: rgba(0, 0, 0, 0.3) !important;
        z-index: 2147483648 !important;
        cursor: crosshair !important;
        user-select: none !important;
      `;
      
      const instructions = captureOverlay.querySelector('.capture-instructions');
      instructions.style.cssText = `
        position: absolute !important;
        top: 20px !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        background: white !important;
        padding: 20px !important;
        border-radius: 8px !important;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
        text-align: center !important;
        z-index: 2147483649 !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      `;
      
      document.body.appendChild(captureOverlay);
      
      document.getElementById('cancel-capture').addEventListener('click', cancelCapture);
      enableSnippingSelection();
      
      console.log('CONTENT: ✅ Capture overlay created');
    }, 300);
  }

  function cancelCapture() {
    console.log('CONTENT: ❌ Capture cancelled');
    cleanupCapture();
    restoreSidebarAfterCapture();
  }

  function cleanupCapture() {
    isCapturing = false;
    
    if (captureOverlay) {
      captureOverlay.remove();
      captureOverlay = null;
    }
    
    // Remove selection boxes
    const selectionBoxes = document.querySelectorAll('[style*="border: 2px dashed"]');
    selectionBoxes.forEach(box => box.remove());
  }

  function restoreSidebarAfterCapture() {
    if (sidebarIframe) {
      sidebarIframe.style.display = 'block';
      setTimeout(() => {
        adjustPageLayout();
      }, 100);
    }
  }

  function enableSnippingSelection() {
    let isSelecting = false;
    let startX, startY, endX, endY;
    let selectionBox = null;

    captureOverlay.addEventListener('mousedown', (e) => {
      if (e.target.id === 'cancel-capture') return;
      
      isSelecting = true;
      startX = e.clientX;
      startY = e.clientY;
      
      selectionBox = document.createElement('div');
      selectionBox.style.cssText = `
        position: fixed !important;
        border: 2px dashed #007bff !important;
        background: rgba(0, 123, 255, 0.1) !important;
        z-index: 2147483650 !important;
        pointer-events: none !important;
      `;
      document.body.appendChild(selectionBox);
      
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isSelecting || !selectionBox) return;
      
      endX = e.clientX;
      endY = e.clientY;
      
      const left = Math.min(startX, endX);
      const top = Math.min(startY, endY);
      const width = Math.abs(endX - startX);
      const height = Math.abs(endY - startY);
      
      selectionBox.style.left = left + 'px';
      selectionBox.style.top = top + 'px';
      selectionBox.style.width = width + 'px';
      selectionBox.style.height = height + 'px';
    });

    document.addEventListener('mouseup', (e) => {
      if (!isSelecting) return;
      
      isSelecting = false;
      endX = e.clientX;
      endY = e.clientY;
      
      const left = Math.min(startX, endX);
      const top = Math.min(startY, endY);
      const width = Math.abs(endX - startX);
      const height = Math.abs(endY - startY);
      
      if (width > 10 && height > 10) {
        captureSelectedArea(left, top, width, height);
      } else {
        cancelCapture();
      }
      
      if (selectionBox) {
        selectionBox.remove();
        selectionBox = null;
      }
    });
  }

  function captureSelectedArea(left, top, width, height) {
    console.log('CONTENT: 📸 Capturing area:', left, top, width, height);
    
    if (captureOverlay) {
      captureOverlay.style.display = 'none';
    }
    
    setTimeout(() => {
      chrome.runtime.sendMessage({
        action: 'captureTab',
        area: { left, top, width, height }
      }).then((response) => {
        if (response.error) {
          console.error('CONTENT: ❌ Capture failed:', response.error);
          createFallbackCapture(left, top, width, height);
        } else {
          console.log('CONTENT: ✅ Tab captured successfully');
          cropAndSendImage(response.dataUrl, left, top, width, height);
        }
      }).catch((error) => {
        console.error('CONTENT: ❌ Capture message failed:', error);
        createFallbackCapture(left, top, width, height);
      });
    }, 200);
  }

  function cropAndSendImage(dataUrl, left, top, width, height) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = width;
    canvas.height = height;
    
    const img = new Image();
    img.onload = () => {
      try {
        const dpr = window.devicePixelRatio || 1;
        
        ctx.drawImage(
          img,
          left * dpr, top * dpr, width * dpr, height * dpr,
          0, 0, width, height
        );
        
        canvas.toBlob((blob) => {
          cleanupCapture();
          restoreSidebarAfterCapture();
          
          setTimeout(() => {
            sendImageToSidebar(blob);
          }, 400);
        }, 'image/png');
        
      } catch (error) {
        console.error('CONTENT: Error cropping:', error);
        createFallbackCapture(left, top, width, height);
      }
    };
    
    img.src = dataUrl;
  }

  function createFallbackCapture(left, top, width, height) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = width;
    canvas.height = height;
    
    // Create gradient background
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#f8f9fa');
    gradient.addColorStop(1, '#e9ecef');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Add border
    ctx.strokeStyle = '#dee2e6';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, width-2, height-2);
    
    // Add text
    ctx.fillStyle = '#495057';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('📷', width/2, height/2 - 30);
    
    ctx.font = 'bold 16px Arial';
    ctx.fillText('Fashion Item Captured', width/2, height/2 + 10);
    
    canvas.toBlob((blob) => {
      cleanupCapture();
      restoreSidebarAfterCapture();
      
      setTimeout(() => {
        sendImageToSidebar(blob);
      }, 400);
    }, 'image/png');
  }

  function sendImageToSidebar(blob) {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (sidebarIframe && sidebarIframe.contentWindow) {
        sidebarIframe.contentWindow.postMessage({
          action: 'setImage',
          imageData: e.target.result
        }, '*');
      }
    };
    reader.readAsDataURL(blob);
  }

  console.log('CONTENT: ✅ Content script initialization complete');
}