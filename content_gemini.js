console.log("Google AI Companion: Gemini Module Loaded (v3.0.0-alpha.2)");
console.log("Current URL:", window.location.href);

// --- Global State ---
let state = {
  folders: [
    { id: 'all', name: '全部', type: 'system' }
  ],
  fileMappings: {}, // conversationId -> [folderId]
  sharedGems: [],   // [{ id: string, name: string, url: string }]
  activeFolderId: 'all',
  currentMenuContext: null, // { id: string, title: string }
};

// --- Initialization ---
function init() {
  loadData(() => {
    startObserver();
    setupGlobalClickListener();
    setupAutoPinObserver();
    
    // Watch for URL changes (SPA)
    let lastUrl = window.location.href;
    setInterval(() => {
        if (window.location.href !== lastUrl) {
            lastUrl = window.location.href;
            setupAutoPinObserver();
        }
    }, 2000);
  });
}

// --- Auto-Pin Shared Gems ---
function setupAutoPinObserver() {
    const url = window.location.href;
    // Only trigger auto-pin if it's a shared Gem link (contains usp=sharing)
    if (!url.includes('gemini.google.com/gem/') || !url.includes('usp=sharing')) return;

    const gemId = url.split('/gem/')[1].split('?')[0];
    DOMService.log(`[Name-Search] Started search for Gem: ${gemId}`);
    
    const isInvalidName = (name) => {
        if (!name) return true;
        const lower = name.toLowerCase();
        return lower === 'gemini' || lower === 'google gemini' || lower === 'untitled' || lower === 'loading...' || lower === 'chats' || lower === 'chat';
    };

    const updateGemName = (name) => {
        if (isInvalidName(name)) return false;
        
        const existingIdx = state.sharedGems.findIndex(g => g.id === gemId);
        if (existingIdx >= 0) {
            // Self-Correction: If current name is generic, update it
            if (isInvalidName(state.sharedGems[existingIdx].name)) {
                DOMService.log(`[Name-Search] Correcting name: ${state.sharedGems[existingIdx].name} -> ${name}`);
                state.sharedGems[existingIdx].name = name;
                saveData();
                renderSharedGems();
                return true;
            }
            return false; // Already have a good name
        } else {
            // New Pin
            DOMService.log(`[Name-Search] Auto-pinning: ${name}`);
            state.sharedGems.push({ id: gemId, name: name, url: url });
            saveData();
            renderSharedGems();
            return true;
        }
    };

    // 1. Try Script Data (Fastest)
    const initialData = document.getElementById('bard-initial-data');
    if (initialData) {
        try {
            const text = initialData.textContent;
            // Usually contains titles in quotes. This is a heuristic regex.
            const match = text.match(/"([^"]{3,100})"/); 
            // Better to just monitor DOM as script parsing is risky without schema
        } catch(e) {}
    }

    // 2. Continuous Observer
    let attempts = 0;
    const observer = new MutationObserver((mutations, obs) => {
        attempts++;
        
        // Strategy A: DOM elements
        const nameEl = document.querySelector('.bot-name-container-animation-box, .bot-name-container, h1');
        const nameFromDOM = nameEl ? nameEl.textContent.trim() : '';
        
        // Strategy B: Document Title (often updated by Gemini)
        const nameFromTitle = document.title.replace('Google Gemini', '').replace('- Gemini', '').trim();

        if (updateGemName(nameFromDOM)) {
            obs.disconnect();
            return;
        }
        
        if (updateGemName(nameFromTitle)) {
            obs.disconnect();
            return;
        }

        if (attempts > 100) { // Stop after ~10-20 seconds
            obs.disconnect();
            DOMService.log(`[Name-Search] Search timed out for ${gemId}`);
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

// --- Data Management ---
function loadData(callback) {
  chrome.storage.local.get(['gemini_folders', 'gemini_mappings', 'gemini_shared_gems'], (result) => {
    if (result.gemini_folders) {
      state.folders = result.gemini_folders;
    } else {
      state.folders = [{ id: 'all', name: '全部', type: 'system' }];
      saveData();
    }
    
    if (result.gemini_mappings) {
      state.fileMappings = result.gemini_mappings;
    } else {
      state.fileMappings = {};
    }

    if (result.gemini_shared_gems) {
      state.sharedGems = result.gemini_shared_gems;
    } else {
      state.sharedGems = [];
    }
    
    if (callback) callback();
  });
}

function saveData() {
  chrome.storage.local.set({
    'gemini_folders': state.folders,
    'gemini_mappings': state.fileMappings,
    'gemini_shared_gems': state.sharedGems
  });
}

// --- DOM Observer ---
function startObserver() {
  const observer = new MutationObserver((mutations) => {
    let shouldInjectSidebar = false;
    let shouldInjectMenu = false;

    mutations.forEach(mutation => {
      // 1. Sidebar Injection Check
      if (!document.querySelector('.nlm-folder-container')) {
        shouldInjectSidebar = true;
      }
      
      // 2. Menu Injection Check
      if (mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1 && node.classList && node.classList.contains('cdk-overlay-container')) {
             shouldInjectMenu = true;
          }
          // Also check direct children of overlay pane if container already exists
          if (node.nodeType === 1 && node.classList && node.classList.contains('conversation-actions-menu')) {
             injectMenuItem(node);
          }
        });
      }
    });

    if (shouldInjectSidebar) {
        const nav = findSidebarNav();
        if (nav) {
            injectFolderUI(nav);
        }
    }
    
    // 3. Position Check (Fix for shifting UI)
    // Always ensure folder is AFTER Gems if Gems exist
    ensureFolderPosition();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  // Fallback Polling
  const pollTimer = setInterval(() => {
      if (!document.querySelector('.nlm-folder-container')) {
          const nav = findSidebarNav();
          if (nav) {
              DOMService.log("Sidebar found via polling!");
              injectFolderUI(nav);
          }
      } else {
          // Also check position during polling
          ensureFolderPosition();
      }
  }, 1000);
}

function ensureFolderPosition() {
    const container = document.querySelector('.nlm-folder-container');
    if (!container) return;
    
    // Find Gems List
    const gemsList = document.querySelector('.gems-list-container, [data-test-id="gems-list"]');
    if (!gemsList) return; // If no Gems, we don't force position (assume it's correct or Gems not loaded)
    
    // Check if Gems List is actually in the DOM and visible
    if (!gemsList.isConnected) return;

    // We want container to be AFTER gemsList
    // Check if container is already immediately after gemsList (ignoring comments/text)
    // Simplified: Just check if container.previousElementSibling === gemsList
    // But there might be comments.
    
    // Strategy: If gemsList is NOT before container, move container.
    // Or if container is BEFORE gemsList (position mismatch).
    
    // Compare document position
    const position = gemsList.compareDocumentPosition(container);
    
    // DOCUMENT_POSITION_FOLLOWING (4) means container is after gemsList.
    // If NOT following (e.g. preceding 2, or disconnected), we need to move.
    if (!(position & Node.DOCUMENT_POSITION_FOLLOWING)) {
        DOMService.log("Position Mismatch: Folder is NOT after Gems. Fixing...");
        
        // Move container to: insertBefore(gemsList.nextSibling)
        // This effectively appends it after Gems
        if (gemsList.nextSibling) {
            gemsList.parentNode.insertBefore(container, gemsList.nextSibling);
        } else {
            gemsList.parentNode.appendChild(container);
        }
    }
}

function findSidebarNav() {
     // Strategy 1: "Gems-First" approach (User requested: insert between Gems and Chats)
     // Try to find the Gems list container
     const gemsList = document.querySelector('.gems-list-container, [data-test-id="gems-list"]');
     if (gemsList) {
         DOMService.log("Found sidebar via 'gems-list-container'");
         // We want to insert AFTER the Gems list.
         // But since insertBefore is the standard API, we look for the element AFTER Gems.
         // In Gemini DOM, there are often comment nodes (<!---->) after Gems.
         // We should insert before the next visible element (like Chat History) or just append after Gems.
         // A safe bet is to return the Gems list, and let injectFolderUI handle "insertAfter" logic,
         // OR return the Chat History and rely on "insertBefore".
         
         // However, the user specifically mentioned "between Gems and Chats".
         // The previous implementation inserted BEFORE Chat History.
         // If we want to be "between", and there are comment nodes, 
         // inserting BEFORE Chat History puts us AFTER the comment nodes (usually).
         // Unless the comment nodes are inside the Chat History container? No, they are siblings.
         
         // Let's look for Chat History again, but this time check its siblings.
     }

     // Strategy 2: Target the .chat-history container specifically
     // This is the container for the chat list, we want to insert BEFORE it.
     const chatHistory = document.querySelector('.chat-history, [data-test-id="chat-history-list"]');
     if (chatHistory) {
         DOMService.log("Found sidebar via '.chat-history'");
         return chatHistory; 
     }
     
     // 3. Try Voyager's selector as fallback
     const recentChats = document.querySelector('expandable-list-item, [data-test-id="recent-chats-list"]');
     if (recentChats) {
         DOMService.log("Found sidebar via 'recent-chats-list' (Fallback)");
         return recentChats.parentElement; 
     }
     
     return null;
 }

 // --- Sidebar UI ---
 function injectFolderUI(targetElement) {
   if (document.querySelector('.nlm-folder-container')) return;
   
   DOMService.log("Injecting Folder UI into Gemini Sidebar...");
 
   const container = document.createElement('div');
   container.className = 'nlm-folder-container gemini-folder-container'; // Add gemini specific class
   
   // Reuse existing styles structure
  container.innerHTML = `
    <div id="nlm-shared-gems-section" style="display: none; margin-bottom: 12px;">
      <div class="nlm-folder-header">
        <span>共享给我的 Gem</span>
      </div>
      <ul class="nlm-folder-list" id="gemini-shared-gems-list"></ul>
    </div>
    <div class="nlm-folder-header">
      <span>文件夹分类</span>
      <div class="nlm-header-actions">
        <button class="nlm-add-btn" title="新建文件夹">+</button>
      </div>
    </div>
    <ul class="nlm-folder-list" id="gemini-folder-list"></ul>
  `;
   
   // Insertion Logic Refined for "Between Gems and Chats"
   // targetElement is currently '.chat-history' (Strategy 2) or parent of recent chats (Strategy 3)
   
   if (targetElement && targetElement.parentElement) {
       // Check if we can find a better anchor point (e.g., Gems list)
       const gemsList = targetElement.parentElement.querySelector('.gems-list-container');
       
       if (gemsList) {
           // If Gems list exists, we try to insert AFTER it.
           // The safest way to "insert after" is to insertBefore the next sibling of Gems.
           // But if Gems and Chat History are separated by comments, we want to be careful.
           
           // User's observation: "Insert between Gems and Chats (between the exclamation marks)"
           // Simply inserting before Chat History usually achieves this visually.
           // But if the previous logic failed (was "sticking out"), maybe we were too close?
           // Let's try to insert specifically before the targetElement (Chat History).
           // This is what we were doing.
           
           // Maybe the user wants it ABOVE the "Chats" header?
           // Does ".chat-history" include the header? usually no.
           // Let's look for a header sibling.
           
           // Heuristic: If targetElement (Chat History) has a previous sibling that is NOT Gems list,
           // maybe it's the "Chats" header or a divider.
           // Let's just insert before targetElement for now, but ensure we handle margin in CSS.
           
           // WAIT: User said "Gems List" -> "Comment" -> "Comment" -> "Folder" -> "Chat History"
           // The user wants: "Gems" -> "Folder" -> "Chats".
           // If we insertBefore(gemsList.nextSibling), we are immediately after Gems.
           
           if (gemsList.nextSibling) {
               targetElement.parentElement.insertBefore(container, gemsList.nextSibling);
               DOMService.log("Inserted AFTER Gems List");
           } else {
               targetElement.parentElement.appendChild(container); // Gems is last?
               DOMService.log("Appended AFTER Gems List");
           }
       } else {
           // Fallback: Insert before Chat History
           targetElement.parentElement.insertBefore(container, targetElement);
           DOMService.log("Inserted BEFORE Chat History (Fallback)");
       }
   } else {
       console.error("Target element has no parent, cannot insert.");
   }
   
   // Bind Events
  container.querySelector('.nlm-add-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    const name = prompt("新建文件夹名称:");
    if (name) {
      state.folders.push({ id: Date.now().toString(), name: name, type: 'user' });
      saveData();
      renderFolders();
    }
  });

  // Auto-hide on collapse (Sidebar Squeeze Fix)
  // We observe the parent of the container (which is inside the sidebar)
  // Or the grand-parent if needed. 
  // Gemini sidebar usually collapses by reducing width.
  const sidebarContainer = targetElement.parentElement;
  if (sidebarContainer) {
      const resizeObserver = new ResizeObserver(entries => {
          for (let entry of entries) {
              // Gemini collapsed sidebar is usually very narrow (e.g. 72px or 80px)
              // Expanded is usually > 200px.
              // We pick a safe threshold, e.g. 150px.
              if (entry.contentRect.width < 150) {
                  container.style.display = 'none';
              } else {
                  container.style.display = 'block';
              }
          }
      });
      resizeObserver.observe(sidebarContainer);
  }
  
  renderSharedGems();
  renderFolders();
}

function renderSharedGems() {
    const section = document.getElementById('nlm-shared-gems-section');
    const list = document.getElementById('gemini-shared-gems-list');
    if (!section || !list) return;

    // Check if current page is a shared Gem not yet pinned
    const url = window.location.href;
    const isSharedLink = url.includes('gemini.google.com/gem/') && url.includes('usp=sharing');
    const gemId = isSharedLink ? url.split('/gem/')[1].split('?')[0] : null;
    const alreadyPinned = gemId ? state.sharedGems.some(g => g.id === gemId) : false;

    if (state.sharedGems.length === 0 && !isSharedLink) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';
    list.innerHTML = '';

    // 1. Add "Pin Current Gem" button if applicable
    if (isSharedLink && !alreadyPinned) {
        const pinBtn = document.createElement('li');
        pinBtn.className = 'nlm-folder-item pin-current-btn';
        pinBtn.style.border = '1px dashed #1a73e8';
        pinBtn.style.color = '#1a73e8';
        pinBtn.style.justifyContent = 'center';
        pinBtn.style.marginBottom = '8px';
        pinBtn.innerHTML = `
            <span style="font-weight: 500;">+ 固定当前 Gem</span>
        `;
        pinBtn.addEventListener('click', () => {
            // Trigger the auto-pin logic manually with PROMPT
            // First, try to guess the name
            let defaultName = document.title.replace('Google Gemini', '').replace('- Gemini', '').trim();
            const nameEl = document.querySelector('.bot-name-container-animation-box, .bot-name-container, h1');
            if (nameEl && nameEl.textContent.trim()) defaultName = nameEl.textContent.trim();
            
            if (defaultName.toLowerCase() === 'chats' || defaultName.toLowerCase() === 'gemini') defaultName = '';
            
            const name = prompt("请输入 Gem 名称:", defaultName);
            if (name && name.trim()) {
                state.sharedGems.push({ id: gemId, name: name.trim(), url: window.location.href });
                saveData();
                renderSharedGems();
            }
        });
        list.appendChild(pinBtn);
    }

    // 2. Render all shared Gems
    state.sharedGems.forEach(gem => {
        const li = document.createElement('li');
        li.className = 'nlm-folder-item';
        
        li.innerHTML = `
            <svg class="nlm-icon" viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm4.24 16L12 15.45 7.76 18l1.12-4.81-3.73-3.23 4.92-.42L12 5l1.93 4.53 4.92.42-3.73 3.23L16.23 18z"/></svg>
            <span class="nlm-folder-name" title="${gem.name}">${gem.name}</span>
            <div class="nlm-folder-actions">
              <button class="nlm-more-btn" title="更多操作">
                <svg viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
              </button>
            </div>
        `;

        li.addEventListener('click', (e) => {
            if (e.target.closest('.nlm-more-btn')) return;
            window.location.href = gem.url;
        });

        const moreBtn = li.querySelector('.nlm-more-btn');
        moreBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showSharedGemMenu(e, gem.id);
        });

        list.appendChild(li);
    });
}

function showSharedGemMenu(event, gemId) {
    // Remove existing menus
    document.querySelectorAll('.nlm-context-menu').forEach(m => m.remove());

    const menu = document.createElement('div');
    menu.className = 'nlm-context-menu';
    menu.innerHTML = `
        <div class="nlm-context-menu-item rename">
            <svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
            <span>重命名</span>
        </div>
        <div class="nlm-context-menu-item delete">
            <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
            <span>移除此共享 Gem</span>
        </div>
    `;

    // Position menu near the button
    const rect = event.target.closest('button').getBoundingClientRect();
    menu.style.position = 'fixed';
    menu.style.top = `${rect.bottom + 5}px`;
    menu.style.left = `${rect.left - 120}px`;
    menu.style.zIndex = '10000';

    menu.querySelector('.rename').addEventListener('click', () => {
        const gem = state.sharedGems.find(g => g.id === gemId);
        if (gem) {
            const newName = prompt("重命名 Gem:", gem.name);
            if (newName && newName.trim()) {
                gem.name = newName.trim();
                saveData();
                renderSharedGems();
            }
        }
        menu.remove();
    });

    menu.querySelector('.delete').addEventListener('click', () => {
        state.sharedGems = state.sharedGems.filter(g => g.id !== gemId);
        saveData();
        renderSharedGems();
        menu.remove();
    });

    document.body.appendChild(menu);

    // Close menu when clicking outside
    const closeMenu = (e) => {
        if (!menu.contains(e.target)) {
            menu.remove();
            document.removeEventListener('click', closeMenu);
        }
    };
    setTimeout(() => document.addEventListener('click', closeMenu), 0);
}

function checkAndAddPinButton() {
    // Deprecated: Logic moved to renderSharedGems sidebar
}

// --- Debugging ---
const DOMService = {
  debug: true,
  logBuffer: [],
  log(message, data = null) {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message} ${data ? JSON.stringify(data) : ''}`;
    if (this.debug) {
      if (data) console.log(`[Gemini-DOM] ${message}`, data);
      else console.log(`[Gemini-DOM] ${message}`);
    }
    this.logBuffer.unshift(logEntry);
    if (this.logBuffer.length > 50) this.logBuffer.pop();
  }
};

// Visual Connectivity Test (Red Box) - REMOVED
// function showDebugBox() { ... }
// showDebugBox();

// --- Message Listener for Popup ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getLogs") {
    sendResponse({ logs: DOMService.logBuffer });
  }
});


// --- Renaming Logic ---
function enableRenaming(folderId, spanElement, currentName) {
  const input = document.createElement('input');
  input.type = 'text';
  input.value = currentName;
  input.className = 'nlm-folder-rename-input';
  input.style.width = '100px';
  input.style.padding = '2px 4px';
  input.style.border = '1px solid #1a73e8';
  input.style.borderRadius = '4px';
  input.style.fontSize = '14px';
  
  // Replace span with input
  spanElement.replaceWith(input);
  input.focus();
  input.select();
  
  const save = () => {
    const newName = input.value.trim();
    if (newName && newName !== currentName) {
      const folder = state.folders.find(f => f.id === folderId);
      if (folder) {
        folder.name = newName;
        saveData();
      }
    }
    renderFolders(); // Re-render to restore span
  };
  
  input.addEventListener('blur', save);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      save();
    } else if (e.key === 'Escape') {
      renderFolders(); // Cancel
    }
  });
  
  input.addEventListener('click', e => e.stopPropagation());
}

function renderFolders() {
  const list = document.getElementById('gemini-folder-list');
  if (!list) return;
  list.innerHTML = '';
  
  state.folders.forEach(folder => {
    const li = document.createElement('li');
    li.className = `nlm-folder-item ${state.activeFolderId === folder.id ? 'active' : ''}`;
    
    let iconPath = 'M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z';
    if (folder.id === 'all') iconPath = 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z'; 
    
    let removeBtnHtml = folder.id !== 'all' ? `<span class="nlm-folder-remove" title="删除文件夹">×</span>` : '';

    li.innerHTML = `<svg class="nlm-icon" viewBox="0 0 24 24"><path d="${iconPath}"/></svg><span class="nlm-folder-name">${folder.name}</span>${removeBtnHtml}`;
    
    // Rename Event (Double Click)
    const nameSpan = li.querySelector('.nlm-folder-name');
    if (folder.id !== 'all' && nameSpan) {
        nameSpan.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            enableRenaming(folder.id, nameSpan, folder.name);
        });
    }
    
    // Delete Event
    const removeBtn = li.querySelector('.nlm-folder-remove');
    if (removeBtn) {
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm(`确定要删除文件夹 "${folder.name}" 吗？`)) {
                deleteFolder(folder.id);
            }
        });
    }

    // Filter Event
    li.addEventListener('click', (e) => {
      e.stopPropagation();
      state.activeFolderId = folder.id;
      renderFolders();
      filterConversationList(); // Implementation needed
    });
    
    list.appendChild(li);
  });
}

function deleteFolder(folderId) {
    state.folders = state.folders.filter(f => f.id !== folderId);
    Object.keys(state.fileMappings).forEach(key => {
        state.fileMappings[key] = state.fileMappings[key].filter(id => id !== folderId);
    });
    if (state.activeFolderId === folderId) state.activeFolderId = 'all';
    saveData();
    renderFolders();
    filterConversationList();
}

// --- Menu Injection & Interaction ---

// 1. Capture Context BEFORE menu opens
function setupGlobalClickListener() {
  document.addEventListener('mousedown', (e) => {
    // Look for the "Three Dots" button in Gemini sidebar
    // Strategy: 
    // 1. Check if we clicked a button
    // 2. If it's the menu trigger, it usually is inside the chat item container
    // 3. The chat item container usually has the <a href="..."> link
    
    const btn = e.target.closest('button');
    if (!btn) return;

    // Gem Guard: If the button is inside the Gems list, ignore it.
    if (btn.closest('.gems-list-container') || btn.closest('[data-test-id="gems-list"]')) {
         DOMService.log("GlobalListener: Ignored click on Gem item.");
         return;
    }

    // Gem Guard (Link Check): If the associated link is a Gem link, ignore it.
    // Usually Gem links are like /app/gem/...
    // We need to check the link associated with this button.
    let guardContainer = btn.parentElement;
    for (let i = 0; i < 5; i++) {
        if (!guardContainer) break;
        const link = guardContainer.querySelector('a[href^="/app/"]');
        if (link && link.getAttribute('href').includes('/gem/')) {
             DOMService.log("GlobalListener: Ignored click on Gem link.");
             return;
        }
        guardContainer = guardContainer.parentElement;
    }

    state.lastClickedButton = btn;

    // Check if this button is likely the "More options" button
    // It might have an aria-label or specific icon
    // But generic traversal is safer: look for a sibling or parent <a> tag
    
    // Go up to find the list item container
    // In Gemini, it's usually <div class="conversation-container"> or similar
    // Or just go up 3-4 levels and look for 'a' tag
    let container = btn.parentElement;
    let link = null;
    
    for (let i = 0; i < 5; i++) {
        if (!container) break;
        // Look for the link in this container
        link = container.querySelector('a[href^="/app/"]');
        if (link) break;
        
        // Also check if the container ITSELF is the link (rare but possible)
        if (container.tagName === 'A' && container.getAttribute('href').startsWith('/app/')) {
            link = container;
            break;
        }
        
        container = container.parentElement;
    }
    
    if (link) {
        const href = link.getAttribute('href');
        const id = href.split('/').pop();
        
        // Try to find title
        let title = 'Untitled Chat';
        const titleEl = link.querySelector('.conversation-title, .title, .label');
        if (titleEl) title = titleEl.textContent.trim();
        else {
             // Fallback: try to find any text node
             title = link.textContent.trim().substring(0, 20) + '...';
        }

        state.currentMenuContext = { id, title };
        DOMService.log(`Context Captured: ${id} - ${title}`);
    } else {
        // Only log warning if we are sure it was a menu trigger (heuristic)
        if (btn.querySelector('mat-icon') || btn.innerHTML.includes('more_vert')) {
             DOMService.log("Clicked menu button but could not find Conversation Link!");
        }
    }
  }, true); // Capture phase
}

function injectMenuItem(menuNode) {
  // 1. Context Guard: Find the button that triggered this menu
  const triggerBtn = document.querySelector('button[aria-expanded="true"]');
  if (triggerBtn) {
      // Check if button is inside the Gems list
      const isGemItem = triggerBtn.closest('.gems-list-container') || 
                        triggerBtn.closest('[data-test-id="gems-list"]') ||
                        triggerBtn.closest('.side-nav-entry-container');
      
      // Also check the link associated with this item
      let isGemLink = false;
      let container = triggerBtn.parentElement;
      for (let i = 0; i < 5; i++) {
          if (!container) break;
          const link = container.querySelector('a[href*="/gem/"]');
          if (link) {
              isGemLink = true;
              break;
          }
          container = container.parentElement;
      }

      if (isGemItem || isGemLink) {
           console.log("Gemini Extension: Blocking 'Move to folder' for Gem item.");
           return;
      }
  }

  // menuNode is likely .conversation-actions-menu
  const content = menuNode.querySelector('.mat-mdc-menu-content');
    if (!content || content.querySelector('.nlm-menu-item')) return;
    
    console.log("Injecting Gemini Menu Item...");
    
    const btn = document.createElement('button');
    btn.className = 'mat-mdc-menu-item mat-focus-indicator nlm-menu-item';
    btn.setAttribute('role', 'menuitem');
    btn.innerHTML = `
        <mat-icon role="img" class="mat-icon notranslate material-icons mat-icon-no-color" aria-hidden="true">folder</mat-icon>
        <span class="mat-mdc-menu-item-text">Move to folder</span>
    `;
    
    btn.addEventListener('click', () => {
        // Close menu
        const backdrop = document.querySelector('.cdk-overlay-backdrop');
        if (backdrop) backdrop.click();
        
        if (state.currentMenuContext) {
            showFolderSelectionModal(state.currentMenuContext);
        } else {
            alert("无法获取对话信息，请重试。");
        }
    });
    
    // Insert as first item
    content.insertBefore(btn, content.firstChild);
}

// --- Folder Selection Modal (Reused Logic) ---
function showFolderSelectionModal(context) {
  const modal = document.createElement('div');
  modal.className = 'nlm-modal-overlay';
  
  const currentFolders = state.fileMappings[context.id] || [];
  
  modal.innerHTML = `
    <div class="nlm-modal">
      <h3 class="nlm-modal-title">将 "${context.title}" 加入文件夹</h3>
      <div class="nlm-folder-select-list">
        ${state.folders.filter(f => f.id !== 'all').map(folder => `
          <label class="nlm-folder-checkbox-item">
            <input type="checkbox" value="${folder.id}" ${currentFolders.includes(folder.id) ? 'checked' : ''}>
            ${folder.name}
          </label>
        `).join('')}
      </div>
      <div class="nlm-modal-actions">
        <button class="nlm-btn" id="nlm-modal-cancel">取消</button>
        <button class="nlm-btn nlm-btn-primary" id="nlm-modal-save">保存</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  modal.querySelector('#nlm-modal-cancel').addEventListener('click', () => modal.remove());
  
  modal.querySelector('#nlm-modal-save').addEventListener('click', () => {
    const selected = Array.from(modal.querySelectorAll('input:checked')).map(cb => cb.value);
    
    state.fileMappings[context.id] = selected;
    saveData();
    modal.remove();
    filterConversationList(); // Update UI
  });
}

// --- List Filtering ---
function filterConversationList() {
    if (state.activeFolderId === 'all') {
        // Show all
        document.querySelectorAll('a[href^="/app/"]').forEach(el => {
            // Traverse up to the list item container
            // Gemini structure is likely <li> -> <a> or similar
            // We hide the container
            const container = el.closest('li') || el.parentElement;
            if (container) container.style.display = '';
        });
        return;
    }

    document.querySelectorAll('a[href^="/app/"]').forEach(el => {
        const href = el.getAttribute('href');
        const id = href.split('/').pop();
        const container = el.closest('li') || el.parentElement; // Adjust selector
        
        if (container) {
            const belongs = state.fileMappings[id] && state.fileMappings[id].includes(state.activeFolderId);
            container.style.display = belongs ? '' : 'none';
        }
    });
}

init();