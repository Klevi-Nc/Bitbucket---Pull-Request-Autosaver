# Bitbucket | Pull Request Autosaver Extension

A Chrome Extension that automatically saves your Bitbucket pull-request descriptions, keeps a version history per branch, and provides a UI to browse, copy, or restore previous drafts.
Designed for developers who frequently refine PR descriptions and want reliable autosaving without losing work during navigation, refreshes, crashes, or session timeouts.

⭐ **Features**

**Autosave**

	•	Automatically saves the PR description while typing.
	•	Debounced saving to prevent excessive writes.
	•	Minimum time gap between saves (MIN_SAVE_GAP) to avoid duplicate versions.
	•	Only saves a version if the text actually changed.

**Version History**

	•	Keeps only the last 10 versions per branch.
	•	Older versions are removed automatically.
	•	Fully stored locally (Chrome storage.local).

**Branch-Aware Drafting**

	•	Each Bitbucket branch maintains its own version list.
	•	Switching branches loads the correct history.

**Popup UI - The extension popup displays:**

	•	A list of tracked branches.
	•	Each branch expandable into version history.
	•	“Copy” functionality for each version.
	•	Delete individual versions.
	•	Delete an entire branch’s history.
	•	Export all drafts to a .txt file.
	•	Clear all saved drafts option.

📂 **Project Structure**
 
<img width="576" height="162" alt="Screenshot 2025-12-01 at 10 23 05" src="https://github.com/user-attachments/assets/7796578d-ce75-46e3-b046-673594a7712f" />


🔧 **How It Works**

1. **autosave.js**

Injected into Bitbucket PR pages. Responsibilities:

	•	Detect the PR description editor.
	•	Monitor input events & trigger autosave with debounce.
	•	Save only if text changed and minimum time gap passed.
	•	Enforce 10-version limit per branch.
	•	Restore latest version on load if editor is empty.
	•	Regular cleanup (cleanupOldVersions) runs every 10 seconds.

Key techniques:

	•	MutationObserver for waiting until the editor appears.
	•	Chrome storage.local for durable browser-based saving.
	•	Branch names extracted from Bitbucket URL or UI.

2. **popup.js**

Runs inside extension popup. Responsibilities:

	•	Load all branch histories from storage.
	•	Limit each branch internally to 10 versions (safety fallback).
	•	Render collapsible lists for branches + versions.
	•	Provide delete buttons for individual versions or entire branch.
	•	Export all drafts as a single text file.
	•	Display “Showing last 10 versions” label per branch.
	•	Clear-all functionality.

3. **popup.html**

Defines:

	•	Branch list container.
	•	Export button.
	•	Clear-all button.

4. **popup.css**

Styles the popup to be readable, compact, and scroll-friendly.


🛠 **Installation (Development Mode)**

	1.Clone the repository
    2.Open Chrome → chrome://extensions/
	3.Enable Developer Mode.
	4.Click Load unpacked.
	5.Select this project folder.
	6.Navigate to any Bitbucket PR page to see it in action.

🔐 **Privacy**

This extension:

	•	Stores all data locally on your machine.
	•	Never sends data to external servers.
	•	Never tracks analytics, telemetry, or user activity outside Bitbucket PR descriptions.

🧪 **Known Limitations**

	•	Works only on Bitbucket PR pages (not commits or issues).
	•	Only the default Bitbucket editor is supported (custom editors may not work).

📣 **Contributing**

Pull requests are welcome! Feel free to open issues for bugs or ideas.
