# Task Plan: NotebookLM Folder Manager

## Overview
开发一个 Chrome 插件，为 NotebookLM 的 Sources 列表添加文件夹管理功能。

## Phases

### Phase 1: MVP Prototype (✅ Completed)
- [x] Create project structure (manifest.json, styles.css, content.js)
- [x] Implement UI injection logic
- [x] Implement Folder UI rendering
- [x] Implement Drag & Drop logic
- [x] Implement LocalStorage persistence

### Phase 2: Refinement & Stability (✅ Completed)
- [x] **Feature**: Inject "Move to Folder" menu item into native context menu.
- [x] **Bug Fix**: Ensure reliable file name extraction (Fixed in v2.0.3/v2.1.5).
- [x] **Task**: Analyze Gemini Voyager architecture for reference (`docs/planning/gemini_voyager_analysis.md`).
- [x] **Feature**: Batch operations (Select multiple -> Move) (v2.1.0).
- [x] **Feature**: Folder Detail View with Batch Management (v2.1.0).
- [x] **Feature**: File Tags in Native List (Visibility) (v2.1.1).
- [x] **Feature**: Native Selection Sync (Exclusive Mode) (v2.1.2 - v2.1.4).
- [x] **Bug Fix**: Fix MutationObserver infinite loop (v2.1.1).
- [x] **Bug Fix**: Robust Title Extraction & Text Wrap (v2.1.5).

### Phase 3: Advanced Features (📅 Planned)
- [ ] Sync storage.
