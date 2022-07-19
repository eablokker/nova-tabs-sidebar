
var treeView = null;
var tabDataProvider = null;
var focusedTab = null;

exports.activate = function() {
    // Do work when the extension is activated

    // Create the TreeView
    tabDataProvider = new TabDataProvider(nova.workspace.textDocuments);
    treeView = new TreeView("tabs-sidebar", {
        dataProvider: tabDataProvider
    });

    nova.workspace.onDidAddTextEditor(editor => {
        //console.log('Document opened');

        tabDataProvider.loadData(nova.workspace.textDocuments);
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
                treeView.reload();
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
        //nova.workspace.openFile(selection.map((e) => e.uri));
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

nova.commands.register("tabs-sidebar.open", (workspace) => {
    let selection = treeView.selection;
    workspace.openFile(selection.map((e) => e.uri));
});

nova.commands.register("tabs-sidebar.doubleClick", (workspace) => {
    // Invoked when an item is double-clicked
    let selection = treeView.selection;
    console.log("DoubleClick: " + selection.map((e) => e.name));

    workspace.openFile(selection.map((e) => e.uri));
});

nova.commands.register("tabs-sidebar.up", () => {
    // Invoked when the "Move Up" header button is clicked
    let selection = treeView.selection;

    console.log(JSON.stringify(selection[0]));

    console.log("Move Up: " + selection.map((e) => e.name));

    tabDataProvider.moveTab(selection[0], -1);
});

nova.commands.register("tabs-sidebar.down", () => {
    // Invoked when the "Move Down" header button is clicked
    let selection = treeView.selection;

    console.log(JSON.stringify(selection[0]));

    console.log("Move Down: " + selection.map((e) => e.name));

    tabDataProvider.moveTab(selection[0], 1);
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

    const sortAlpha = !workspace.config.get("eablokker.tabsSidebar.config.sortAlpha", "boolean");

    workspace.config.set("eablokker.tabsSidebar.config.sortAlpha", sortAlpha);

    tabDataProvider.setSortAlpha(sortAlpha);
    treeView.reload();
});

nova.commands.register("tabs-sidebar.groupByKind", (workspace) => {
    console.log("groupByKind");

    const groupByKind = !workspace.config.get("eablokker.tabsSidebar.config.groupByKind", "boolean");

    workspace.config.set("eablokker.tabsSidebar.config.groupByKind", groupByKind);

    tabDataProvider.setGroupByKind(groupByKind);
    treeView.reload();
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

        this.sortAlpha = nova.workspace.config.get("eablokker.tabsSidebar.config.sortAlpha", "boolean");
        this.groupByKind = nova.workspace.config.get("eablokker.tabsSidebar.config.groupByKind", "boolean");

        this.loadData(documentTabs);
    }

    loadData(documentTabs) {
        let rootItems = [];
        const customOrderIsNotSet = !this.customOrder.length;

        documentTabs.forEach((tab) => {
            // Hide untitled tabs
            if (tab.isUntitled) {
                return;
            }

            if (customOrderIsNotSet) {
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
                contextValue: "tabItem"
            });
            rootItems.push(element);
        });

        this.customOrderedItems = rootItems;
        this.rootItems = rootItems;

        this.sortRootItems();
    }

    setDirty(editor) {
        this.rootItems.forEach(item => {
            if (item.path === editor.document.path) {
                item.isDirty = editor.document.isDirty;
            }
        });
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

    cleanUpByAlpha() {
        this.customOrder.sort((a, b) => {
            return nova.path.basename(a).localeCompare(nova.path.basename(b));
        });

        this.sortRootItems();
    }

    cleanUpByKind() {
        this.customOrder.sort((a, b) => {
            return nova.path.extname(a).localeCompare(nova.path.extname(b));
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

        this.customOrderedItems.forEach((tab, i) => {
            if (i === 0) {
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

            this.rootItems.sort((a, b) => {
                return a.name.localeCompare(b.name);
            });
        } else {
            this.rootItems = this.customOrderedItems.slice();
        }

        if (this.groupByKind) {
            console.log("Grouping by kind");

            this.rootItems.sort((a, b) => {
                return nova.path.extname(a.uri).localeCompare(nova.path.extname(b.uri));
            });
        }

        if (!this.sortAlpha && ! this.groupByKind) {
            console.log("Sorting by custom");
            this.rootItems = this.customOrderedItems.slice();
        }
    }

    getElementByUri(uri) {
        return this.rootItems.find((item) => {
            return item.uri === uri;
        });
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
        return element.parent;
    }

    getTreeItem(element) {
        // Converts an element into its display (TreeItem) representation
        let item = new TreeItem((element.isDirty ? "● " : "") + element.name);
        if (element.children.length > 0) {
            item.descriptiveText = element.descriptiveText;
            item.collapsibleState = TreeItemCollapsibleState.Collapsed;
            item.path = element.uri;
            item.tooltip = "tooltip";
            item.contextValue = "tab";
            item.identifier = element.uri;
        }
        else {
            item.descriptiveText = element.descriptiveText;
            item.path = element.uri;
            item.tooltip = element.path;
            item.command = "tabs-sidebar.doubleClick";
            item.contextValue = element.contextValue;
            item.identifier = element.uri;
        }
        return item;
    }
}

