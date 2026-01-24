console.log("NotebookLM Folder Manager: Loaded v2.1.17 (Checkbox-First Traversal)");

// --- 全局状态 ---
let state = {
  folders: [
    { id: 'all', name: '全部', type: 'system' }
  ],
  fileMappings: {},
  activeFolderId: 'all',
  currentMenuFile: null, // 当前正在操作菜单的文件名
  isBatchMode: false,
  selectedBatchFiles: new Set(),
  currentNotebookId: null // 当前笔记本ID
};

// --- 初始化 ---
function init() {
  state.currentNotebookId = getNotebookId();
  console.log(`NotebookLM Folder Manager: Initializing for notebook "${state.currentNotebookId || 'global'}"`);
  
  loadData(() => {
    startObserver();
    setupGlobalClickListener(); // 监听全局点击以捕获菜单
    setupNavigationListener(); // 监听路由变化
  });
}

// --- 路由监听 (SPA) ---
function setupNavigationListener() {
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      const newId = getNotebookId();
      if (newId !== state.currentNotebookId) {
        console.log(`NotebookLM Extension: Notebook changed from ${state.currentNotebookId} to ${newId}`);
        state.currentNotebookId = newId;
        // 重置 UI 状态
        state.activeFolderId = 'all';
        state.isBatchMode = false;
        state.selectedBatchFiles.clear();
        
        // 重新加载数据
        loadData(() => {
          // 清除旧的 UI
          const container = document.querySelector('.nlm-folder-container');
          if (container) container.remove();
          
          // 重新渲染会由 startObserver 中的检查逻辑触发，或者我们可以手动触发一次
          // 但 startObserver 会检测到没有 container 并重新注入
          // 为了更稳健，手动触发一次注入检查
          const injectionPoint = findInjectionPoint();
          if (injectionPoint) {
             injectFolderUI(injectionPoint);
          }
        });
      }
    }
  }).observe(document, {subtree: true, childList: true});
}

function getNotebookId() {
  const match = window.location.pathname.match(/\/notebook\/([a-zA-Z0-9-]+)/);
  return match ? match[1] : null;
}

function loadData(callback) {
  const notebookId = state.currentNotebookId;
  // 如果没有 notebookId (比如在主页)，我们可能不加载或者加载全局？
  // 暂时策略：如果没有 ID，加载一个空的或全局的。但用户说是在笔记本内。
  // 我们使用带前缀的 key。
  
  const foldersKey = notebookId ? `nlm_folders_${notebookId}` : 'nlm_folders_global';
  const mappingsKey = notebookId ? `nlm_mappings_${notebookId}` : 'nlm_mappings_global';

  chrome.storage.local.get([foldersKey, mappingsKey], (result) => {
    if (result[foldersKey]) {
      state.folders = result[foldersKey];
    } else {
      // 初始化默认文件夹 (每个新笔记本都是空的，除了"全部")
      state.folders = [
        { id: 'all', name: '全部', type: 'system' }
        // 不再预置 "产品Wiki" 等，保持干净
      ];
      saveData();
    }
    
    if (result[mappingsKey]) {
      state.fileMappings = result[mappingsKey];
    } else {
      state.fileMappings = {};
    }
    
    if (callback) callback();
  });
}

function saveData() {
  const notebookId = state.currentNotebookId;
  const foldersKey = notebookId ? `nlm_folders_${notebookId}` : 'nlm_folders_global';
  const mappingsKey = notebookId ? `nlm_mappings_${notebookId}` : 'nlm_mappings_global';
  
  const data = {};
  data[foldersKey] = state.folders;
  data[mappingsKey] = state.fileMappings;
  
  chrome.storage.local.set(data);
}

// --- DOM 监听 ---
function startObserver() {
  const observer = new MutationObserver((mutations) => {
    let shouldUpdateDraggable = false;
    let shouldUpdateBatch = false;
    let shouldUpdateTags = false;
    let shouldSyncSelection = false; // New: Sync trigger

    mutations.forEach(mutation => {
      // 0. Ignore internal UI changes
      if (mutation.target.closest && (
          mutation.target.closest('.nlm-batch-toolbar') || 
          mutation.target.closest('.nlm-folder-container') ||
          mutation.target.closest('.nlm-modal-overlay') ||
          mutation.target.closest('.nlm-tags-container')
      )) return;
      
      if (mutation.target.classList && (
          mutation.target.classList.contains('nlm-batch-checkbox') ||
          mutation.target.classList.contains('nlm-file-tag')
      )) return;

      // 1. Attribute changes (Class/Aria) for Syncing
      if (mutation.type === 'attributes') {
          const target = mutation.target;
          
          // Debug Logging for DOM Watch
          if (target.tagName === 'INPUT' && target.type === 'checkbox' && !target.classList.contains('nlm-file-checkbox')) {
               DOMService.log(`[DOM Watch] Input attribute changed: ${mutation.attributeName}`, target.className);
               
               // Fast Path: 针对单选框变化，立即触发点对点更新，跳过 Debounce
               // 通过 DOM 关系找到这一行的文件名
               const row = target.closest('.row') || target.closest('div[role="row"]');
               if (row) {
                   const fileName = extractFileNameFromRow(row);
                   if (fileName) {
                       const isCheckedNative = isChecked(target);
                       updateViewCheckboxState(fileName, isCheckedNative);
                   }
               }
               
               shouldSyncSelection = true; // 仍然触发全量检查作为兜底
          }
          else if (target.tagName === 'MAT-CHECKBOX') {
               DOMService.log(`[DOM Watch] Mat-Checkbox attribute changed: ${mutation.attributeName}`, target.className);
               shouldSyncSelection = true;
          }
          return; // Skip structural checks for attribute changes
      }

      // 2. Structural changes (Nodes added/removed)
      // ... existing logic ...
      const isInternalChange = Array.from(mutation.addedNodes).some(node => 
        node.nodeType === 1 && (
            node.classList.contains('nlm-batch-checkbox') ||
            node.classList.contains('nlm-file-tag') ||
            node.classList.contains('nlm-folder-container') ||
            node.classList.contains('nlm-tags-container')
        )
      );
      if (isInternalChange) return;

      if (!document.querySelector('.nlm-folder-container')) {
        const injectionPoint = findInjectionPoint();
        if (injectionPoint) {
          injectFolderUI(injectionPoint);
          shouldUpdateDraggable = true;
        }
      }
      
      if (mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) {
            if (node.classList && (node.classList.contains('mat-mdc-menu-content') || node.classList.contains('mat-mdc-menu-panel'))) {
              injectMenuItem(node);
            }
            const menuContent = node.querySelector ? node.querySelector('.mat-mdc-menu-content') : null;
            if (menuContent) {
              injectMenuItem(menuContent);
            }
            shouldUpdateDraggable = true;
            shouldUpdateTags = true;
            if (state.isBatchMode) shouldUpdateBatch = true;
          }
        });
      }
    });

    if (shouldSyncSelection) {
        // Debounce sync to avoid spamming
        if (!state.syncTimer) {
            state.syncTimer = setTimeout(() => {
                syncViewFromNative();
                state.syncTimer = null;
            }, 50);
        }
    }

    if (shouldUpdateDraggable) makeSourcesDraggable();
    if (shouldUpdateBatch) updateBatchUI();
    // 使用 getAllSourceRows 检查是否真的有 row，而不是依赖旧的选择器
    const hasRows = getAllSourceRows().length > 0;
    if (shouldUpdateTags || hasRows) {
        if (!state.renderTagsTimer) {
            state.renderTagsTimer = setTimeout(() => {
                renderFileTags();
                state.renderTagsTimer = null;
            }, 100);
        }
    }
  });
  
  // Watch attributes for sync, childList for injection
  observer.observe(document.body, { 
      childList: true, 
      subtree: true, 
      attributes: true, 
      attributeFilter: ['class', 'aria-checked', 'aria-label'] 
  });
  
  // 初始调用一次
  renderFileTags();
}

function findInjectionPoint() {
  const xpath = "//span[contains(text(), 'Select all sources')]";
  const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
  if (result) {
    let current = result;
    for (let i = 0; i < 5; i++) {
        if (!current.parentElement) break;
        if (current.parentElement.tagName.toLowerCase().includes('source-picker')) return current;
        if (current.classList.contains('row') || current.classList.contains('header')) return current;
        current = current.parentElement;
    }
    return result.parentElement?.parentElement;
  }
  return null;
}

// --- 文件夹 UI ---
function injectFolderUI(targetRow) {
  const container = document.createElement('div');
  container.className = 'nlm-folder-container';
  
  const header = document.createElement('div');
  header.className = 'nlm-folder-header';
  
  const headerLeft = document.createElement('div');
  headerLeft.innerHTML = '<span>文件夹分类</span>';
  
  const headerActions = document.createElement('div');
  headerActions.className = 'nlm-header-actions';

  const batchBtn = document.createElement('button');
  batchBtn.className = 'nlm-add-btn nlm-batch-toggle';
  batchBtn.title = '批量管理';
  batchBtn.innerHTML = `
    <svg style="width:18px;height:18px" viewBox="0 0 24 24">
        <path d="M19,3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3M19,19H5V5H19V19M17,17H7V15H17V17M17,13H7V11H17V13M17,9H7V7H17V9Z" fill="currentColor"/>
    </svg>
  `;
  
  const addBtn = document.createElement('button');
  addBtn.className = 'nlm-add-btn';
  addBtn.title = '新建文件夹';
  addBtn.innerHTML = '+';

  headerActions.appendChild(batchBtn);
  headerActions.appendChild(addBtn);
  
  header.appendChild(headerLeft);
  header.appendChild(headerActions);
  
  const list = document.createElement('ul');
  list.className = 'nlm-folder-list';
  list.id = 'nlm-folder-list-ul';
  
  // 详情视图容器（初始隐藏）
  const detailView = document.createElement('div');
  detailView.className = 'nlm-detail-view';
  detailView.id = 'nlm-detail-view';
  detailView.style.display = 'none';

  container.appendChild(header);
  container.appendChild(list);
  container.appendChild(detailView); // 将详情视图也放在容器里
  
  if (targetRow && targetRow.parentElement) {
    targetRow.parentElement.insertBefore(container, targetRow);
  }
  
  // 绑定事件
  batchBtn.addEventListener('click', toggleBatchMode);

  addBtn.addEventListener('click', (e) => {
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

function toggleBatchMode() {
    state.isBatchMode = !state.isBatchMode;
    state.selectedBatchFiles.clear();
    
    // 切换 Body 类名，触发 CSS 屏蔽效果
    if (state.isBatchMode) {
        document.body.classList.add('nlm-batch-mode-active');
    } else {
        document.body.classList.remove('nlm-batch-mode-active');
        // 清除所有行的高亮
        document.querySelectorAll('.nlm-batch-row-active').forEach(row => {
            row.classList.remove('nlm-batch-row-active');
        });
    }

    const btn = document.querySelector('.nlm-batch-toggle');
    if (btn) {
        btn.style.color = state.isBatchMode ? '#1a73e8' : '#5f6368';
        btn.style.backgroundColor = state.isBatchMode ? 'rgba(26, 115, 232, 0.1)' : 'transparent';
    }
    
    updateBatchUI();
}

// --- Helper: Get All Source Rows (Standard + Standalone Containers) ---
function getAllSourceRows() {
    // 1. Standard rows
    const standardRows = Array.from(document.querySelectorAll('.row, div[role="row"]'));
    
    // 2. Standalone containers (YouTube, PDF, Audio, etc.)
    const standaloneContainers = Array.from(document.querySelectorAll('.single-source-container'));
    
    // 3. Merge and Deduplicate
    // If a standalone container is inside a standard row, prefer the row (or filter out the container).
    // Actually, our logic handles both, but let's ensure we don't process the same file twice.
    const allItems = new Set(standardRows);
    
    standaloneContainers.forEach(container => {
        // Check if this container is already inside one of the standard rows
        const parentRow = container.closest('.row, div[role="row"]');
        if (!parentRow) {
            // It's a true standalone container
            allItems.add(container);
        }
    });
    
    return Array.from(allItems);
}

function updateBatchUI() {
    // 1. 注入或移除 Checkboxes
    const rows = getAllSourceRows();
    
    rows.forEach(row => {
        // 排除 Select All 行
        if (row.innerText && row.innerText.includes('Select all sources')) return;

        const existingCb = row.querySelector('.nlm-batch-checkbox');
        
        if (state.isBatchMode) {
            if (!existingCb) {
                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.className = 'nlm-batch-checkbox';
                
                // 阻止事件冒泡，防止触发原生点击
                cb.addEventListener('click', (e) => e.stopPropagation());
                cb.addEventListener('mousedown', (e) => e.stopPropagation());
                
                cb.addEventListener('change', (e) => {
                    const fileName = extractFileNameFromRow(row);
                    if (fileName) {
                        if (e.target.checked) {
                            state.selectedBatchFiles.add(fileName);
                            row.classList.add('nlm-batch-row-active');
                        } else {
                            state.selectedBatchFiles.delete(fileName);
                            row.classList.remove('nlm-batch-row-active');
                        }
                        renderBatchToolbar();
                    }
                });
                
                // 插入到最前面
                // 对于 standalone container, 结构可能不同，尝试插入到第一个子元素前
                row.insertBefore(cb, row.firstChild);
            }
            
            // 绑定行点击事件 (Focus Mode Interaction)
            if (!row.hasAttribute('data-nlm-batch-listener')) {
                row.setAttribute('data-nlm-batch-listener', 'true');
                row.addEventListener('click', (e) => {
                    // 仅在批量模式下生效
                    if (!state.isBatchMode) return;
                    
                    // 如果点击的是我们的 checkbox 或者菜单按钮，不处理（避免冲突）
                    if (e.target.classList.contains('nlm-batch-checkbox') || 
                        e.target.closest('button') || 
                        e.target.closest('.nlm-tags-container')) return;
                    
                    // 阻止默认行为（防止打开文件）
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // 切换 checkbox 状态
                    const cb = row.querySelector('.nlm-batch-checkbox');
                    if (cb) {
                        cb.checked = !cb.checked;
                        cb.dispatchEvent(new Event('change')); // 触发 change 事件更新状态
                    }
                }, true); // Use capture to intercept early
            }
        } else {
            if (existingCb) existingCb.remove();
            row.classList.remove('nlm-batch-row-active'); // 退出模式时清除高亮
            // 注意：我们留着 click listener 没关系，因为里面检查了 state.isBatchMode
        }
    });
    
    renderBatchToolbar();
}

function renderBatchToolbar() {
    let toolbar = document.getElementById('nlm-batch-toolbar');
    if (!toolbar) {
        toolbar = document.createElement('div');
        toolbar.id = 'nlm-batch-toolbar';
        toolbar.className = 'nlm-batch-toolbar';
        document.body.appendChild(toolbar);
    }
    
    if (!state.isBatchMode) {
        toolbar.classList.remove('visible');
        return;
    }
    
    const count = state.selectedBatchFiles.size;
    
    toolbar.innerHTML = `
        <span>已选择 ${count} 个文件</span>
        <div style="display:flex;gap:8px">
            <button class="nlm-batch-btn primary" id="nlm-batch-move">移动到...</button>
            <button class="nlm-batch-btn" id="nlm-batch-cancel">取消选择</button>
        </div>
    `;
    
    toolbar.classList.add('visible');
    
    // 绑定事件
    toolbar.querySelector('#nlm-batch-move').addEventListener('click', () => {
        if (count === 0) return alert('请先选择文件');
        const fileNames = Array.from(state.selectedBatchFiles);
        showFolderSelectionModal(fileNames[0], fileNames); // 传递第一个作为 title，第二个作为全量
    });
    
    toolbar.querySelector('#nlm-batch-cancel').addEventListener('click', () => {
        state.selectedBatchFiles.clear();
        // 取消所有 checkbox
        document.querySelectorAll('.nlm-batch-checkbox').forEach(cb => cb.checked = false);
        renderBatchToolbar();
    });
}

function renderFolders() {
  const list = document.getElementById('nlm-folder-list-ul');
  if (!list) return;
  list.innerHTML = '';
  
  state.folders.forEach(folder => {
    const li = document.createElement('li');
    li.className = `nlm-folder-item ${state.activeFolderId === folder.id ? 'active' : ''}`;
    
    let iconPath = 'M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z';
    if (folder.id === 'all') iconPath = 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z'; 
    
    let removeBtnHtml = '';
    if (folder.id !== 'all') {
        removeBtnHtml = `<span class="nlm-folder-remove" title="删除文件夹">×</span>`;
    }

    li.innerHTML = `<svg class="nlm-icon" viewBox="0 0 24 24"><path d="${iconPath}"/></svg><span>${folder.name}</span>${removeBtnHtml}`;
    
    // 绑定删除按钮事件
    const removeBtn = li.querySelector('.nlm-folder-remove');
    if (removeBtn) {
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm(`确定要删除文件夹 "${folder.name}" 吗？\n文件夹内的文件将移至"全部"。`)) {
                deleteFolder(folder.id);
            }
        });
    }
    
    // 右键菜单 (删除功能) - 保留作为备用
    if (folder.id !== 'all') {
      li.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showFolderContextMenu(e.clientX, e.clientY, folder);
      });
    }

    li.addEventListener('click', (e) => {
      e.stopPropagation();
      state.activeFolderId = folder.id;
      renderFolders(); // 更新高亮
      
      if (folder.id === 'all') {
        hideDetailView();
        showNativeList();
      } else {
        showDetailView(folder);
        hideNativeList();
      }
    });
    
    // 拖拽放置
    if (folder.id !== 'all') { 
        li.addEventListener('dragover', (e) => { e.preventDefault(); li.classList.add('drag-over'); });
        li.addEventListener('dragleave', () => { li.classList.remove('drag-over'); });
        li.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            li.classList.remove('drag-over');
            const fileName = e.dataTransfer.getData('text/plain');
            if (fileName) addFileToFolder(fileName, folder.id);
        });
    }
    list.appendChild(li);
  });
}

// --- 文件夹右键菜单 ---
function showFolderContextMenu(x, y, folder) {
  // 清除旧菜单
  const oldMenu = document.querySelector('.nlm-context-menu');
  if (oldMenu) oldMenu.remove();

  const menu = document.createElement('div');
  menu.className = 'nlm-context-menu';
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;

  menu.innerHTML = `
    <div class="nlm-context-menu-item danger" id="nlm-ctx-delete">删除文件夹</div>
  `;

  document.body.appendChild(menu);

  // 点击外部关闭
  const closeMenu = () => {
    menu.remove();
    document.removeEventListener('click', closeMenu);
  };
  // 延迟绑定，防止当前点击立即触发关闭
  setTimeout(() => document.addEventListener('click', closeMenu), 0);

  // 绑定事件
  menu.querySelector('#nlm-ctx-delete').addEventListener('click', () => {
    if (confirm(`确定要删除文件夹 "${folder.name}" 吗？\n文件夹内的文件将移至"全部"。`)) {
      deleteFolder(folder.id);
    }
  });
}

function deleteFolder(folderId) {
  // 1. 从文件夹列表移除
  state.folders = state.folders.filter(f => f.id !== folderId);
  
  // 2. 从所有文件映射中移除该 ID
  Object.keys(state.fileMappings).forEach(fileName => {
    state.fileMappings[fileName] = state.fileMappings[fileName].filter(id => id !== folderId);
    // 如果文件没有归属任何文件夹，可以保留空数组或删除 key (视逻辑而定，这里保留空数组)
  });
  
  // 3. 如果当前正在查看被删除的文件夹，切回"全部"
  if (state.activeFolderId === folderId) {
    state.activeFolderId = 'all';
    hideDetailView();
    showNativeList();
  }
  
  saveData();
  renderFolders();
  renderFileTags(); // 更新标签显示
}

// --- 原生选择同步辅助函数 ---
// 新：基于视图状态的全量同步（实现"独占/排他"选择逻辑）
function syncNativeSelectionFromView(view) {
    // 1. 获取 View 中所有被选中的文件名
    const selectedFiles = new Set(
        Array.from(view.querySelectorAll('.nlm-file-checkbox:checked'))
             .map(cb => cb.dataset.file)
    );

    // 2. 遍历原生列表，强制同步状态
    const rows = getAllSourceRows();
    rows.forEach(row => {
        if (row.closest('.nlm-folder-container')) return;
        
        // 忽略 header (Select all sources)
        // 即使 extractFileNameFromRow 会返回 "Select all sources"，我们也应该显式跳过，避免将其视为普通文件
        if (row.querySelector('input[aria-label="Select all sources"]')) {
            // 特殊处理 Header: 如果我们的 View 并没有选中所有文件（通常是子集），
            // 那么 Header 的全选状态应该被取消，以保持一致性。
            // 这里简单处理：只要触发了同步，就意味着进入了"文件夹筛选模式"，取消全局全选总是安全的。
            const headerCb = row.querySelector('input[type="checkbox"]');
            if (headerCb && isChecked(headerCb)) {
                safeClick(headerCb);
            }
            return;
        }

        const fileName = extractFileNameFromRow(row);
        if (!fileName) return;

        const shouldBeSelected = selectedFiles.has(fileName);
        const cb = row.querySelector('input[type="checkbox"]');
        
        if (cb && !cb.classList.contains('nlm-batch-checkbox') && !cb.classList.contains('nlm-file-checkbox')) {
            const isCurrentlySelected = isChecked(cb);
            if (isCurrentlySelected !== shouldBeSelected) {
                safeClick(cb);
            }
        }
    });
}

// 新：更新 View 中单个 Checkbox 的状态 (Native -> View Fast Path)
function updateViewCheckboxState(fileName, isChecked) {
    const view = document.getElementById('nlm-detail-view');
    if (!view || view.style.display === 'none') return;
    
    const cb = view.querySelector(`.nlm-file-checkbox[data-file="${CSS.escape(fileName)}"]`);
    if (cb && cb.checked !== isChecked) {
        cb.checked = isChecked;
        DOMService.log(`[Fast Sync] Updated View Checkbox for "${fileName}" to ${isChecked}`);
        
        // 更新全选框
        const all = view.querySelectorAll('.nlm-file-checkbox');
        const allChecked = Array.from(all).every(c => c.checked);
        const selectAllCb = view.querySelector('#nlm-select-all-detail');
        if (selectAllCb) selectAllCb.checked = allChecked;
    }
}

// 新：反向同步（Native -> View）
// 当原生列表状态变化时，更新 View 中的 Checkbox 状态
function syncViewFromNative(retryCount = 0) {
    const view = document.getElementById('nlm-detail-view');
    // 如果 View 没显示，或者已经被销毁，就不需要同步
    if (!view || view.style.display === 'none') return;
    
    // Retry logic: DOM updates might be slightly delayed
    if (retryCount > 2) return;

    DOMService.log(`[Sync] Triggering View sync from Native changes... (Attempt ${retryCount + 1})`);

    // 1. Check Global "Select all sources" status
    const selectAllInput = document.querySelector('input[type="checkbox"][aria-label="Select all sources"]');
    const isGlobalSelectAllChecked = selectAllInput && isChecked(selectAllInput);
    
    // 2. Iterate ALL checkboxes to find native states (Robust Traversal)
    const nativeStates = {};
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    
    checkboxes.forEach(cb => {
        if (cb.classList.contains('nlm-file-checkbox') || cb.classList.contains('nlm-batch-checkbox')) return;
        if (cb.getAttribute('aria-label') === 'Select all sources') return;
        
        const fileName = extractFileNameFromCheckboxContext(cb);
        if (fileName) {
             const normalizedName = normalizeFileName(fileName);
             // Store by normalized name for fuzzy matching lookup
             nativeStates[normalizedName] = isChecked(cb);
        }
    });
    
    // 3. Update View Checkboxes
    const viewCheckboxes = view.querySelectorAll('.nlm-file-checkbox');
    let allViewChecked = true;
    let anyUpdate = false;
    
    viewCheckboxes.forEach(cb => {
        const fileName = cb.dataset.file;
        const normalizedName = normalizeFileName(fileName);
        let shouldBeChecked = false;
        
        if (isGlobalSelectAllChecked) {
            shouldBeChecked = true;
        } else {
            // Fuzzy lookup in nativeStates
            // Try exact match first
            if (nativeStates.hasOwnProperty(normalizedName)) {
                shouldBeChecked = nativeStates[normalizedName];
            } else {
                // Try fuzzy match
                const match = Object.keys(nativeStates).find(key => 
                    (key.includes(normalizedName) && Math.abs(key.length - normalizedName.length) < 5) ||
                    (normalizedName.includes(key) && Math.abs(normalizedName.length - key.length) < 5)
                );
                if (match) {
                    shouldBeChecked = nativeStates[match];
                } else {
                     // Not found in native list (maybe folded/hidden), keep current state?
                     // Or assume false if we are confident? 
                     // Let's keep current state to be safe.
                     shouldBeChecked = cb.checked; 
                }
            }
        }
        
        if (cb.checked !== shouldBeChecked) {
            cb.checked = shouldBeChecked;
            anyUpdate = true;
            DOMService.log(`[Sync] Updated View Checkbox for "${fileName}" to ${shouldBeChecked}`);
        }
        
        if (!shouldBeChecked) allViewChecked = false;
    });
    
    // 4. Update View's "Select All" Checkbox
    const viewSelectAll = view.querySelector('#nlm-select-all-detail');
    if (viewSelectAll) {
        viewSelectAll.checked = (viewCheckboxes.length > 0 && allViewChecked);
    }

    if (!anyUpdate && retryCount < 1) {
         setTimeout(() => syncViewFromNative(retryCount + 1), 100);
    }
}

function clearNativeSelection() {
    // 保留此函数用于"全选"时的清理，虽然 syncNativeSelectionFromView 也能覆盖此逻辑，
    // 但为了逻辑清晰，或者全选时我们可以直接构造一个全量的 Set 传给 sync 逻辑。
    // 实际上，showDetailView 里全选逻辑也可以用 syncNativeSelectionFromView 接管。
    // 暂时保留，以防万一。
    const selectAllInput = document.querySelector('input[type="checkbox"][aria-label="Select all sources"]');
    if (selectAllInput && isChecked(selectAllInput)) {
        safeClick(selectAllInput);
    }
    
    const rows = getAllSourceRows();
    rows.forEach(row => {
         if (row.closest('.nlm-folder-container')) return;
         if (row.querySelector('input[aria-label="Select all sources"]')) return;
         
         const cb = row.querySelector('input[type="checkbox"]');
         if (cb && !cb.classList.contains('nlm-batch-checkbox') && !cb.classList.contains('nlm-file-checkbox') && isChecked(cb)) {
             safeClick(cb);
         }
    });
}

function isNativeSelected(fileName) {
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    const normalizedTarget = normalizeFileName(fileName);
    
    for (let cb of checkboxes) {
        if (cb.classList.contains('nlm-file-checkbox') || cb.classList.contains('nlm-batch-checkbox')) continue;
        if (cb.getAttribute('aria-label') === 'Select all sources') continue;
        
        const rowFileName = extractFileNameFromCheckboxContext(cb);
        if (rowFileName) {
            const normalizedRowName = normalizeFileName(rowFileName);
            const isMatch = normalizedRowName === normalizedTarget || 
                           (normalizedRowName.includes(normalizedTarget) && Math.abs(normalizedRowName.length - normalizedTarget.length) < 5) ||
                           (normalizedTarget.includes(normalizedRowName) && Math.abs(normalizedTarget.length - normalizedRowName.length) < 5);

            if (isMatch) {
                const selected = isChecked(cb);
                DOMService.log(`isNativeSelected: Found checkbox for "${rowFileName}" (matched "${fileName}"). Checked: ${selected}`);
                return selected;
            }
        }
    }
    DOMService.log(`isNativeSelected: Checkbox not found for "${fileName}"`);
    return false;
}

// 辅助：检查 Checkbox 是否选中 (兼容 Angular Material/MDC)
function isChecked(checkbox) {
    if (checkbox.checked) return true;
    if (checkbox.getAttribute('aria-checked') === 'true') return true;
    if (checkbox.classList.contains('mdc-checkbox--selected')) return true;
    if (checkbox.classList.contains('mat-mdc-checkbox-checked')) return true;
    
    // Catch animation state (transient checked state)
    if (checkbox.classList.contains('mdc-checkbox--anim-unchecked-checked')) return true;

    // Check parent mat-checkbox (Critical for NotebookLM)
    const matCheckbox = checkbox.closest('mat-checkbox');
    if (matCheckbox) {
        if (matCheckbox.classList.contains('mat-mdc-checkbox-checked')) return true;
        if (matCheckbox.classList.contains('mdc-checkbox--selected')) return true;
    }
    
    return false;
}

// 辅助：安全点击 (兼容框架事件监听)
function safeClick(element) {
    // 1. 模拟鼠标点击流程
    element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
    element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
    
    // 2. 原生点击
    element.click();
    
    // 3. 强制分发 Angular/React 依赖的事件
    // 注意：某些框架监听的是 input 的 change，有些是 click
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('input', { bubbles: true }));
}

 // --- 详情视图 (独立 List) ---
 function showDetailView(folder) {
   const view = document.getElementById('nlm-detail-view');
   view.style.display = 'block';
   
   // 找出属于该文件夹的文件
   const filesInFolder = Object.keys(state.fileMappings).filter(fileName => 
     state.fileMappings[fileName].includes(folder.id)
   );
 
   view.innerHTML = `
     <div class="nlm-detail-header">
       <span style="font-weight:bold; font-size:16px;">${folder.name} (${filesInFolder.length})</span>
       <div class="nlm-detail-actions" style="display:flex; align-items:center;">
         <label class="nlm-select-all-label" style="margin-right: 12px; display: flex; align-items: center; gap: 4px; font-size: 14px; cursor: pointer;">
             <input type="checkbox" id="nlm-select-all-detail"> 全选
         </label>
         <button class="nlm-btn" id="nlm-batch-remove">移出文件夹</button>
       </div>
     </div>
     <ul class="nlm-file-list">
       ${filesInFolder.map(file => `
         <li class="nlm-file-item">
           <input type="checkbox" class="nlm-file-checkbox" data-file="${file}" ${isNativeSelected(file) ? 'checked' : ''}>
           <span class="nlm-file-name">${file}</span>
         </li>
       `).join('')}
     </ul>
     ${filesInFolder.length === 0 ? '<div style="color:#999; padding:20px; text-align:center">暂无文件，请从全部列表拖拽添加，或使用菜单添加。</div>' : ''}
   `;

  // 绑定批量操作
  const selectAllCb = view.querySelector('#nlm-select-all-detail');
  if (selectAllCb) {
      selectAllCb.addEventListener('change', (e) => {
          const isChecked = e.target.checked;
          const checkboxes = view.querySelectorAll('.nlm-file-checkbox');
          checkboxes.forEach(cb => {
              cb.checked = isChecked;
              // 全选时也触发单点同步，虽然效率低点但稳
              syncSingleFileToNative(cb.dataset.file, isChecked);
          });
      });
  }
  
  // 直接绑定单个文件 Checkbox 事件 (不再使用委托)
  const fileCheckboxes = view.querySelectorAll('.nlm-file-checkbox');
  fileCheckboxes.forEach(cb => {
      // 使用 click 事件以获得更即时的响应
      cb.addEventListener('click', (e) => {
          // e.target.checked 在 click 事件中已经是点击后的状态
          const fileName = e.target.dataset.file;
          const isChecked = e.target.checked;
          
          DOMService.log(`[View Action] User clicked "${fileName}" to ${isChecked}`);
          
          // 更新全选框状态
          const allChecked = Array.from(fileCheckboxes).every(c => c.checked);
          if (selectAllCb) selectAllCb.checked = allChecked;
          
          // 立即同步到原生
          syncSingleFileToNative(fileName, isChecked);
      });
  });

  document.getElementById('nlm-batch-remove')?.addEventListener('click', () => {
    const checked = Array.from(view.querySelectorAll('.nlm-file-checkbox:checked')).map(cb => cb.dataset.file);
    if (checked.length === 0) return alert('请先选择文件');
    if (confirm(`确定要将这 ${checked.length} 个文件移出 "${folder.name}" 吗？`)) {
      checked.forEach(file => {
        state.fileMappings[file] = state.fileMappings[file].filter(id => id !== folder.id);
      });
      saveData();
      showDetailView(folder); // 刷新视图
      renderFileTags(); // 更新主列表标签
    }
  });
  
  // 初始化同步：打开视图时，立即从原生状态同步一次
  // 使用 setTimeout 确保 DOM 渲染完成
  setTimeout(() => {
      syncViewFromNative();
  }, 0);
}

// 辅助：标准化文件名用于比较 (去除不可见字符、空格标准化)
function normalizeFileName(name) {
    if (!name) return '';
    return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

// 辅助：从 Checkbox 上下文提取文件名 (新策略)
function extractFileNameFromCheckboxContext(checkbox) {
    // 1. Try aria-label directly on checkbox (Most reliable for single files)
    const ariaLabel = checkbox.getAttribute('aria-label');
    if (ariaLabel && DOMService.isValidFileName(ariaLabel)) {
        // Handle "Select [Filename]" format if present, though NotebookLM seems to put filename directly
        if (ariaLabel.startsWith("Select ")) {
            return ariaLabel.substring(7).trim();
        }
        return ariaLabel;
    }

    // 2. Try traversing up to find a row and use standard extraction
    const row = checkbox.closest('.row') || checkbox.closest('div[role="row"]');
    if (row) {
        const name = extractFileNameFromRow(row);
        if (name) return name;
    }
    
    return null;
}

// 新：点对点同步单个文件 (View -> Native)
function syncSingleFileToNative(fileName, targetState) {
    // Iterate ALL checkboxes directly, bypassing row selectors which might fail
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    const normalizedTarget = normalizeFileName(fileName);
    let found = false;
    let visibleFiles = []; // For debug logging

    checkboxes.forEach(cb => {
        // Skip our own checkboxes
        if (cb.classList.contains('nlm-file-checkbox') || cb.classList.contains('nlm-batch-checkbox')) return;
        
        // Skip "Select all" checkbox
        if (cb.getAttribute('aria-label') === 'Select all sources') return;

        const rowFileName = extractFileNameFromCheckboxContext(cb);
        
        if (rowFileName) {
            visibleFiles.push(rowFileName);
            const normalizedRowName = normalizeFileName(rowFileName);
            
            // 增强匹配：精确匹配 OR 包含匹配 (处理截断)
            const isMatch = normalizedRowName === normalizedTarget || 
                           (normalizedRowName.includes(normalizedTarget) && Math.abs(normalizedRowName.length - normalizedTarget.length) < 5) ||
                           (normalizedTarget.includes(normalizedRowName) && Math.abs(normalizedTarget.length - normalizedRowName.length) < 5);

            if (isMatch) {
                const nativeState = isChecked(cb);
                if (nativeState !== targetState) {
                    DOMService.log(`[Sync] Clicking native checkbox for "${rowFileName}" (matched "${fileName}") to match View state (${targetState})`);
                    safeClick(cb);
                } else {
                    DOMService.log(`[Sync] Native checkbox for "${rowFileName}" already matches View state (${targetState})`);
                }
                found = true;
                // Don't return here, in case there are duplicates (unlikely but safe)
            }
        }
    });
    
    if (!found) {
        DOMService.log(`[Sync] Warning: Native row not found for "${fileName}".`);
        DOMService.log(`[Sync] Visible files found via checkboxes:`, visibleFiles);
    }
}

function renderFileTags() {
    const rows = getAllSourceRows();
    rows.forEach(row => {
        if (row.innerText && row.innerText.includes('Select all sources')) return;
        
        const fileName = extractFileNameFromRow(row);
        if (!fileName) return;
        
        const folderIds = state.fileMappings[fileName] || [];
        
        let container = row.querySelector('.nlm-tags-container');
        
        if (folderIds.length === 0) {
            if (container) container.remove();
            return;
        }
        
        if (!container) {
            container = document.createElement('div');
            container.className = 'nlm-tags-container';
            // 尝试插入到菜单按钮之前，或者作为倒数第二个元素
            // NotebookLM 的 row 通常是 Flex 布局，直接 append 可能在最后
            // 菜单按钮通常是最后一个
            const menuBtn = row.querySelector('button[aria-haspopup="menu"]') || row.querySelector('button:last-child');
            if (menuBtn && menuBtn.parentElement === row) {
                 row.insertBefore(container, menuBtn);
            } else {
                 // 对于 standalone container, 结构可能稍微不同，
                 // 通常 .source-title-column 是中间的，菜单是右边的。
                 // 如果我们找不到明确的菜单按钮，append 到最后也行。
                 // 但对于 standalone container, 它的直接子元素是: icon-and-menu, source-title-column, checkbox
                 // 我们的 tags 最好放在 source-title-column 后面，或者 append 到 container 里。
                 // 由于 container 是 flex，append 到最后会在 checkbox 后面（如果 checkbox 是最后）。
                 // 让我们尝试找 checkbox container，插在它前面。
                 const checkboxContainer = row.querySelector('.select-checkbox-container');
                 if (checkboxContainer) {
                     row.insertBefore(container, checkboxContainer);
                 } else {
                     row.appendChild(container);
                 }
            }
        }
        
        const folderNames = folderIds.map(id => {
            const f = state.folders.find(fold => fold.id === id);
            return f ? f.name : null;
        }).filter(Boolean);
        
        container.innerHTML = folderNames.map(name => 
            `<span class="nlm-file-tag">${name}</span>`
        ).join('');
    });
}

function hideDetailView() {
  document.getElementById('nlm-detail-view').style.display = 'none';
}

function hideNativeList() {
  // 隐藏原生列表（除了 Header）
  const selectAllRow = findInjectionPoint();
  if (!selectAllRow) return;
  let sibling = selectAllRow.nextElementSibling;
  while (sibling) {
    if (sibling.tagName !== 'SCRIPT' && sibling.tagName !== 'STYLE') {
       sibling.style.display = 'none';
    }
    sibling = sibling.nextElementSibling;
  }
}

function showNativeList() {
  const selectAllRow = findInjectionPoint();
  if (!selectAllRow) return;
  let sibling = selectAllRow.nextElementSibling;
  while (sibling) {
    sibling.style.display = '';
    sibling = sibling.nextElementSibling;
  }
}

// --- Services ---

const DOMService = {
  debug: true, // Enable debug logging
  logBuffer: [], // Store logs for popup display

  log(message, data = null) {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message} ${data ? JSON.stringify(data) : ''}`;
    
    // Console output
    if (this.debug) {
      if (data) console.log(`[NotebookLM-DOM] ${message}`, data);
      else console.log(`[NotebookLM-DOM] ${message}`);
    }

    // Buffer for Popup
    this.logBuffer.unshift(logEntry);
    if (this.logBuffer.length > 50) this.logBuffer.pop();
  },

  /**
   * Checks if a text is a valid filename and not a UI control label.
   * Performs strict filtering to avoid capturing "Edit", "More", etc.
   */
  isValidFileName(text) {
    if (!text) return false;
    const t = text.trim();
    if (t.length < 1) return false;
    
    const lower = t.toLowerCase();
    const invalidTerms = [
      'edit', 'more', 'menu', 'delete', 'rename', 'source', 
      'edit source', 'remove', 'more_vert', 'open_in_new',
      'check_box_outline_blank', 'check_box', 'add source',
      'select all sources', 'file_upload', 'drive_folder_upload',
      'edit_note', 'edit_square', 'drive_file_rename_outline', 'mode_edit',
      '编辑', '更多', '删除', '重命名', '取消', '全选', '新建',
      'rename source', 'edit source'
    ];
    
    if (invalidTerms.includes(lower)) {
        this.log(`Rejected invalid term: "${t}"`);
        return false;
    }
    
    if (lower.startsWith('edit ')) return false; 
    if (lower.match(/^\d+ days ago$/)) return false; 
    
    return true;
  },

  /**
   * Extracts filename from a row element with prioritized strategies.
   * STRICTLY prioritizes .single-source-container as requested.
   */
  extractFileName(row) {
    if (!row) return null;

    this.log("Attempting extraction for row:", row);

    // Strategy 0: [cdk-describedby-host] (Highest Priority per User Finding)
    // User identified this attribute specifically marks the title element.
    const hostElement = row.querySelector('[cdk-describedby-host]');
    if (hostElement) {
        const text = hostElement.textContent.trim();
        if (this.isValidFileName(text)) {
            this.log("Success (Strategy 0 - [cdk-describedby-host]):", text);
            return text;
        }
    }

    // Strategy 1: .single-source-container (Highest Priority per User Request)
    // Checks if the row itself IS the container, or contains one.
    let singleSourceContainer = null;
    if (row.classList.contains('single-source-container')) {
        singleSourceContainer = row;
    } else {
        singleSourceContainer = row.querySelector('.single-source-container');
    }

    if (singleSourceContainer) {
        const title = singleSourceContainer.querySelector('.source-title');
        if (title) {
             const text = title.textContent.trim();
             if (this.isValidFileName(text)) {
                this.log("Success (Strategy 1 - .single-source-container):", text);
                return text;
             } else {
                this.log("Found .single-source-container title but invalid:", text);
             }
        }
    }

    // Strategy 2: aria-description on "More" button (Metadata)
    // Often contains the full filename even if truncated visually
    const moreBtn = row.querySelector('button[aria-description]');
    if (moreBtn) {
        const desc = moreBtn.getAttribute('aria-description');
        if (this.isValidFileName(desc)) {
             this.log("Success (Strategy 2 - aria-description):", desc.trim());
             return desc.trim();
        }
    }

    // Strategy 3: Direct .source-title in row
    // Fallback if container structure is different
    const titleSpan = row.querySelector('.source-title');
    if (titleSpan) {
        const text = titleSpan.textContent.trim();
        if (this.isValidFileName(text)) {
            this.log("Success (Strategy 3 - direct .source-title):", text);
            return text;
        }
    }

    // Strategy 4: Checkbox aria-label (Select [Filename])
    const checkbox = row.querySelector('input[type="checkbox"]');
    if (checkbox) {
        const label = checkbox.getAttribute('aria-label');
        if (label) {
            let name = null;
            if (label.startsWith("Select ")) {
                name = label.substring(7).trim();
            } else if (label !== "Select all sources") {
                name = label;
            }
            
            if (name && this.isValidFileName(name)) {
                this.log("Success (Strategy 4 - checkbox label):", name);
                return name;
            }
        }
    }

    this.log("Failed to extract filename from row.");
    return null;
  },

  /**
   * Guesses filename from sibling elements of a clicked target.
   * Only used as a last resort.
   */
  guessFileNameFromSiblings(element) {
    let current = element;
    for (let i = 0; i < 3; i++) {
        if (!current || current === document.body) break;
        
        let sibling = current.previousElementSibling;
        while (sibling) {
            // Skip icons and non-text elements
            if (sibling.classList.contains('material-icons') || 
                sibling.classList.contains('google-symbols') || 
                sibling.getAttribute('role') === 'img' ||
                sibling.tagName === 'SVG') {
                sibling = sibling.previousElementSibling;
                continue;
            }

            const text = sibling.innerText;
            if (text) {
                // Check each line as a potential candidate
                const lines = text.split('\n');
                for (const line of lines) {
                    const candidate = line.trim();
                    if (candidate && this.isValidFileName(candidate)) {
                        this.log("Guessed from sibling:", candidate);
                        return candidate;
                    }
                }
            }
            sibling = sibling.previousElementSibling;
        }
        current = current.parentElement;
    }
    return null;
  }
};

// --- Menu Injection Logic ---
function setupGlobalClickListener() {
  document.addEventListener('mousedown', (e) => {
    // Check if we are clicking inside a menu
    // If we are clicking inside a menu, we should NOT try to extract a filename,
    // because the filename is context-dependent on what opened the menu.
    // We want to PRESERVE the state.currentMenuFile that was set when the menu opener was clicked.
    if (e.target.closest('.mat-mdc-menu-content') || e.target.closest('.nlm-menu-item')) {
        DOMService.log("GlobalListener: Ignoring click inside menu to preserve context.");
        return;
    }

    const btn = e.target.closest('button');
    
    // 1. Direct aria-description check (Fastest & Most Accurate)
    if (btn) {
        state.lastClickedButton = btn;
        const description = btn.getAttribute('aria-description');
        // DOMService.log("Global Click: Button clicked with description:", description);
        
        if (DOMService.isValidFileName(description)) {
             state.currentMenuFile = description.trim();
             DOMService.log("GlobalListener: Captured from aria-description:", state.currentMenuFile);
             return;
        } else {
             // DOMService.log("GlobalListener: Ignored invalid description:", description);
        }
    }

    // 2. Container Traversal (Robust using closest)
    // Try to find the row container which holds the title
    const row = e.target.closest('.row') || e.target.closest('div[role="row"]');
    if (row) {
       DOMService.log("GlobalListener: Found row container", row);
       const fileName = DOMService.extractFileName(row);
       if (fileName) {
           state.currentMenuFile = fileName;
           DOMService.log("GlobalListener: Captured from row:", fileName);
           return;
       }
    }
    
    // Fallback: Check for .single-source-container directly if not in a standard row
    const sourceContainer = e.target.closest('.single-source-container');
    if (sourceContainer) {
       const title = sourceContainer.querySelector('.source-title');
       if (title) {
           const text = title.textContent.trim();
           if (DOMService.isValidFileName(text)) {
               state.currentMenuFile = text;
               DOMService.log("GlobalListener: Captured from .single-source-container directly:", text);
               return;
           }
       }
    }

    // 3. Fallback: Sibling Guessing
    if (btn) {
        const fileName = DOMService.guessFileNameFromSiblings(btn);
        if (fileName) {
            state.currentMenuFile = fileName;
            DOMService.log("GlobalListener: Guessed from siblings:", fileName);
        }
    }
  }, true);
}

// Delegate legacy calls to DOMService
function extractFileNameFromRow(row) {
    return DOMService.extractFileName(row);
}


function injectMenuItem(menuNode) {
  // 确保我们操作的是 mat-mdc-menu-content
  let menuContent = menuNode;
  if (!menuContent.classList.contains('mat-mdc-menu-content')) {
      menuContent = menuNode.querySelector('.mat-mdc-menu-content');
  }
  if (!menuContent) return;

  // 防止重复注入
  if (menuContent.querySelector('.nlm-menu-item')) return;

  console.log("NotebookLM Extension: Injecting menu item...");

  const separator = document.createElement('div');
  separator.style.borderTop = '1px solid #dadce0'; // Google Gray
  separator.style.margin = '8px 0';
  
  const menuItem = document.createElement('button');
  menuItem.className = 'nlm-menu-item mat-mdc-menu-item'; // 添加原生类名以保持一致性
  menuItem.innerHTML = `
    <svg class="nlm-menu-icon" viewBox="0 0 24 24">
       <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
    </svg>
    <span class="mdc-list-item__primary-text">移动到文件夹...</span>
  `;
  
  menuItem.addEventListener('click', () => {
      // 关闭原生菜单 (模拟点击 backdrop)
      const backdrop = document.querySelector('.cdk-overlay-backdrop');
      if (backdrop) backdrop.click();
      
      let fileName = state.currentMenuFile;

      // 如果全局点击监听没有捕获到文件名，尝试进行回退查找
      if (!fileName) {
          console.log("NotebookLM Extension: Filename missing, attempting fallback...");
          // 策略: 查找当前处于 "expanded" 状态的按钮 (触发菜单的按钮)
          const expandedBtn = document.querySelector('button[aria-expanded="true"]');
          if (expandedBtn) {
              const row = expandedBtn.closest('.row') || expandedBtn.closest('div[role="row"]');
              if (row) {
                   fileName = extractFileNameFromRow(row);
                   console.log("NotebookLM Extension: Recovered filename from expanded button:", fileName);
              }
          }
      }

      if (fileName) {
        showFolderSelectionModal(fileName);
      } else {
        // 最后一次尝试：提示用户手动输入或报错
        console.error("NotebookLM Extension: Failed to resolve filename.");
        alert("无法自动获取文件名。请尝试重新刷新页面。");
      }
  });
  
  menuContent.appendChild(separator);
  menuContent.appendChild(menuItem);
}

// --- 文件夹选择弹窗 ---
function showFolderSelectionModal(fileName, batchFileNames = null) {
  const modal = document.createElement('div');
  modal.className = 'nlm-modal-overlay';
  
  const isBatch = !!batchFileNames;
  const targetFiles = isBatch ? batchFileNames : [fileName];
  
  // 如果是批量，不预选任何文件夹（或者预选所有文件共有的？为了简单，暂不预选）
  // 如果是单选，预选当前所在的文件夹
  const currentFolders = isBatch ? [] : (state.fileMappings[fileName] || []);
  
  modal.innerHTML = `
    <div class="nlm-modal">
      <h3 class="nlm-modal-title">${isBatch ? `将 ${targetFiles.length} 个文件加入文件夹` : `将 "${fileName}" 加入文件夹`}</h3>
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
    
    targetFiles.forEach(file => {
         // 批量模式下，我们是“添加”还是“覆盖”？
         // 简单起见，这里是覆盖模式。如果用户想保留之前的，需要手动勾选。
         // 但对于批量操作，通常是“移动到”，意味着归类。
         // 如果用户什么都没选，就是清空文件夹归属。
         state.fileMappings[file] = selected;
    });
    
    saveData();
    modal.remove();
    
    // 如果是批量操作，完成后退出批量模式
    if (isBatch) {
        toggleBatchMode();
    }

    // 刷新 UI：Tags 和 Folders
    renderFileTags();
    renderFolders();

    // 如果当前在看某个文件夹，刷新详情视图
    if (state.activeFolderId !== 'all') showDetailView(state.folders.find(f => f.id === state.activeFolderId));
    alert(isBatch ? `已更新 ${targetFiles.length} 个文件的归类` : `已更新文件夹归类`);
  });
}

// --- 拖拽逻辑 ---
function makeSourcesDraggable() {
  const checkboxes = document.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(checkbox => {
      const row = checkbox.closest('.row') || checkbox.closest('div[role="row"]') || checkbox.parentElement.parentElement;
      if (row && !row.classList.contains('nlm-draggable-processed') && !row.innerText.includes('Select all sources')) {
          row.classList.add('nlm-draggable-processed');
          row.setAttribute('draggable', 'true');
          
          row.addEventListener('dragstart', (e) => {
             const fileName = extractFileNameFromRow(row);
             if (fileName) {
                 e.dataTransfer.setData('text/plain', fileName);
             } else {
                 e.preventDefault(); // 如果没找到文件名，禁止拖拽
             }
          });
      }
  });
}

function addFileToFolder(fileName, folderId) {
  if (!state.fileMappings[fileName]) state.fileMappings[fileName] = [];
  if (!state.fileMappings[fileName].includes(folderId)) {
    state.fileMappings[fileName].push(folderId);
    saveData();
    renderFileTags(); // 立即更新标签
    console.log(`Added "${fileName}" to folder "${folderId}"`);
  }
}

// --- Message Listener for Popup ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getLogs") {
    sendResponse({ logs: DOMService.logBuffer });
  }
});

init();
