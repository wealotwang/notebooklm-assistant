# Contributing Guide

## Development Standards & Anti-Patterns

### 🚨 Critical Anti-Patterns (Based on v33-v35 Post-Mortem)

To maintain stability in the Gemini Content Script module, strictly adhere to these rules:

#### 1. No Complex Promise Chains for Initialization
*   **Don't**: Use `Promise.all([loadData(), domReady()])` to gate initialization.
*   **Do**: Use a "Fire-and-Forget" pattern. Start `loadData`, and inside the callback, start a `MutationObserver`. Let the Observer handle the timing of DOM readiness.
*   **Reason**: SPA navigation events are unpredictable. Rigid Promise chains often deadlock if the expected DOM event doesn't fire exactly as planned.

#### 2. No Parallel "Dual-Trigger" Rendering
*   **Don't**: Call `injectUI()` and `loadData()` in parallel to "speed up" rendering.
*   **Do**: Always serial execution: `loadData(() => injectUI())`.
*   **Reason**: Parallel execution leads to race conditions where the UI renders with empty data, and the Observer fails to trigger a re-render because it sees the (empty) UI already exists.

#### 3. Stateless UI Decisions
*   **Don't**: Use `sessionStorage` to persist UI states (like "Show Pin Button") across navigations.
*   **Do**: Re-evaluate the state based on the current URL (`window.location.href`) and DOM on *every* render cycle.
*   **Reason**: Browser tabs have no reliable "session end". Stale state leads to "Ghost UI" appearing on incorrect pages.

#### 4. Broad Observers
*   **Don't**: Over-optimize `MutationObserver` by filtering out specific node types or class changes.
*   **Do**: Use broad detection (childList, subtree) and idempotent injection functions (`if (!exists) inject`).
*   **Reason**: Modern frameworks (like Angular/Wiz used by Google) often update views via subtle attribute changes or text node updates that specific filters miss.

---

## Release Workflow

1.  **Update Version**: Bump version in `manifest.json`.
2.  **Update Changelog**: Document changes in `CHANGELOG.md`.
3.  **Build**: Run `./package_extension.sh` (if available) or zip the required files.
