# Tabs Sidebar
**Tabs Sidebar** provides a sidebar to list and manage your currently open document tabs.

It was inspired by the [Tab List](https://extensions.panic.com/extensions/gerardojbueno/gerardojbueno.tablist/) Nova extension, but is a complete rewrite with numerous improvements and new features.

![List of open tabs](https://raw.githubusercontent.com/eablokker/nova-tabs-sidebar/main/screenshots/list.png)

![List of open tabs grouped by kind](https://raw.githubusercontent.com/eablokker/nova-tabs-sidebar/main/screenshots/group-by-kind.png)

![Context menu items](https://raw.githubusercontent.com/eablokker/nova-tabs-sidebar/main/screenshots/context-menu.png)

![Sorting menu](https://raw.githubusercontent.com/eablokker/nova-tabs-sidebar/main/screenshots/sorting-menu.png)

![Preferences panel](https://raw.githubusercontent.com/eablokker/nova-tabs-sidebar/main/screenshots/preferences.png)

## Features

- Sort by tab bar order, file kind, or alphabetically
- Sort by custom order using up/down buttons and context menu
- Custom sort order is saved in project config
- Group by kind, based on syntax
- Indicators for unsaved tab, remote tab, and in trash
- Right-click context menu with options to "Close Tab", "Show in Finder", "Copy Path", etc.
- Option to open tab on single click or double click
- Option to show or hide parent folder names
- Option to show file count when grouping by kind

## Requirements

Tabs Sidebar uses AppleScript to read and activate certain menubar items such as "Close Tab", "Show in Files Sidebar", and "Clean Up By Tab Bar Order". Accessibility permissions must be granted to Nova to perform these actions.

> To give Nova accessibility permissions, open System Preferences → Security & Privacy → Accessibility, click the lock to make changes, and check on Nova in the list.

## Usage

To use Tabs Sidebar:

- From the "All Sidebars" panel, click and drag the "Tabs" item up into the toolbar or out into a new split
- All open document tabs will be listed in the sidebar. Click or double-click an item to open its tab
- Click the up/down buttons when a tab is selected to rearrange the list
- Right-click in the sidebar or click the (…) button for sorting options
- If "Group By Kind" or "Sort Alphabetically" are enabled, custom sorting is not available. When both are disabled, custom order is restored.

### Configuration

To configure global preferences, open **Extensions → Extension Library...** then select Tabs Sidebar's **Preferences** tab.

## Known limitations

- Tabs Sidebar cannot rearrange Nova's tab bar because there is currently no API, menu item, or keyboard shortcut for managing tabs order
- Cannot differentiate between a local file and remote file with the same name, leading to inconsistent opening and sorting. This is due to the Window menu not indicating which files are remote.
- Does not update list when document file path or syntax changes — coming soon
- Cannot close remote files from the sidebar — coming soon
