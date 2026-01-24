
## 2026-01-24: NotebookLM Timeline Implementation
**Topic:** Adapting the Voyager timeline concept to NotebookLM's specific DOM structure.

### 1. DOM Structure Discovery
Unlike Gemini (which uses Angular-specific classes like `.user-query-bubble`), NotebookLM uses a different structure:
- **Scroll Container:** `.chat-panel-content` (This is the element with `overflow-y: scroll`).
- **User Anchors:** `.from-user-container` (Wraps the entire user message block).

### 2. Implementation Strategy (`timeline.js`)
We implemented a lightweight, standalone script `timeline.js` that:
1.  **Injection:** Dynamically appends a `.nlm-timeline-bar` to the `body`.
2.  **Layout Protection:** Adds `padding-right: 40px` to `.chat-panel-content` to prevent the timeline from obscuring chat text.
3.  **Positioning Logic:**
    - Iterates over all `.from-user-container` elements.
    - Calculates their position relative to the *scrollable content top* using: `el.getBoundingClientRect().top - containerRect.top + container.scrollTop`.
    - Normalizes this to a `0.0 - 1.0` value for CSS positioning.
4.  **Reactivity:**
    - Uses `MutationObserver` to detect new messages and re-render dots.
    - Uses `ResizeObserver` to handle window resizing.
    - Uses `scroll` listener to update the slider position.

### 3. Key Differences from Gemini Voyager
- **Simpler Architecture:** Instead of a complex TypeScript class with event buses, we used a straightforward functional approach in vanilla JS (`timeline.js`), fitting the existing project structure.
- **Direct CSS Injection:** Styles are appended to the existing `styles.css` but namespaced with `.nlm-timeline-` to avoid conflicts.
