console.log("NotebookLM Folder Manager: Loaded v2.0 (Menu & Detail View)");

// --- 全局状态 ---
let state = {
  folders: [
    { id: 'all', name: '全部', type: 'system' }
  ],
  fileMappings: {},
  activeFolderId: 'all',
  currentMenuFile: null, // 当前正在操作菜单的文件名
  isBatchMode: false,
  selectedBatchFiles: new Set()
};

// --- 初始化 ---
function init() {
  loadData(() => {
    startObserver();
    setupGlobalClickListener(); // 监听全局点击以捕获菜单
  });
}

function loadData(callback) {
  chrome.storage.local.get(['nlm_folders', 'nlm_mappings'], (result) => {
    if (result.nlm_folders) {
      state.folders = result.nlm_folders;
    } else {
      state.folders = [
        { id: 'all', name: '全部', type: 'system' },
        { id: 'wiki', name: '产品Wiki', type: 'user' },
        { id: 'learning', name: '个人学习', type: 'user' }
      ];
      saveData();
    }
    if (result.nlm_mappings) state.fileMappings = result.nlm_mappings;
    if (callback) callback();
  });
}

function saveData() {
  chrome.storage.local.set({
    'nlm_folders': state.folders,
    'nlm_mappings': state.fileMappings
  });
}

// --- DOM 监听 ---
function startObserver() {
  const observer = new MutationObserver((mutations) => {
    let shouldUpdateDraggable = false;
    let shouldUpdateBatch = false;
    let shouldUpdateTags = false;

    mutations.forEach(mutation => {
      // 0. 忽略我们自己 UI 元素的变动，防止死循环
      if (mutation.target.closest && (
          mutation.target.closest('.nlm-batch-toolbar') || 
          mutation.target.closest('.nlm-folder-container') ||
          mutation.target.closest('.nlm-modal-overlay') ||
          mutation.target.closest('.nlm-tags-container') // 忽略标签容器
      )) return;
      
      if (mutation.target.classList && (
          mutation.target.classList.contains('nlm-batch-checkbox') ||
          mutation.target.classList.contains('nlm-file-tag')
      )) return;

      // 检查新增节点是否包含我们的元素
      const isInternalChange = Array.from(mutation.addedNodes).some(node => 
        node.nodeType === 1 && (
            node.classList.contains('nlm-batch-checkbox') ||
            node.classList.contains('nlm-file-tag') ||
            node.classList.contains('nlm-folder-container') ||
            node.classList.contains('nlm-tags-container')
        )
      );
      if (isInternalChange) return;

      // 1. 检查是否需要注入文件夹 UI
      if (!document.querySelector('.nlm-folder-container')) {
        const injectionPoint = findInjectionPoint();
        if (injectionPoint) {
          injectFolderUI(injectionPoint);
          shouldUpdateDraggable = true;
        }
      }
      
      // 2. 检查是否有菜单被添加 (Angular Material Menu)
      if (mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) { // Element node
            // 检查直接添加的节点是否是菜单内容
            if (node.classList && (node.classList.contains('mat-mdc-menu-content') || node.classList.contains('mat-mdc-menu-panel'))) {
              injectMenuItem(node);
            }
            // 或者在子树中查找
            const menuContent = node.querySelector ? node.querySelector('.mat-mdc-menu-content') : null;
            if (menuContent) {
              injectMenuItem(menuContent);
            }
            
            // 标记需要更新
            shouldUpdateDraggable = true;
            shouldUpdateTags = true;
            if (state.isBatchMode) shouldUpdateBatch = true;
          }
        });
      }
    });

    // 批量执行更新
    if (shouldUpdateDraggable) makeSourcesDraggable();
    if (shouldUpdateBatch) updateBatchUI();
    if (shouldUpdateTags || document.querySelectorAll('.row, div[role="row"]').length > 0) {
        // 总是尝试更新标签，因为初始化时也需要
        // 使用 debounce 避免过于频繁
        if (!state.renderTagsTimer) {
            state.renderTagsTimer = setTimeout(() => {
                renderFileTags();
                state.renderTagsTimer = null;
            }, 100);
        }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  
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
    
    const btn = document.querySelector('.nlm-batch-toggle');
    if (btn) {
        btn.style.color = state.isBatchMode ? '#1a73e8' : '#5f6368';
        btn.style.backgroundColor = state.isBatchMode ? 'rgba(26, 115, 232, 0.1)' : 'transparent';
    }
    
    updateBatchUI();
}

function updateBatchUI() {
    // 1. 注入或移除 Checkboxes
    // 我们复用 makeSourcesDraggable 里的逻辑来寻找 rows，但要更通用
    const rows = document.querySelectorAll('.row, div[role="row"]');
    
    rows.forEach(row => {
        // 排除 Select All 行
        if (row.innerText.includes('Select all sources')) return;

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
                        if (e.target.checked) state.selectedBatchFiles.add(fileName);
                        else state.selectedBatchFiles.delete(fileName);
                        renderBatchToolbar();
                    }
                });
                
                // 插入到最前面
                row.insertBefore(cb, row.firstChild);
            }
        } else {
            if (existingCb) existingCb.remove();
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
    
    li.innerHTML = `<svg class="nlm-icon" viewBox="0 0 24 24"><path d="${iconPath}"/></svg><span>${folder.name}</span>`;
    
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

// --- 原生选择同步辅助函数 ---
// 新：基于视图状态的全量同步（实现"独占/排他"选择逻辑）
function syncNativeSelectionFromView(view) {
    // 1. 获取 View 中所有被选中的文件名
    const selectedFiles = new Set(
        Array.from(view.querySelectorAll('.nlm-file-checkbox:checked'))
             .map(cb => cb.dataset.file)
    );

    // 2. 遍历原生列表，强制同步状态
    const rows = document.querySelectorAll('.row, div[role="row"]');
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

function clearNativeSelection() {
    // 保留此函数用于"全选"时的清理，虽然 syncNativeSelectionFromView 也能覆盖此逻辑，
    // 但为了逻辑清晰，或者全选时我们可以直接构造一个全量的 Set 传给 sync 逻辑。
    // 实际上，showDetailView 里全选逻辑也可以用 syncNativeSelectionFromView 接管。
    // 暂时保留，以防万一。
    const selectAllInput = document.querySelector('input[type="checkbox"][aria-label="Select all sources"]');
    if (selectAllInput && isChecked(selectAllInput)) {
        safeClick(selectAllInput);
    }
    
    const rows = document.querySelectorAll('.row, div[role="row"]');
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
    const rows = document.querySelectorAll('.row, div[role="row"]');
    for (let row of rows) {
        if (row.closest('.nlm-folder-container')) continue;
        if (row.querySelector('input[aria-label="Select all sources"]')) continue;
        
        const rowFileName = extractFileNameFromRow(row);
        if (rowFileName === fileName) {
            const cb = row.querySelector('input[type="checkbox"]');
            return cb && !cb.classList.contains('nlm-batch-checkbox') && !cb.classList.contains('nlm-file-checkbox') && isChecked(cb);
        }
    }
    return false;
}

// 辅助：检查 Checkbox 是否选中 (兼容 Angular Material/MDC)
function isChecked(checkbox) {
    return checkbox.checked || 
           checkbox.classList.contains('mdc-checkbox--selected') || 
           checkbox.getAttribute('aria-checked') === 'true';
}

// 辅助：安全点击 (兼容框架事件监听)
function safeClick(element) {
    element.click();
    // 某些框架可能监听 input 事件或 change 事件
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
          checkboxes.forEach(cb => cb.checked = isChecked);
          
          // 同步到原生列表 (全量同步)
          syncNativeSelectionFromView(view);
      });
  }
  
  // 绑定单个文件 Checkbox 变化
  view.addEventListener('change', (e) => {
      if (e.target.classList.contains('nlm-file-checkbox')) {
          // 更新全选框状态
          const all = view.querySelectorAll('.nlm-file-checkbox');
          const allChecked = Array.from(all).every(cb => cb.checked);
          if (selectAllCb) selectAllCb.checked = allChecked;

          // 同步到原生列表 (全量同步)
          syncNativeSelectionFromView(view);
      }
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
}

function renderFileTags() {
    const rows = document.querySelectorAll('.row, div[role="row"]');
    rows.forEach(row => {
        if (row.innerText.includes('Select all sources')) return;
        
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
                 row.appendChild(container);
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

// --- 菜单注入逻辑 ---
function setupGlobalClickListener() {
  // 使用 mousedown 而不是 click，以确保在事件被 Angular 阻止前捕获
  document.addEventListener('mousedown', (e) => {
    // 1. 记录最后点击的按钮 (用于 fallback)
    const btn = e.target.closest('button');
    if (btn) {
        state.lastClickedButton = btn;
        console.log("NotebookLM Extension: Button clicked", btn);
    }

    // 2. 尝试从点击位置向上查找可能的容器
    let target = e.target;
    let container = null;
    
    // 向上查找 5 层，寻找包含文本的块级元素
    for (let i = 0; i < 5; i++) {
        if (!target || target === document.body) break;
        
        // 如果遇到明确的 row 标识
        if (target.classList.contains('row') || target.getAttribute('role') === 'row') {
            container = target;
            break;
        }
        // 或者只要包含 checkbox 的 div 也可以认为是容器
        if (target.querySelector('input[type="checkbox"]')) {
            container = target;
            break;
        }
        target = target.parentElement;
    }

    if (container) {
       // 尝试提取文件名并缓存
       const fileName = extractFileNameFromRow(container);
       if (fileName) {
           state.currentMenuFile = fileName;
           console.log("NotebookLM Extension: Captured interaction with file:", fileName);
       }
    } else if (btn) {
        // 如果没找到容器，但点的是按钮，尝试从按钮的兄弟节点找
        // 通常文件名在按钮的左侧（前面的兄弟节点）
        const fileName = guessFileNameFromSiblings(btn);
        if (fileName) {
            state.currentMenuFile = fileName;
            console.log("NotebookLM Extension: Guessed filename from siblings:", fileName);
        }
    }
  }, true); // Capture phase
}

function guessFileNameFromSiblings(element) {
    let current = element;
    // 向上找几层，每一层都看看前面有没有兄弟节点包含文本
    for (let i = 0; i < 3; i++) {
        if (!current || current === document.body) break;
        
        let sibling = current.previousElementSibling;
        while (sibling) {
            if (sibling.innerText && sibling.innerText.trim().length > 0) {
                // 排除一些显然不是文件名的词
                const text = sibling.innerText.trim();
                if (text !== "more_vert" && text !== "Source" && !text.includes("ago")) {
                    return text.split('\n')[0].trim();
                }
            }
            sibling = sibling.previousElementSibling;
        }
        current = current.parentElement;
    }
    return null;
}

function extractFileNameFromRow(row) {
    // 策略1: 优先查找可视化的标题元素 (.source-title)
    // 这是用户所见的内容，最准确
    const titleSpan = row.querySelector('.source-title');
    if (titleSpan) {
        return titleSpan.textContent.trim();
    }

    // 策略2: 查找带有 aria-label 的 checkbox
    // 注意：aria-label 可能会包含 "Select " 前缀，需要小心处理
    // 但在 NotebookLM 中，通常它就是文件名
    const checkbox = row.querySelector('input[type="checkbox"]');
    if (checkbox && checkbox.getAttribute('aria-label')) {
        let label = checkbox.getAttribute('aria-label');
        if (label === "Select all sources") return null; // 忽略全选框
        return label;
    }
    
    // 策略3: 查找 span[class*="title"] (备用)
    const backupTitle = row.querySelector('span[class*="title"]');
    if (backupTitle) {
        return backupTitle.textContent.trim();
    }

    // 策略4: 遍历所有子元素，找第一个看起来像文件名的文本
    // 排除 checkbox, button, icon
    const walker = document.createTreeWalker(row, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while(node = walker.nextNode()) {
        const text = node.textContent.trim();
        if (text.length > 0 && text.length < 100) { // 假设文件名不会太长
             // 简单的过滤
             if (['more_vert', 'check_box_outline_blank', 'check_box'].includes(text)) continue;
             return text;
        }
    }

    // 策略4: 回退到 innerText
    let text = row.innerText.split('\n')[0].trim();
    if (!text && row.innerText.split('\n')[1]) {
        text = row.innerText.split('\n')[1].trim();
    }
    return text;
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

    // 如果当前在看某个文件夹，刷新一下
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
             // 优先使用 aria-label
             let text = checkbox.getAttribute('aria-label');
             if (!text) {
                text = row.innerText.split('\n')[0].trim(); 
             }
             e.dataTransfer.setData('text/plain', text);
          });
      }
  });
}

function addFileToFolder(fileName, folderId) {
  if (!state.fileMappings[fileName]) state.fileMappings[fileName] = [];
  if (!state.fileMappings[fileName].includes(folderId)) {
    state.fileMappings[fileName].push(folderId);
    saveData();
    console.log(`Added "${fileName}" to folder "${folderId}"`);
  }
}

init();
