I have analyzed the logs and the code, and I believe I have identified the issue.

### Problem Analysis
1.  **Menu Interaction Works**: The logs (`Captured from aria-description` -> `Ignoring click inside menu`) confirm that the "Three Dots" menu is correctly capturing the filename and the "Move to folder" option is clickable.
2.  **"Cancel" Log Explanation**: The log `Rejected invalid term: "取消"` (Cancel) appears because when you clicked a button in the popup modal (likely "Save" or "Cancel"), the global listener tried to guess a filename from the button's siblings. This actually confirms that **the modal successfully opened**.
3.  **Root Cause**: The operation likely *succeeded* in the background, but the **UI (File Tags) did not update immediately**.
    *   In the `showFolderSelectionModal` function, after clicking "Save", the code saves the data but **fails to call `renderFileTags()`**.
    *   This means the little blue folder tags (e.g., "Product", "Learning") do not appear next to the file until you refresh the page or trigger another update.
    *   This leads to the impression that "it didn't work".

### Proposed Changes (v2.1.23)

I will fix this by ensuring the UI refreshes immediately after any folder operation:

1.  **`content.js`**:
    *   Update `showFolderSelectionModal`: Add `renderFileTags()` and `renderFolders()` calls in the "Save" button handler.
    *   Update `addFileToFolder` (Drag & Drop): Add `renderFileTags()` here as well, so drag-and-drop also updates tags instantly.
2.  **`manifest.json`**: Bump version to **2.1.23**.
3.  **`CHANGELOG.md`**: Document the fix.

This will ensure that as soon as you add a file to a folder (via menu or drag-and-drop), the tag appears instantly.