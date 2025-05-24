export const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

// Fixed encryption utilities
async function generateKey(salt = null) {
  if (!salt) {
    salt = new Uint8Array(16);
    crypto.getRandomValues(salt);
  }
  
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode('extension-secure-storage-key'),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );
  
  return {
    key: await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    ),
    salt
  };
}

async function encryptToken(token) {
  try {
    const iv = new Uint8Array(12);
    crypto.getRandomValues(iv);
    
    const { key, salt } = await generateKey();
    const encoder = new TextEncoder();
    const encodedToken = encoder.encode(token);
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encodedToken
    );
    
    // Combine salt + iv + encrypted data
    const encryptedArray = new Uint8Array(encrypted);
    const combined = new Uint8Array(salt.length + iv.length + encryptedArray.length);
    combined.set(salt);
    combined.set(iv, salt.length);
    combined.set(encryptedArray, salt.length + iv.length);
    
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt token');
  }
}

async function decryptToken(encryptedToken) {
  try {
    const encrypted = Uint8Array.from(atob(encryptedToken), c => c.charCodeAt(0));
    
    // Extract salt, iv and data
    const salt = encrypted.slice(0, 16);
    const iv = encrypted.slice(16, 28);
    const data = encrypted.slice(28);
    
    const { key } = await generateKey(salt);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );
    
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt token');
  }
}

// Modify token handling
export async function getToken() {
  // Return dummy token since we're using Flask backend directly
  return 'flask-backend-token';
}

export async function saveToken(token) {
  const encryptedToken = await encryptToken(token);
  await browserAPI.storage.sync.set({ apiToken: encryptedToken });
}

export function getBrowserType() {
  return typeof browser !== 'undefined' ? 'firefox' : 'chrome';
}

export async function executeScript(tabId, files) {
  if (getBrowserType() === 'firefox') {
    for (const file of files) {
      await browser.tabs.executeScript(tabId, { file });
    }
  } else {
    await chrome.scripting.executeScript({
      target: { tabId },
      files
    });
  }
}

export async function connectToBackground(name) {
  return browserAPI.runtime.connect({ name });
}

export async function sendMessage(message) {
  return browserAPI.runtime.sendMessage(message);
}

export async function injectContentScript(tabId) {
  if (getBrowserType() === 'firefox') {
    await executeScript(tabId, ['browser-polyfill.js', 'content.js']);
  } else {
    await executeScript(tabId, ['content.js']);
  }
}

export async function openSidePanel() {
  try {
    if (browserAPI.sidePanel && browserAPI.sidePanel.open) {
      await browserAPI.sidePanel.open({ windowId: browserAPI.windows.WINDOW_ID_CURRENT });
    }
  } catch (error) {
    console.error('Failed to open side panel:', error);
  }
}

export async function toggleSidebar() {
  if (getBrowserType() === 'firefox') {
    try {
      // Check if sidebar exists in current window
      const currentWindow = await browser.windows.getCurrent();
      await browser.sidebarAction.close();
      // Longer delay
      await new Promise(resolve => setTimeout(resolve, 250));
      await browser.sidebarAction.open({ windowId: currentWindow.id });
    } catch (e) {
      console.error('Toggle sidebar error:', e);
      throw e;
    }
  }
}
