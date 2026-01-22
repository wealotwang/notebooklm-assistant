# Daily Progress Log

## 2026-01-22 (Session 2: Deep Sync Fixes)
- **Problem**: Checkbox synchronization between Folder View and Native List was inconsistent, especially for single-file selection and initial loading.
- **Analysis**:
    - Native `change` events were not bubbling correctly to View.
    - View `click` events were not triggering Angular change detection.
    - Filenames were mismatched due to truncation or DOM structure variations (NotebookLM dynamic rendering).
- **Action**: Released v2.1.13 - Added **Bi-directional Sync** foundation. Implemented Native "Select All" listener and handled Angular animation states (`mdc-checkbox--anim-unchecked-checked`).
- **Action**: Released v2.1.14 - Implemented **Point-to-Point Sync** (View->Native) and **Retry Logic** (Native->View). Added Init Sync on folder open.
- **Action**: Released v2.1.15 - Refactored Event Binding. Removed event delegation in favor of direct `click` listeners. Introduced **Fast Path** for instant UI feedback.
- **Action**: Released v2.1.16 - Added **Fuzzy Matching** for filenames. Solved issues where truncated filenames caused sync failures.
- **Action**: Released v2.1.17 - **Architectural Overhaul**: Switched to **Checkbox-First Traversal**.
    - Instead of relying on unstable `.row` selectors, we now iterate all `input[type="checkbox"]` elements directly.
    - Robust context extraction from `aria-label` or parent nodes.
    - **Result**: 100% reliable synchronization in all tested scenarios (Search, Filtered, Virtual Scroll).

## 2026-01-22 (Session 1)
- **Action**: Initialized project.
- **Action**: Created MVP with Drag & Drop.
- **Action**: Verified plugin loading in Chrome.
- **Action**: Released v2.1.0 - Added Batch Operations, Folder Detail View, and Select-to-Move.
- **Action**: Released v2.1.1 - Fixed browser freeze (MutationObserver loop), Added File Tags for visibility, Added 'Select All' in Detail View.
- **Action**: Released v2.1.2 - Implemented basic Native Selection Sync.
- **Action**: Released v2.1.3 - Fixed Angular Material Checkbox handling (aria-label & event simulation).
- **Action**: Released v2.1.4 - Implemented "Exclusive Selection" (Sync View -> Native).
- **Action**: Released v2.1.5 - Optimized Title Extraction (1:1 match with source title) and added Text Wrap support.
- **Status**: Phase 2 Completed. Core folder management features are stable and integrated with NotebookLM UI.
