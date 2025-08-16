/**
 * Hover - Options Script
 * Manages the extension options page and advanced settings
 */

// DOM Elements - General
const customCSSTextarea = document.getElementById('customCSS');
const triggerSelectorInput = document.getElementById('triggerSelector');
const popupWidthInput = document.getElementById('popupWidth');
const popupHeightInput = document.getElementById('popupHeight');

// DOM Elements - PlantUML
const plantUmlServerInput = document.getElementById('plantUmlServer');
const plantUmlFormatSelect = document.getElementById('plantUmlFormat');

// DOM Elements - ChatGPT (disabled in version 1)
// const openaiApiKeyInput = document.getElementById('openaiApiKey');
// const chatgptModelSelect = document.getElementById('chatgptModel');
// const chatgptPromptTextarea = document.getElementById('chatgptPrompt');

// DOM Elements - Custom API
const customApiUrlInput = document.getElementById('customApiUrl');
const customApiMethodSelect = document.getElementById('customApiMethod');
const customApiHeadersTextarea = document.getElementById('customApiHeaders');
const customApiBodyTextarea = document.getElementById('customApiBody');
const customApiResponseTypeSelect = document.getElementById('customApiResponseType');
const customApiResponseFieldInput = document.getElementById('customApiResponseField');

// DOM Elements - Buttons
const saveButton = document.getElementById('saveButton');
const resetButton = document.getElementById('resetButton');

// Default Advanced Settings
const DEFAULT_ADVANCED_SETTINGS = {
    general: {
        customCSS: '',
        triggerSelector: 'pre code, .language-plantuml, .language-svg',
        popupWidth: 400,
        popupHeight: 400,
    },
    plantuml: {
        server: 'https://www.plantuml.com/plantuml',
        format: 'svg',
    },
    chatgpt: {
        apiKey: '',
        model: 'gpt-4',
        promptTemplate: 'Analyze the following code/diagram: {{CODE}}',
    },
    customApi: {
        url: '',
        method: 'POST',
        headers: '{"Content-Type": "application/json"}',
        bodyTemplate: '{"code": "{{CODE}}", "format": "svg"}',
        responseType: 'image-url',
        responseField: 'data.imageUrl',
    },
};

// Initialize options page with current settings
function initOptions() {
    chrome.storage.sync.get(['settings', 'advancedSettings'], (data) => {
        const settings = data.settings || {};
        const advancedSettings = data.advancedSettings || DEFAULT_ADVANCED_SETTINGS;

        // Fill General settings
        customCSSTextarea.value = advancedSettings.general.customCSS || '';
        triggerSelectorInput.value = advancedSettings.general.triggerSelector || DEFAULT_ADVANCED_SETTINGS.general.triggerSelector;
        popupWidthInput.value = advancedSettings.general.popupWidth || DEFAULT_ADVANCED_SETTINGS.general.popupWidth;
        popupHeightInput.value = advancedSettings.general.popupHeight || DEFAULT_ADVANCED_SETTINGS.general.popupHeight;

        // Fill PlantUML settings
        plantUmlServerInput.value = advancedSettings.plantuml.server || DEFAULT_ADVANCED_SETTINGS.plantuml.server;
        plantUmlFormatSelect.value = advancedSettings.plantuml.format || DEFAULT_ADVANCED_SETTINGS.plantuml.format;

        // Fill ChatGPT settings (disabled in version 1)
        // openaiApiKeyInput.value = advancedSettings.chatgpt.apiKey || '';
        // chatgptModelSelect.value = advancedSettings.chatgpt.model || DEFAULT_ADVANCED_SETTINGS.chatgpt.model;
        // chatgptPromptTextarea.value = advancedSettings.chatgpt.promptTemplate || DEFAULT_ADVANCED_SETTINGS.chatgpt.promptTemplate;

        // Fill Custom API settings
        customApiUrlInput.value = advancedSettings.customApi.url || '';
        customApiMethodSelect.value = advancedSettings.customApi.method || DEFAULT_ADVANCED_SETTINGS.customApi.method;
        customApiHeadersTextarea.value = advancedSettings.customApi.headers || DEFAULT_ADVANCED_SETTINGS.customApi.headers;
        customApiBodyTextarea.value = advancedSettings.customApi.bodyTemplate || DEFAULT_ADVANCED_SETTINGS.customApi.bodyTemplate;
        customApiResponseTypeSelect.value = advancedSettings.customApi.responseType || DEFAULT_ADVANCED_SETTINGS.customApi.responseType;
        customApiResponseFieldInput.value = advancedSettings.customApi.responseField || DEFAULT_ADVANCED_SETTINGS.customApi.responseField;
    });
}

// Save advanced settings
function saveAdvancedSettings() {
    try {
        // Get current basic settings first
        chrome.storage.sync.get('settings', (data) => {
            const settings = data.settings || {};

            // Prepare advanced settings object
            const advancedSettings = {
                general: {
                    customCSS: customCSSTextarea.value,
                    triggerSelector: triggerSelectorInput.value,
                    popupWidth: Number(popupWidthInput.value),
                    popupHeight: Number(popupHeightInput.value),
                },
                plantuml: {
                    server: plantUmlServerInput.value,
                    format: plantUmlFormatSelect.value,
                },
                chatgpt: {
                    apiKey: '', // Disabled in version 1
                    model: 'gpt-4',
                    promptTemplate: 'Analyze the following code/diagram: {{CODE}}',
                },
                customApi: {
                    url: customApiUrlInput.value,
                    method: customApiMethodSelect.value,
                    headers: customApiHeadersTextarea.value,
                    bodyTemplate: customApiBodyTextarea.value,
                    responseType: customApiResponseTypeSelect.value,
                    responseField: customApiResponseFieldInput.value,
                },
            };

            // Save to storage
            chrome.storage.sync.set({ advancedSettings }, () => {
                showMessage('Settings saved successfully!', 'success');

                // Notify tabs about the update
                chrome.tabs.query({}, (tabs) => {
                    tabs.forEach(tab => {
                        chrome.tabs.sendMessage(tab.id, {
                            action: 'updateAdvancedSettings',
                            advancedSettings
                        }).catch(() => {
                            // Ignoring errors for inactive tabs
                        });
                    });
                });
            });
        });
    } catch (error) {
        showMessage(`Error saving settings: ${error.message}`, 'error');
    }
}

// Reset to default settings
function resetSettings() {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
        chrome.storage.sync.set({
            advancedSettings: DEFAULT_ADVANCED_SETTINGS
        }, () => {
            initOptions();
            showMessage('Settings have been reset to defaults', 'success');
        });
    }
}

// Show status message
function showMessage(message, type = 'success') {
    // Remove existing message if any
    const existingMessage = document.querySelector('.status-message');
    if (existingMessage) {
        existingMessage.remove();
    }

    // Create message element
    const messageElement = document.createElement('div');
    messageElement.classList.add('status-message');
    messageElement.textContent = message;
    messageElement.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 10px 20px;
    border-radius: 4px;
    color: white;
    font-weight: bold;
    z-index: 9999;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  `;

    if (type === 'success') {
        messageElement.style.backgroundColor = '#4CAF50';
    } else if (type === 'error') {
        messageElement.style.backgroundColor = '#F44336';
    }

    document.body.appendChild(messageElement);

    // Remove after 3 seconds
    setTimeout(() => {
        messageElement.remove();
    }, 3000);
}

// Tab switching functionality
function setupTabs() {
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Deactivate all tabs
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // Activate clicked tab
            tab.classList.add('active');
            const tabId = tab.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    initOptions();
    setupTabs();
});
saveButton.addEventListener('click', saveAdvancedSettings);
resetButton.addEventListener('click', resetSettings); 