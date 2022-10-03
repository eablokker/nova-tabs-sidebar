type GitStatus = {
	status: string;
	path: string;
};

let treeView: TreeView<TabItem | FolderItem | null>;
let tabDataProvider: TabDataProvider;
let focusedTab: TabItem | undefined;
let openTabWhenFocusSidebar = true;

// Config vars
let openOnSingleClick = nova.config.get('eablokker.tabs-sidebar.open-on-single-click', 'boolean');
let showGitStatus = nova.config.get('eablokker.tabs-sidebar.show-git-status', 'string');

let alwaysShowParentFolder = nova.config.get('eablokker.tabs-sidebar.always-show-parent-folder', 'boolean');
let showGroupCount = nova.config.get('eablokker.tabs-sidebar.show-group-count', 'boolean');

let unsavedSymbol = nova.config.get('eablokker.tabs-sidebar.unsaved-symbol', 'string');
let unsavedSymbolLocation = nova.config.get('eablokker.tabs-sidebar.unsaved-symbol-location', 'string');

let groupByKind = nova.workspace.config.get('eablokker.tabsSidebar.config.groupByKind', 'boolean');
const customTabOrder = nova.workspace.config.get('eablokker.tabsSidebar.config.customTabOrder', 'array');

let fileWatcher: FileSystemWatcher;

const syntaxnames = {
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

const initFileWatcher = () => {
	// Prevent excessive watch events
	let watchTimeoutID = setTimeout(() => {
		//
	});

	// Don't watch files if workspace is not bound to folder
	if (showGitStatus !== 'never' && nova.workspace.path) {
		fileWatcher = nova.fs.watch(null, () => { /**/ });

		fileWatcher.onDidChange(path => {
			clearTimeout(watchTimeoutID);
			watchTimeoutID = setTimeout(() => {
				if (nova.inDevMode()) console.log('File changed', path);

				tabDataProvider.updateGitStatus()
					.then(gitStatuses => {
						gitStatuses.forEach(gitStatus => {
							const path = nova.path.join(nova.workspace.path || '', gitStatus.path);

							// console.log('gitStatus.path', path);

							const element = tabDataProvider.getElementByPath(path);

							// console.log('element', element);

							// Don't reload treeview if that file is not open in workspace
							if (!element) {
								return;
							}

							treeView.reload(element)
								.then(() => {
									// treeView.reveal(element || null);
								})
								.catch(err => {
									console.error('Could not reload treeView.', err);
								});
						});
					})
					.catch((err: Error) => {
						console.error('Could not update git statuses', err);
					});
			}, 100);
		});
	}
};

const openRemoteTab = (uri: string): Promise<TextEditor> => {
	return new Promise((resolve, reject) => {
		const element = tabDataProvider.getElementByUri(uri);

		if (!element) {
			console.warn('No tab element found for uri ' + uri);
			return;
		}

		let basename = nova.path.basename(element.uri);
		let parentPath = '';
		const isUnique = tabDataProvider.isUniqueName(element);

		// Differentiate remote file by common parent path
		if (!isUnique) {
			const commonBasePath = tabDataProvider.getCommonBasePath(element);
			parentPath = decodeURI(nova.path.dirname(element.uri).substring(commonBasePath.length));
		}

		if (parentPath.length) {
			basename += ' – ' + parentPath;
		}

		tabDataProvider
			.runProcess(__dirname + '/click_project_item_by_name.sh', [nova.localize('Window'), basename])
			.then(() => {
				// console.log('Menu item ' + basename + ' of Window menu clicked');
				const editor = nova.workspace.activeTextEditor;
				resolve(editor);
			})
			.catch(err => {
				console.error('Could not click project item by filename.', err);
				reject(err);
			});
	});
};

exports.activate = function() {
	// Do work when the extension is activated

	// Create the TreeView
	tabDataProvider = new TabDataProvider();
	treeView = new TreeView('tabs-sidebar', {
		dataProvider: tabDataProvider
	});

	// Make shell scripts executable on activation
	const shellScriptPaths = [
		'/click_menu_item.sh',
		'/click_project_item_by_name.sh',
		'/list_menu_items.sh'
	];

	shellScriptPaths.forEach(path => {
		const scriptExists = nova.fs.access(__dirname + path, nova.fs.constants.F_OK);

		if (!scriptExists) {
			console.error('Shell script not found', __dirname + path);
			return;
		}

		const scriptIsExecutable = nova.fs.access(__dirname + path, nova.fs.constants.X_OK);

		if (scriptExists && !scriptIsExecutable) {
			tabDataProvider
				.runProcess('/bin/chmod', ['744', __dirname + path])
				.then(() => {
					if (nova.inDevMode()) console.log('Shell script ' + path + ' changed to 744');
				})
				.catch(err => {
					console.error(err);
				});
		}
	});

	// Watch for config changes
	nova.config.onDidChange('eablokker.tabs-sidebar.open-on-single-click', (newVal: boolean, oldVal: boolean) => {
		openOnSingleClick = newVal;
	});

	nova.config.onDidChange('eablokker.tabs-sidebar.show-git-status', (newVal: string, oldVal: string) => {
		showGitStatus = newVal;

		if (newVal === 'never') {
			fileWatcher.dispose();
		} else if (oldVal === 'never' && newVal !== 'never') {
			initFileWatcher();
		}

		treeView.reload();
	});

	nova.config.onDidChange('eablokker.tabs-sidebar.always-show-parent-folder', (newVal: boolean, oldVal: boolean) => {
		alwaysShowParentFolder = newVal;

		treeView.reload();
	});

	nova.config.onDidChange('eablokker.tabs-sidebar.show-group-count', (newVal: boolean, oldVal: boolean) => {
		showGroupCount = newVal;

		tabDataProvider.sortItems();
		treeView.reload();
	});

	nova.config.onDidChange('eablokker.tabs-sidebar.unsaved-symbol', (newVal: string, oldVal: string) => {
		unsavedSymbol = newVal;

		treeView.reload();
	});

	nova.config.onDidChange('eablokker.tabs-sidebar.unsaved-symbol-location', (newVal: string, oldVal: string) => {
		unsavedSymbolLocation = newVal;

		treeView.reload();
	});

	nova.workspace.config.onDidChange('eablokker.tabsSidebar.config.groupByKind', (newVal: boolean, oldVal: boolean) => {
		groupByKind = newVal;

		tabDataProvider.setGroupByKind(groupByKind);
		treeView.reload();
	});

	// Prevent excessive reloading
	let reloadTimeoutID = setTimeout(() => {
		//
	});

	nova.workspace.onDidAddTextEditor(editor => {
		//console.log('Document opened');

		clearTimeout(reloadTimeoutID);
		reloadTimeoutID = setTimeout(() => {
			let reload;
			const folder = tabDataProvider.getFolderBySyntax(editor.document.syntax || 'plaintext');

			tabDataProvider.loadData(nova.workspace.textDocuments, focusedTab);

			if (folder && groupByKind) {
				reload = treeView.reload(folder);
			} else {
				reload = treeView.reload();
			}

			reload
				.then(() => {
					// Focus tab in sidebar
					focusedTab = tabDataProvider.getElementByUri(editor.document.uri);
					//treeView.reveal(focusedTab, { focus: true });
				})
				.catch(err => {
					console.error('Could not reload treeView.', err);
				});
		}, 1);

		// Remove tab from sidebar when editor closed
		editor.onDidDestroy(destroyedEditor => {
			//console.log('Document closed');

			setTimeout(() => {
				let reload;
				const folder = tabDataProvider.getFolderBySyntax(destroyedEditor.document.syntax || 'plaintext');

				if (folder && folder.children.length > 1 && groupByKind) {
					reload = treeView.reload(folder);
				} else {
					reload = treeView.reload();
				}

				tabDataProvider.loadData(nova.workspace.textDocuments);

				reload
					.then(() => {
						const document = nova.workspace.activeTextEditor ? nova.workspace.activeTextEditor.document : null;

						if (document) {
							focusedTab = tabDataProvider.getElementByUri(document.uri);
							treeView.reveal(focusedTab || null, { focus: true });
						}
					})
					.catch(err => {
						console.error('Could not reload treeView.', err);
					});
			}, 1);
		});

		// Focus tab in sidebar when clicking in document
		editor.onDidChangeSelection(changedEditor => {
			// if (nova.inDevMode()) console.log('editor.onDidChangeSelection');

			const selection = treeView.selection[0];
			const document = changedEditor.document;

			// Don't reveal in treeview if it's already selected
			if (selection && selection.uri === document.uri) {
				return;
			}

			focusedTab = tabDataProvider.getElementByUri(changedEditor.document.uri);
			openTabWhenFocusSidebar = false;
			treeView.reveal(focusedTab || null, { focus: true });
		});

		editor.onDidStopChanging(changedEditor => {
			//console.log('Document stopped changing');

			focusedTab = tabDataProvider.getElementByUri(changedEditor.document.uri);
			tabDataProvider.setDirty(changedEditor);

			treeView.reload(focusedTab)
				.then(() => {
					treeView.reveal(focusedTab || null, { focus: true });
				})
				.catch(err => {
					console.error('Could not reload treeView.', err);
				});
		});

		// Focus tab in sidebar when saving document
		editor.onDidSave(savedEditor => {
			//console.log('Document saved');

			focusedTab = tabDataProvider.getElementByUri(savedEditor.document.uri);
			tabDataProvider.setDirty(savedEditor);

			treeView.reload(focusedTab)
				.then(() => {
					treeView.reveal(focusedTab || null, { focus: true });
				})
				.catch(err => {
					console.error('Could not reload treeView.', err);
				});
		});

		const document = editor.document;
		document.onDidChangePath((changedDocument, path) => {
			if (nova.inDevMode()) console.log('editor.document.onDidChangePath', changedDocument.uri, path);
		});

		document.onDidChangeSyntax((changedDocument, newSyntax) => {
			if (nova.inDevMode()) console.log('editor.document.onDidChangeSyntax', changedDocument.uri, newSyntax);
		});
	});

	treeView.onDidChangeSelection((selection) => {
		if (nova.inDevMode()) console.log('treeView.onDidChangeSelection');
		//console.log('New selection: ' + selection.map((e) => e.name));

		if (!selection[0]) {
			return;
		}

		// Prevent tab opening when editor selection changes
		if (openTabWhenFocusSidebar === false) {
			openTabWhenFocusSidebar = true;
			return;
		}

		const activeDocument = nova.workspace.activeTextEditor ? nova.workspace.activeTextEditor.document : null;

		if (openOnSingleClick && (!activeDocument || activeDocument.uri !== selection[0].uri)) {
			nova.commands.invoke('tabs-sidebar.open');
		}
	});

	treeView.onDidExpandElement(() => {
		// console.log('Expanded: ' + element.name);
	});

	treeView.onDidCollapseElement(() => {
		// console.log('Collapsed: ' + element.name);
	});

	treeView.onDidChangeVisibility(() => {
		if (nova.inDevMode()) console.log('Visibility Changed');
	});

	// TreeView implements the Disposable interface
	nova.subscriptions.add(treeView);

	initFileWatcher();
};

exports.deactivate = function() {
	// Clean up state before the extension is deactivated
};

nova.commands.register('tabs-sidebar.close', (workspace: Workspace) => {
	// console.log('Close Tab clicked');

	const selection = treeView.selection;

	if (!selection[0]) {
		return;
	}

	let activeDocument = workspace.activeTextEditor ? workspace.activeTextEditor.document : null;
	const activeDocumentIsRemote = activeDocument ? activeDocument.isRemote : false;
	const selectionIsRemote = selection[0].isRemote;

	// Close currently active tab
	if (activeDocument && selection[0].uri === activeDocument.uri) {
		tabDataProvider
			.runProcess(__dirname + '/click_menu_item.sh', [nova.localize('File'), nova.localize('Close Tab')])
			.then(() => {
				activeDocument = workspace.activeTextEditor ? workspace.activeTextEditor.document : null;

				if (activeDocument) {
					focusedTab = tabDataProvider.getElementByUri(activeDocument.uri);
					treeView.reveal(focusedTab || null, { focus: true });
				}
			})
			.catch(err => {
				console.error('Could not click menu item.', err);
			});

		return;
	}

	if (!selectionIsRemote) {
		// Close non currently active tab by switching to it and back
		workspace.openFile(selection[0].uri)
			.then(() => {
				tabDataProvider
					.runProcess(__dirname + '/click_menu_item.sh', [nova.localize('File'), nova.localize('Close Tab')])
					.then(() => {
						if (!activeDocument) {
							return;
						}

						// Switch back to local tab after closing other local tab
						if (!activeDocumentIsRemote) {
							workspace.openFile(activeDocument.uri)
								.then(value => {
									if (value) {
										focusedTab = tabDataProvider.getElementByUri(value.document.uri);
										treeView.reveal(focusedTab || null, { focus: true });
									}
								})
								.catch((err: string) => {
									console.error('Could not open file.', err);
								});

							return;
						}

						// Switch back to remote tab after closing other local tab
						openRemoteTab(activeDocument.uri)
							.then(() => {
								if (activeDocument) {
									focusedTab = tabDataProvider.getElementByUri(activeDocument.uri);
									treeView.reveal(focusedTab || null, { focus: true });
								}
							})
							.catch(err => {
								console.error('Could not open remote tab.', err);
							});

					})
					.catch(err => {
						console.error('Could not click menu item.', err);
					});
			})
			.catch((err: string) => {
				console.error('Could not open file.', err);
			});

		return;
	}

	openRemoteTab(selection[0].uri)
		.then(() => {
			tabDataProvider
				.runProcess(__dirname + '/click_menu_item.sh', [nova.localize('File'), nova.localize('Close Tab')])
				.then(() => {
					if (!activeDocument) {
						return;
					}

					// Switch back to local tab after closing other remote tab
					if (!activeDocumentIsRemote) {
						workspace.openFile(activeDocument.uri)
							.then(value => {
								if (value) {
									focusedTab = tabDataProvider.getElementByUri(value.document.uri);
									treeView.reveal(focusedTab || null, { focus: true });
								}
							})
							.catch((err: string) => {
								console.error('Could not open file.', err);
							});

						return;
					}

					// Switch back to remote tab after closing other remote tab
					openRemoteTab(activeDocument.uri)
						.then(value => {
							if (value) {
								focusedTab = tabDataProvider.getElementByUri(value.document.uri);
								treeView.reveal(focusedTab || null, { focus: true });
							}
						})
						.catch(err => {
							console.error('Could not open remote tab.', err);
						});

				})
				.catch(err => {
					console.error('Could not click menu item.', err);
				});
		})
		.catch(err => {
			console.error('Could not open remote tab.', err);
		});
});

nova.commands.register('tabs-sidebar.open', (workspace: Workspace) => {
	const selection = treeView.selection;
	// console.log('Selection: ' + selection[0].name);

	if (!selection[0]) {
		return;
	}

	// Don't do anything with folders
	if (selection[0].contextValue === 'kindGroup') {
		return;
	}

	const isRemote = selection[0].isRemote;

	// Switch to tab for local file
	if (!isRemote) {
		workspace.openFile(selection[0].uri)
			.then(value => {
				if (value) {
					focusedTab = tabDataProvider.getElementByUri(value.document.uri);
					//treeView.reveal(focusedTab, { focus: true });
				}
			})
			.catch((err: string) => {
				console.error('Could not open file.', err);
			});
		return;
	}

	// Switch to tab for remote file
	openRemoteTab(selection[0].uri)
		.then((editor: TextEditor) => {
			focusedTab = tabDataProvider.getElementByUri(editor.document.uri);
			//treeView.reveal(focusedTab, { focus: true });
		})
		.catch(err => {
			console.error('Could not open remote tab.', err);
		});
});

nova.commands.register('tabs-sidebar.doubleClick', () => {
	// Invoked when an item is double-clicked
	nova.commands.invoke('tabs-sidebar.open');
});

nova.commands.register('tabs-sidebar.up', () => {
	// Invoked when the 'Move Up' header button is clicked
	const selection = treeView.selection;

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

nova.commands.register('tabs-sidebar.down', () => {
	// Invoked when the 'Move Down' header button is clicked
	const selection = treeView.selection;

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

nova.commands.register('tabs-sidebar.cleanUpByTabBarOrder', (workspace: Workspace) => {
	//console.log('Clean up by tab bar order clicked');

	tabDataProvider.runProcess(__dirname + '/list_menu_items.sh', [nova.localize('Window')])
		.then(result => {
			//console.log(result);

			tabDataProvider.cleanUpByTabBarOrder(result);

			focusedTab = workspace.activeTextEditor ? tabDataProvider.getElementByUri(workspace.activeTextEditor.document.uri) : undefined;
			treeView.reload()
				.then(() => {
					treeView.reveal(focusedTab || null, { focus: true });
				})
				.catch(err => {
					console.error('Could not reload treeView.', err);
				});
		})
		.catch(err => {
			console.error(err);
		});
});

nova.commands.register('tabs-sidebar.cleanUpByAlpha', () => {
	if (nova.inDevMode()) console.log('cleanUpByAlpha');

	tabDataProvider.cleanUpByAlpha();
	treeView.reload()
		.then(() => {
			treeView.reveal(focusedTab || null, { focus: true });
		})
		.catch(err => {
			console.error('Could not reload treeView.', err);
		});
});

nova.commands.register('tabs-sidebar.cleanUpByKind', () => {
	if (nova.inDevMode()) console.log('cleanUpByKind');

	tabDataProvider.cleanUpByKind();
	treeView.reload()
		.then(() => {
			treeView.reveal(focusedTab || null, { focus: true });
		})
		.catch(err => {
			console.error('Could not reload treeView.', err);
		});
});

nova.commands.register('tabs-sidebar.sortByAlpha', (workspace: Workspace) => {
	if (nova.inDevMode()) console.log('Sort alphabetically');

	const sortAlpha = !workspace.config.get('eablokker.tabsSidebar.config.sortAlpha', 'boolean');

	workspace.config.set('eablokker.tabsSidebar.config.sortAlpha', sortAlpha);

	tabDataProvider.setSortAlpha(sortAlpha);
	treeView.reload();
});

nova.commands.register('tabs-sidebar.groupByKind', (workspace: Workspace) => {
	if (nova.inDevMode()) console.log('groupByKind');

	workspace.config.set('eablokker.tabsSidebar.config.groupByKind', !groupByKind);
});

nova.commands.register('tabs-sidebar.showInFilesSidebar', (workspace: Workspace) => {
	if (nova.inDevMode()) console.log('Show in Files Sidebar');

	const selection = treeView.selection;

	if (!selection[0]) {
		return;
	}

	// Need to open selected tab in order to invoke command
	workspace.openFile(selection[0].uri)
		.then(() => {
			tabDataProvider
				.runProcess(__dirname + '/click_menu_item.sh', [nova.localize('File'), nova.localize('Show in Files Sidebar')])
				.then(() => {
					//
				})
				.catch(err => {
					console.error('Could not click menu item.', err);
				});
		})
		.catch((err: string) => {
			console.error('Could not open file.', err);
		});
});

nova.commands.register('tabs-sidebar.showInFinder', () => {
	const selection = treeView.selection;

	if (!selection[0]) {
		return;
	}

	if (!selection[0].path) {
		if (nova.inDevMode()) console.log('No path found for selection', selection[0].name);
		return;
	}

	nova.fs.reveal(selection[0].path);
});

nova.commands.register('tabs-sidebar.copyPath', () => {
	const selection = treeView.selection;

	if (!selection[0]) {
		return;
	}

	if (!selection[0].path) {
		if (nova.inDevMode()) console.log('No path found for selection', selection[0].name);
		return;
	}

	nova.clipboard.writeText(selection[0].path);
});

nova.commands.register('tabs-sidebar.copyRelativePath', (workspace: Workspace) => {
	const selection = treeView.selection;

	if (!selection[0]) {
		return;
	}

	if (!selection[0].path) {
		if (nova.inDevMode()) console.log('No path found for selection', selection[0].name);
		return;
	}

	if (workspace.path) {
		nova.clipboard.writeText(selection[0].path.substring(workspace.path.length));
	} else {
		nova.clipboard.writeText(selection[0].path);
	}
});

nova.commands.register('tabs-sidebar.refresh', (workspace: Workspace) => {
	const selection = treeView.selection;

	if (selection[0] instanceof FolderItem) {
		tabDataProvider.loadData(workspace.textDocuments);
	} else {
		tabDataProvider.loadData(workspace.textDocuments, selection[0] || undefined);
	}

	treeView.reload();
});

class ListItem {
	name: string;
	contextValue: string | undefined;
	syntax: string | undefined;
	extension: string | undefined;
	path: string | undefined;
	uri: string;
	isRemote: boolean;

	constructor(name: string) {
		this.name = name;
		this.path = '';
		this.uri = '';
		this.isRemote = false;
	}
}

class TabItem extends ListItem {
	path: string | undefined;
	isDirty: boolean;
	isUntitled: boolean;
	isTrashed: boolean;
	children: TabItem[];
	parent: FolderItem | null;
	syntax: string;
	extension: string | undefined;
	count: number | undefined;

	constructor(name: string, tab: TextDocument) {
		super(name);

		// Check if in .Trash folder
		const trashRegex = new RegExp('^file://' + nova.path.expanduser('~') + '/.Trash/');

		this.name = name;
		this.path = tab.path || undefined;
		this.uri = tab.uri;
		this.isRemote = tab.isRemote;
		this.isDirty = tab.isDirty;
		this.isUntitled = tab.isUntitled;
		this.isTrashed = trashRegex.test(decodeURI(tab.uri));
		this.children = [];
		this.parent = null;
		this.syntax = tab.syntax || 'plaintext';
		this.extension = nova.path.extname(tab.path || '').replace(/^\./, '');
		this.contextValue = tab.isRemote ? 'remote-tab' : 'tab';
	}
}

class FolderItem extends ListItem {
	children: TabItem[];
	parent: FolderItem | null;
	collapsibleState: TreeItemCollapsibleState;
	count: number | undefined;

	constructor(name: string, syntax: string | null, extName: string) {
		super(name);

		this.syntax = syntax || 'plaintext';
		this.extension = extName;
		this.contextValue = 'kindGroup';
		this.children = [];
		this.parent = null;
		this.collapsibleState = TreeItemCollapsibleState.None;
		this.count = undefined;
	}

	addChild(element: TabItem) {
		element.parent = this;
		this.children.push(element);
	}
}

class TabDataProvider {
	flatItems: TabItem[];
	groupedItems: FolderItem[];
	customOrder: string[];
	gitStatuses: GitStatus[];
	sortAlpha: boolean | null;
	groupByKind: boolean | null;

	constructor() {
		this.flatItems = [];
		this.groupedItems = [];
		this.customOrder = customTabOrder || [];
		this.gitStatuses = [];

		this.sortAlpha = nova.workspace.config
			.get('eablokker.tabsSidebar.config.sortAlpha', 'boolean');
		this.groupByKind = groupByKind;
	}

	loadData(documentTabs: readonly TextDocument[], focusedTab?: TabItem) {
		// this.updateGitStatus();

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
				this.customOrder.splice(this.customOrder.indexOf(item.path || '', 1));
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
			if (tab.isUntitled || !tab.path) {
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
				const tabName = this.basename(tab.path || 'untitled');

				const element = new TabItem(tabName, tab);

				this.flatItems.push(element);

				// Add tab to grouped items if new
				const tabSyntax = tab.syntax || 'plaintext';
				const folder = this.groupedItems.find(group => group.syntax === tabSyntax);

				if (folder) {
					const childIndex = folder.children.findIndex(child => child.uri === tab.uri);
					if (childIndex < 0) {
						folder.addChild(Object.assign({}, element));
					}
				} else {
					const titleCaseName = tabSyntax
						.split(' ')
						.map((s) => s.charAt(0).toUpperCase() + s.substring(1))
						.join(' ');

					const extName = nova.path.extname(tab.path || '').replace(/^\./, '');

					const newFolder = new FolderItem(
						syntaxnames[tabSyntax as keyof typeof syntaxnames] || titleCaseName,
						tab.syntax,
						extName
					);

					newFolder.addChild(Object.assign({}, element));
					this.groupedItems.push(newFolder);
				}
			}
		});
		nova.workspace.config.set('eablokker.tabsSidebar.config.customTabOrder', this.customOrder);

		this.sortItems();
	}

	runProcess(scriptPath: string, args: string[], cwd?: string, timeout = 3000): Promise<string> {
		return new Promise((resolve, reject) => {
			let outString = '';
			let errorString = '';

			const process = new Process(scriptPath, { args: args, cwd: cwd });

			process.onStdout(line => {
				outString += line;
			});

			process.onStderr(line => {
				errorString += line;
			});

			const timeoutID = setTimeout(() => {
				// Ensure the process terminates in a timely fashion
				reject('The process did not respond in a timely manner.');
				process.terminate();
			}, timeout);

			process.onDidExit(status => {
				clearTimeout(timeoutID);

				if (status > 0 || errorString.length) {
					reject(new Error(errorString));
				} else {
					resolve(outString);
				}
			});

			process.start();
		});
	}

	setDirty(editor: TextEditor) {
		const element = this.getElementByUri(editor.document.uri);

		if (element) {
			element.isDirty = editor.document.isDirty;
		}
	}

	basename(uri: string) {
		return nova.path.basename(uri);
	}

	isUniqueName(tab: TabItem) {
		return nova.workspace.textDocuments
			.filter(doc => doc.uri !== tab.uri)
			.every(doc => {
				const basename = this.basename(doc.uri);
				return basename !== this.basename(tab.uri);
			});
	}

	getCommonBasePath(tab: TabItem) {
		const tabDirArray = nova.path.split(nova.path.dirname(tab.path || ''));
		const similarTabs = nova.workspace.textDocuments
			.filter(doc => {
				// Differentiate between local and remote files with same name
				return doc.isRemote === tab.isRemote && this.basename(doc.uri) === this.basename(tab.uri);
			});

		const commonDirArray: string[] = [];
		tabDirArray.every((dir, i) => {
			const commonDir = similarTabs.every((tab2) => {
				const tabDirArray2 = nova.path.split(nova.path.dirname(tab2.path || ''));
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
	}

	moveTab(tab: TabItem, distance: number) {
		// Original tab path
		const uri = tab.uri;
		const path = tab.path;

		// Get item indexes
		const fromItemIndex = this.flatItems.findIndex(item => item.uri === uri);
		const toItemIndex = fromItemIndex + distance;

		if (toItemIndex < 0 || toItemIndex >= this.flatItems.length) {
			return;
		}

		// Get items to swap
		const fromItem = this.flatItems[fromItemIndex];
		const toItem = this.flatItems[toItemIndex];

		// Swap data between items
		const keys = Object.keys(fromItem).concat(Object.keys(toItem));
		keys
			.filter((key, i, keys) => keys.indexOf(key) === i) // Remove duplicates
			.forEach((key) => {
				// Preserve context value
				if (key === 'contextValue') {
					return;
				}

				const tabItemKey = key as keyof TabItem;

				const newVal = fromItem[tabItemKey];
				const oldVal = toItem[tabItemKey];

				// @ts-expect-error Need to figure out how to swap values
				toItem[tabItemKey] = newVal;
				// @ts-expect-error Need to figure out how to swap values
				fromItem[tabItemKey] = oldVal;
			});

		// Update custom order
		const fromIndex = this.customOrder.indexOf(path || '');
		const toIndex = fromIndex + distance;

		if (toIndex < 0 || toIndex >= this.customOrder.length) {
			return;
		}

		const item = this.customOrder.splice(fromIndex, 1)[0];
		this.customOrder.splice(toIndex, 0, item);
		nova.workspace.config.set('eablokker.tabsSidebar.config.customTabOrder', this.customOrder);

		// Reload each item that got swapped
		Promise.all([treeView.reload(fromItem), treeView.reload(toItem)])
			.then(() => {
				openTabWhenFocusSidebar = false;
				treeView.reveal(toItem, { focus: true });
			})
			.catch(err => {
				console.error(err);
			});
	}

	cleanUpByTabBarOrder(result: string) {
		const windowList = result.split(', ');
		const currentWindow: string[] = [];

		let projectFound = false;
		windowList.every((menuItem: string) => {
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

		this.customOrder.sort((a, b) => {
			// Sort by parent path if filename is not unique
			const paths = [a, b].map(path => {
				let basename = nova.path.basename(path);
				let parentPath = '';
				const element = tabDataProvider.getElementByPath(path);

				if (!element) {
					return basename;
				}

				const isUnique = tabDataProvider.isUniqueName(element);

				if (isUnique) {
					return basename;
				}

				const commonBasePath = tabDataProvider.getCommonBasePath(element);
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

			return (
				currentWindow.indexOf(paths[0]) -
				currentWindow.indexOf(paths[1])
			);
		});
		nova.workspace.config.set('eablokker.tabsSidebar.config.customTabOrder', this.customOrder);

		this.sortItems();
	}

	cleanUpByAlpha() {
		this.customOrder.sort((a, b) => {
			return nova.path.basename(a).localeCompare(nova.path.basename(b));
		});
		nova.workspace.config.set('eablokker.tabsSidebar.config.customTabOrder', this.customOrder);

		this.sortItems();
	}

	cleanUpByKind() {
		const elementArray = this.customOrder.map(path => {
			return tabDataProvider.getElementByPath(path);
		});

		this.customOrder.sort((a, b) => {
			const aElement = elementArray.find(item => item?.path === a);
			const bElement = elementArray.find(item => item?.path === b);

			if (!aElement || !bElement) {
				return 0;
			}

			return aElement.syntax.localeCompare(bElement.syntax);
		});
		nova.workspace.config.set('eablokker.tabsSidebar.config.customTabOrder', this.customOrder);

		this.sortItems();
	}

	setSortAlpha(sortAlpha: boolean) {
		//console.log('Setting sort alpha', sortAlpha);
		this.sortAlpha = sortAlpha;

		this.sortItems();
	}

	setGroupByKind(groupByKind: boolean) {
		//console.log('Setting sort by kind', groupByKind);
		this.groupByKind = groupByKind;

		this.sortItems();
	}

	updateGitStatus(): Promise<GitStatus[]> {
		if (nova.inDevMode()) console.log('updateGitStatus()');

		return new Promise((resolve, reject) => {
			const projectPath = nova.workspace.path;

			if (!projectPath) {
				return;
			}

			// '--no-optional-locks' git option to prevent watching changes on .git/index.lock
			this
				.runProcess('/usr/bin/git', ['--no-optional-locks', 'status', '--porcelain'], projectPath)
				.then(result => {
					const gitStatusRegex = new RegExp('([ ADMRCU?!]{2}) "?([0-9a-zA-Z_. /-]+) ?-?>? ?([0-9a-zA-Z_. /-]*)', 'gm');
					let matches = gitStatusRegex.exec(result);

					// Reset statuses
					this.gitStatuses.forEach(status => {
						status.status = '';
					});

					while (matches != null) {
						const newStatus = {
							status: matches[1],
							path: matches[3] || matches[2]
						};

						const i = this.gitStatuses.findIndex(status => status.path === newStatus.path);
						if (i > -1) {
							this.gitStatuses[i].status = newStatus.status;
						} else {
							this.gitStatuses.push(newStatus);
						}

						matches = gitStatusRegex.exec(result);
					}

					// console.log(this.gitStatuses);

					resolve(this.gitStatuses);
				})
				.catch((err: Error) => {
					reject(err);
				});
		});
	}

	byCustomOrder(a: TabItem, b: TabItem) {
		if (this.customOrder.indexOf(a.path || '') < 0) {
			return 1;
		}
		return this.customOrder.indexOf(a.path || '') - this.customOrder.indexOf(b.path || '');
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
				tab.contextValue = tab.isRemote ? 'remote-only' : 'only';
			} else if (i === 0) {
				tab.contextValue = tab.isRemote ? 'remote-first' : 'first';
			} else if (i === length - 1) {
				tab.contextValue = tab.isRemote ? 'remote-last' : 'last';
			} else {
				tab.contextValue = tab.isRemote ? 'remote-tab' : 'tab';
			}
		});

		//console.log('this.customOrder', this.customOrder);

		if (this.sortAlpha) {
			if (nova.inDevMode()) console.log('Sorting by alpha');

			this.flatItems.sort((a, b) => {
				return a.name.localeCompare(b.name);
			});
		}

		if (this.groupByKind && this.sortAlpha) {
			if (nova.inDevMode()) console.log('Sorting folders by alpha');

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

	getElementByUri(uri: string): TabItem | undefined {
		if (this.groupByKind) {
			let childElement: TabItem | undefined;
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

	getElementByPath(path: string): TabItem | undefined {
		if (this.groupByKind) {
			let childElement: TabItem | undefined;
			this.groupedItems.some(item => {
				childElement = item.children.find(child => {
					return child.path === path;
				});

				return !!childElement;
			});

			return childElement;
		}

		return this.flatItems.find(item => {
			return item.path === path;
		});
	}

	getFolderBySyntax(syntax: string) {
		return this.groupedItems.find((folder: FolderItem) => folder.syntax === syntax);
	}

	getChildren(element: TabItem | FolderItem) {
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

	getParent(element: TabItem | FolderItem) {
		// Requests the parent of an element, for use with the reveal() method

		// if (nova.inDevMode()) console.log('getParent');

		if (element === null) {
			return null;
		}

		return element.parent;
	}

	getTreeItem(element: TabItem | FolderItem) {
		// Converts an element into its display (TreeItem) representation
		let item: TreeItem;

		if (element instanceof FolderItem) {
			item = new TreeItem(element.name);


			item.collapsibleState = TreeItemCollapsibleState.Expanded;
			item.contextValue = element.contextValue;
			item.descriptiveText = showGroupCount ? '(' + element.children.length + ')' : '';
			item.identifier = element.syntax;
			item.image = element.extension ? '__filetype.' + element.extension : element.syntax === 'plaintext' ? '__filetype.txt' : '__filetype.blank';
			item.tooltip = '';
		}
		else {
			let name = element.name;
			let description = '';

			if (element.isDirty) {
				switch (unsavedSymbolLocation) {
				case 'never':
					break;
				case 'after-filename':
					description = (unsavedSymbol || '⚫︎') + ' ';
					break;
				case 'before-filename':
				default:
					name = (unsavedSymbol || '⚫︎') + ' ' + name;
					break;
				}
			}

			item = new TreeItem(name);

			item.image = element.extension ? '__filetype.' + element.extension : '__filetype.blank';
			// item.image = 'blank';
			item.tooltip = element.path ? element.path.replace(nova.path.expanduser('~'), '~') : '';

			if (element.isTrashed) {
				const trashString = nova.localize('Trash');
				description = '‹ ' + trashString + ' 🗑';
			} else if (element.isRemote) {
				description += '☁️ ';
			} else {
				const relativePath = (element.path + '').replace(nova.workspace.path + '/', '');
				// console.log('relativePath', relativePath);

				const foundStatus = this.gitStatuses.find(status => status.path === relativePath);

				if (foundStatus) {
					// console.log('status', foundStatus.status);

					if (foundStatus.status.length && (showGitStatus === 'text' || showGitStatus === 'both')) {
						description += '[' + foundStatus.status.trim() + '] ';
					}

					if (showGitStatus === 'icon' || showGitStatus === 'both') {
						switch (foundStatus.status) {
						case ' M':
						case 'M ':
						case 'MM':
						case 'RM':
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
			let parentPath = '';
			const isUnique = this.isUniqueName(element);

			// Always show parent folder if config setting is toggled on
			if (alwaysShowParentFolder && !parentPath.length) {
				const tabDirArray = nova.path.split(nova.path.dirname(element.path || ''));
				parentPath = decodeURI(tabDirArray[tabDirArray.length - 1]);
				description += '‹ ' + parentPath;
			}

			// Show parent path if filename is not unique
			if (!isUnique) {
				const commonBasePath = this.getCommonBasePath(element);
				const parentPathSplit = decodeURI(nova.path.dirname(element.path || '').substring(commonBasePath.length))
					.split('/')
					.reverse();

				parentPathSplit
					.filter(dir => dir.length)
					.forEach((dir, i) => {
						if (i === 0) {
							description = '';
						}

						description += '‹ ' + dir + ' ';
					});
			}

			item.descriptiveText = description;
			item.path = element.path;
			item.command = 'tabs-sidebar.doubleClick';
			item.contextValue = element.contextValue;
			item.identifier = element.uri;
		}
		return item;
	}
}
