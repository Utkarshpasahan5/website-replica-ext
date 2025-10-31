// Background service worker for the Page Replica Generator extension
console.log('Page Replica Generator background script loaded');

// Handle extension installation and updates
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        console.log('Extension installed successfully');
        // Set default badge
        chrome.action.setBadgeBackgroundColor({ color: '#4f46e5' });
    } else if (details.reason === 'update') {
        const manifest = chrome.runtime.getManifest();
        console.log('Extension updated to version:', manifest.version);
    }
});

// Handle messages from popup or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Background received message:', request.action);

    // Capture screenshot of visible tab
    if (request.action === 'captureScreenshot') {
        // Ensure we have permission
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs || tabs.length === 0) {
                sendResponse({
                    success: false,
                    error: 'No active tab found'
                });
                return;
            }

            const tab = tabs[0];

            // Check if it's a chrome:// page
            if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
                sendResponse({
                    success: false,
                    error: 'Cannot capture Chrome system pages'
                });
                return;
            }

            // Capture the visible area
            chrome.tabs.captureVisibleTab(
                null,
                { format: 'png', quality: 100 },
                (dataUrl) => {
                    if (chrome.runtime.lastError) {
                        console.error('Screenshot error:', chrome.runtime.lastError);
                        sendResponse({
                            success: false,
                            error: chrome.runtime.lastError.message
                        });
                    } else {
                        console.log('Screenshot captured successfully');
                        sendResponse({
                            success: true,
                            dataUrl: dataUrl
                        });
                    }
                }
            );
        });
        return true; // Keep message channel open for async response
    }

    // Get active tab information
    if (request.action === 'getActiveTab') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs && tabs.length > 0) {
                sendResponse({
                    success: true,
                    tab: tabs[0]
                });
            } else {
                sendResponse({
                    success: false,
                    error: 'No active tab found'
                });
            }
        });
        return true; // Keep message channel open for async response
    }

    return false;
});

// Monitor storage changes for API key updates
chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'sync' && changes.geminiApiKey) {
        console.log('Gemini API key updated');

        if (changes.geminiApiKey.newValue) {
            // Show success badge
            chrome.action.setBadgeText({ text: '✓' });
            chrome.action.setBadgeBackgroundColor({ color: '#10b981' });
            
            // Clear badge after 2 seconds
            setTimeout(() => {
                chrome.action.setBadgeText({ text: '' });
            }, 2000);
        } else {
            // API key was removed
            chrome.action.setBadgeText({ text: '' });
        }
    }
});

// Handle extension icon click (optional - for debugging)
chrome.action.onClicked.addListener((tab) => {
    console.log('Extension icon clicked for tab:', tab.id);
});

console.log('Background script initialization complete');