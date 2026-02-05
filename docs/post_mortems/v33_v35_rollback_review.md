# Post-Mortem: The v33-v35 Rollback Review

> **Date**: 2026-02-05
> **Scope**: Gemini Content Script Stability (v3.0.0.26 -> v3.0.0.35 -> Rollback)
> **Status**: Resolved via Hard Rollback to v3.0.0.26

## 1. Executive Summary

Between v3.0.0.26 and v3.0.0.35, we attempted to refactor the initialization logic of the Gemini module to support "Dual-Trigger" loading (parallelizing data fetch and UI injection) and to fix state persistence issues. 

**Result**: These changes introduced critical regressions:
1.  **Deadlocks**: UI failing to load on first visit.
2.  **Race Conditions**: Empty folder lists due to render timing.
3.  **Ghost UI**: "Pin" buttons appearing on incorrect pages.
4.  **Invisible Updates**: Content failing to refresh on navigation.

We have rolled back to the **v3.0.0.26 baseline**, which uses a simpler, robust `setInterval` + `MutationObserver` architecture.

---

## 2. Bad Case Analysis

### Bad Case 1: The Promise Chain Deadlock
**Goal**: Make initialization deterministic by waiting for both Data and DOM.

**The Code (Anti-Pattern)**:
```javascript
// v34 Attempt
Promise.all([
    loadData(),    // Promise
    waitForDOM()   // Promise waiting for specific selector
]).then(() => {
    injectUI();
});
```

**Why it Failed**: 
*   **SPA Unpredictability**: In a Single Page Application (SPA) like Gemini, `waitForDOM` might hang indefinitely if the user navigates quickly or if the selector changes slightly.
*   **Result**: The `.then()` block never executes. The extension silently fails to load.
*   **Fix (v26)**: Fire-and-forget. Start `loadData`, and inside the callback, start a continuous `MutationObserver`. If the DOM isn't ready *now*, the Observer will catch it *later*.

### Bad Case 2: The "Dual-Trigger" Race Condition
**Goal**: Show the UI skeleton immediately, then fill in data (Perceived Performance).

**The Code (Anti-Pattern)**:
```javascript
// v34 Attempt
loadData(renderFolders); // Async
injectFolderUI();        // Sync/Immediate
```

**Why it Failed**: 
*   **Empty Render**: `injectFolderUI` calls `renderFolders` immediately. If `loadData` hasn't finished, `state.folders` is empty. The user sees an empty list.
*   **Observer Confusion**: When `loadData` finally finishes, the Observer checks `if (document.querySelector('.container'))`. Since the (empty) container already exists, it decides *not* to re-inject or re-render.
*   **Fix (v26)**: Strict Serial Execution. `loadData(() => { injectUI(); })`. Never render UI before data is ready.

### Bad Case 3: SessionStorage State Pollution
**Goal**: Remember "Pending Share" state so if the URL changes slightly (redirect), the "Pin" button remains.

**The Code (Anti-Pattern)**:
```javascript
// v33 Attempt
if (isShared) sessionStorage.setItem('pending', true);
// ... later ...
if (sessionStorage.getItem('pending')) showPinButton();
```

**Why it Failed**: 
*   **Stale State**: There is no reliable "session end" event in a browser tab. If the user navigates from a Shared Gem to a private Chat, the flag remains true.
*   **Ghost UI**: The "Pin Current Gem" button appears on private chats, confusing the user.
*   **Fix (v26)**: **Stateless is Best**. Check `window.location.href.includes('usp=sharing')` on *every* render. If the URL doesn't say sharing, don't show the button.

### Bad Case 4: Over-Aggressive Observer Filtering
**Goal**: Reduce performance overhead by ignoring irrelevant DOM changes.

**The Code (Anti-Pattern)**:
```javascript
// v35 Attempt
if (mutation.target.classList.contains('irrelevant-class')) return;
if (mutation.addedNodes.length === 0) return;
```

**Why it Failed**: 
*   **Subtle Updates**: Gemini sometimes updates the view by changing a custom attribute or a deep text node, not always adding top-level nodes.
*   **Missed Renders**: The filter filtered out the actual navigation event. The UI stayed stuck on the previous chat's state.
*   **Fix (v26)**: **Dumb & Safe**. If *any* significant change happens (or just periodically check), run a cheap "Connectivity Check" (`ensureFolderPosition`). It's better to check twice than to miss an update.

---

## 3. Lessons & Rules

1.  **Callback > Promise**: For Content Scripts, callbacks are more resilient to "hanging" than Promises.
2.  **Serial > Parallel**: Always load data *before* touching the DOM.
3.  **Stateless > Stateful**: Rely on the current URL/DOM for UI decisions, not hidden storage flags.
4.  **Robust > Smart**: Observers should be broad. Idempotent injection (`if (!exists) inject`) handles the "noise" better than complex filtering.
