'use strict';

var treeView;
var tabDataProvider;
var focusedTab;
// Config vars
var openOnSingleClick = nova.config.get('eablokker.tabs-sidebar.open-on-single-click', 'boolean');
var alwaysShowParentFolder = nova.config.get('eablokker.tabs-sidebar.always-show-parent-folder', 'boolean');
var showGroupCount = nova.config.get('eablokker.tabs-sidebar.show-group-count', 'boolean');
var unsavedSymbol = nova.config.get('eablokker.tabs-sidebar.unsaved-symbol', 'string');
var unsavedSymbolLocation = nova.config.get('eablokker.tabs-sidebar.unsaved-symbol-location', 'string');
var groupByKind = nova.workspace.config.get('eablokker.tabsSidebar.config.groupByKind', 'boolean');
var customTabOrder = nova.workspace.config.get('eablokker.tabsSidebar.config.customTabOrder', 'array');
var syntaxnames = {
    'plaintext': 'Plain Text',
    'coffeescript': 'CoffeeScript',
    'css': 'CSS',
    'diff': 'Diff',
    'erb': 'ERB',
    'haml': 'Haml',
    'html': 'HTML',
    'ini': 'INI',
    'javascript': 'JavaScript',
    'json': 'JSON',
    'jsx': 'JSX',
    'less': 'Less',
    'lua': 'Lua',
    'markdown': 'Markdown',
    'perl': 'Perl',
    'php': 'PHP-HTML',
    'python': 'Python',
    'ruby': 'Ruby',
    'sass': 'Sass',
    'scss': 'SCSS',
    'shell': 'Shell Script',
    'smarty': 'Smarty',
    'sql': 'SQL',
    'tsx': 'TSX',
    'twig': 'Twig-HTML',
    'twig-markdown': 'Twig-Markdown',
    'typescript': 'TypeScript',
    'vue': 'Vue',
    'xml': 'XML',
    'yaml': 'YAML'
};
var openRemoteTab = function (uri) {
    return new Promise(function (resolve, reject) {
        tabDataProvider
            .runProcess(__dirname + '/list_menu_items.sh', ['Window'])
            .then(function (result) {
            var workspaceName = nova.workspace.config.get('workspace.name', 'string') || nova.path.split(nova.workspace.path || '').pop();
            var resultArray = result.split(', ');
            var element = tabDataProvider.getElementByUri(uri);
            if (!element) {
                console.warn('No element found for uri ' + uri);
                return;
            }
            var basename = nova.path.basename(element.uri);
            var parentPath = '';
            var isUnique = tabDataProvider.isUniqueName(element);
            // Differentiate remote file by common parent path
            if (!isUnique) {
                var commonBasePath = tabDataProvider.getCommonBasePath(element);
                parentPath = decodeURI(nova.path.dirname(element.uri).substring(commonBasePath.length));
            }
            if (parentPath.length) {
                basename += ' – ' + parentPath;
            }
            var menuPosition = -1;
            var projectFound = false;
            resultArray.every(function (menuItem, i, self) {
                if (menuItem.trim() === workspaceName && self[i - 1].trim() === 'missing value') {
                    projectFound = true;
                }
                if (menuItem.trim() === basename) {
                    menuPosition = i + 1; // Zero-indexed to 1-indexed
                }
                // Exit early at end of project items
                if (projectFound && menuItem.trim() === 'missing value') {
                    return false;
                }
                return true;
            });
            if (menuPosition < 0) {
                reject();
                return;
            }
            tabDataProvider
                .runProcess(__dirname + '/click_menu_item_by_number.sh', ['Window', menuPosition.toString()])
                .then(function () {
                // console.log('Menu item ' + menuPosition + ' of Window menu clicked');
                var editor = nova.workspace.activeTextEditor;
                resolve(editor);
            })
                .catch(function (err) {
                console.error('Could not click menu item by number.', err);
            });
        })
            .catch(function (err) {
            reject(err);
        });
    });
};
exports.activate = function () {
    // Do work when the extension is activated
    // Create the TreeView
    tabDataProvider = new TabDataProvider();
    treeView = new TreeView('tabs-sidebar', {
        dataProvider: tabDataProvider
    });
    // Make shell scripts executable on activation
    var shellScriptPaths = [
        '/click_menu_item.sh',
        '/click_menu_item_by_number.sh',
        '/list_menu_items.sh'
    ];
    shellScriptPaths.forEach(function (path) {
        var scriptExists = nova.fs.access(__dirname + path, nova.fs.constants.F_OK);
        if (!scriptExists) {
            console.error('Shell script not found', __dirname + path);
            return;
        }
        var scriptIsExecutable = nova.fs.access(__dirname + path, nova.fs.constants.X_OK);
        if (scriptExists && !scriptIsExecutable) {
            tabDataProvider
                .runProcess('/bin/chmod', ['744', __dirname + path])
                .then(function () {
                if (nova.inDevMode())
                    console.log('Shell script ' + path + ' changed to 744');
            })
                .catch(function (err) {
                console.error(err);
            });
        }
    });
    // Watch for config changes
    nova.config.onDidChange('eablokker.tabs-sidebar.open-on-single-click', function (newVal, oldVal) {
        openOnSingleClick = newVal;
    });
    nova.config.onDidChange('eablokker.tabs-sidebar.always-show-parent-folder', function (newVal, oldVal) {
        alwaysShowParentFolder = newVal;
        treeView.reload();
    });
    nova.config.onDidChange('eablokker.tabs-sidebar.show-group-count', function (newVal, oldVal) {
        showGroupCount = newVal;
        tabDataProvider.sortItems();
        treeView.reload();
    });
    nova.config.onDidChange('eablokker.tabs-sidebar.unsaved-symbol', function (newVal, oldVal) {
        unsavedSymbol = newVal;
        treeView.reload();
    });
    nova.config.onDidChange('eablokker.tabs-sidebar.unsaved-symbol-location', function (newVal, oldVal) {
        unsavedSymbolLocation = newVal;
        treeView.reload();
    });
    nova.workspace.config.onDidChange('eablokker.tabsSidebar.config.groupByKind', function (newVal, oldVal) {
        groupByKind = newVal;
        tabDataProvider.setGroupByKind(groupByKind);
        treeView.reload();
    });
    // Initially sort by tabs bar order
    //nova.commands.invoke('tabs-sidebar.cleanUpByTabBarOrder');
    // Prevent excessive reloading
    var reloadTimeoutID = setTimeout(function () { });
    nova.workspace.onDidAddTextEditor(function (editor) {
        //console.log('Document opened');
        clearTimeout(reloadTimeoutID);
        reloadTimeoutID = setTimeout(function () {
            var reload;
            var folder = tabDataProvider.getFolderBySyntax(editor.document.syntax || 'plaintext');
            tabDataProvider.loadData(nova.workspace.textDocuments, focusedTab);
            if (folder && groupByKind) {
                reload = treeView.reload(folder);
            }
            else {
                reload = treeView.reload();
            }
            reload
                .then(function () {
                // Focus tab in sidebar
                focusedTab = tabDataProvider.getElementByUri(editor.document.uri);
                //treeView.reveal(focusedTab, { focus: true });
            })
                .catch(function (err) {
                console.error('Could not reload treeView.', err);
            });
        }, 1);
        // Remove tab from sidebar when editor closed
        editor.onDidDestroy(function (destroyedEditor) {
            //console.log('Document closed');
            setTimeout(function () {
                var reload;
                var folder = tabDataProvider.getFolderBySyntax(destroyedEditor.document.syntax || 'plaintext');
                if (folder && folder.children.length > 1 && groupByKind) {
                    reload = treeView.reload(folder);
                }
                else {
                    reload = treeView.reload();
                }
                tabDataProvider.loadData(nova.workspace.textDocuments);
                reload
                    .then(function () {
                    var document = nova.workspace.activeTextEditor.document;
                    focusedTab = tabDataProvider.getElementByUri(document.uri);
                    treeView.reveal(focusedTab || null, { focus: true });
                })
                    .catch(function (err) {
                    console.error('Could not reload treeView.', err);
                });
            }, 1);
        });
        // Focus tab in sidebar when clicking in document
        editor.onDidChangeSelection(function (changedEditor) {
            //console.log('Document changed');
            if (!treeView.selection[0]) {
                return;
            }
            // Highlight sidebar tab if tab changed or no focused tab yet or no treeview selection
            if (focusedTab && treeView.selection[0].uri === changedEditor.document.uri && changedEditor.document.uri === focusedTab.uri) {
                return;
            }
            focusedTab = tabDataProvider.getElementByUri(changedEditor.document.uri);
            treeView.reveal(focusedTab || null, { focus: true });
        });
        editor.onDidStopChanging(function (changedEditor) {
            //console.log('Document stopped changing');
            focusedTab = tabDataProvider.getElementByUri(changedEditor.document.uri);
            tabDataProvider.setDirty(changedEditor);
            treeView.reload(focusedTab)
                .then(function () {
                treeView.reveal(focusedTab || null, { focus: true });
            })
                .catch(function (err) {
                console.error('Could not reload treeView.', err);
            });
        });
        // Focus tab in sidebar when saving document
        editor.onDidSave(function (savedEditor) {
            //console.log('Document saved');
            focusedTab = tabDataProvider.getElementByUri(savedEditor.document.uri);
            tabDataProvider.setDirty(savedEditor);
            treeView.reload(focusedTab)
                .then(function () {
                treeView.reveal(focusedTab || null, { focus: true });
            })
                .catch(function (err) {
                console.error('Could not reload treeView.', err);
            });
        });
        var document = editor.document;
        document.onDidChangePath(function (changedDocument, path) {
            if (nova.inDevMode())
                console.log('editor.document.onDidChangePath', changedDocument.uri, path);
        });
        document.onDidChangeSyntax(function (changedDocument, newSyntax) {
            if (nova.inDevMode())
                console.log('editor.document.onDidChangeSyntax', changedDocument.uri, newSyntax);
        });
    });
    treeView.onDidChangeSelection(function (selection) {
        //console.log('New selection: ' + selection.map((e) => e.name));
        if (!selection[0]) {
            return;
        }
        var activeDocument = nova.workspace.activeTextEditor.document;
        if (openOnSingleClick && activeDocument.uri !== selection[0].uri) {
            nova.commands.invoke('tabs-sidebar.open');
        }
    });
    treeView.onDidExpandElement(function (element) {
        // console.log('Expanded: ' + element.name);
    });
    treeView.onDidCollapseElement(function (element) {
        // console.log('Collapsed: ' + element.name);
    });
    treeView.onDidChangeVisibility(function () {
        // console.log('Visibility Changed');
    });
    // TreeView implements the Disposable interface
    nova.subscriptions.add(treeView);
};
exports.deactivate = function () {
    // Clean up state before the extension is deactivated
};
nova.commands.register('tabs-sidebar.close', function (workspace) {
    // console.log('Close Tab clicked');
    var selection = treeView.selection;
    if (!selection[0]) {
        return;
    }
    var activeDocument = workspace.activeTextEditor.document;
    var activeDocumentIsRemote = activeDocument.isRemote;
    var selectionIsRemote = selection[0].isRemote;
    // Close currently active tab
    if (selection[0].uri === activeDocument.uri) {
        tabDataProvider
            .runProcess(__dirname + '/click_menu_item.sh', ['File', 'Close Tab'])
            .then(function (result) {
            activeDocument = workspace.activeTextEditor.document;
            focusedTab = tabDataProvider.getElementByUri(activeDocument.uri);
            treeView.reveal(focusedTab || null, { focus: true });
        })
            .catch(function (err) {
            console.error('Could not click menu item.', err);
        });
        return;
    }
    if (!selectionIsRemote) {
        // Close non currently active tab by switching to it and back
        workspace.openFile(selection[0].uri)
            .then(function (editor) {
            tabDataProvider
                .runProcess(__dirname + '/click_menu_item.sh', ['File', 'Close Tab'])
                .then(function (result) {
                // Switch back to local tab after closing other local tab
                if (!activeDocumentIsRemote) {
                    workspace.openFile(activeDocument.uri)
                        .then(function (editor) {
                        focusedTab = tabDataProvider.getElementByUri(editor.document.uri);
                        treeView.reveal(focusedTab || null, { focus: true });
                    })
                        .catch(function (err) {
                        console.error('Could not open file.', err);
                    });
                    return;
                }
                // Switch back to remote tab after closing other local tab
                openRemoteTab(activeDocument.uri)
                    .then(function (editor) {
                    focusedTab = tabDataProvider.getElementByUri(activeDocument.uri);
                    treeView.reveal(focusedTab || null, { focus: true });
                })
                    .catch(function (err) {
                    console.error('Could not open remote tab.', err);
                });
            })
                .catch(function (err) {
                console.error('Could not click menu item.', err);
            });
        })
            .catch(function (err) {
            console.error('Could not open file.', err);
        });
        return;
    }
    openRemoteTab(selection[0].uri)
        .then(function (editor) {
        tabDataProvider
            .runProcess(__dirname + '/click_menu_item.sh', ['File', 'Close Tab'])
            .then(function (result) {
            // Switch back to local tab after closing other remote tab
            if (!activeDocumentIsRemote) {
                workspace.openFile(activeDocument.uri)
                    .then(function (editor) {
                    focusedTab = tabDataProvider.getElementByUri(editor.document.uri);
                    treeView.reveal(focusedTab || null, { focus: true });
                })
                    .catch(function (err) {
                    console.error('Could not open file.', err);
                });
                return;
            }
            // Switch back to remote tab after closing other remote tab
            openRemoteTab(activeDocument.uri)
                .then(function (editor) {
                focusedTab = tabDataProvider.getElementByUri(activeDocument.uri);
                treeView.reveal(focusedTab || null, { focus: true });
            })
                .catch(function (err) {
                console.error('Could not open remote tab.', err);
            });
        })
            .catch(function (err) {
            console.error('Could not click menu item.', err);
        });
    })
        .catch(function (err) {
        console.error('Could not open remote tab.', err);
    });
});
nova.commands.register('tabs-sidebar.open', function (workspace) {
    var selection = treeView.selection;
    // console.log('Selection: ' + selection[0].name);
    if (!selection[0]) {
        return;
    }
    var isRemote = selection[0].isRemote;
    // Switch to tab for local file
    if (!isRemote) {
        workspace.openFile(selection[0].uri)
            .then(function (editor) {
            focusedTab = tabDataProvider.getElementByUri(editor.document.uri);
            //treeView.reveal(focusedTab, { focus: true });
        })
            .catch(function (err) {
            console.error('Could not open file.', err);
        });
        return;
    }
    // Switch to tab for remote file
    openRemoteTab(selection[0].uri)
        .then(function (editor) {
        focusedTab = tabDataProvider.getElementByUri(editor.document.uri);
        //treeView.reveal(focusedTab, { focus: true });
    })
        .catch(function (err) {
        console.error('Could not open remote tab.', err);
    });
});
nova.commands.register('tabs-sidebar.doubleClick', function (workspace) {
    // Invoked when an item is double-clicked
    nova.commands.invoke('tabs-sidebar.open', workspace);
});
nova.commands.register('tabs-sidebar.up', function () {
    // Invoked when the 'Move Up' header button is clicked
    var selection = treeView.selection;
    if (!selection[0]) {
        return;
    }
    if (selection[0] instanceof FolderItem) {
        return;
    }
    // console.log(JSON.stringify(selection[0]));
    // console.log('Move Up: ' + selection.map((e) => e.name));
    tabDataProvider.moveTab(selection[0], -1);
});
nova.commands.register('tabs-sidebar.down', function () {
    // Invoked when the 'Move Down' header button is clicked
    var selection = treeView.selection;
    if (!selection[0]) {
        return;
    }
    if (selection[0] instanceof FolderItem) {
        return;
    }
    // console.log(JSON.stringify(selection[0]));
    // console.log('Move Down: ' + selection.map((e) => e.name));
    tabDataProvider.moveTab(selection[0], 1);
});
nova.commands.register('tabs-sidebar.cleanUpByTabBarOrder', function (workspace) {
    //console.log('Clean up by tab bar order clicked');
    tabDataProvider.runProcess(__dirname + '/list_menu_items.sh', ['Window'])
        .then(function (result) {
        //console.log(result);
        tabDataProvider.cleanUpByTabBarOrder(result);
        focusedTab = tabDataProvider.getElementByUri(workspace.activeTextEditor.document.uri);
        treeView.reload()
            .then(function () {
            treeView.reveal(focusedTab || null, { focus: true });
        })
            .catch(function (err) {
            console.error('Could not reload treeView.', err);
        });
    })
        .catch(function (err) {
        console.error(err);
    });
});
nova.commands.register('tabs-sidebar.cleanUpByAlpha', function () {
    if (nova.inDevMode())
        console.log('cleanUpByAlpha');
    tabDataProvider.cleanUpByAlpha();
    treeView.reload()
        .then(function () {
        treeView.reveal(focusedTab || null, { focus: true });
    })
        .catch(function (err) {
        console.error('Could not reload treeView.', err);
    });
});
nova.commands.register('tabs-sidebar.cleanUpByKind', function () {
    if (nova.inDevMode())
        console.log('cleanUpByKind');
    tabDataProvider.cleanUpByKind();
    treeView.reload()
        .then(function () {
        treeView.reveal(focusedTab || null, { focus: true });
    })
        .catch(function (err) {
        console.error('Could not reload treeView.', err);
    });
});
nova.commands.register('tabs-sidebar.sortByAlpha', function (workspace) {
    if (nova.inDevMode())
        console.log('Sort alphabetically');
    var sortAlpha = !workspace.config.get('eablokker.tabsSidebar.config.sortAlpha', 'boolean');
    workspace.config.set('eablokker.tabsSidebar.config.sortAlpha', sortAlpha);
    tabDataProvider.setSortAlpha(sortAlpha);
    treeView.reload();
});
nova.commands.register('tabs-sidebar.groupByKind', function (workspace) {
    if (nova.inDevMode())
        console.log('groupByKind');
    workspace.config.set('eablokker.tabsSidebar.config.groupByKind', !groupByKind);
});
nova.commands.register('tabs-sidebar.showInFilesSidebar', function (workspace) {
    if (nova.inDevMode())
        console.log('Show in Files Sidebar');
    var selection = treeView.selection;
    if (!selection[0]) {
        return;
    }
    // Need to open selected tab in order to invoke command
    workspace.openFile(selection[0].uri)
        .then(function (editor) {
        tabDataProvider
            .runProcess(__dirname + '/click_menu_item.sh', ['File', 'Show in Files Sidebar'])
            .then(function (result) {
        })
            .catch(function (err) {
            console.error('Could not click menu item.', err);
        });
    })
        .catch(function (err) {
        console.error('Could not open file.', err);
    });
});
nova.commands.register('tabs-sidebar.showInFinder', function () {
    var selection = treeView.selection;
    if (!selection[0]) {
        return;
    }
    if (!selection[0].path) {
        if (nova.inDevMode())
            console.log('No path found for selection', selection[0].name);
        return;
    }
    nova.fs.reveal(selection[0].path);
});
nova.commands.register('tabs-sidebar.copyPath', function () {
    var selection = treeView.selection;
    if (!selection[0]) {
        return;
    }
    if (!selection[0].path) {
        if (nova.inDevMode())
            console.log('No path found for selection', selection[0].name);
        return;
    }
    nova.clipboard.writeText(selection[0].path);
});
nova.commands.register('tabs-sidebar.copyRelativePath', function (workspace) {
    var selection = treeView.selection;
    if (!selection[0]) {
        return;
    }
    if (!selection[0].path) {
        if (nova.inDevMode())
            console.log('No path found for selection', selection[0].name);
        return;
    }
    nova.clipboard.writeText(selection[0].path.substring(workspace.path.length));
});
nova.commands.register('tabs-sidebar.refresh', function (workspace) {
    var selection = treeView.selection;
    if (selection[0] instanceof FolderItem) {
        tabDataProvider.loadData(workspace.textDocuments);
    }
    else {
        tabDataProvider.loadData(workspace.textDocuments, selection[0] || undefined);
    }
    treeView.reload();
});
var TabItem = /** @class */ (function () {
    function TabItem(name, tab) {
        // Check if in .Trash folder
        var trashRegex = new RegExp('^file:\/\/' + nova.path.expanduser('~') + '\/\.Trash\/');
        var isTrashed = trashRegex.test(decodeURI(tab.uri));
        var extName = nova.path.extname(tab.path || '').replace(/^\./, '');
        this.name = name;
        this.path = tab.path || undefined;
        this.uri = tab.uri;
        this.descriptiveText = '';
        this.isRemote = tab.isRemote || false;
        this.isDirty = tab.isDirty || false;
        this.isUntitled = tab.isUntitled || false;
        this.isTrashed = isTrashed;
        this.children = [];
        this.parent = undefined;
        this.syntax = tab.syntax || 'plaintext';
        this.extension = extName;
        this.icon = undefined;
        this.count = undefined;
        this.contextValue = 'tabItem';
    }
    return TabItem;
}());
var FolderItem = /** @class */ (function () {
    function FolderItem(name, syntax, extName) {
        this.name = name;
        this.path = undefined;
        this.uri = '';
        this.descriptiveText = '';
        this.isRemote = false;
        this.isDirty = false;
        this.children = [];
        this.parent = undefined;
        this.collapsibleState = TreeItemCollapsibleState.None;
        this.syntax = syntax || 'plaintext';
        this.extension = extName;
        this.icon = undefined;
        this.count = undefined;
        this.contextValue = 'kindGroup';
    }
    FolderItem.prototype.addChild = function (element) {
        element.parent = this;
        this.children.push(element);
    };
    return FolderItem;
}());
var TabDataProvider = /** @class */ (function () {
    function TabDataProvider() {
        this.flatItems = [];
        this.groupedItems = [];
        this.customOrder = customTabOrder || [];
        this.sortAlpha = nova.workspace.config
            .get('eablokker.tabsSidebar.config.sortAlpha', 'boolean');
        this.groupByKind = groupByKind;
    }
    TabDataProvider.prototype.loadData = function (documentTabs, focusedTab) {
        var _this = this;
        // Remove extraneous from custom order
        if (this.customOrder.length) {
            this.customOrder = this.customOrder.filter(function (path) {
                return documentTabs.some(function (tab) { return tab.path === path; });
            });
        }
        // Remove closed tabs
        this.flatItems.forEach(function (item, i, self) {
            var tabIsClosed = documentTabs.every(function (tab) { return tab.uri !== item.uri; });
            if (tabIsClosed) {
                // Remove from flat items
                self.splice(i, 1);
                // Remove from custom order
                _this.customOrder.splice(_this.customOrder.indexOf(item.path || '', 1));
            }
        });
        this.groupedItems.forEach(function (folder, i, self) {
            folder.children.forEach(function (child, i2, self2) {
                var tabIsClosed = documentTabs.every(function (tab) { return tab.uri !== child.uri; });
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
        documentTabs.forEach(function (tab) {
            // Hide untitled tabs
            if (tab.isUntitled || !tab.path) {
                return;
            }
            // Check if tab is new in custom order
            var tabIsNewInCustomOrder = _this.customOrder.every(function (path) { return path !== tab.path; });
            // Add new tab to custom order
            if (tabIsNewInCustomOrder && focusedTab) {
                // Splice new tab into array just after focused tab
                var tabIndex = _this.customOrder
                    .findIndex(function (path) { return path === focusedTab.path; });
                _this.customOrder.splice(tabIndex + 1, 0, tab.path);
            }
            else if (tabIsNewInCustomOrder) {
                _this.customOrder.push(tab.path);
            }
            // Check if tab is new in flat items
            var tabIsNew = _this.flatItems.every(function (item) { return item.uri !== tab.uri; });
            // Add tab to flat items if new
            if (tabIsNew) {
                var tabName = _this.basename(tab.path || 'untitled');
                var element = new TabItem(tabName, tab);
                _this.flatItems.push(element);
                // Add tab to grouped items if new
                var tabSyntax_1 = tab.syntax || 'plaintext';
                var folder = _this.groupedItems.find(function (group) { return group.syntax === tabSyntax_1; });
                if (folder) {
                    var childIndex = folder.children.findIndex(function (child) { return child.uri === tab.uri; });
                    if (childIndex < 0) {
                        folder.addChild(Object.assign({}, element));
                    }
                }
                else {
                    var titleCaseName = tabSyntax_1
                        .split(' ')
                        .map(function (s) { return s.charAt(0).toUpperCase() + s.substring(1); })
                        .join(' ');
                    var extName = nova.path.extname(tab.path || '').replace(/^\./, '');
                    var newFolder = new FolderItem(syntaxnames[tabSyntax_1] || titleCaseName, tab.syntax, extName);
                    newFolder.addChild(Object.assign({}, element));
                    _this.groupedItems.push(newFolder);
                }
            }
        });
        nova.workspace.config.set('eablokker.tabsSidebar.config.customTabOrder', this.customOrder);
        this.sortItems();
    };
    TabDataProvider.prototype.runProcess = function (scriptPath, args, timeout) {
        if (timeout === void 0) { timeout = 3000; }
        return new Promise(function (resolve, reject) {
            var outString = '';
            var errorString = '';
            var process = new Process(scriptPath, { args: args });
            process.onStdout(function (line) {
                outString += line;
            });
            process.onStderr(function (line) {
                errorString += line;
            });
            var timeoutID = setTimeout(function () {
                // Ensure the process terminates in a timely fashion
                reject('The process did not respond in a timely manner.');
                process.terminate();
            }, timeout);
            process.onDidExit(function (status) {
                clearTimeout(timeoutID);
                if (errorString.length) {
                    reject(new Error(errorString));
                }
                else {
                    resolve(outString);
                }
            });
            process.start();
        });
    };
    TabDataProvider.prototype.setDirty = function (editor) {
        var element = this.getElementByUri(editor.document.uri);
        if (element) {
            element.isDirty = editor.document.isDirty;
        }
    };
    TabDataProvider.prototype.basename = function (uri) {
        return nova.path.basename(uri);
    };
    TabDataProvider.prototype.isUniqueName = function (tab) {
        var _this = this;
        return nova.workspace.textDocuments
            .filter(function (doc) { return doc.uri !== tab.uri; })
            .every(function (doc) {
            var basename = _this.basename(doc.uri);
            return basename !== _this.basename(tab.uri);
        });
    };
    TabDataProvider.prototype.getCommonBasePath = function (tab) {
        var _this = this;
        var tabDirArray = nova.path.split(nova.path.dirname(tab.path || ''));
        var similarTabs = nova.workspace.textDocuments
            .filter(function (doc) {
            // Differentiate between local and remote files with same name
            return doc.isRemote === tab.isRemote && _this.basename(doc.uri) === _this.basename(tab.uri);
        });
        var commonDirArray = [];
        tabDirArray.every(function (dir, i) {
            var commonDir = similarTabs.every(function (tab2) {
                var tabDirArray2 = nova.path.split(nova.path.dirname(tab2.path || ''));
                return tabDirArray2[i] === dir;
            });
            if (!commonDir) {
                return false;
            }
            commonDirArray.push(dir);
            return true;
        });
        if (commonDirArray.length === 1) {
            return '/';
        }
        return commonDirArray.join('/');
    };
    TabDataProvider.prototype.moveTab = function (tab, distance) {
        // Original tab path
        var uri = tab.uri;
        var path = tab.path;
        // Get item indexes
        var fromItemIndex = this.flatItems.findIndex(function (item) { return item.uri === uri; });
        var toItemIndex = fromItemIndex + distance;
        if (toItemIndex < 0 || toItemIndex >= this.flatItems.length) {
            return;
        }
        // Get items to swap
        var fromItem = this.flatItems[fromItemIndex];
        var toItem = this.flatItems[toItemIndex];
        // Swap data between items
        var keys = Object.keys(fromItem).concat(Object.keys(toItem));
        keys
            .filter(function (key, i, keys) { return keys.indexOf(key) === i; }) // Remove duplicates
            .forEach(function (key) {
            // Preserve context value
            if (key === 'contextValue') {
                return;
            }
            var tabItemKey = key;
            var newVal = fromItem[tabItemKey];
            var oldVal = toItem[tabItemKey];
            // @ts-expect-error
            toItem[tabItemKey] = newVal;
            // @ts-expect-error
            fromItem[tabItemKey] = oldVal;
        });
        // Update custom order
        var fromIndex = this.customOrder.indexOf(path || '');
        var toIndex = fromIndex + distance;
        if (toIndex < 0 || toIndex >= this.customOrder.length) {
            return;
        }
        var item = this.customOrder.splice(fromIndex, 1)[0];
        this.customOrder.splice(toIndex, 0, item);
        nova.workspace.config.set('eablokker.tabsSidebar.config.customTabOrder', this.customOrder);
        // Reload each item that got swapped
        Promise.all([treeView.reload(fromItem), treeView.reload(toItem)])
            .then(function () {
            treeView.reveal(toItem, { focus: true });
        })
            .catch(function (err) {
            console.error(err);
        });
    };
    TabDataProvider.prototype.cleanUpByTabBarOrder = function (result) {
        var workspaceName = nova.workspace.config.get('workspace.name', 'string') ||
            nova.path.split(nova.workspace.path || '').pop();
        var menuGroups = result
            .split(', missing value, ')
            .map(function (group) {
            var items = group.split(',')
                .map(function (item) { return item.trim(); })
                .filter(function (item) { return item !== 'missing value'; });
            var name = items.shift();
            return {
                name: name,
                tabs: items
            };
        });
        var lastWindowMenuItemIndex = menuGroups
            .findIndex(function (item) { return item.name === 'Bring All to Front'; });
        menuGroups.splice(0, lastWindowMenuItemIndex + 1);
        var currentWindow = menuGroups
            .find(function (item) { return item.name === workspaceName; });
        this.customOrder.sort(function (a, b) {
            // Sort by parent path if filename is not unique
            var paths = [a, b].map(function (path) {
                var basename = nova.path.basename(path);
                var parentPath = '';
                var element = tabDataProvider.getElementByPath(path);
                if (!element) {
                    return basename;
                }
                var isUnique = tabDataProvider.isUniqueName(element);
                if (isUnique) {
                    return basename;
                }
                var commonBasePath = tabDataProvider.getCommonBasePath(element);
                parentPath = decodeURI(nova.path.dirname(element.path || '').substring(commonBasePath.length));
                if (parentPath.length) {
                    basename += ' – ' + parentPath;
                }
                return basename;
            });
            if (!currentWindow) {
                return 0;
            }
            if (currentWindow.tabs.indexOf(paths[0]) < 0) {
                return 1;
            }
            return (currentWindow.tabs.indexOf(paths[0]) -
                currentWindow.tabs.indexOf(paths[1]));
        });
        nova.workspace.config.set('eablokker.tabsSidebar.config.customTabOrder', this.customOrder);
        this.sortItems();
    };
    TabDataProvider.prototype.cleanUpByAlpha = function () {
        this.customOrder.sort(function (a, b) {
            return nova.path.basename(a).localeCompare(nova.path.basename(b));
        });
        nova.workspace.config.set('eablokker.tabsSidebar.config.customTabOrder', this.customOrder);
        this.sortItems();
    };
    TabDataProvider.prototype.cleanUpByKind = function () {
        var elementArray = this.customOrder.map(function (path) {
            return tabDataProvider.getElementByPath(path);
        });
        this.customOrder.sort(function (a, b) {
            var aElement = elementArray.find(function (item) { return (item === null || item === void 0 ? void 0 : item.path) === a; });
            var bElement = elementArray.find(function (item) { return (item === null || item === void 0 ? void 0 : item.path) === b; });
            if (!aElement || !bElement) {
                return 0;
            }
            return aElement.syntax.localeCompare(bElement.syntax);
        });
        nova.workspace.config.set('eablokker.tabsSidebar.config.customTabOrder', this.customOrder);
        this.sortItems();
    };
    TabDataProvider.prototype.setSortAlpha = function (sortAlpha) {
        //console.log('Setting sort alpha', sortAlpha);
        this.sortAlpha = sortAlpha;
        this.sortItems();
    };
    TabDataProvider.prototype.setGroupByKind = function (groupByKind) {
        //console.log('Setting sort by kind', groupByKind);
        this.groupByKind = groupByKind;
        this.sortItems();
    };
    TabDataProvider.prototype.byCustomOrder = function (a, b) {
        if (this.customOrder.indexOf(a.path || '') < 0) {
            return 1;
        }
        return this.customOrder.indexOf(a.path || '') - this.customOrder.indexOf(b.path || '');
    };
    TabDataProvider.prototype.sortItems = function () {
        var _this = this;
        // Sort custom ordered items by custom order
        this.flatItems.sort(this.byCustomOrder.bind(this));
        // Sort folders alphabetically
        this.groupedItems.sort(function (a, b) {
            return a.name.localeCompare(b.name);
        });
        // Sort folder children by custom order
        this.groupedItems.forEach(function (item) {
            item.children.sort(_this.byCustomOrder.bind(_this));
        });
        // Set context of position in list
        var length = this.flatItems.length;
        this.flatItems.forEach(function (tab, i) {
            if (length === 1) {
                tab.contextValue = 'only';
            }
            else if (i === 0) {
                tab.contextValue = 'first';
            }
            else if (i === length - 1) {
                tab.contextValue = 'last';
            }
            else {
                tab.contextValue = 'tab';
            }
        });
        //console.log('this.customOrder', this.customOrder);
        if (this.sortAlpha) {
            if (nova.inDevMode())
                console.log('Sorting by alpha');
            this.flatItems.sort(function (a, b) {
                return a.name.localeCompare(b.name);
            });
        }
        if (this.groupByKind && this.sortAlpha) {
            if (nova.inDevMode())
                console.log('Sorting folders by alpha');
            this.groupedItems.sort(function (a, b) {
                return a.name.localeCompare(b.name);
            });
            this.groupedItems.forEach(function (item) {
                item.children.sort(function (a, b) {
                    return a.name.localeCompare(b.name);
                });
            });
        }
    };
    TabDataProvider.prototype.getElementByUri = function (uri) {
        if (this.groupByKind) {
            var childElement_1;
            this.groupedItems.some(function (item) {
                childElement_1 = item.children.find(function (child) {
                    return child.uri === uri;
                });
                return !!childElement_1;
            });
            return childElement_1;
        }
        return this.flatItems.find(function (item) {
            return item.uri === uri;
        });
    };
    TabDataProvider.prototype.getElementByPath = function (path) {
        var element = this.flatItems.find(function (item) {
            return item.path === path;
        });
        if (element) {
            return element;
        }
        var childElement = undefined;
        this.flatItems.some(function (item) {
            childElement = item.children.find(function (child) {
                return child.path === path;
            });
            return !!childElement;
        });
        return childElement;
    };
    TabDataProvider.prototype.getFolderBySyntax = function (syntax) {
        return this.groupedItems.find(function (folder) { return folder.syntax === syntax; });
    };
    TabDataProvider.prototype.getChildren = function (element) {
        // Requests the children of an element
        if (!element) {
            if (this.groupByKind) {
                return this.groupedItems;
            }
            else {
                return this.flatItems;
            }
        }
        else {
            return element.children;
        }
    };
    TabDataProvider.prototype.getParent = function (element) {
        // Requests the parent of an element, for use with the reveal() method
        return element.parent;
    };
    TabDataProvider.prototype.getTreeItem = function (element) {
        // Converts an element into its display (TreeItem) representation
        var item;
        if (element instanceof FolderItem) {
            item = new TreeItem(element.name);
            item.descriptiveText = showGroupCount ? '(' + element.children.length + ')' : '';
            item.collapsibleState = TreeItemCollapsibleState.Expanded;
            item.path = element.path;
            item.tooltip = '';
            item.contextValue = element.contextValue;
            item.identifier = element.syntax;
            item.image = element.extension ? '__filetype.' + element.extension : element.syntax === 'plaintext' ? '__filetype.txt' : '__filetype.blank';
        }
        else {
            element.name;
            var description_1 = '';
            if (element.isDirty) {
                switch (unsavedSymbolLocation) {
                    case 'never':
                        break;
                    case 'after-filename':
                        description_1 = (unsavedSymbol || '●') + ' ' + description_1;
                        break;
                }
            }
            item = new TreeItem(element.name);
            // Calculate parent folder path for description
            var parentPath = '';
            var isUnique = this.isUniqueName(element);
            // Always show parent folder if config setting is toggled on
            if (alwaysShowParentFolder && !parentPath.length) {
                var tabDirArray = nova.path.split(nova.path.dirname(element.path || ''));
                parentPath = decodeURI(tabDirArray[tabDirArray.length - 1]);
                description_1 += '‹ ' + parentPath;
            }
            // Show parent path if filename is not unique
            if (!isUnique) {
                var commonBasePath = this.getCommonBasePath(element);
                var parentPathSplit = decodeURI(nova.path.dirname(element.path || '').substring(commonBasePath.length))
                    .split('/')
                    .reverse();
                parentPathSplit
                    .filter(function (dir) { return dir.length; })
                    .forEach(function (dir, i) {
                    if (i === 0) {
                        description_1 = '';
                    }
                    description_1 += '‹ ' + dir + ' ';
                });
            }
            if (element.isTrashed) {
                description_1 = '‹ Trash 🗑' + description_1;
            }
            else if (element.isRemote) {
                description_1 = '☁️' + description_1;
            }
            item.descriptiveText = description_1;
            item.path = element.path;
            item.tooltip = element.path;
            item.command = 'tabs-sidebar.doubleClick';
            item.contextValue = element.contextValue;
            item.identifier = element.uri;
            item.image = element.extension ? '__filetype.' + element.extension : '__filetype.blank';
        }
        return item;
    };
    return TabDataProvider;
}());
//# sourceMappingURL=main.dist.js.map
