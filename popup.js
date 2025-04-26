/**
 * Hover - Popup Script
 * Manages the extension popup UI and user interactions
 */

// DOM Elements
const enabledToggle = document.getElementById('enabled');
const renderPlantUMLToggle = document.getElementById('renderPlantUML');
const renderSVGToggle = document.getElementById('renderSVG');
const debounceTimeInput = document.getElementById('debounceTime');
const renderServiceSelect = document.getElementById('renderService');
const saveButton = document.getElementById('saveButton');
const optionsButton = document.getElementById('optionsButton');

// Initialize popup with current settings
function initPopup() {
    chrome.runtime.sendMessage({ action: 'getSettings' }, ({ settings }) => {
        if (settings) {
            enabledToggle.checked = settings.enabled;
            renderPlantUMLToggle.checked = settings.renderPlantUML;
            renderSVGToggle.checked = settings.renderSVG;
            debounceTimeInput.value = settings.debounceTime / 1000; // Convert ms to seconds
            renderServiceSelect.value = settings.renderService;

            // Disable options based on the enabled state
            toggleOptionsState(settings.enabled);
        }
    });
}

// Save settings
function saveSettings() {
    const settings = {
        enabled: enabledToggle.checked,
        renderPlantUML: renderPlantUMLToggle.checked,
        renderSVG: renderSVGToggle.checked,
        debounceTime: Number(debounceTimeInput.value) * 1000, // Convert seconds to ms
        renderService: renderServiceSelect.value
    };

    chrome.runtime.sendMessage({ action: 'saveSettings', settings }, ({ success }) => {
        if (success) {
            // Show success message
            const message = document.createElement('div');
            message.textContent = 'Settings saved!';
            message.style.cssText = `
        background-color: #4CAF50;
        color: white;
        padding: 10px;
        text-align: center;
        margin-top: 10px;
        border-radius: 4px;
      `;
            document.querySelector('.container').appendChild(message);

            // Remove message after 2 seconds
            setTimeout(() => {
                message.remove();
            }, 2000);
        }
    });
}

// Toggle the enabled state of options
function toggleOptionsState(enabled) {
    renderPlantUMLToggle.disabled = !enabled;
    renderSVGToggle.disabled = !enabled;
    debounceTimeInput.disabled = !enabled;
    renderServiceSelect.disabled = !enabled;
}

// Open the options page
function openOptionsPage() {
    chrome.runtime.openOptionsPage();
}

// Event Listeners
document.addEventListener('DOMContentLoaded', initPopup);
saveButton.addEventListener('click', saveSettings);
optionsButton.addEventListener('click', openOptionsPage);
enabledToggle.addEventListener('change', () => toggleOptionsState(enabledToggle.checked)); 