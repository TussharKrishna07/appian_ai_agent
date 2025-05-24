// This file is no longer needed since we're using Flask backend
// But keeping it to avoid import errors, making it a simple stub

// Simple stub to prevent import errors - all functionality moved to background.js
class Client {
  constructor(config = {}) {
    console.log('Client is deprecated - using Flask backend via background script');
  }

  async createChatCompletion(params) {
    throw new Error('Client is deprecated - use browserAPI.runtime.sendMessage() with action: "sendToAPI"');
  }
}

export default Client;