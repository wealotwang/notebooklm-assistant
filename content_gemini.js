console.log("Google AI Companion: Gemini Module Loaded (v3.0.0-alpha.2)");
console.log("Current URL:", window.location.href);

// --- Global State ---
let state = {
  folders: [
    { id: 'all', name: '全部', type: 'system' }
  ],
  fileMappings: {}, // conversationId -> [folderId]
  activeFolderId: 'all',
  currentMenuContext: null, // { id: string, title: string }
};

// --- Initialization ---
function init() {
  loadData(() => {
    startObserver();
    setupGlobalClickListener();
  });
}

// --- Data Management ---
function loadData(callback) {
  chrome.storage.local.get(['gemini_folders', 'gemini_mappings'], (result) => {
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
    
    if (callback) callback();
  });
}

function saveData() {
  chrome.storage.local.set({
    'gemini_folders': state.folders,
    'gemini_mappings': state.fileMappings
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
        } else {
            // DOMService.log("Sidebar Nav not found yet.");
        }
    }
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
              // Don't clear interval, user might navigate away and back
          }
      }
  }, 1000);
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
   
   renderFolders();
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

// Visual Connectivity Test (Red Box)
function showDebugBox() {
    const box = document.createElement('div');
    box.style.position = 'fixed';
    box.style.top = '10px';
    box.style.right = '10px';
    box.style.width = '20px';
    box.style.height = '20px';
    box.style.backgroundColor = 'red';
    box.style.zIndex = '999999';
    box.title = 'Gemini Module Active';
    box.style.pointerEvents = 'none';
    document.body.appendChild(box);
    DOMService.log("Debug Box Injected");
}

showDebugBox();

// --- Message Listener for Popup ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getLogs") {
    sendResponse({ logs: DOMService.logBuffer });
  }
});


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

    li.innerHTML = `<svg class="nlm-icon" viewBox="0 0 24 24"><path d="${iconPath}"/></svg><span>${folder.name}</span>${removeBtnHtml}`;
    
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

// 2. Inject Menu Item
function injectMenuItem(menuNode) {
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