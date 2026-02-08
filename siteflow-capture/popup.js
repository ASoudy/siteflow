document.getElementById('exportBtn').addEventListener('click', async () => {
    const status = document.getElementById('status');
    const btn = document.getElementById('exportBtn');

    try {
        btn.disabled = true;
        btn.textContent = 'Exporting...';

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (!tab.id) throw new Error('No active tab');

        // Inject the content script
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
        });

        status.textContent = 'Export started! Check downloads.';
        status.style.display = 'block';
        status.className = '';

        setTimeout(() => {
            btn.disabled = false;
            btn.textContent = 'Export Page';
        }, 2000);

    } catch (err) {
        status.textContent = 'Error: ' + err.message;
        status.style.display = 'block';
        status.className = 'error';
        btn.disabled = false;
        btn.textContent = 'Export Page';
    }
});
