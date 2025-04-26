/**
 * Hover - Background Script
 * Handles extension events and manages extension state
 */

// Default settings
const DEFAULT_SETTINGS = {
    enabled: true,
    renderPlantUML: true,
    renderSVG: true,
    debounceTime: 15000, // 15 seconds
    renderService: 'plantuml' // Options: 'plantuml', 'chatgpt', 'custom'
};

// Initialize settings when extension is installed
chrome.runtime.onInstalled.addListener(({ reason }) => {
    if (reason === 'install') {
        chrome.storage.sync.set({ settings: DEFAULT_SETTINGS });
        console.log('Hover extension installed with default settings');
    }
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'getSettings') {
        chrome.storage.sync.get('settings', (data) => {
            sendResponse({ settings: data.settings || DEFAULT_SETTINGS });
        });
        return true; // Required for asynchronous sendResponse
    }

    if (message.action === 'saveSettings') {
        chrome.storage.sync.set({ settings: message.settings }, () => {
            // Notify all active tabs about settings change
            chrome.tabs.query({}, (tabs) => {
                tabs.forEach(tab => {
                    chrome.tabs.sendMessage(tab.id, { action: 'updateSettings', settings: message.settings })
                        .catch(error => console.log(`Could not update tab ${tab.id}: ${error}`));
                });
            });
            sendResponse({ success: true });
        });
        return true;
    }

    if (message.action === 'sendToChatGPT') {
        // Handle sending content to ChatGPT API
        // This will be implemented in version 2
        sendResponse({ success: false, message: 'ChatGPT integration not implemented yet' });
        return true;
    }

    if (message.action === 'sendToCustomService') {
        // Handle sending content to a custom API
        // This will be implemented based on settings
        sendResponse({ success: false, message: 'Custom service integration not implemented yet' });
        return true;
    }
});

// Extension icon click handler
chrome.action.onClicked.addListener((tab) => {
    // Open the options page when icon is clicked
    chrome.runtime.openOptionsPage();
}); 