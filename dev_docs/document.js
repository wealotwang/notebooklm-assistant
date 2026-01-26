document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('log-container');
  const status = document.getElementById('status');
  const refreshBtn = document.getElementById('refresh');

  function fetchLogs() {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (!tabs[0] || !tabs[0].id) {
        status.textContent = "No active tab found.";
        return;
      }
      
      // Send message to content script
      chrome.tabs.sendMessage(tabs[0].id, {action: "getLogs"}, (response) => {
        if (chrome.runtime.lastError) {
          status.textContent = "Error: Please reload the NotebookLM page.";
          container.innerHTML = `<div style="color:red">Content script not connected. Try refreshing the page.</div>`;
          return;
        }

        if (response && response.logs) {
          status.textContent = `Found ${response.logs.length} logs.`;
          renderLogs(response.logs);
        } else {
          status.textContent = "No logs received.";
        }
      });
    });
  }

  function renderLogs(logs) {
    container.innerHTML = logs.map(log => `<div class="log-entry">${escapeHtml(log)}</div>`).join('');
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  refreshBtn.addEventListener('click', fetchLogs);

  // Initial fetch
  fetchLogs();
});