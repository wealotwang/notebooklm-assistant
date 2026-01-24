# Learning from Voyager

**Notice to AI Assistants:**
This document serves as a persistent knowledge base and context handover for the "NotebookLM Folder Tool" project. It records key insights, architectural analyses, and implementation details learned from studying reference projects (like `gemini-voyager`).
**When starting a new session or task, please review this document to understand previous learnings.**
**If you discover new patterns, techniques, or insights during your analysis, please append them to this document with a clear date and topic header.**

---

## 2026-01-24: Timeline & Custom Scrollbar Implementation
**Topic:** How `gemini-voyager` implements its custom timeline/scrollbar overlay without modifying the native browser scrollbar.

### 1. Core Concept: "Shadow" Navigation
The plugin does not style the native `::-webkit-scrollbar`. Instead, it creates a completely separate UI component ("Timeline") that acts as a visual map and navigation controller.
- **Left/Main:** Native content with standard scrolling (often hidden or ignored).
- **Right/Overlay:** A fixed-position `div` representing the timeline.
- **Sync:** A bidirectional binding between the main content's scroll position and the timeline's slider/dots.

### 2. Implementation Breakdown (Source: `src/pages/content/timeline/manager.ts`)

#### A. Finding the Scroll Container
The plugin dynamically locates the scrollable area:
1.  Identifies "User Turn" elements (chat bubbles) as anchors.
2.  Traverses up the DOM to find the first parent with `overflow-y: auto` or `scroll`.
3.  This becomes the `scrollContainer` for event listeners.

#### B. Layout Space Injection
To prevent the overlay from obscuring content, it injects CSS to "squeeze" the original page:
```css
/* src/pages/content/chatWidth/index.ts */
chat-window, .chat-container {
  padding-right: 10px !important; /* Reserves space */
  box-sizing: border-box !important;
}
```

#### C. Geometry & CSS Variable Positioning
The positioning logic is a hybrid of TypeScript calculation and CSS rendering:
1.  **Normalization:** The TS code calculates a normalized position `n` (0.0 to 1.0) for each message based on its `offsetTop` relative to the total content height.
2.  **CSS Variables:** Instead of setting `top: 123px` on every dot, it sets a CSS variable:
    ```typescript
    dot.style.setProperty('--n', String(this.markers[i].n));
    ```
3.  **Efficient Rendering:** CSS handles the final pixel placement:
    ```css
    .timeline-dot {
      top: calc(var(--timeline-track-padding) + (100% - 2 * var(--timeline-track-padding)) * var(--n, 0));
    }
    ```

#### D. Bidirectional Synchronization
- **Scroll -> Timeline:** `scrollContainer.addEventListener('scroll', ...)` updates the slider's `top` position.
- **Timeline -> Scroll:** Dragging the slider calculates the target scroll percentage and calls `scrollContainer.scrollTo()`.

### 3. Key Takeaways for Our Project
- **Observer Patterns:** Use `MutationObserver` for dynamic content (chat streams) and `ResizeObserver` for responsive layout.
- **Performance:** Offload layout calculations to CSS variables where possible to reduce JS main thread work.
- **Non-Destructive:** Do not fight the browser's native scrollbar; instead, create a parallel control structure and sync them.
