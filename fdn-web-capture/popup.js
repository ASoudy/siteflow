
document.getElementById('exportBtn').addEventListener('click', async () => {
    const status = document.getElementById('status');
    const btn = document.getElementById('exportBtn');
    const originalBtnText = btn.innerHTML;

    try {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> Exporting...';
        status.className = '';
        status.innerHTML = '';

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (!tab?.id) throw new Error('No active tab found');

        // executeScript to run content.js
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
        });

        // Success state
        status.className = 'show success';
        status.innerHTML = `
            <svg style="width:16px;height:16px;fill:currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
            Export started! Check downloads.
        `;

        setTimeout(() => {
            btn.disabled = false;
            btn.innerHTML = originalBtnText;
        }, 3000);

    } catch (err) {
        console.error(err);
        status.className = 'show error';
        status.innerHTML = `
            <svg style="width:16px;height:16px;fill:currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
            ${err.message}
        `;

        btn.disabled = false;
        btn.innerHTML = originalBtnText;
    }
});
