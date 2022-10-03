'use strict';

var __extends = (undefined && undefined.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var treeView;
var tabDataProvider;
var focusedTab;
var openTabWhenFocusSidebar = true;
// Config vars
var openOnSingleClick = nova.config.get('eablokker.tabs-sidebar.open-on-single-click', 'boolean');
var showGitStatus = nova.config.get('eablokker.tabs-sidebar.show-git-status', 'string');
var alwaysShowParentFolder = nova.config.get('eablokker.tabs-sidebar.always-show-parent-folder', 'boolean');
var showGroupCount = nova.config.get('eablokker.tabs-sidebar.show-group-count', 'boolean');
var unsavedSymbol = nova.config.get('eablokker.tabs-sidebar.unsaved-symbol', 'string');
var unsavedSymbolLocation = nova.config.get('eablokker.tabs-sidebar.unsaved-symbol-location', 'string');
var groupByKind = nova.workspace.config.get('eablokker.tabsSidebar.config.groupByKind', 'boolean');
var customTabOrder = nova.workspace.config.get('eablokker.tabsSidebar.config.customTabOrder', 'array');
var watcher;
var syntaxnames = {
    'plaintext': nova.localize('Plain Text'),
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
        var element = tabDataProvider.getElementByUri(uri);
        if (!element) {
            console.warn('No tab element found for uri ' + uri);
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
        tabDataProvider
            .runProcess(__dirname + '/click_project_item_by_name.sh', [nova.localize('Window'), basename])
            .then(function () {
            // console.log('Menu item ' + basename + ' of Window menu clicked');
            var editor = nova.workspace.activeTextEditor;
            resolve(editor);
        })
            .catch(function (err) {
            console.error('Could not click project item by filename.', err);
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
        '/click_project_item_by_name.sh',
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
    nova.config.onDidChange('eablokker.tabs-sidebar.show-git-status', function (newVal, oldVal) {
        showGitStatus = newVal;
        treeView.reload();
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
    // Prevent excessive reloading
    var reloadTimeoutID = setTimeout(function () {
        //
    });
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
                    var document = nova.workspace.activeTextEditor ? nova.workspace.activeTextEditor.document : null;
                    if (document) {
                        focusedTab = tabDataProvider.getElementByUri(document.uri);
                        treeView.reveal(focusedTab || null, { focus: true });
                    }
                })
                    .catch(function (err) {
                    console.error('Could not reload treeView.', err);
                });
            }, 1);
        });
        // Focus tab in sidebar when clicking in document
        editor.onDidChangeSelection(function (changedEditor) {
            // if (nova.inDevMode()) console.log('editor.onDidChangeSelection');
            var selection = treeView.selection[0];
            var document = changedEditor.document;
            // Don't reveal in treeview if it's already selected
            if (selection && selection.uri === document.uri) {
                return;
            }
            focusedTab = tabDataProvider.getElementByUri(changedEditor.document.uri);
            openTabWhenFocusSidebar = false;
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
        if (nova.inDevMode())
            console.log('treeView.onDidChangeSelection');
        //console.log('New selection: ' + selection.map((e) => e.name));
        if (!selection[0]) {
            return;
        }
        // Prevent tab opening when editor selection changes
        if (openTabWhenFocusSidebar === false) {
            openTabWhenFocusSidebar = true;
            return;
        }
        var activeDocument = nova.workspace.activeTextEditor ? nova.workspace.activeTextEditor.document : null;
        if (openOnSingleClick && (!activeDocument || activeDocument.uri !== selection[0].uri)) {
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
    // Prevent excessive watch events
    var watchTimeoutID = setTimeout(function () {
        //
    });
    // Don't watch files if workspace is not bound to folder
    if (showGitStatus !== 'never' && nova.workspace.path) {
        watcher = nova.fs.watch(null, function () { });
        watcher.onDidChange(function (path) {
            clearTimeout(watchTimeoutID);
            watchTimeoutID = setTimeout(function () {
                console.log('File changed', path);
                tabDataProvider.updateGitStatus()
                    .then(function (gitStatuses) {
                    gitStatuses.forEach(function (gitStatus) {
                        var path = nova.path.join(nova.workspace.path || '', gitStatus.path);
                        // console.log('gitStatus.path', path);
                        var element = tabDataProvider.getElementByPath(path);
                        // console.log('element', element);
                        // Don't reload treeview if that file is not open in workspace
                        if (!element) {
                            return;
                        }
                        treeView.reload(element)
                            .then(function () {
                            // treeView.reveal(element || null);
                        })
                            .catch(function (err) {
                            console.error('Could not reload treeView.', err);
                        });
                    });
                })
                    .catch(function (err) {
                    console.error('Could not update git statuses', err);
                });
            }, 100);
        });
    }
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
    var activeDocument = workspace.activeTextEditor ? workspace.activeTextEditor.document : null;
    var activeDocumentIsRemote = activeDocument ? activeDocument.isRemote : false;
    var selectionIsRemote = selection[0].isRemote;
    // Close currently active tab
    if (activeDocument && selection[0].uri === activeDocument.uri) {
        tabDataProvider
            .runProcess(__dirname + '/click_menu_item.sh', [nova.localize('File'), nova.localize('Close Tab')])
            .then(function (result) {
            activeDocument = workspace.activeTextEditor ? workspace.activeTextEditor.document : null;
            if (activeDocument) {
                focusedTab = tabDataProvider.getElementByUri(activeDocument.uri);
                treeView.reveal(focusedTab || null, { focus: true });
            }
        })
            .catch(function (err) {
            console.error('Could not click menu item.', err);
        });
        return;
    }
    if (!selectionIsRemote) {
        // Close non currently active tab by switching to it and back
        workspace.openFile(selection[0].uri)
            .then(function () {
            tabDataProvider
                .runProcess(__dirname + '/click_menu_item.sh', [nova.localize('File'), nova.localize('Close Tab')])
                .then(function () {
                if (!activeDocument) {
                    return;
                }
                // Switch back to local tab after closing other local tab
                if (!activeDocumentIsRemote) {
                    workspace.openFile(activeDocument.uri)
                        .then(function (value) {
                        if (value) {
                            focusedTab = tabDataProvider.getElementByUri(value.document.uri);
                            treeView.reveal(focusedTab || null, { focus: true });
                        }
                    })
                        .catch(function (err) {
                        console.error('Could not open file.', err);
                    });
                    return;
                }
                // Switch back to remote tab after closing other local tab
                openRemoteTab(activeDocument.uri)
                    .then(function () {
                    if (activeDocument) {
                        focusedTab = tabDataProvider.getElementByUri(activeDocument.uri);
                        treeView.reveal(focusedTab || null, { focus: true });
                    }
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
        .then(function () {
        tabDataProvider
            .runProcess(__dirname + '/click_menu_item.sh', [nova.localize('File'), nova.localize('Close Tab')])
            .then(function () {
            if (!activeDocument) {
                return;
            }
            // Switch back to local tab after closing other remote tab
            if (!activeDocumentIsRemote) {
                workspace.openFile(activeDocument.uri)
                    .then(function (value) {
                    if (value) {
                        focusedTab = tabDataProvider.getElementByUri(value.document.uri);
                        treeView.reveal(focusedTab || null, { focus: true });
                    }
                })
                    .catch(function (err) {
                    console.error('Could not open file.', err);
                });
                return;
            }
            // Switch back to remote tab after closing other remote tab
            openRemoteTab(activeDocument.uri)
                .then(function (value) {
                if (value) {
                    focusedTab = tabDataProvider.getElementByUri(value.document.uri);
                    treeView.reveal(focusedTab || null, { focus: true });
                }
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
    // Don't do anything with folders
    if (selection[0].contextValue === 'kindGroup') {
        return;
    }
    var isRemote = selection[0].isRemote;
    // Switch to tab for local file
    if (!isRemote) {
        workspace.openFile(selection[0].uri)
            .then(function (value) {
            if (value) {
                focusedTab = tabDataProvider.getElementByUri(value.document.uri);
                //treeView.reveal(focusedTab, { focus: true });
            }
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
nova.commands.register('tabs-sidebar.doubleClick', function () {
    // Invoked when an item is double-clicked
    nova.commands.invoke('tabs-sidebar.open');
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
    tabDataProvider.runProcess(__dirname + '/list_menu_items.sh', [nova.localize('Window')])
        .then(function (result) {
        //console.log(result);
        tabDataProvider.cleanUpByTabBarOrder(result);
        focusedTab = workspace.activeTextEditor ? tabDataProvider.getElementByUri(workspace.activeTextEditor.document.uri) : undefined;
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
        .then(function () {
        tabDataProvider
            .runProcess(__dirname + '/click_menu_item.sh', [nova.localize('File'), nova.localize('Show in Files Sidebar')])
            .then(function () {
            //
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
    if (workspace.path) {
        nova.clipboard.writeText(selection[0].path.substring(workspace.path.length));
    }
    else {
        nova.clipboard.writeText(selection[0].path);
    }
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
var ListItem = /** @class */ (function () {
    function ListItem(name) {
        this.name = name;
    }
    return ListItem;
}());
var TabItem = /** @class */ (function (_super) {
    __extends(TabItem, _super);
    function TabItem(name, tab) {
        var _this = _super.call(this, name) || this;
        // Check if in .Trash folder
        var trashRegex = new RegExp('^file://' + nova.path.expanduser('~') + '/.Trash/');
        var isTrashed = trashRegex.test(decodeURI(tab.uri));
        var extName = nova.path.extname(tab.path || '').replace(/^\./, '');
        _this.name = name;
        _this.path = tab.path || undefined;
        _this.uri = tab.uri;
        _this.descriptiveText = '';
        _this.isRemote = tab.isRemote || false;
        _this.isDirty = tab.isDirty || false;
        _this.isUntitled = tab.isUntitled || false;
        _this.isTrashed = isTrashed;
        _this.children = [];
        _this.parent = null;
        _this.syntax = tab.syntax || 'plaintext';
        _this.extension = extName;
        _this.icon = undefined;
        _this.count = undefined;
        _this.contextValue = tab.isRemote ? 'remote-tab' : 'tab';
        return _this;
    }
    return TabItem;
}(ListItem));
var FolderItem = /** @class */ (function (_super) {
    __extends(FolderItem, _super);
    function FolderItem(name, syntax, extName) {
        var _this = _super.call(this, name) || this;
        _this.path = undefined;
        _this.uri = '';
        _this.descriptiveText = '';
        _this.isRemote = false;
        _this.isDirty = false;
        _this.children = [];
        _this.parent = null;
        _this.collapsibleState = TreeItemCollapsibleState.None;
        _this.syntax = syntax || 'plaintext';
        _this.extension = extName;
        _this.icon = undefined;
        _this.count = undefined;
        _this.contextValue = 'kindGroup';
        return _this;
    }
    FolderItem.prototype.addChild = function (element) {
        element.parent = this;
        this.children.push(element);
    };
    return FolderItem;
}(ListItem));
var TabDataProvider = /** @class */ (function () {
    function TabDataProvider() {
        this.flatItems = [];
        this.groupedItems = [];
        this.customOrder = customTabOrder || [];
        this.gitStatuses = [];
        this.sortAlpha = nova.workspace.config
            .get('eablokker.tabsSidebar.config.sortAlpha', 'boolean');
        this.groupByKind = groupByKind;
    }
    TabDataProvider.prototype.loadData = function (documentTabs, focusedTab) {
        // this.updateGitStatus();
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
    TabDataProvider.prototype.runProcess = function (scriptPath, args, cwd, timeout) {
        if (timeout === void 0) { timeout = 3000; }
        return new Promise(function (resolve, reject) {
            var outString = '';
            var errorString = '';
            var process = new Process(scriptPath, { args: args, cwd: cwd });
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
            // @ts-expect-error Need to figure out how to swap values
            toItem[tabItemKey] = newVal;
            // @ts-expect-error Need to figure out how to swap values
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
            openTabWhenFocusSidebar = false;
            treeView.reveal(toItem, { focus: true });
        })
            .catch(function (err) {
            console.error(err);
        });
    };
    TabDataProvider.prototype.cleanUpByTabBarOrder = function (result) {
        var windowList = result.split(', ');
        var currentWindow = [];
        var projectFound = false;
        windowList.every(function (menuItem) {
            if (menuItem.trim() === '✓') {
                projectFound = true;
                return true;
            }
            // Stop at end of current project list
            if (projectFound && menuItem.trim() === nova.localize('missing value')) {
                projectFound = false;
                return false;
            }
            if (projectFound) {
                currentWindow.push(menuItem.trim());
            }
            return true;
        });
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
            if (!currentWindow.length) {
                return 0;
            }
            if (currentWindow.indexOf(paths[0]) < 0) {
                return 1;
            }
            return (currentWindow.indexOf(paths[0]) -
                currentWindow.indexOf(paths[1]));
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
    TabDataProvider.prototype.updateGitStatus = function () {
        var _this = this;
        console.log('updateGitStatus()');
        return new Promise(function (resolve, reject) {
            var projectPath = nova.workspace.path;
            if (!projectPath) {
                return;
            }
            // '--no-optional-locks' git option to prevent watching changes on .git/index.lock
            _this
                .runProcess('/usr/bin/git', ['--no-optional-locks', 'status', '--porcelain'], projectPath)
                .then(function (result) {
                var gitStatusRegex = new RegExp('([ ADMRCU?!]{2}) "?([0-9a-zA-Z_. /-]+) ?-?>? ?([0-9a-zA-Z_. /-]*)', 'gm');
                var matches = gitStatusRegex.exec(result);
                // Reset statuses
                _this.gitStatuses.forEach(function (status) {
                    status.status = '';
                });
                var _loop_1 = function () {
                    var newStatus = {
                        status: matches[1],
                        path: matches[3] || matches[2]
                    };
                    var i = _this.gitStatuses.findIndex(function (status) { return status.path === newStatus.path; });
                    if (i > -1) {
                        _this.gitStatuses[i].status = newStatus.status;
                    }
                    else {
                        _this.gitStatuses.push(newStatus);
                    }
                    matches = gitStatusRegex.exec(result);
                };
                while (matches != null) {
                    _loop_1();
                }
                console.log(_this.gitStatuses);
                resolve(_this.gitStatuses);
            })
                .catch(function (err) {
                reject(err);
            });
        });
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
                tab.contextValue = tab.isRemote ? 'remote-only' : 'only';
            }
            else if (i === 0) {
                tab.contextValue = tab.isRemote ? 'remote-first' : 'first';
            }
            else if (i === length - 1) {
                tab.contextValue = tab.isRemote ? 'remote-last' : 'last';
            }
            else {
                tab.contextValue = tab.isRemote ? 'remote-tab' : 'tab';
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
        if (this.groupByKind) {
            var childElement_2;
            this.groupedItems.some(function (item) {
                childElement_2 = item.children.find(function (child) {
                    return child.path === path;
                });
                return !!childElement_2;
            });
            return childElement_2;
        }
        return this.flatItems.find(function (item) {
            return item.path === path;
        });
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
        // if (nova.inDevMode()) console.log('getParent');
        if (element === null) {
            return null;
        }
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
            var name_1 = element.name;
            var description_1 = '';
            if (element.isDirty) {
                switch (unsavedSymbolLocation) {
                    case 'never':
                        break;
                    case 'after-filename':
                        description_1 = (unsavedSymbol || '⚫︎') + ' ';
                        break;
                    case 'before-filename':
                    default:
                        name_1 = (unsavedSymbol || '⚫︎') + ' ' + name_1;
                        break;
                }
            }
            item = new TreeItem(name_1);
            item.image = element.extension ? '__filetype.' + element.extension : '__filetype.blank';
            // item.image = 'blank';
            item.tooltip = element.path ? element.path.replace(nova.path.expanduser('~'), '~') : '';
            if (element.isTrashed) {
                var trashString = nova.localize('Trash');
                description_1 = '‹ ' + trashString + ' 🗑';
            }
            else if (element.isRemote) {
                description_1 += '☁️ ';
            }
            else {
                var relativePath_1 = (element.path + '').replace(nova.workspace.path + '/', '');
                // console.log('relativePath', relativePath);
                var foundStatus = this.gitStatuses.find(function (status) { return status.path === relativePath_1; });
                if (foundStatus) {
                    console.log('status', foundStatus.status);
                    if (foundStatus.status.length && (showGitStatus === 'text' || showGitStatus === 'both')) {
                        description_1 += '[' + foundStatus.status.trim() + '] ';
                    }
                    if (showGitStatus === 'icon' || showGitStatus === 'both') {
                        switch (foundStatus.status) {
                            case ' M':
                            case 'M ':
                            case 'MM':
                                item.image = 'git-modified';
                                break;
                            case 'A ':
                            case 'AM':
                                item.image = 'git-added';
                                break;
                            case 'R ':
                                item.image = 'git-renamed';
                                break;
                            case '??':
                                item.image = 'git-untracked';
                                break;
                        }
                    }
                }
            }
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
            item.descriptiveText = description_1;
            item.path = element.path;
            item.command = 'tabs-sidebar.doubleClick';
            item.contextValue = element.contextValue;
            item.identifier = element.uri;
        }
        return item;
    };
    return TabDataProvider;
}());
//# sourceMappingURL=main.dist.js.map
