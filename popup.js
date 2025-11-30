const draftsContainer = document.getElementById("drafts");
const exportBtn = document.getElementById("export");
const clearAllBtn = document.getElementById("clearAll");

/** Helper to format timestamps into “x min ago” text */
function formatTimeAgo(timestamp) {
    const diffMs = Date.now() - timestamp;
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    return `${diffMin}m ago`;
}

/** Load and render all saved drafts */
function loadDrafts() {
    draftsContainer.innerHTML = "";
    chrome.storage.local.get(null, (items) => {
        const branches = Object.keys(items)
            .filter(k => k.startsWith("bitbucket_pr_description_") && !k.endsWith("_timestamp"))
            .map(k => {
                const branch = k.replace("bitbucket_pr_description_", "");
                // 🔹 Only keep last 10 versions
                const versions = Array.isArray(items[k]) ? items[k].slice(-10) : [];
                return { branch, versions };
            })
            .sort((a, b) => {
                const aLatest = a.versions.length ? a.versions[a.versions.length - 1].timestamp : 0;
                const bLatest = b.versions.length ? b.versions[b.versions.length - 1].timestamp : 0;
                return bLatest - aLatest;
            });

        if (branches.length === 0) {
            draftsContainer.textContent = "No saved drafts found.";
            return;
        }

        branches.forEach(b => {
            const branchContainer = document.createElement("div");
            branchContainer.className = "branch-container";

            // Branch accordion header with Delete Branch button
            const headerWrapper = document.createElement("div");
            headerWrapper.style.display = "flex";
            headerWrapper.style.justifyContent = "space-between";
            headerWrapper.style.alignItems = "center";

            const branchHeader = document.createElement("button");
            branchHeader.className = "accordion";
            branchHeader.textContent = `Branch: ${b.branch}`;
            branchHeader.addEventListener("click", () => {
                branchHeader.classList.toggle("active");
                const wrapper = branchHeader.parentElement;
                const panel = wrapper.nextElementSibling;
                panel.style.display = panel.style.display === "block" ? "none" : "block";
            });

            const deleteBranchBtn = document.createElement("button");
            deleteBranchBtn.textContent = "🗑️ Delete Branch";
            deleteBranchBtn.style.marginLeft = "6px";
            deleteBranchBtn.addEventListener("click", () => {
                if (!confirm(`Delete all versions for branch "${b.branch}"?`)) return;
                const key = `bitbucket_pr_description_${b.branch}`;
                chrome.storage.local.remove([key], loadDrafts);
            });

            headerWrapper.appendChild(branchHeader);
            headerWrapper.appendChild(deleteBranchBtn);

            // Branch panel
            const branchPanel = document.createElement("div");
            branchPanel.className = "panel";
            branchPanel.style.display = "block";

            // Info about version limit
            const infoDiv = document.createElement("div");
            infoDiv.className = "version-limit-info";
            infoDiv.textContent = "Showing last 10 versions";
            branchPanel.appendChild(infoDiv);

            // Show versions (newest first)
            const versions = [...b.versions].reverse();
            versions.forEach((v, idx) => {
                const versionContainer = document.createElement("div");
                versionContainer.className = "version-container";

                // Version header
                const versionHeader = document.createElement("button");
                versionHeader.className = "accordion version-accordion";
                versionHeader.textContent = `Version ${versions.length - idx} • ${formatTimeAgo(v.timestamp)}`;
                versionHeader.addEventListener("click", () => {
                    versionHeader.classList.toggle("active");
                    const panel = versionHeader.nextElementSibling;
                    panel.style.display = panel.style.display === "block" ? "none" : "block";
                });

                // Version panel
                const versionPanel = document.createElement("div");
                versionPanel.className = "panel";
                versionPanel.style.display = "block";

                const textDiv = document.createElement("div");
                textDiv.className = "draft-text";
                textDiv.textContent = v.text;

                const buttonsDiv = document.createElement("div");
                buttonsDiv.className = "button-group";

                const copyBtn = document.createElement("button");
                copyBtn.textContent = "Copy";
                copyBtn.addEventListener("click", () => {
                    navigator.clipboard.writeText(v.text).then(() => {
                        copyBtn.textContent = "Copied!";
                        setTimeout(() => (copyBtn.textContent = "Copy"), 1000);
                    });
                });

                const deleteBtn = document.createElement("button");
                deleteBtn.textContent = "🗑️ Delete";
                deleteBtn.addEventListener("click", () => {
                    const key = `bitbucket_pr_description_${b.branch}`;
                    const filtered = b.versions.filter(x => x !== v).slice(-10); // 🔹 enforce max 10
                    if (filtered.length === 0) {
                        chrome.storage.local.remove([key], loadDrafts);
                    } else {
                        chrome.storage.local.set({ [key]: filtered }, loadDrafts);
                    }
                });

                buttonsDiv.appendChild(copyBtn);
                buttonsDiv.appendChild(deleteBtn);

                versionPanel.appendChild(textDiv);
                versionPanel.appendChild(buttonsDiv);

                versionContainer.appendChild(versionHeader);
                versionContainer.appendChild(versionPanel);

                branchPanel.appendChild(versionContainer);
            });

            branchContainer.appendChild(headerWrapper);
            branchContainer.appendChild(branchPanel);
            draftsContainer.appendChild(branchContainer);
        });
    });
}

/** Export all drafts as plain text file */
exportBtn.addEventListener("click", () => {
    chrome.storage.local.get(null, (items) => {
        const branches = Object.keys(items)
            .filter(k => k.startsWith("bitbucket_pr_description_") && !k.endsWith("_timestamp"))
            .map(k => {
                const branch = k.replace("bitbucket_pr_description_", "");
                const data = Array.isArray(items[k]) ? items[k].slice(-10) : []; // 🔹 last 10
                return { branch, data };
            });

        let content = "Bitbucket PR Drafts Export\n\n";
        branches.forEach(b => {
            content += `=== Branch: ${b.branch} ===\n`;
            const versions = [...b.data].reverse();
            versions.forEach((v, i) => {
                const time = new Date(v.timestamp).toLocaleString();
                content += `Version ${versions.length - i} (${time}):\n${v.text}\n\n`;
            });
        });

        const blob = new Blob([content], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "bitbucket_pr_drafts.txt";
        a.click();
        URL.revokeObjectURL(url);
    });
});

/** Clear all saved drafts */
clearAllBtn.addEventListener("click", () => {
    if (!confirm("Are you sure you want to clear all saved drafts?")) return;
    chrome.storage.local.clear(() => {
        draftsContainer.textContent = "All drafts cleared.";
    });
});

// Initialize popup
loadDrafts();