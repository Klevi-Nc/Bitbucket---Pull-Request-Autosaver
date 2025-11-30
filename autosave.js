console.log("Bitbucket PR Autosave active");

const SAVE_INTERVAL = 7000; // auto-save every 7s
const DEBOUNCE_MS = 1500;   // debounce for typing
const MAX_VERSIONS = 10;

let editorEl = null;
let lastSavedText = "";
let lastSaveTime = 0;
let saveTimeout = null;

// In-memory store per branch
const branchVersions = {};

// Minimum gap between saves (ms)
const MIN_SAVE_GAP = 5000;

// Get current branch name
function getBranchName() {
    try {
        const params = new URLSearchParams(window.location.search);
        const ref = params.get("sourceBranch");
        if (ref) return decodeURIComponent(ref).split("/").pop();

        const el = document.querySelector('[data-testid="source-branch-name"]');
        if (el) return el.textContent.trim();

        return "default"; // fallback
    } catch (e) {
        console.warn("Failed to get branch name:", e);
        return "default";
    }
}

// Get storage key
function getStorageKey(branchName) {
    return `bitbucket_pr_description_${branchName}`;
}

// Get editor text
function getEditorText() {
    return editorEl ? editorEl.innerText.trim() : "";
}

// Set editor text
function setEditorText(text) {
    if (editorEl) editorEl.innerText = text;
}

// Save description as a new version (in-memory + storage)
function saveDescription() {
    if (!editorEl) return;

    const branchName = getBranchName();
    if (!branchName) return;

    const newText = getEditorText();
    if (!newText) return;

    const now = Date.now();

    // Don't save if text unchanged and minimum gap not passed
    if (newText === lastSavedText && now - lastSaveTime < MIN_SAVE_GAP) return;

    lastSavedText = newText;
    lastSaveTime = now;

    // Load in-memory versions or initialize
    if (!branchVersions[branchName]) branchVersions[branchName] = [];
    const versions = branchVersions[branchName];

    const lastVersion = versions[versions.length - 1];
    if (!lastVersion || lastVersion.text !== newText) {
        versions.push({ text: newText, timestamp: now });

        // Keep only last 10 versions
        if (versions.length > MAX_VERSIONS) {
            branchVersions[branchName] = versions.slice(-MAX_VERSIONS);
        }

        // Write sliced array to storage
        chrome.storage.local.set({ [getStorageKey(branchName)]: branchVersions[branchName] }, () => {
            console.log(`Saved version for branch "${branchName}". Total versions: ${branchVersions[branchName].length}`);
        });
    }
}

// Restore latest version if editor empty
function restoreDescription() {
    const branchName = getBranchName();
    const key = getStorageKey(branchName);

    chrome.storage.local.get([key], (result) => {
        const versions = Array.isArray(result[key]) ? result[key] : [];
        branchVersions[branchName] = versions;

        if (versions.length > 0 && editorEl && !editorEl.innerText.trim()) {
            const lastVersion = versions[versions.length - 1];
            setEditorText(lastVersion.text);
            lastSavedText = lastVersion.text;
            console.log(`Restored latest version for branch "${branchName}"`);
        }
    });
}

// Initialize autosave
function initAutosave() {
    editorEl = document.querySelector('.CodeMirror-code[contenteditable="true"]');
    if (!editorEl) return;

    restoreDescription();

    editorEl.addEventListener("input", () => {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(saveDescription, DEBOUNCE_MS);
    });

    setInterval(saveDescription, SAVE_INTERVAL);

    // Periodically ensure storage never exceeds MAX_VERSIONS (safety)
    setInterval(() => {
        for (const branchName in branchVersions) {
            const versions = branchVersions[branchName];
            if (versions.length > MAX_VERSIONS) {
                branchVersions[branchName] = versions.slice(-MAX_VERSIONS);
                chrome.storage.local.set({ [getStorageKey(branchName)]: branchVersions[branchName] });
            }
        }
    }, 10000); // every 10s
}

// Observe editor appearance
const observer = new MutationObserver(() => {
    if (document.querySelector('.CodeMirror-code[contenteditable="true"]')) {
        observer.disconnect();
        initAutosave();
    }
});
observer.observe(document.body, { childList: true, subtree: true });