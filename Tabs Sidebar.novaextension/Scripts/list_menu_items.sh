#!/bin/sh

osascript <<EOF
tell application "Nova" to activate
tell application "System Events"
	tell process "Nova"
		set menuItems to name of every menu item of menu 1 of menu bar item "$1" of menu bar 1
		return menuItems
	end tell
end tell
EOF
