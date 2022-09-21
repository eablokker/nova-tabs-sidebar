#!/bin/sh

osascript <<EOF
tell application "Nova" to activate
tell application "System Events"
	tell process "Nova"
		set menuItems to name of every menu item of menu 1 of menu bar item "$1" of menu bar 1
		set menuItemsStatus to value of attribute "AXMenuItemMarkChar" of every menu item of menu 1 of menu bar item "$1" of menu bar 1

		set menuPosition to -1 as integer
		set projectFound to false

		repeat with n from 1 to count of menuItems
			set previousItemIndex to n - 1 as integer
			if item n of menuItemsStatus = "✓" and item previousItemIndex of menuItems = (missing value) then
				set projectFound to true

			else if projectFound and item n of menuItems = "$2" then
				set menuPosition to n

			else if projectFound and item n of menuItems = (missing value) then
				exit repeat
			end if
		end repeat
	end tell

	if menuPosition > 0 then
		click menu item menuPosition of ((process "Nova")'s (menu bar 1)'s ¬
		(menu bar item "$1")'s (menu "$1"))
	end if
end tell
EOF
