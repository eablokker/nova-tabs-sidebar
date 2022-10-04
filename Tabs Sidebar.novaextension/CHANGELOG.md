## v1.5.0 - 2022-10-03

### Added

- Show Git status indicators next to file names, as icon and/or text
- Check for existence of Git executable and Git repo in project folder before starting file watcher
- Global config for displaying Git status
- Remember collapsed kind groups in workspace config

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
