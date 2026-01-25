I have analyzed the code snippets for both the YouTube link and the PDF file. The root cause is identical: in NotebookLM's current UI update, these items are rendered as standalone `.single-source-container` elements, **without** the surrounding `.row` wrapper that the extension previously relied on.

This explains why they are ignored by the "Batch Selection" checkboxes and "Folder Tags", even though the "Three Dots" menu (which uses a different detection method) still works.

### Implementation Plan (v2.1.24)

I will upgrade the extension's "Vision" to correctly recognize these standalone source containers.

1.  **`content.js`**:
    *   **New Helper**: Create `getAllSourceRows()` to retrieve all valid source items. It will query for `.row`, `div[role="row"]`, **AND** `.single-source-container`. It will strictly filter out duplicates (e.g., if a container is inside a row).
    *   **Update Extraction Logic**: Upgrade `DOMService.extractFileName(row)` to handle the case where the `row` input **is itself** a `.single-source-container` (currently it only looks *inside* the row).
    *   **Apply to All Features**: Update `renderFileTags()` (Tags), `updateBatchUI()` (Checkboxes), and `syncNativeSelectionFromView()` (Sync) to use `getAllSourceRows()`.

2.  **`manifest.json`**: Bump version to **2.1.24**.
3.  **`CHANGELOG.md`**: Document support for standalone Source Containers (YouTube/PDF/Audio).

This fix will universally solve the issue for YouTube links, PDFs, Audio files, and any other source types using this new DOM structure.