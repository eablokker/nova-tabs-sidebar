
var treeView = null;
var tabDataProvider = null;
var focusedTab = null;

// Config vars
let openOnSingleClick = nova.config.get("eablokker.tabs-sidebar.open-on-single-click", "Boolean");
let alwaysShowParentFolder = nova.config.get("eablokker.tabs-sidebar.always-show-parent-folder", "Boolean");
let showGroupCount = nova.config.get("eablokker.tabs-sidebar.show-group-count", "Boolean");

let unsavedSymbol = nova.config.get("eablokker.tabs-sidebar.unsaved-symbol", "String");
let unsavedSymbolLocation = nova.config.get("eablokker.tabs-sidebar.unsaved-symbol-location", "String");

let groupByKind = nova.workspace.config.get("eablokker.tabsSidebar.config.groupByKind", "Boolean");
let customTabOrder = nova.workspace.config.get("eablokker.tabsSidebar.config.customTabOrder", "Array");

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

    // Watch for config changes
    nova.config.onDidChange("eablokker.tabs-sidebar.open-on-single-click", (newVal, oldVal) => {
        openOnSingleClick = newVal;
    });

    nova.config.onDidChange("eablokker.tabs-sidebar.always-show-parent-folder", (newVal, oldVal) => {
        alwaysShowParentFolder = newVal;

        treeView.reload();
    });

    nova.config.onDidChange("eablokker.tabs-sidebar.show-group-count", (newVal, oldVal) => {
        showGroupCount = newVal;

        tabDataProvider.sortItems();
        treeView.reload();
    });

    nova.config.onDidChange("eablokker.tabs-sidebar.unsaved-symbol", (newVal, oldVal) => {
        unsavedSymbol = newVal;

        treeView.reload();
    });

    nova.config.onDidChange("eablokker.tabs-sidebar.unsaved-symbol-location", (newVal, oldVal) => {
        unsavedSymbolLocation = newVal;

        treeView.reload();
    });

    nova.workspace.config.onDidChange("eablokker.tabsSidebar.config.groupByKind", (newVal, oldVal) => {
        groupByKind = newVal;

        tabDataProvider.setGroupByKind(groupByKind);
        treeView.reload();
    });

    // Create the TreeView
    tabDataProvider = new TabDataProvider(nova.workspace.textDocuments);
    treeView = new TreeView("tabs-sidebar", {
        dataProvider: tabDataProvider
    });

    // Initially sort by tabs bar order
    //nova.commands.invoke("tabs-sidebar.cleanUpByTabBarOrder");

    nova.workspace.onDidAddTextEditor(editor => {
        //console.log('Document opened');

        let reload;
        const folder = tabDataProvider.getFolderBySyntax(editor.document.syntax || "plaintext");

        tabDataProvider.loadData(nova.workspace.textDocuments, focusedTab);

        if (folder && groupByKind) {
            reload = treeView.reload(folder);
        } else {
            reload = treeView.reload();
        }

        reload.then(() => {
            // Focus tab in sidebar
            focusedTab = tabDataProvider.getElementByUri(editor.document.uri);
            treeView.reveal(focusedTab, { focus: true });
        });

        // Remove tab from sidebar when editor closed
        editor.onDidDestroy(destroyedEditor => {
            //console.log('Document closed');

            setTimeout(() => {
                let reload;
                const folder = tabDataProvider.getFolderBySyntax(destroyedEditor.document.syntax || "plaintext");

                if (folder && folder.children.length > 1 && groupByKind) {
                    reload = treeView.reload(folder);
                } else {
                    reload = treeView.reload();
                }

                tabDataProvider.loadData(nova.workspace.textDocuments);

                reload.then(() => {
                    const document = nova.workspace.activeTextEditor.document;
                    focusedTab = tabDataProvider.getElementByUri(document.uri);
                    treeView.reveal(focusedTab, { focus: true });
                });
            }, 1);
        });

        // Focus tab in sidebar when clicking in document
        editor.onDidChangeSelection(changedEditor => {
            //console.log('Document changed');

            // Highlight sidebar tab if tab changed or no focused tab yet or no treeview selection
            if (focusedTab && treeView.selection[0] === changedEditor.document.uri && changedEditor.document.uri === focusedTab.uri) {
                return;
            }

            focusedTab = tabDataProvider.getElementByUri(changedEditor.document.uri);
            treeView.reveal(focusedTab);
        });

        editor.onDidStopChanging(changedEditor => {
            //console.log('Document stopped changing');

            focusedTab = tabDataProvider.getElementByUri(changedEditor.document.uri);
            tabDataProvider.setDirty(changedEditor);

            treeView.reload(focusedTab).then(() => {
                treeView.reveal(focusedTab, { focus: true });
            });
        });

        // Focus tab in sidebar when saving document
        editor.onDidSave(savedEditor => {
            //console.log('Document saved');

            focusedTab = tabDataProvider.getElementByUri(savedEditor.document.uri);
            tabDataProvider.setDirty(savedEditor);

            treeView.reload(focusedTab).then(() => {
                treeView.reveal(focusedTab, { focus: true });
            });
        });

        const document = editor.document;
        document.onDidChangePath((changedDocument, path) => {
            console.log("editor.document.onDidChangePath", changedDocument.uri, path);

        });

        document.onDidChangeSyntax((changedDocument, newSyntax) => {
            console.log("editor.document.onDidChangeSyntax", changedDocument.uri, newSyntax);

        });
    });

    treeView.onDidChangeSelection((selection) => {
        //console.log("New selection: " + selection[0].name);

        if (openOnSingleClick) {
            nova.commands.invoke("tabs-sidebar.open", nova.workspace);
        }
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
    // console.log("Close Tab clicked");

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
                                treeView.reveal(focusedTab, { focus: true });
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
    // console.log("Selection: " + selection[0].name);

    if (!selection.length) {
        return;
    }

    const isRemote = selection[0].isRemote;

    // Switch to tab for local file
    if (!isRemote) {
        workspace.openFile(selection[0].uri)
            .then(editor => {
                focusedTab = tabDataProvider.getElementByUri(editor.document.uri);
                treeView.reveal(focusedTab, { focus: true });
            });
        return;
    }

    // Switch to tab for remote file
    tabDataProvider
        .runProcess("/list_menu_items.sh", ["Window"])
        .then(result => {
            const workspaceName = nova.workspace.config.get("workspace.name", "string") || nova.path.split(nova.workspace.path).pop();
            const resultArray = result.split(", ");
            const element = selection[0];
            let basename = nova.path.basename(element.path);
            let parentPath = "";
            const isUnique = tabDataProvider.isUniqueName(element);

            // Differentiate remote file by common parent path
            if (!isUnique) {
                const commonBasePath = tabDataProvider.getCommonBasePath(element);
                parentPath = decodeURI(nova.path.dirname(element.path).substring(commonBasePath.length));
            }

            if (parentPath.length) {
                basename += " – " + parentPath;
            }

            let menuPosition = -1;
            let projectFound = false;
            resultArray.every((menuItem, i, self) => {
                if (menuItem.trim() === workspaceName && self[i - 1].trim() === "missing value") {
                    projectFound = true;
                }

                if (menuItem.trim() === basename) {
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
                    // console.log("Menu item " + menuPosition + " of Window menu clicked");
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

    // console.log(JSON.stringify(selection[0]));
    // console.log("Move Up: " + selection.map((e) => e.name));

    tabDataProvider.moveTab(selection[0], -1).then(() => {
        treeView.reveal(selection[0], { focus: true });
    });
});

nova.commands.register("tabs-sidebar.down", () => {
    // Invoked when the "Move Down" header button is clicked
    let selection = treeView.selection;

    // console.log(JSON.stringify(selection[0]));
    // console.log("Move Down: " + selection.map((e) => e.name));

    tabDataProvider.moveTab(selection[0], 1).then(() => {
        treeView.reveal(selection[0], { focus: true });
    });
});

nova.commands.register("tabs-sidebar.cleanUpByTabBarOrder", (workspace) => {
    //console.log("Clean up by tab bar order clicked");

    tabDataProvider.runProcess("/list_menu_items.sh", ["Window"])
        .then(result => {
            //console.log(result);

            tabDataProvider.cleanUpByTabBarOrder(result);

            focusedTab = tabDataProvider.getElementByUri(workspace.activeTextEditor.document.uri);
            treeView.reload().then(() => {
                treeView.reveal(focusedTab, { focus: true });
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
        treeView.reveal(focusedTab, { focus: true });
    });
});

nova.commands.register("tabs-sidebar.cleanUpByKind", () => {
    console.log("cleanUpByKind");

    tabDataProvider.cleanUpByKind();
    treeView.reload().then(() => {
        treeView.reveal(focusedTab, { focus: true });
    });
});

nova.commands.register("tabs-sidebar.sortByAlpha", (workspace) => {
    console.log("Sort alphabetically");

    const sortAlpha = !workspace.config.get("eablokker.tabsSidebar.config.sortAlpha", "boolean");

    workspace.config.set("eablokker.tabsSidebar.config.sortAlpha", sortAlpha);

    tabDataProvider.setSortAlpha(sortAlpha);
    treeView.reload();
});

nova.commands.register("tabs-sidebar.groupByKind", (workspace) => {
    console.log("groupByKind");

    workspace.config.set("eablokker.tabsSidebar.config.groupByKind", !groupByKind);
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

    // console.log(selection[0].path);

    nova.fs.reveal(selection[0].path);
});

nova.commands.register("tabs-sidebar.copyPath", () => {
    let selection = treeView.selection;
    nova.clipboard.writeText(selection[0].path);
});

nova.commands.register("tabs-sidebar.copyRelativePath", workspace => {
    let selection = treeView.selection;
    nova.clipboard.writeText(selection[0].path.substring(workspace.path.length));
});

class TabItem {
    constructor(tab) {
        this.name = tab.name;
        this.path = tab.path;
        this.uri = tab.uri;
        this.descriptiveText = tab.description || "";
        this.parentPath = tab.parentPath;
        this.isRemote = tab.isRemote || false;
        this.isDirty = tab.isDirty || false;
        this.isUntitled = tab.isUntitled || false;
        this.isTrashed = tab.isTrashed || false;
        this.children = [];
        this.parent = null;
        this.collapsibleState = TreeItemCollapsibleState.None;
        this.syntax = tab.syntax || "plaintext";
        this.extension = tab.extension || null;
        this.icon = tab.icon || null;
        this.count = tab.count || null;
    }

    addChild(element) {
        element.parent = this;
        this.children.push(element);
    }
}


class TabDataProvider {
    constructor(documentTabs) {
        this.flatItems = [];
        this.groupedItems = [];
        this.customOrder = customTabOrder || [];

        this.sortAlpha = nova.workspace.config
            .get("eablokker.tabsSidebar.config.sortAlpha", "boolean");
        this.groupByKind = groupByKind;

        this.loadData(documentTabs);
    }

    loadData(documentTabs, focusedTab) {
        // Remove extraneous from custom order
        if (this.customOrder.length) {
            this.customOrder = this.customOrder.filter(path => {
                return documentTabs.some(tab => tab.path === path);
            });
        }

        // Remove closed tabs
        this.flatItems.forEach((item, i, self) => {
            const tabIsClosed = documentTabs.every(tab => tab.uri !== item.uri);
            if (tabIsClosed) {
                // Remove from flat items
                self.splice(i, 1);
                // Remove from custom order
                this.customOrder.splice(this.customOrder.indexOf(item.path, 1));
            }
        });

        this.groupedItems.forEach((folder, i, self) => {
            folder.children.forEach((child, i2, self2) => {
                const tabIsClosed = documentTabs.every(tab => tab.uri !== child.uri);
                if (tabIsClosed) {
                    self2.splice(i2, 1);

                    // Remove folder if now empty
                    if (!folder.children.length) {
                        self.splice(i, 1);
                    }
                }
            });
        });

        // Add newly opened tabs
        documentTabs.forEach(tab => {
            // Hide untitled tabs
            if (tab.isUntitled) {
                return;
            }

            // Check if tab is new in custom order
            const tabIsNewInCustomOrder = this.customOrder.every(path => path !== tab.path);

            // Add new tab to custom order
            if (tabIsNewInCustomOrder && focusedTab) {
                // Splice new tab into array just after focused tab
                const tabIndex = this.customOrder
                    .findIndex(path => path === focusedTab.path);
                this.customOrder.splice(tabIndex + 1, 0, tab.path);
            } else if (tabIsNewInCustomOrder) {
                this.customOrder.push(tab.path);
            }

            // Check if tab is new in flat items
            const tabIsNew = this.flatItems.every(item => item.uri !== tab.uri);

            // Add tab to flat items if new
            if (tabIsNew) {
                const tabName = this.basename(tab.path || "untitled");
                const extName = nova.path.extname(tab.path).replace(/^\./, "");

                // Check if in .Trash folder
                const trashRegex = new RegExp("^file:\/\/" + nova.path.expanduser("~") + "\/\.Trash\/");
                const isTrashed = trashRegex.test(tab.uri);

                const element = new TabItem({
                    name: tabName,
                    path: tab.path,
                    uri: tab.uri,
                    description: "",
                    isRemote: tab.isRemote,
                    isDirty: tab.isDirty,
                    isUntitled: tab.isUntitled,
                    isTrashed: isTrashed,
                    contextValue: "tabItem",
                    syntax: tab.syntax,
                    extension: extName
                });

                this.flatItems.push(element);

                // Add tab to grouped items if new
                const tabSyntax = tab.syntax || "plaintext";
                const folder = this.groupedItems.find(group => group.syntax === tabSyntax);

                if (folder) {
                    const childIndex = folder.children.findIndex(child => child.uri === tab.uri);
                    if (childIndex < 0) {
                        folder.addChild(Object.assign({}, element));
                    }
                } else {
                    const titleCaseName = tabSyntax
                        .split(" ")
                        .map((s) => s.charAt(0).toUpperCase() + s.substring(1))
                        .join(" ");
                    const extName = nova.path.extname(tab.path).replace(/^\./, "");

                    const newFolder = new TabItem({
                        name: syntaxnames[tabSyntax] || titleCaseName,
                        path: "",
                        uri: "",
                        description: "",
                        syntax: tab.syntax,
                        extension: extName
                    });

                    newFolder.addChild(Object.assign({}, element));
                    this.groupedItems.push(newFolder);
                }
            }
        });
        nova.workspace.config.set("eablokker.tabsSidebar.config.customTabOrder", this.customOrder);

        this.sortItems();
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

    isUniqueName(tab) {
        return nova.workspace.textDocuments
            .filter(doc => doc.uri !== tab.uri)
            .every(doc => {
                const basename = this.basename(doc.uri);
                return basename !== this.basename(tab.uri);
            });
    }

    getCommonBasePath(tab) {
        const tabDirArray = nova.path.split(nova.path.dirname(tab.path || ""));
        const similarTabs = nova.workspace.textDocuments
            .filter(doc => {
                // Differentiate between local and remote files with same name
                return doc.isRemote === tab.isRemote && this.basename(doc.uri) === this.basename(tab.uri);
            });

        let commonDirArray = [];
        tabDirArray.every((dir, i) => {
            const commonDir = similarTabs.every((tab2) => {
                const tabDirArray2 = nova.path.split(nova.path.dirname(tab2.path || ""));
                return tabDirArray2[i] === dir;
            });

            if (!commonDir) {
                return false;
            }

            commonDirArray.push(dir);
            return true;
        });

        if (commonDirArray.length === 1) {
            return "/";
        }

        return commonDirArray.join("/");
    }

    moveTab(tab, distance) {
        const fromIndex = this.customOrder.indexOf(tab.path);
        const toIndex = fromIndex + distance;

        if (toIndex < 0 || toIndex > this.customOrder.length) {
            return;
        }

        const item = this.customOrder.splice(fromIndex, 1)[0];
        this.customOrder.splice(toIndex, 0, item);
        nova.workspace.config.set("eablokker.tabsSidebar.config.customTabOrder", this.customOrder);

        this.sortItems();
        return treeView.reload();
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
            // Sort by parent path if filename is not unique
            const paths = [a, b].map(path => {
                let basename = nova.path.basename(path);
                let parentPath = "";
                const element = tabDataProvider.getElementByPath(path);
                const isUnique = tabDataProvider.isUniqueName(element);

                if (isUnique) {
                    return basename;
                }

                const commonBasePath = tabDataProvider.getCommonBasePath(element);
                parentPath = decodeURI(nova.path.dirname(element.path).substring(commonBasePath.length));

                if (parentPath.length) {
                    basename += " – " + parentPath;
                }

                return basename;
            });

            if (currentWindow.tabs.indexOf(paths[0]) < 0) {
                return 1;
            }

            return (
                currentWindow.tabs.indexOf(paths[0]) -
                currentWindow.tabs.indexOf(paths[1])
            );
        });
        nova.workspace.config.set("eablokker.tabsSidebar.config.customTabOrder", this.customOrder);

        this.sortItems();
    }

    cleanUpByAlpha() {
        this.customOrder.sort((a, b) => {
            return nova.path.basename(a).localeCompare(nova.path.basename(b));
        });
        nova.workspace.config.set("eablokker.tabsSidebar.config.customTabOrder", this.customOrder);

        this.sortItems();
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
        nova.workspace.config.set("eablokker.tabsSidebar.config.customTabOrder", this.customOrder);

        this.sortItems();
    }

    setSortAlpha(sortAlpha) {
        //console.log("Setting sort alpha", sortAlpha);
        this.sortAlpha = sortAlpha;

        this.sortItems();
    }

    setGroupByKind(groupByKind) {
        //console.log("Setting sort by kind", groupByKind);
        this.groupByKind = groupByKind;

        this.sortItems();
    }

    byCustomOrder(a, b) {
        if (this.customOrder.indexOf(a.path) < 0) {
            return 1;
        }
        return this.customOrder.indexOf(a.path) - this.customOrder.indexOf(b.path);
    }

    sortItems() {
        // Sort custom ordered items by custom order
        this.flatItems.sort(this.byCustomOrder.bind(this));

        // Sort folders alphabetically
        this.groupedItems.sort((a, b) => {
            return a.name.localeCompare(b.name);
        });

        // Sort folder children by custom order
        this.groupedItems.forEach(item => {
            item.children.sort(this.byCustomOrder.bind(this));
        });

        // Set context of position in list
        const length = this.flatItems.length;
        this.flatItems.forEach((tab, i) => {
            if (length === 1) {
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

        if (this.sortAlpha) {
            console.log("Sorting by alpha");

            this.flatItems.sort((a, b) => {
                return a.name.localeCompare(b.name);
            });
        }

        if (this.groupByKind && this.sortAlpha) {
            console.log("Sorting folders by alpha");

            this.groupedItems.sort((a, b) => {
                return a.name.localeCompare(b.name);
            });

            this.groupedItems.forEach(item => {
                item.children.sort((a, b) => {
                    return a.name.localeCompare(b.name);
                });
            });
        }
    }

    getElementByUri(uri) {
        if (this.groupByKind) {
            let childElement = null;
            this.groupedItems.some(item => {
                childElement = item.children.find(child => {
                    return child.uri === uri;
                });

                return !!childElement;
            });

            return childElement;
        }

        return this.flatItems.find(item => {
            return item.uri === uri;
        });

    }

    getElementByPath(path) {
        const element = this.flatItems.find(item => {
            return item.path === path;
        });

        if (element) {
            return element;
        }

        let childElement = null;
        this.flatItems.some(item => {
            childElement = item.children.find(child => {
                return child.path === path;
            });

            return !!childElement;
        });

        return childElement;
    }

    getFolderBySyntax(syntax) {
        return this.groupedItems.find(folder => folder.syntax === syntax);
    }

    getChildren(element) {
        // Requests the children of an element
        if (!element) {
            if (this.groupByKind) {
                return this.groupedItems;
            } else {
                return this.flatItems;
            }
        }
        else {
            return element.children;
        }
    }

    getParent(element) {
        // Requests the parent of an element, for use with the reveal() method
        return element.parent;
    }

    getTreeItem(element) {
        // Converts an element into its display (TreeItem) representation

        let name = element.name;
        let description = "";

        if (element.isDirty) {
            switch (unsavedSymbolLocation) {
            case "never":
                break;
            case "after-filename":
                description = (unsavedSymbol || "●") + " " + description;
                break;
            case "before-filename":
            default:
                name = (unsavedSymbol || "●") + " " + name;
                break;
            }
        }

        let item = new TreeItem(name);
        if (element.children.length > 0) {
            item.descriptiveText = showGroupCount ? "(" + element.children.length + ")" : "";
            item.collapsibleState = TreeItemCollapsibleState.Expanded;
            item.path = element.path;
            item.tooltip = "";
            item.contextValue = "kindGroup";
            item.identifier = element.name;
            item.image = element.extension ? "__filetype." + element.extension : element.syntax === "plaintext" ? "__filetype.txt" : "__filetype.blank";
            item.syntax = element.syntax;
        }
        else {
            // Calculate parent folder path for description
            let parentPath = "";
            const isUnique = this.isUniqueName(element);

            // Always show parent folder if config setting is toggled on
            if (alwaysShowParentFolder && !parentPath.length) {
                const tabDirArray = nova.path.split(nova.path.dirname(element.path || ""));
                parentPath = decodeURI(tabDirArray[tabDirArray.length - 1]);
                description += "‹ " + parentPath;
            }

            // Show parent path if filename is not unique
            if (!isUnique) {
                const commonBasePath = this.getCommonBasePath(element);
                parentPath = decodeURI(nova.path.dirname(element.path).substring(commonBasePath.length))
                    .split("/")
                    .reverse();

                parentPath
                    .filter(dir => dir.length)
                    .forEach((dir, i) => {
                        if (i === 0) {
                            description = "";
                        }

                        description += "‹ " + dir + " ";
                    });
            }

            if (element.isTrashed) {
                description = "‹ Trash 🗑" + description;
            } else if (element.isRemote) {
                description = "☁️" + description;
            }

            item.descriptiveText = description;
            item.path = element.path;
            item.tooltip = element.path;
            item.command = "tabs-sidebar.doubleClick";
            item.contextValue = element.contextValue;
            item.identifier = element.uri;
            item.image = element.extension ? "__filetype." + element.extension : "__filetype.blank";
            item.syntax = element.syntax;
        }
        return item;
    }
}
