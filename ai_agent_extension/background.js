const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

const rateLimiter = {
  lastRequest: 0,
  minDelay: 1000, // 1 second between requests
  pendingRequests: new Map()
};

async function sendToAPI(content, imageData = null, threadId = 1) {
  // Check if this exact request is already pending
  const requestKey = content.trim();
  if (rateLimiter.pendingRequests.has(requestKey)) {
    return rateLimiter.pendingRequests.get(requestKey);
  }

  // Implement rate limiting
  const now = Date.now();
  if (now - rateLimiter.lastRequest < rateLimiter.minDelay) {
    return { success: false, error: 'Please wait a moment before sending another request.' };
  }
  rateLimiter.lastRequest = now;

  // Create a new promise for this request
  const requestPromise = (async () => {
    try {
      if (!content.trim() && !imageData) {
        throw new Error('Please enter some text or upload an image.');
      }

      // Prepare FormData for Flask backend
      const formData = new FormData();
      
      if (content.trim()) {
        formData.append('message', content);
      }

      formData.append('thread_id', threadId.toString());

      if (imageData) {
        // Convert base64 data URL to blob
        const base64Data = imageData.data.split(',')[1]; // Remove data:image/jpeg;base64, prefix
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: imageData.type });
        
        // Append as file with proper filename
        formData.append('image', blob, imageData.name);
      }

      const response = await fetch('http://127.0.0.1:5000/chat', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      return { success: true, message: data.reply };
    } catch (error) {
      return { 
        success: false, 
        error: error.message
      };
    } finally {
      // Clean up the pending request
      rateLimiter.pendingRequests.delete(requestKey);
    }
  })();

  // Store the promise in pending requests
  rateLimiter.pendingRequests.set(requestKey, requestPromise);
  return requestPromise;
}

async function captureScreenArea(tabId, captureData) {
  try {
    console.log('Capturing screen area:', captureData);
    
    // Capture the visible tab
    const dataUrl = await chrome.tabs.captureVisibleTab(null, {
      format: 'png',
      quality: 100
    });

    console.log('Tab captured, cropping image...');

    // Create a canvas using OffscreenCanvas (available in service workers)
    const canvas = new OffscreenCanvas(captureData.width, captureData.height);
    const ctx = canvas.getContext('2d');

    // Create ImageBitmap from the captured data URL
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const imageBitmap = await createImageBitmap(blob);

    // Account for device pixel ratio
    const ratio = captureData.devicePixelRatio;
    const cropX = captureData.left * ratio;
    const cropY = captureData.top * ratio;
    const cropWidth = captureData.width * ratio;
    const cropHeight = captureData.height * ratio;

    console.log('Cropping with dimensions:', { cropX, cropY, cropWidth, cropHeight });

    // Set canvas size to the cropped area
    canvas.width = cropWidth;
    canvas.height = cropHeight;

    // Draw the cropped portion
    ctx.drawImage(
      imageBitmap,
      cropX, cropY, cropWidth, cropHeight,
      0, 0, cropWidth, cropHeight
    );

    // Convert canvas to blob and then to data URL
    const croppedBlob = await canvas.convertToBlob({ type: 'image/png' });
    const reader = new FileReader();
    
    return new Promise((resolve) => {
      reader.onload = () => {
        console.log('Image cropped successfully, sending to popup');
        resolve({
          success: true,
          imageData: {
            data: reader.result,
            type: 'image/png',
            name: 'screen-capture.png'
          }
        });
      };
      
      reader.onerror = () => {
        console.error('Failed to convert blob to data URL');
        resolve({
          success: false,
          error: 'Failed to process captured image'
        });
      };
      
      reader.readAsDataURL(croppedBlob);
    });

  } catch (error) {
    console.error('Capture error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);
  
  if (request.action === 'sendToAPI') {
    sendToAPI(request.content, request.image, request.thread_id)
      .then(sendResponse)
      .catch(error => {
        sendResponse({ 
          success: false, 
          error: error.message || 'API request failed'
        });
      });
    return true; // Required for async response
  } else if (request.action === 'captureScreen') {
    console.log('Processing capture screen request');
    captureScreenArea(sender.tab.id, request.data)
      .then(result => {
        console.log('Capture result:', result);
        sendResponse(result);
        
        if (result.success) {
          // Send the captured image to the popup
          console.log('Broadcasting captured image to popup');
          chrome.runtime.sendMessage({
            action: 'capturedImage',
            imageData: result.imageData
          }).catch(error => {
            console.log('No popup listening, that\'s normal');
          });
        }
      })
      .catch(error => {
        console.error('Capture error:', error);
        sendResponse({
          success: false,
          error: error.message
        });
      });
    return true;
  } else if (request.action === 'startCapture') {
    // Forward to content script
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {action: 'startCapture'}, sendResponse);
      }
    });
    return true;
  }
});

// Handle extension icon click
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.url.startsWith('chrome://') || tab.url.startsWith('about:')) {
    return;
  }
  
  try {
    await chrome.sidePanel.open({ tabId: tab.id });
  } catch (error) {
    console.error('Failed to open panel:', error);
    chrome.windows.create({
      url: 'src/popup.html',
      type: 'popup',
      width: 400,
      height: 600
    });
  }
});

// Initialize sidebar on install for Firefox
function getBrowserType() {
  return typeof browser !== 'undefined' ? 'firefox' : 'chrome';
}

if (getBrowserType() === 'firefox') {
  browser.runtime.onInstalled.addListener(() => {
    browser.sidebarAction.open();
  });
}