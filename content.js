console.log("NotebookLM Folder Manager: Loaded v2.0 (Menu & Detail View)");

// --- 全局状态 ---
let state = {
  folders: [
    { id: 'all', name: '全部', type: 'system' }
  ],
  fileMappings: {},
  activeFolderId: 'all',
  currentMenuFile: null // 当前正在操作菜单的文件名
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
    mutations.forEach(mutation => {
      // 1. 检查是否需要注入文件夹 UI
      if (!document.querySelector('.nlm-folder-container')) {
        const injectionPoint = findInjectionPoint();
        if (injectionPoint) {
          injectFolderUI(injectionPoint);
          makeSourcesDraggable();
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
          }
        });
      }
    });

    // 持续监听新元素以绑定拖拽
    makeSourcesDraggable();
  });
  observer.observe(document.body, { childList: true, subtree: true });
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
  header.innerHTML = `<span>文件夹分类</span><button class="nlm-add-btn" title="新建文件夹">+</button>`;
  
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
  
  header.querySelector('.nlm-add-btn').addEventListener('click', (e) => {
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
      <div class="nlm-detail-actions">
        <button class="nlm-btn" id="nlm-batch-remove">移出文件夹</button>
      </div>
    </div>
    <ul class="nlm-file-list">
      ${filesInFolder.map(file => `
        <li class="nlm-file-item">
          <input type="checkbox" class="nlm-file-checkbox" data-file="${file}">
          <span class="nlm-file-name">${file}</span>
        </li>
      `).join('')}
    </ul>
    ${filesInFolder.length === 0 ? '<div style="color:#999; padding:20px; text-align:center">暂无文件，请从全部列表拖拽添加，或使用菜单添加。</div>' : ''}
  `;

  // 绑定批量操作
  document.getElementById('nlm-batch-remove')?.addEventListener('click', () => {
    const checked = Array.from(view.querySelectorAll('.nlm-file-checkbox:checked')).map(cb => cb.dataset.file);
    if (checked.length === 0) return alert('请先选择文件');
    if (confirm(`确定要将这 ${checked.length} 个文件移出 "${folder.name}" 吗？`)) {
      checked.forEach(file => {
        state.fileMappings[file] = state.fileMappings[file].filter(id => id !== folder.id);
      });
      saveData();
      showDetailView(folder); // 刷新视图
    }
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
  document.addEventListener('click', (e) => {
    // 1. 监听"三个点"按钮点击 (More options)
    // 尝试找到触发菜单的按钮，通常有 aria-label="More options" 或类似
    const moreBtn = e.target.closest('button'); 
    
    if (moreBtn) {
       // 尝试找到所在的行
       const row = moreBtn.closest('.row') || moreBtn.closest('div[role="row"]');
       if (row) {
           // 尝试获取文件名
           // 策略1: 直接从 innerText 获取第一行
           let fileName = row.innerText.split('\n')[0].trim();
           
           // 策略2: 如果有 aria-label 的 checkbox
           const checkbox = row.querySelector('input[type="checkbox"]');
           if (checkbox && checkbox.getAttribute('aria-label')) {
               fileName = checkbox.getAttribute('aria-label');
           }

           if (fileName) {
               state.currentMenuFile = fileName;
               console.log("NotebookLM Extension: Detected click on file:", state.currentMenuFile);
           }
       }
    }
  }, true); // Capture phase
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
function showFolderSelectionModal(fileName) {
  const modal = document.createElement('div');
  modal.className = 'nlm-modal-overlay';
  
  const currentFolders = state.fileMappings[fileName] || [];
  
  modal.innerHTML = `
    <div class="nlm-modal">
      <h3 class="nlm-modal-title">将 "${fileName}" 加入文件夹</h3>
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
    state.fileMappings[fileName] = selected;
    saveData();
    modal.remove();
    // 如果当前在看某个文件夹，刷新一下
    if (state.activeFolderId !== 'all') showDetailView(state.folders.find(f => f.id === state.activeFolderId));
    alert(`已更新文件夹归类`);
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
