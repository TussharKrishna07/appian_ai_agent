console.log('BACKGROUND: Fashion Finder background script loaded');

// Global sidebar state
let globalSidebarState = {
  isOpen: false,
  width: 400
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('BACKGROUND: 📨 Received message:', request.action, 'from tab:', sender.tab?.id);

  switch (request.action) {
    case 'captureTab':
      console.log('BACKGROUND: 📸 Capturing tab with area:', request.area);
      
      chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
        if (chrome.runtime.lastError) {
          console.error('BACKGROUND: ❌ Capture error:', chrome.runtime.lastError.message);
          sendResponse({ error: chrome.runtime.lastError.message });
          return;
        }
        
        if (dataUrl) {
          console.log('BACKGROUND: ✅ Tab captured successfully');
          sendResponse({ dataUrl: dataUrl });
        } else {
          console.error('BACKGROUND: ❌ No data URL returned');
          sendResponse({ error: 'No screenshot data returned' });
        }
      });
      
      return true;

    case 'setSidebarState':
      console.log(`BACKGROUND: 🔄 Setting sidebar state from tab ${sender.tab?.id}:`, request.isOpen);
      const previousState = globalSidebarState.isOpen;
      
      globalSidebarState.isOpen = request.isOpen;
      globalSidebarState.width = request.width || 400;
      
      console.log('BACKGROUND: ✅ Global state updated:', globalSidebarState);
      
      // If sidebar was closed AND it's a manual close, notify ALL other tabs to close their sidebars
      if (!request.isOpen && previousState && request.manualClose === true) {
        console.log('BACKGROUND: 🔄 Manual sidebar close detected, notifying ALL tabs to close');
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach(tab => {
            if (tab.id !== sender.tab?.id) {
              chrome.tabs.sendMessage(tab.id, { 
                action: 'globalSidebarStateChanged',
                isOpen: false,
                width: globalSidebarState.width,
                manualClose: true  // Pass the manual close flag
              }).then(() => {
                console.log(`BACKGROUND: ✅ Manual close message sent to tab ${tab.id}`);
              }).catch((error) => {
                console.log(`BACKGROUND: ❌ Error sending manual close message to tab ${tab.id}:`, error.message);
              });
            }
          });
        });
      }
      
      sendResponse({ success: true });
      break;

    case 'getSidebarState':
      console.log('BACKGROUND: 📊 Getting global sidebar state:', globalSidebarState);
      sendResponse(globalSidebarState);
      break;

    case 'contentScriptReady':
      console.log('BACKGROUND: 🎯 Content script ready in tab:', sender.tab?.id);
      console.log('BACKGROUND: Current global sidebar state:', globalSidebarState);
      
      // Always send the current state to the newly loaded content script
      sendResponse({ sidebarState: globalSidebarState });
      
      // If sidebar should be open, send create message after a delay
      if (globalSidebarState.isOpen) {
        console.log('BACKGROUND: 📂 Sidebar should be open, sending create message');
        setTimeout(() => {
          chrome.tabs.sendMessage(sender.tab.id, {
            action: 'createSidebar',
            width: globalSidebarState.width
          }).catch((error) => {
            console.log('BACKGROUND: ❌ Error sending create sidebar message:', error.message);
          });
        }, 300);
      }
      break;

    default:
      console.log('BACKGROUND: ❓ Unknown action:', request.action);
      sendResponse({ error: 'Unknown action' });
  }
  
  return true;
});

// Handle extension icon click - ONLY toggle sidebar
chrome.action.onClicked.addListener((tab) => {
  console.log('BACKGROUND: 🎯 Extension icon clicked - toggling sidebar for tab:', tab.id);
  console.log('BACKGROUND: Current global state:', globalSidebarState);
  
  if (globalSidebarState.isOpen) {
    // Close sidebar globally with manual close flag
    console.log('BACKGROUND: ❌ Closing sidebar globally (MANUAL)');
    globalSidebarState.isOpen = false;
    
    // Notify ALL tabs to close their sidebars with manual close flag
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tabItem => {
        chrome.tabs.sendMessage(tabItem.id, { 
          action: 'globalSidebarStateChanged',
          isOpen: false,
          width: globalSidebarState.width,
          manualClose: true  // This is a manual close
        }).then(() => {
          console.log(`BACKGROUND: ✅ Manual close message sent to tab ${tabItem.id}`);
        }).catch((error) => {
          console.log(`BACKGROUND: ❌ Error sending manual close message to tab ${tabItem.id}:`, error.message);
        });
      });
    });
  } else {
    // Open sidebar globally
    console.log('BACKGROUND: 📂 Opening sidebar globally');
    globalSidebarState.isOpen = true;
    
    // First notify ALL tabs about the state change
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tabItem => {
        chrome.tabs.sendMessage(tabItem.id, { 
          action: 'globalSidebarStateChanged',
          isOpen: true,
          width: globalSidebarState.width
        }).then(() => {
          console.log(`BACKGROUND: ✅ Open state message sent to tab ${tabItem.id}`);
        }).catch((error) => {
          console.log(`BACKGROUND: ❌ Error sending state message to tab ${tabItem.id}:`, error.message);
          
          // Try injecting content script if message failed
          if (tabItem.id === tab.id) {
            console.log('BACKGROUND: 🔄 Trying to inject content script...');
            chrome.scripting.executeScript({
              target: { tabId: tabItem.id },
              files: ['content.js']
            }).then(() => {
              console.log('BACKGROUND: ✅ Content script injected, trying again...');
              setTimeout(() => {
                chrome.tabs.sendMessage(tabItem.id, { 
                  action: 'createSidebar',
                  width: globalSidebarState.width
                }).catch((retryError) => {
                  console.error('BACKGROUND: ❌ Retry failed:', retryError);
                });
              }, 500);
            }).catch((injectError) => {
              console.error('BACKGROUND: ❌ Script injection failed:', injectError);
            });
          }
        });
      });
    });
  }
});

// Listen for tab updates (navigation) - restore sidebar if needed
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && globalSidebarState.isOpen) {
    console.log(`BACKGROUND: 🔄 Tab ${tabId} completed loading, checking if sidebar should be restored`);
    
    setTimeout(() => {
      chrome.tabs.sendMessage(tabId, {
        action: 'globalSidebarStateChanged',
        isOpen: true,
        width: globalSidebarState.width
      }).then(() => {
        console.log(`BACKGROUND: ✅ Sidebar restoration message sent to tab ${tabId}`);
      }).catch((error) => {
        console.log(`BACKGROUND: ❌ Tab ${tabId} restoration failed:`, error.message);
      });
    }, 1000); // Longer delay for page navigation
  }
});

// Listen for tab activation - ensure sidebar appears if it should be open
chrome.tabs.onActivated.addListener((activeInfo) => {
  if (globalSidebarState.isOpen) {
    console.log(`BACKGROUND: 🎯 Tab ${activeInfo.tabId} activated, ensuring sidebar is shown`);
    
    setTimeout(() => {
      chrome.tabs.sendMessage(activeInfo.tabId, {
        action: 'globalSidebarStateChanged',
        isOpen: true,
        width: globalSidebarState.width
      }).catch((error) => {
        console.log(`BACKGROUND: ❌ Tab ${activeInfo.tabId} activation sync failed:`, error.message);
      });
    }, 200);
  }
});

console.log('BACKGROUND: ✅ Background script initialization complete');