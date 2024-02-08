## v1.6.0 - 2024-02-07

### Breaking

- Tab order is now saved by URI instead of path. Saved tab order from previous versions will be lost.

### Added

- Group by folder option
- Remember collapsed folder state
- New Dockerfile icon
- Updated macOS permissions instructions in README
- Added popup notification if Nova is unable to execute Applescript commands

### Changed

- Disabled open/close context menu items on type group folders
- Track custom order by file URI instead of path

## v1.5.12 - 2024-01-25

### Added

- Objective-C++ folder name
- Ruby folder icon when grouping by kind
- Add syntax icons for group folders when file extension doesn't match syntax

### Fixed

- Attempt to fix documents in sidebar not updating properly when adding/removing editors
- Fix tree view reloading every time new untitled document is edited
- Disable Show In... and Copy Path context menu items for group folders

## v1.5.8 - 2023-06-03

### Added

- Preference to show folder path in forward or reverse order

### Fixed

- Parent folder displaying twice in sidebar when always show parent folder option is selected

## v1.5.7 - 2023-06-01

### Fixed

- Attempt to fix extension service crash by delaying start of filesystem watcher on launch

## v1.5.6 - 2023-05-28

### Fixed

- Attempt to fix extension crash message on Nova launch by stopping filesystem watcher before quit

## v1.5.5 - 2023-05-20

### Added

- Dockerfile icon
- Objective-C group name
- Inverted Git status icons for working tree status

## v1.5.4 - 2023-04-18

### Changed

- Don't reload Git status if changed file is ignored by .gitignore

## v1.5.3 - 2022-10-28

### Added

- Reload tab list when document syntax changed

### Changed

- Update sidebar icon to better match Nova interface
- Update Typescript definitions

## v1.5.2 - 2022-10-17

### Added

- Add back missing icons for .editorconfig, .gitignore, .css.map, .js.map, and typescript .t.ds definitions.

## v1.5.1 - 2022-10-15

### Fixed

- Filenames with @ symbol not showing git status
- Files inside untracked folders not showing git status
- Trashed files showing .Trash as parent folder twice

## v1.5.0 - 2022-10-08

### Added

- Show Git status indicators next to file names, configurable as icon and/or text
- Remember collapsed state of groups
- Group order can now be moved up/down when grouping by kind
- Basic workspace preferences pane

### Changed

- Refactored app as a class, moved TabDataProvider to separate file
- Never activate open tab command when extension highlights a tab programmatically

### Fixed

- Wrong tab sometimes being selected on startup
- Wrong tab sometimes being selected on document open/close

## v1.4.2 - 2022-09-20

### Changed

- Improved performance of switching remote tabs by combining applescripts into one script
- Disable unavailable context menu items for remote tabs (Show in Finder, Copy Relative Path)

### Fixed

- Some remote tabs not opening on macOS < 11

## v1.4.1 - 2022-09-20

### Fixed

- Opening, closing, sorting remote tabs when workspace has no path
- Opening, closing, sorting tabs when file browser or terminal tab is currently active

## v1.4.0 - 2022-09-18

### Added

- Localized in French, German, Chinese, Japanese

### Changed

- Rewritten with Typescript
- Slightly smaller default unsaved tab symbol

### Fixed

- Prevent externally changed files from having their tabs inadvertently opened
- Fixes tabs switching when discarding git changes
- Fix error with getting parent of null element

## v1.3.1 - 2022-08-08

### Fixed

- Bug with timeoutId causing extension to fail to load

## v1.3.0 - 2022-08-07

### Added

- Ability to close remote tabs from the context menu

### Changed

- Always activate extension no matter which documents are in workspace
- Refactored opening remote tabs

### Fixed

- Newly opened tabs being placed in wrong order

## v1.2.1 - 2022-08-05

### Changed

- Improved performance of load on activation

## v1.2.0 - 2022-08-05

### Added

- Refresh command for when file name/path or syntax changes

### Changed

- Greatly improved performance of moving tabs up/down by only refreshing moved items
- Scroll tab into view when moving up/down or focusing in editor

### Fixed

- Error when trying to move tab past end rapidly

## v1.1.8 - 2022-08-03

- Prevent error popup when attempting to move tabs too quickly past end

## v1.1.7

- Prevent error popup when moving tabs up/down too quickly

## v1.1.6

- Don't try to open document if it's already the one that's opened

## v1.1.5

- Make shell scripts executable using Process instead of fs.chmod

## v1.1.4

- Correct size for extension icon

## v1.1.3

- Keep last document open when opening project

## v1.1.2

- Resolve rapid tab switching bug on launch

## v1.1.1

- Added new logo
- Updated TODO

## v1.1.0 - 2022-08-02

- Automatically make shell scripts executable if they are not already
- Fixes certain commands not working

## v1.0.0 - 2022-08-02

Initial release
