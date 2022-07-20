
var treeView = null;
var tabDataProvider = null;
var focusedTab = null;

var syntaxnames = {
    "plaintext": "Plain Text",
    "coffeescript": "CoffeeScript",
    "css": "CSS",
    "diff": "Diff",
    "erb": "ERB",
    "haml": "Haml",
    "html": "HTML",
    "ini": "INI",
    "javascript": "JavaScript",
    "json": "JSON",
    "jsx": "JSX",
    "less": "Less",
    "lua": "Lua",
    "markdown": "Markdown",
    "perl": "Perl",
    "php": "PHP-HTML",
    "python": "Python",
    "ruby": "Ruby",
    "sass": "Sass",
    "scss": "SCSS",
    "shell": "Shell Script",
    "smarty": "Smarty",
    "sql": "SQL",
    "tsx": "TSX",
    "twig": "Twig-HTML",
    "twig-markdown": "Twig-Markdown",
    "typescript": "TypeScript",
    "vue": "Vue",
    "xml": "XML",
    "yaml": "YAML"
};

exports.activate = function() {
    // Do work when the extension is activated

    // Create the TreeView
    tabDataProvider = new TabDataProvider(nova.workspace.textDocuments);
    treeView = new TreeView("tabs-sidebar", {
        dataProvider: tabDataProvider
    });

    // Initially sort by tabs bar order
    nova.commands.invoke("tabs-sidebar.cleanUpByTabBarOrder");

    nova.workspace.onDidAddTextEditor(editor => {
        //console.log('Document opened');

        tabDataProvider.loadData(nova.workspace.textDocuments, focusedTab);
        treeView.reload().then(() => {
            // Focus tab in sidebar
            focusedTab = tabDataProvider.getElementByUri(editor.document.uri);
            treeView.reveal(focusedTab);
        });

        // Remove tab from sidebar when editor closed
        editor.onDidDestroy(destroyedEditor => {
            //console.log('Document closed');

            setTimeout(() => {
                tabDataProvider.loadData(nova.workspace.textDocuments);
                treeView.reload().then(() => {
                    treeView.reveal(focusedTab);
                });
            }, 1);
        });

        // Focus tab in sidebar when editing document
        editor.onDidChange(changedEditor => {
            //console.log('Document changed');

            focusedTab = tabDataProvider.getElementByUri(changedEditor.document.uri);
            treeView.reveal(focusedTab);
        });

        editor.onDidStopChanging(changedEditor => {
            //console.log('Document stopped changing');

            focusedTab = tabDataProvider.getElementByUri(changedEditor.document.uri);
            tabDataProvider.setDirty(changedEditor);

            treeView.reload(focusedTab).then(() => {
                treeView.reveal(focusedTab);
            });
        });

        // Focus tab in sidebar when saving document
        editor.onDidSave(savedEditor => {
            //console.log('Document saved');

            focusedTab = tabDataProvider.getElementByUri(savedEditor.document.uri);
            tabDataProvider.setDirty(savedEditor);

            treeView.reload(focusedTab).then(() => {
                treeView.reveal(focusedTab);
            });
        });
    });

    treeView.onDidChangeSelection((selection) => {
        // console.log("New selection: " + selection.map((e) => e.name));
        //nova.workspace.openFile(selection[0].uri));
    });

    treeView.onDidExpandElement((element) => {
        // console.log("Expanded: " + element.name);
    });

    treeView.onDidCollapseElement((element) => {
        // console.log("Collapsed: " + element.name);
    });

    treeView.onDidChangeVisibility(() => {
        // console.log("Visibility Changed");
    });

    // TreeView implements the Disposable interface
    nova.subscriptions.add(treeView);
};

exports.deactivate = function() {
    // Clean up state before the extension is deactivated
};

nova.commands.register("tabs-sidebar.close", (workspace) => {
    console.log("Close Tab clicked");

    let selection = treeView.selection;
    let activeDocument = workspace.activeTextEditor.document;

    if (!selection[0].isRemote) {

        if (selection[0].uri === activeDocument.uri) {
            // Close currently active tab
            workspace.openFile(selection[0].uri)
                .then(editor => {
                    tabDataProvider
                        .runProcess("/click_menu_item.sh", ["File", "Close Tab"])
                        .then(result => {

                        })
                        .catch(err => {
                            console.error(err);
                        });
                });

            return;
        }

        // Close non currently active tab by switching to it and back
        workspace.openFile(selection[0].uri)
            .then(editor => {
                tabDataProvider
                    .runProcess("/click_menu_item.sh", ["File", "Close Tab"])
                    .then(result => {
                        workspace.openFile(activeDocument.uri)
                            .then(editor => {
                                focusedTab = tabDataProvider.getElementByUri(editor.document.uri);
                                treeView.reveal(focusedTab);
                            });
                    })
                    .catch(err => {
                        console.error(err);
                    });
            });

        return;
    }

    console.log("Close remote tab");
});

nova.commands.register("tabs-sidebar.open", (workspace) => {
    let selection = treeView.selection;
    console.log("DoubleClick: " + selection[0].name);

    const isRemote = selection[0].isRemote;

    if (!isRemote) {
        workspace.openFile(selection[0].uri)
            .then(editor => {
                focusedTab = tabDataProvider.getElementByUri(editor.document.uri);
                treeView.reveal(focusedTab);
            });
        return;
    }



    tabDataProvider
        .runProcess("/list_menu_items.sh", ["Window"])
        .then(result => {
            const workspaceName = nova.workspace.config.get("workspace.name", "string") || nova.path.split(nova.workspace.path).pop();
            const resultArray = result.split(", ");
            const baseName = nova.path.basename(selection[0].path);

            let menuPosition = -1;
            let projectFound = false;
            resultArray.every((menuItem, i, self) => {
                if (menuItem.trim() === workspaceName && self[i - 1].trim() === "missing value") {
                    projectFound = true;
                }

                if (menuItem.trim() === baseName) {
                    menuPosition = i + 1; // Zero-indexed to 1-indexed
                }

                // Exit early at end of project items
                if (projectFound && menuItem.trim() === "missing value") {
                    return false;
                }

                return true;
            });

            if (menuPosition < 0) {
                return;
            }

            tabDataProvider
                .runProcess("/click_menu_item_by_number.sh", ["Window", menuPosition.toString()])
                .then(result => {
                    console.log("Menu item " + menuPosition + " of Window menu clicked");
                })
                .catch(err => {
                    console.error(err);
                });
        })
        .catch(err => {
            console.error(err);
        });


});

nova.commands.register("tabs-sidebar.doubleClick", (workspace) => {
    // Invoked when an item is double-clicked
    nova.commands.invoke("tabs-sidebar.open", workspace);
});

nova.commands.register("tabs-sidebar.up", () => {
    // Invoked when the "Move Up" header button is clicked
    let selection = treeView.selection;

    //console.log(JSON.stringify(selection[0]));

    console.log("Move Up: " + selection.map((e) => e.name));

    tabDataProvider.moveTab(selection[0], -1);
});

nova.commands.register("tabs-sidebar.down", () => {
    // Invoked when the "Move Down" header button is clicked
    let selection = treeView.selection;

    //console.log(JSON.stringify(selection[0]));

    console.log("Move Down: " + selection.map((e) => e.name));

    tabDataProvider.moveTab(selection[0], 1);
});

nova.commands.register("tabs-sidebar.cleanUpByTabBarOrder", (workspace) => {
    //console.log("Clean up by tab bar order clicked");

    tabDataProvider.runProcess("/list_menu_items.sh", ["Window"])
        .then(result => {
            //console.log(result);

            tabDataProvider.cleanUpByTabBarOrder(result);

            focusedTab = tabDataProvider.getElementByUri(workspace.activeTextEditor.document.uri);
            treeView.reload().then(() => {
                treeView.reveal(focusedTab);
            });
        })
        .catch(err => {
            console.error(err);
        });
});

nova.commands.register("tabs-sidebar.cleanUpByAlpha", () => {
    console.log("cleanUpByAlpha");

    tabDataProvider.cleanUpByAlpha();
    treeView.reload().then(() => {
        treeView.reveal(focusedTab);
    });
});

nova.commands.register("tabs-sidebar.cleanUpByKind", () => {
    console.log("cleanUpByKind");

    tabDataProvider.cleanUpByKind();
    treeView.reload().then(() => {
        treeView.reveal(focusedTab);
    });
});

nova.commands.register("tabs-sidebar.sortByAlpha", (workspace) => {
    console.log("Sort alphabetically");

    const sortAlpha = !workspace.config
        .get("eablokker.tabsSidebar.config.sortAlpha", "boolean");

    workspace.config.set("eablokker.tabsSidebar.config.sortAlpha", sortAlpha);

    tabDataProvider.setSortAlpha(sortAlpha);
    treeView.reload();
});

nova.commands.register("tabs-sidebar.groupByKind", (workspace) => {
    console.log("groupByKind");

    const groupByKind = !workspace.config
        .get("eablokker.tabsSidebar.config.groupByKind", "boolean");

    workspace.config.set("eablokker.tabsSidebar.config.groupByKind", groupByKind);

    tabDataProvider.setGroupByKind(groupByKind);
    treeView.reload();
});

nova.commands.register("tabs-sidebar.showInFilesSidebar", (workspace) => {
    console.log("Show in Files Sidebar");

    let selection = treeView.selection;

    // Need to open selected tab in order to invoke command
    workspace.openFile(selection[0].uri)
        .then(editor => {
            tabDataProvider
                .runProcess("/click_menu_item.sh", ["File", "Show in Files Sidebar"])
                .then(result => {

                })
                .catch(err => {
                    console.error(err);
                });
        });
});

nova.commands.register("tabs-sidebar.showInFinder", () => {
    let selection = treeView.selection;

    console.log(selection[0].path);

    //nova.fs.reveal(selection[0].path);
});

class TabItem {
    constructor(tab) {
        this.name = tab.name;
        this.path = tab.path;
        this.uri = tab.uri;
        this.descriptiveText = tab.description || "";
        this.isRemote = tab.isRemote || false;
        this.isDirty = tab.isDirty || false;
        this.isUntitled = tab.isUntitled || false;
        this.children = [];
        this.parent = null;
        this.collapsibleState = TreeItemCollapsibleState.None;
        this.syntax = tab.syntax || "plaintext";
        this.extension = tab.extension || null;
        this.icon = tab.icon || null;
    }

    addChild(element) {
        element.parent = this;
        this.children.push(element);
    }
}


class TabDataProvider {
    constructor(documentTabs) {
        this.customOrderedItems = [];
        this.customOrder = [];

        this.sortAlpha = nova.workspace.config
            .get("eablokker.tabsSidebar.config.sortAlpha", "boolean");
        this.groupByKind = nova.workspace.config
            .get("eablokker.tabsSidebar.config.groupByKind", "boolean");

        this.loadData(documentTabs);
    }

    loadData(documentTabs, focusedTab) {
        let rootItems = [];

        // Remove extraneous from custom order
        if (this.customOrder.length) {
            this.customOrder = this.customOrder.filter(path => {
                return documentTabs.some(tab => tab.path === path);
            });
        }

        documentTabs.forEach((tab) => {
            // Hide untitled tabs
            if (tab.isUntitled) {
                return;
            }

            // Set custom order
            const tabIsNew = this.customOrder.every(path => path !== tab.path);
            if (tabIsNew && focusedTab) {
                const tabIndex = this.customOrder
                    .findIndex(path => path === focusedTab.path);
                this.customOrder.splice(tabIndex + 1, 0, tab.path);
            } else if (tabIsNew) {
                this.customOrder.push(tab.path);
            }

            const tabName = this.basename(tab.path || "untitled");
            let tabDescription = "";

            const isUnique = this.isUniqueName(tab, documentTabs);
            if (!isUnique) {
                const tabDir = nova.path.split(nova.path.dirname(tab.uri || ""));
                tabDescription = "‹ " + decodeURI(tabDir[tabDir.length - 1]);
            }

            let element = new TabItem({
                name: tabName,
                path: tab.path,
                uri: tab.uri,
                description: tabDescription,
                isRemote: tab.isRemote,
                isDirty: tab.isDirty,
                isUntitled: tab.isUntitled,
                contextValue: "tabItem",
                syntax: tab.syntax
            });

            rootItems.push(element);
        });

        this.customOrderedItems = rootItems;
        this.rootItems = rootItems;

        this.sortRootItems();
    }

    runProcess(scriptName, args, timeout = 3000) {
        return new Promise((resolve, reject) => {
            let outString = "";
            let errorString = "";

            const process = new Process(__dirname + scriptName, { args: args });

            process.onStdout(line => {
                outString += line;
            });

            process.onStderr(line => {
                errorString += line;
            });

            let timeoutID = setTimeout(() => {
                // Ensure the process terminates in a timely fashion
                reject("The process did not respond in a timely manner.");
                process.terminate();
            }, timeout);

            process.onDidExit(status => {
                clearTimeout(timeoutID);

                if (errorString.length) {
                    reject(new Error(errorString));
                } else {
                    resolve(outString);
                }
            });

            process.start();
        });
    }

    setDirty(editor) {
        const element = this.getElementByUri(editor.document.uri);
        element.isDirty = editor.document.isDirty;
    }

    basename(uri) {
        return nova.path.basename(uri);
    }

    isUniqueName(tab, documentTabs) {
        return documentTabs
            .filter(obj => obj.uri !== tab.uri)
            .every(obj => {
                const basename = this.basename(obj.uri).toLowerCase();
                return basename !== this.basename(tab.uri).toLowerCase();
            });
    }

    moveTab(tab, distance) {
        const fromIndex = this.customOrder.indexOf(tab.path);
        const toIndex = fromIndex + distance;

        if (toIndex < 0 || toIndex > this.customOrder.length) {
            return;
        }

        const item = this.customOrder.splice(fromIndex, 1)[0];
        this.customOrder.splice(toIndex, 0, item);

        this.sortRootItems();
        focusedTab = tabDataProvider.getElementByUri(tab.uri);
        treeView.reload().then(() => {
            treeView.reveal(focusedTab);
        });
    }

    cleanUpByTabBarOrder(result) {
        const workspaceName =
            nova.workspace.config.get("workspace.name", "string") ||
            nova.path.split(nova.workspace.path).pop();

        const menuGroups = result
            .split(", missing value, ")
            .map((group) => {
                const items = group.split(",")
                    .map(item => item.trim())
                    .filter(item => item !== "missing value");
                const name = items.shift();
                return {
                    name: name,
                    tabs: items
                };
            });

        const lastWindowMenuItemIndex = menuGroups
            .findIndex(item => item.name === "Bring All to Front");
        menuGroups.splice(0, lastWindowMenuItemIndex + 1);
        const currentWindow = menuGroups
            .find(item => item.name === workspaceName);

        this.customOrder.sort((a, b) => {
            if (currentWindow.tabs.indexOf(nova.path.basename(a)) < 0) {
                return 1;
            }

            return (
                currentWindow.tabs.indexOf(nova.path.basename(a)) -
                currentWindow.tabs.indexOf(nova.path.basename(b))
            );
        });

        this.sortRootItems();
    }

    cleanUpByAlpha() {
        this.customOrder.sort((a, b) => {
            return nova.path.basename(a).localeCompare(nova.path.basename(b));
        });

        this.sortRootItems();
    }

    cleanUpByKind() {
        const elementArray = this.customOrder.map(path => {
            return tabDataProvider.getElementByPath(path);
        });

        this.customOrder.sort((a, b) => {
            const aElement = elementArray.find(item => item.path === a);
            const bElement = elementArray.find(item => item.path === b);

            return aElement.syntax.localeCompare(bElement.syntax);
        });

        this.sortRootItems();
    }

    setSortAlpha(sortAlpha) {
        //console.log("Setting sort alpha", sortAlpha);
        this.sortAlpha = sortAlpha;

        this.sortRootItems();
    }

    setGroupByKind(groupByKind) {
        //console.log("Setting sort by kind", groupByKind);
        this.groupByKind = groupByKind;

        this.sortRootItems();
    }

    sortRootItems() {
        const length = this.customOrderedItems.length;

        this.customOrderedItems.sort((a, b) => {
            if (this.customOrder.indexOf(a.path) < 0) {
                return 1;
            }

            return this.customOrder.indexOf(a.path) - this.customOrder.indexOf(b.path);
        });

        // Set context of position in list
        this.customOrderedItems.forEach((tab, i) => {
            if (this.customOrderedItems.length === 1) {
                tab.contextValue = "only";
            } else if (i === 0) {
                tab.contextValue = "first";
            } else if (i === length - 1) {
                tab.contextValue = "last";
            } else {
                tab.contextValue = "tab";
            }
        });

        //console.log("this.customOrder", this.customOrder);

        // Reset root items to flat structure
        this.rootItems = this.customOrderedItems.slice();

        if (this.sortAlpha) {
            console.log("Sorting by alpha");

            this.rootItems.sort((a, b) => {
                return a.name.localeCompare(b.name);
            });
        }

        if (this.groupByKind) {
            console.log("Grouping by kind");

            const folders = this.rootItems
                .filter((a, index, self) => {
                    return self.findIndex((b) => b.syntax === a.syntax) === index;
                })
                .map(item => {
                    const titleCaseName = item.syntax
                        .split(" ")
                        .map((s) => s.charAt(0).toUpperCase() + s.substring(1))
                        .join(" ");
                    const extName = nova.path.extname(item.path).replace(/^\./, "");
                    const count = this.rootItems.filter(f => {
                        return f.syntax === item.syntax;
                    }).length;

                    return new TabItem({
                        name: syntaxnames[item.syntax] || titleCaseName,
                        path: "",
                        uri: "",
                        //description: count ? count : "",
                        syntax: item.syntax,
                        extension: extName
                    });
                });

            folders.forEach(folder => {
                this.rootItems.forEach(tab => {
                    if (tab.syntax !== folder.syntax) {
                        return;
                    }

                    folder.addChild(tab);
                });
            });

            if (this.sortAlpha) {
                console.log("Sorting folders by alpha");

                folders.sort((a, b) => {
                    return a.name.localeCompare(b.name);
                });
            }

            this.rootItems = folders.slice();

        }

        if (!this.sortAlpha && ! this.groupByKind) {
            console.log("Sorting by custom");
            this.rootItems = this.customOrderedItems.slice();
        }
    }

    getElementByUri(uri) {
        const element = this.rootItems.find(item => {
            return item.uri === uri;
        });

        if (element) {
            return element;
        }

        let childElement = null;
        this.rootItems.some(item => {
            childElement = item.children.find(child => {
                return child.uri === uri;
            });

            return !!childElement;
        });

        return childElement;
    }

    getElementByPath(path) {
        const element = this.rootItems.find(item => {
            return item.path === path;
        });

        if (element) {
            return element;
        }

        let childElement = null;
        this.rootItems.some(item => {
            childElement = item.children.find(child => {
                return child.path === path;
            });

            return !!childElement;
        });

        return childElement;
    }

    getChildren(element) {
        // Requests the children of an element
        if (!element) {
            return this.rootItems;
        }
        else {
            return element.children;
        }
    }

    getParent(element) {
        // Requests the parent of an element, for use with the reveal() method
        return element?.parent;
    }

    getTreeItem(element) {
        // Converts an element into its display (TreeItem) representation
        let item = new TreeItem((element.isDirty ? "● " : "") + element.name);
        if (element.children.length > 0) {
            item.descriptiveText = element.descriptiveText;
            item.collapsibleState = TreeItemCollapsibleState.Expanded;
            item.path = element.path;
            item.tooltip = "";
            item.contextValue = "kindGroup";
            item.identifier = element.name;
            item.image = element.extension ? "__filetype." + element.extension : "__filetype.txt";
        }
        else {
            item.descriptiveText = (element.isRemote ? "☁️ " : "") + element.descriptiveText;
            item.path = element.path;
            item.tooltip = element.path;
            item.command = "tabs-sidebar.doubleClick";
            item.contextValue = element.contextValue;
            item.identifier = element.uri;
        }
        return item;
    }
}

