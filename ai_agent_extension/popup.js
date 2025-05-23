console.log('Popup script loaded');

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('capture-btn').addEventListener('click', async () => {
    console.log('Capture button clicked');
    try {
      const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
      console.log('Current tab:', tab);
      
      // Always try to inject content script (it will handle duplicates now)
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
      console.log('Content script injected from popup');
      
      // Send message to start capture
      await chrome.tabs.sendMessage(tab.id, {action: "startCapture"});
      console.log('Start capture message sent from popup');
      
      window.close();
    } catch (error) {
      console.error('Error in popup:', error);
    }
  });
  
  const openChatBtn = document.getElementById('open-chat');
  
  openChatBtn.addEventListener('click', () => {
    // Get the current active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      
      // Send message to open sidebar
      chrome.tabs.sendMessage(activeTab.id, {
        action: 'createSidebar',
        width: 400
      }).then(() => {
        console.log('POPUP: Sidebar creation message sent');
        // Close the popup
        window.close();
      }).catch((error) => {
        console.error('POPUP: Error opening sidebar:', error);
        // Close the popup anyway
        window.close();
      });
    });
  });
});