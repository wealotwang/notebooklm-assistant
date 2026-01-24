
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
