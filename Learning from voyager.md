
## 2026-01-24: Timeline Implementation Journey & Review
**Session Goal:** Implement a Voyager-style "Timeline Scrollbar" for NotebookLM to facilitate quick navigation of user queries.

### 1. Evolution of Architecture
*   **Initial Approach (v2.1.18):**
    *   Injected `.nlm-timeline-bar` directly into `document.body` with `position: fixed`.
    *   *Issue:* The timeline was visually detached from the Chat Panel, especially when the right-side Studio panel was toggled.
*   **Refined Approach (v2.1.19):**
    *   Moved injection target to the **parent of `.chat-panel-content`**.
    *   Changed positioning to `position: absolute; right: 10px; height: 100%`.
    *   Forced `position: relative` on the parent container.
    *   *Result:* The timeline now perfectly adheres to the Chat Panel's edge, resizing and moving with it naturally.

### 2. UI/UX Refinements
*   **Visual Indicators:**
    *   Switched from generic "Dots" to **Left-Pointing Triangles** (`.nlm-timeline-dot::after` with CSS borders).
    *   This provides a stronger semantic cue that the marker relates to the content on the left.
*   **Tooltip Evolution:**
    *   **v1:** Simple `title` attribute (native browser tooltip, slow and unstyled).
    *   **v2:** Custom `.nlm-timeline-tooltip` with fixed 200px width (caused vertical stacking).
    *   **v3 (Final):** **Adaptive Width Strategy**.
        *   `width: max-content` + `max-width: 400px`.
        *   `min-width: 60px`.
        *   Used `white-space: pre-wrap` for proper text rendering.
        *   Applied `line-clamp: 3` to limit vertical height while showing sufficient context (~50-60 chars).

### 3. Robustness & Engineering
*   **DOM Sentinel:** Implemented a `MutationObserver` on `document.body` to wait for the Chat Panel to exist before initializing, solving "script run too early" issues.
*   **Reactivity:** The timeline automatically updates when:
    *   New messages are generated (MutationObserver).
    *   Window is resized (ResizeObserver).
    *   User scrolls (Scroll Event).

### 4. Versioning
*   **v2.1.18**: MVP Release.
*   **v2.1.19**: Layout fix (Absolute positioning) & Triangle shapes.
*   **v2.1.20**: Adaptive Tooltip sizing.

## 2026-01-24: Folder Isolation & Source Type Compatibility Review
**Session Goal:** Enhance Folder Manager robustness, support SPA navigation, and fix compatibility with diverse source types (YouTube, PDF).

### 1. Data Isolation Strategy (v2.1.21)
*   **Problem:** Folder data was global. Folders created in "Notebook A" appeared in "Notebook B", leading to confusion and data pollution.
*   **Technical Challenge:** NotebookLM is a Single Page Application (SPA). Switching notebooks changes the URL but doesn't refresh the page, so the extension script doesn't automatically restart.
*   **Solution:**
    *   **Context Awareness:** Implemented `getNotebookId()` to parse the URL.
    *   **Namespacing:** Changed storage keys from `nlm_folders` to `nlm_folders_${notebookId}`.
    *   **SPA Listener:** Added a global `MutationObserver` on `document` to watch for URL changes, triggering a full data reload and UI reset when context changes.

### 2. UX Optimization: Deletion (v2.1.22)
*   **Problem:** Deleting folders required right-clicking, which was hidden and unintuitive.
*   **Solution:**
    *   Added an explicit **"×" button** on the active folder chip.
    *   **Event Handling:** Used `e.stopPropagation()` strictly to ensure clicking "Delete" didn't mistakenly trigger "Select Folder".
    *   **Safety:** Added `confirm()` dialogs to prevent accidental deletion.

### 3. "The Invisible Update" Bug (v2.1.23)
*   **Problem:** Users reported that after moving a file to a folder via the menu, nothing happened.
*   **Analysis:** The data *was* saved, but the UI (the blue tags next to files) wasn't repainting.
*   **Fix:**
    *   Traced the `showFolderSelectionModal` save handler.
    *   Explicitly added calls to `renderFileTags()` and `renderFolders()` immediately after data save.
    *   Result: "Instant gratification" UI updates.

### 4. Universal Source Support (v2.1.24)
*   **Problem:** YouTube links, PDFs, and Audio files were **ignored** by the Batch Manager and Folder Tags.
*   **Root Cause:** The extension relied on looking for `.row` elements. NotebookLM renders these special sources as standalone `.single-source-container` elements *without* a wrapper row.
*   **Solution:**
    *   **New Abstraction:** Created `getAllSourceRows()` helper function.
    *   **Logic:** It queries for both standard rows AND standalone containers, merging them into a unified list.
    *   **Adaptation:** Updated filename extraction logic to handle the internal structure of these standalone containers (which differs from standard rows).
    *   **Impact:** YouTube/PDF sources now fully support Batch Select, Drag-and-Drop, and Visual Tags.
