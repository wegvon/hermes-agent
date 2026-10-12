# Session workspace

Personal Desktop customization based on upstream commit `5d5e763780661340aa69caaff019d9079db7d270`.

## Behavior

- Display multiple real Hermes sessions simultaneously in draggable, resizable windows within a pane group.
- Keep each native session contribution mounted while moving or resizing, preserving drafts and session identity.
- Open sidebar sessions and new sessions as additional windows in canvas mode.
- Provide arrange, maximize/restore, close, and windows/tabs controls.
- Preserve native session routing and backend integration; no backend changes.

## Validation

The session canvas, session tile actions, and session tile attachments suites passed locally (15 tests). TypeScript checking and the production renderer build passed. The macOS application was opened with four existing real sessions. Live model sending was not exercised for this validation.

## Current limitations

Window geometry is not persisted across application reloads. Windows are arranged within their existing pane group. Theme and Kanban settings are maintained separately from this source change.

## Maintenance

Keep upstream tracking on `main` and custom development on `boss/session-windows`. Review and merge upstream updates into the custom branch, resolve conflicts, rerun the relevant tests, and rebuild the Desktop app before installing an update. This fork does not provide an automatic update or release pipeline yet.
