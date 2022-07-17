
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

    nova.workspace.onDidAddTextEditor((editor) => {
        //console.log('Document opened');

        tabDataProvider.loadData(nova.workspace.textDocuments);
        treeView.reload();

        // Focus tab in sidebar
        setTimeout(() => {
            // nova.workspace.activeTextEditor
            focusedTab = tabDataProvider.getElementByUri(editor.document.uri);
            treeView.reveal(focusedTab);
        }, 100);

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

        // Focus tab in sidebar when saving document
        editor.onDidSave(savedEditor => {
            //console.log('Document saved');

            focusedTab = tabDataProvider.getElementByUri(savedEditor.document.uri);
            treeView.reveal(focusedTab);
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

nova.commands.register("tabs-sidebar.doubleClick", () => {
    // Invoked when an item is double-clicked
    let selection = treeView.selection;
    console.log("DoubleClick: " + selection.map((e) => e.name));

    nova.workspace.openFile(selection.map((e) => e.uri));
});

nova.commands.register("tabs-sidebar.up", () => {
    // Invoked when the "add" header button is clicked
    let selection = treeView.selection;

    console.log(JSON.stringify(selection[0]));

    console.log("Move Up: " + selection.map((e) => e.name));
});

nova.commands.register("tabs-sidebar.down", () => {
    // Invoked when the "remove" header button is clicked
    let selection = treeView.selection;

    console.log(JSON.stringify(selection[0]));

    console.log("Move Down: " + selection.map((e) => e.name));
});

nova.commands.register("tabs-sidebar.cleanUpByAlpha", () => {
    console.log("cleanUpByAlpha");
});

nova.commands.register("tabs-sidebar.cleanUpByKind", () => {
    console.log("cleanUpByKind");
});

nova.commands.register("tabs-sidebar.sortByAlpha", () => {
    console.log("Sort alphabetically");

    const sortAlpha = !nova.workspace.config.get("eablokker.tabsSidebar.config.sortAlpha", "boolean");

    nova.workspace.config.set("eablokker.tabsSidebar.config.sortAlpha", sortAlpha);

    tabDataProvider.setSortAlpha(sortAlpha);
    treeView.reload();
});

nova.commands.register("tabs-sidebar.groupByKind", () => {
    console.log("groupByKind");

    const groupByKind = !nova.workspace.config.get("eablokker.tabsSidebar.config.groupByKind", "boolean");

    nova.workspace.config.set("eablokker.tabsSidebar.config.groupByKind", groupByKind);

    tabDataProvider.setGroupByKind(groupByKind);
    treeView.reload();
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

        this.sortAlpha = nova.workspace.config.get("eablokker.tabsSidebar.config.sortAlpha", "boolean");
        this.groupByKind = nova.workspace.config.get("eablokker.tabsSidebar.config.groupByKind", "boolean");

        this.loadData(documentTabs);
    }

    loadData(documentTabs) {
        let rootItems = [];

        documentTabs.forEach((tab) => {
            const tabName = nova.path.basename(tab.path || "untitled");
            const tabDir = nova.path.split(nova.path.dirname(tab.path || ""));
            const tabDescription = tabDir[tabDir.length - 1];
            let element = new TabItem({
                name: tabName,
                path: tab.path,
                uri: tab.uri,
                description: tabDescription,
                isRemote: tab.isRemote,
                isDirty: tab.isDirty,
                isUntitled: tab.isUntitled
            });
            rootItems.push(element);
        });

        this.customOrderedItems = rootItems;
        this.rootItems = rootItems;

        this.sortRootItems();
    }

    setSortAlpha(sortAlpha) {
        console.log("Setting sort alpha", sortAlpha);
        this.sortAlpha = sortAlpha;

        this.sortRootItems();
    }

    setGroupByKind(groupByKind) {
        console.log("Setting sort by kind", groupByKind);
        this.groupByKind = groupByKind;

        this.sortRootItems();
    }

    sortRootItems() {
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
        let item = new TreeItem(element.name);
        if (element.children.length > 0) {
            item.descriptiveText = element.descriptiveText;
            item.collapsibleState = TreeItemCollapsibleState.Collapsed;
            item.path = element.path;
            item.contextValue = "tab";
            item.identifier = element.path;
        }
        else {
            item.descriptiveText = element.descriptiveText;
            item.path = element.path;
            item.command = "tabs-sidebar.doubleClick";
            item.contextValue = "info";
            item.identifier = element.path;
        }
        return item;
    }
}

