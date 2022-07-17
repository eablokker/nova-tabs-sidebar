
var treeView = null;


exports.activate = function() {
    // Do work when the extension is activated

    // Create the TreeView
    const tabDataProvider = new TabDataProvider(nova.workspace.textDocuments);
    treeView = new TreeView("tabs-sidebar", {
        dataProvider: tabDataProvider
    });

    nova.workspace.onDidAddTextEditor((editor) => {
        console.log('Document opened');

        tabDataProvider.loadData(nova.workspace.textDocuments);
        treeView.reload();

        editor.onDidDestroy(destroyedEditor => {
            console.log('Document closed');

            setTimeout(() => {
                tabDataProvider.loadData(nova.workspace.textDocuments);
                treeView.reload();
            }, 1);
        });
    });

    treeView.onDidChangeSelection((selection) => {
        // console.log("New selection: " + selection.map((e) => e.name));
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
}

exports.deactivate = function() {
    // Clean up state before the extension is deactivated
}


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

nova.commands.register("tabs-sidebar.doubleClick", () => {
    // Invoked when an item is double-clicked
    let selection = treeView.selection;
    console.log("DoubleClick: " + selection.map((e) => e.name));
});


class TabItem {
    constructor(tab) {
        this.name = tab.name;
        this.path = tab.path;
        this.uri = tab.uri;
        this.descriptiveText = tab.description || '';
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
        this.loadData(documentTabs);
    }

    loadData(documentTabs) {
        let rootItems = [];

        documentTabs.forEach((tab) => {
            const tabName = nova.path.basename(tab.path || 'untitled');
            const tabDir = nova.path.split(nova.path.dirname(tab.path || ''));
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

        this.rootItems = rootItems;
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

