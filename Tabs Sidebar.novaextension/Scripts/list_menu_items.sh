#!/bin/sh

osascript <<EOF
tell application "Nova" to activate
tell application "System Events"
	tell process "Nova"
		set menuItems to name of every menu item of menu 1 of menu bar item "$1" of menu bar 1
		set menuItemsStatus to value of attribute "AXMenuItemMarkChar" of every menu item of menu 1 of menu bar item "$1" of menu bar 1

		repeat with n from 1 to count of menuItems
			set previousItemIndex to n - 1 as integer
			if item n of menuItemsStatus = "✓" and item previousItemIndex of menuItems = missing value
				set item n of menuItems to "✓"
			end if
		end repeat

		return menuItems
	end tell
end tell
EOF
