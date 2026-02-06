document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('toggle-logs');
    const logWrapper = document.getElementById('log-wrapper');
    const container = document.getElementById('log-container');
    const refreshBtn = document.getElementById('refresh');
    const status = document.getElementById('status');
    
    let isLogsVisible = false;

    toggleBtn.addEventListener('click', () => {
        isLogsVisible = !isLogsVisible;
        if (isLogsVisible) {
            logWrapper.style.display = 'flex';
            toggleBtn.textContent = '隐藏日志';
            // Only fetch if empty or user specifically asks? 
            // Let's fetch when opened to ensure fresh data.
            fetchLogs();
        } else {
            logWrapper.style.display = 'none';
            toggleBtn.textContent = '查看日志';
        }
        // Resize body automatically by chrome, but we can nudge it if needed
    });

    function fetchLogs() {
        status.textContent = "Fetching logs...";
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs.length === 0) {
                status.textContent = "No active tab found.";
                return;
            }

            chrome.tabs.sendMessage(tabs[0].id, {action: "getLogs"}, (response) => {
                if (chrome.runtime.lastError) {
                    status.textContent = "Error: Please reload the page. (Script may be disconnected)";
                    container.innerHTML = `<div style="color: #d93025; padding: 8px;">Connection failed: ${chrome.runtime.lastError.message}</div>`;
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
        if (logs.length === 0) {
            container.innerHTML = '<div style="color: #888; padding: 8px;">No logs recorded yet.</div>';
            return;
        }
        
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
});