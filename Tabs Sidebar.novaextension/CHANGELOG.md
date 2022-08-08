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
