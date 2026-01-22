# Findings & Decisions

## NotebookLM DOM Structure
- **Injection Point**: The "Select all sources" text is a reliable anchor.
- **Context Menu**: Uses Angular Material (`mat-mdc-menu-content`), dynamically attached to `body` upon click.
- **File Name**: Extracted from the first line of `innerText` of the source row.

## Interaction Design Decisions
- **Menu Injection**: Must listen for `click` on the source row's "more" button to capture context (which file is being operated on), then inject the menu item into the global overlay.
- **Batch Ops**: Should leverage native checkboxes if possible, or create a sync mechanism.
