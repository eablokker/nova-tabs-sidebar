#!/bin/sh

osascript <<EOF
tell application "System Events"
	click menu item $2 of ((process "Nova")'s (menu bar 1)'s ¬
		(menu bar item "$1")'s (menu "$1"))
end tell
EOF
