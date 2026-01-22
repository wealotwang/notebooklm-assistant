
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('log-container');
    const refreshBtn = document.getElementById('refresh');
    const status = document.getElementById('status');

    function fetchLogs() {
        status.textContent = "Fetching logs...";
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs.length === 0) {
                status.textContent = "No active tab found.";
                return;
            }

            chrome.tabs.sendMessage(tabs[0].id, {action: "getLogs"}, (response) => {
                if (chrome.runtime.lastError) {
                    status.textContent = "Error: Please reload the NotebookLM page. (Content script may be old)";
                    container.innerHTML = `<div style="color:red">Connection failed: ${chrome.runtime.lastError.message}</div>`;
                    return;
                }

                if (response && response.logs) {
                    status.textContent = `Updated at ${new Date().toLocaleTimeString()}`;
                    renderLogs(response.logs);
                } else {
                    status.textContent = "No logs received.";
                }
            });
        });
    }

    function renderLogs(logs) {
        container.innerHTML = logs.map(log => {
            // Log format: [Time] Message Data
            const match = log.match(/^\[(.*?)\] (.*)/);
            const time = match ? match[1] : '';
            const content = match ? match[2] : log;
            
            return `
                <div class="log-entry">
                    <span class="log-time">${time}</span>
                    <span>${escapeHtml(content)}</span>
                </div>
            `;
        }).join('');
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    refreshBtn.addEventListener('click', fetchLogs);
    
    // Auto-fetch on open
    fetchLogs();
});
