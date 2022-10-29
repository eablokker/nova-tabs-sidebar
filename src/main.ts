import { SyntaxNames, TabItem, FolderItem, TabDataProvider } from './TabDataProvider';

class App {
	treeView: TreeView<TabItem | FolderItem | null>;
	tabDataProvider: TabDataProvider;
	fileWatcher: FileSystemWatcher | undefined;
	focusedTab: TabItem | undefined;
	openTabWhenFocusSidebar: boolean;
	gitPath: string;

	openOnSingleClick: boolean | null;
	showGitStatus: string | null;
	alwaysShowParentFolder: boolean | null;
	showGroupCount: boolean | null;
	unsavedSymbol: string | null;
	unsavedSymbolLocation: string | null;
	groupBy: string | null;

	syntaxNames: SyntaxNames;

	constructor() {
		this.openTabWhenFocusSidebar = true;
		this.gitPath = '/usr/bin/git';

		this.openOnSingleClick = nova.config.get('eablokker.tabs-sidebar.open-on-single-click', 'boolean');
		this.showGitStatus = nova.config.get('eablokker.tabs-sidebar.show-git-status', 'string');
		this.alwaysShowParentFolder = nova.config.get('eablokker.tabs-sidebar.always-show-parent-folder', 'boolean');
		this.showGroupCount = nova.config.get('eablokker.tabs-sidebar.show-group-count', 'boolean');
		this.unsavedSymbol = nova.config.get('eablokker.tabs-sidebar.unsaved-symbol', 'string');
		this.unsavedSymbolLocation = nova.config.get('eablokker.tabs-sidebar.unsaved-symbol-location', 'string');
		this.groupBy = nova.workspace.config.get('ealokker.tabsSidebar.config.groupBy', 'string');

		this.syntaxNames = {
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

		this.tabDataProvider = new TabDataProvider(this);
		this.treeView = new TreeView('tabs-sidebar', { dataProvider: this.tabDataProvider });

		this.init();
		this.initConfig();
		this.initEditorEvents();
		this.registerCommands();
		this.initFileWatcher();
	}

	init() {
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
				this.tabDataProvider
					.runProcess('/bin/chmod', ['744', __dirname + path])
					.then(() => {
						if (nova.inDevMode()) console.log('Shell script ' + path + ' changed to 744');
					})
					.catch(err => {
						console.error(err);
					});
			}
		});

		// TreeView implements the Disposable interface
		nova.subscriptions.add(this.treeView);
	}

	initConfig() {
		// Watch for config changes
		nova.config.onDidChange('eablokker.tabs-sidebar.open-on-single-click', (newVal: boolean, oldVal: boolean) => {
			this.openOnSingleClick = newVal;
		});

		nova.config.onDidChange('eablokker.tabs-sidebar.show-git-status', (newVal: string, oldVal: string) => {
			this.showGitStatus = newVal;

			if (newVal === 'never') {
				this.fileWatcher?.dispose();
			} else if (oldVal === 'never' && newVal !== 'never') {
				this.initFileWatcher();
			}

			this.treeView.reload();
		});

		nova.config.onDidChange('eablokker.tabs-sidebar.always-show-parent-folder', (newVal: boolean, oldVal: boolean) => {
			this.alwaysShowParentFolder = newVal;

			this.treeView.reload();
		});

		nova.config.onDidChange('eablokker.tabs-sidebar.show-group-count', (newVal: boolean, oldVal: boolean) => {
			this.showGroupCount = newVal;

			this.tabDataProvider.sortItems();
			this.treeView.reload();
		});

		nova.config.onDidChange('eablokker.tabs-sidebar.unsaved-symbol', (newVal: string, oldVal: string) => {
			this.unsavedSymbol = newVal;

			this.treeView.reload();
		});

		nova.config.onDidChange('eablokker.tabs-sidebar.unsaved-symbol-location', (newVal: string, oldVal: string) => {
			this.unsavedSymbolLocation = newVal;

			this.treeView.reload();
		});

		nova.workspace.config.onDidChange('eablokker.tabsSidebar.config.sortAlpha', (newVal: boolean, oldVal: boolean) => {
			this.tabDataProvider.sortAlpha = newVal;
			this.treeView.reload();
		});

		nova.workspace.config.onDidChange('eablokker.tabsSidebar.config.groupBy', (newVal: string, oldVal: string) => {
			this.groupBy = newVal;

			this.tabDataProvider.groupBy = newVal;
			this.treeView.reload();
		});

		/*nova.workspace.config.onDidChange('eablokker.tabsSidebar.config.customTabOrder', (newVal: string[], oldVal: string[]) => {
			console.log('customTabOrder changed', newVal);

			this.tabDataProvider.customOrder = newVal;
			this.tabDataProvider.sortItems();
			this.treeView.reload()
				.then(() => {
					this.highlightTab(this.focusedTab || null, { focus: true });
				})
				.catch(err => {
					console.error(err);
				});
		});*/
	}

	initEditorEvents() {
		// Prevent excessive reloading
		let reloadTimeoutID = setTimeout(() => {
			//
		});

		nova.workspace.onDidAddTextEditor(editor => {
			//console.log('Document opened');

			clearTimeout(reloadTimeoutID);
			reloadTimeoutID = setTimeout(() => {
				let reload;
				const folder = this.tabDataProvider.getFolderBySyntax(editor.document.syntax || 'plaintext');

				this.tabDataProvider.loadData(nova.workspace.textDocuments, this.focusedTab);

				if (folder && this.groupBy === 'folder') {
					reload = this.treeView.reload(folder);
				} else {
					reload = this.treeView.reload();
				}

				reload
					.then(() => {
						// Focus tab in sidebar
						this.focusedTab = this.tabDataProvider.getElementByUri(editor.document.uri);

						if (editor.document.uri === nova.workspace.activeTextEditor?.document.uri) {
							this.highlightTab(this.focusedTab || null, { focus: true });
						}
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
					const folder = this.tabDataProvider.getFolderBySyntax(destroyedEditor.document.syntax || 'plaintext');

					if (folder && folder.children.length > 1 && this.groupBy === 'folder') {
						reload = this.treeView.reload(folder);
					} else {
						reload = this.treeView.reload();
					}

					this.tabDataProvider.loadData(nova.workspace.textDocuments);

					reload
						.then(() => {
							const document = nova.workspace.activeTextEditor ? nova.workspace.activeTextEditor.document : null;

							if (document) {
								this.focusedTab = this.tabDataProvider.getElementByUri(document.uri);
								this.highlightTab(this.focusedTab || null, { focus: true });
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

				const selection = this.treeView.selection[0];
				const document = changedEditor.document;

				// Don't reveal in treeview if it's already selected
				if (selection?.uri === document.uri) {
					return;
				}

				// Only highlight tab if it's the same as the current active tab
				if (document.uri === nova.workspace.activeTextEditor?.document.uri) {
					this.focusedTab = this.tabDataProvider.getElementByUri(changedEditor.document.uri);
					this.highlightTab(this.focusedTab || null, { focus: true });
				}
			});

			editor.onDidStopChanging(changedEditor => {
				//console.log('Document stopped changing');

				const element = this.tabDataProvider.getElementByUri(editor.document.uri);
				this.focusedTab = element;

				if (element) {
					element.isDirty = editor.document.isDirty;
				}

				this.treeView.reload(this.focusedTab)
					.then(() => {
						this.highlightTab(this.focusedTab || null, { focus: true });
					})
					.catch(err => {
						console.error('Could not reload treeView.', err);
					});
			});

			// Focus tab in sidebar when saving document
			editor.onDidSave(savedEditor => {
				//console.log('Document saved');

				const element = this.tabDataProvider.getElementByUri(savedEditor.document.uri);
				this.focusedTab = element;

				if (element) {
					element.isDirty = editor.document.isDirty;
				}

				this.treeView.reload(this.focusedTab)
					.then(() => {
						this.highlightTab(this.focusedTab || null, { focus: true });
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

				const element = this.tabDataProvider.getElementByUri(document.uri);

				if (!element) {
					return;
				}

				element.syntax = newSyntax || 'plaintext';

				this.tabDataProvider.loadData(nova.workspace.textDocuments, this.focusedTab || undefined);
				this.treeView.reload()
					.then(() => {
						this.highlightTab(this.focusedTab || null, { focus: true });
					})
					.catch(err => {
						console.error('Could not reload treeView.', err);
					});
			});
		});

		this.treeView.onDidChangeSelection((selection) => {
			if (nova.inDevMode()) console.log('treeView.onDidChangeSelection');
			//console.log('New selection: ' + selection.map((e) => e.name));

			if (!selection[0]) {
				return;
			}

			// Prevent tab opening when editor selection changes
			if (this.openTabWhenFocusSidebar === false) {
				this.openTabWhenFocusSidebar = true;
				return;
			}

			const activeDocument = nova.workspace.activeTextEditor ? nova.workspace.activeTextEditor.document : null;

			if (this.openOnSingleClick && (!activeDocument || activeDocument.uri !== selection[0].uri)) {
				nova.commands.invoke('tabs-sidebar.open');
			}
		});

		this.treeView.onDidCollapseElement(element => {
			// console.log('Collapsed: ' + element?.name);

			if (element?.syntax) {
				this.tabDataProvider.collapsedKindGroups.push(element.syntax);
				nova.workspace.config.set('eablokker.tabsSidebar.config.collapsedKindGroups', this.tabDataProvider.collapsedKindGroups);
			}
		});

		this.treeView.onDidExpandElement(element => {
			// console.log('Expanded: ' + element?.name);

			if (element?.syntax) {
				const index = this.tabDataProvider.collapsedKindGroups.indexOf(element.syntax);

				if (index > -1) {
					this.tabDataProvider.collapsedKindGroups.splice(index, 1);
					nova.workspace.config.set('eablokker.tabsSidebar.config.collapsedKindGroups', this.tabDataProvider.collapsedKindGroups);
				}
			}
		});

		this.treeView.onDidChangeVisibility(() => {
			if (nova.inDevMode()) console.log('Visibility Changed');
		});
	}

	registerCommands() {
		nova.commands.register('tabs-sidebar.close', (workspace: Workspace) => {
			// console.log('Close Tab clicked');

			const selection = this.treeView.selection;

			if (!selection[0]) {
				return;
			}

			// Don't do anything with folders
			if (selection[0]?.contextValue?.startsWith('kindGroup')) {
				return;
			}

			let activeDocument = workspace.activeTextEditor ? workspace.activeTextEditor.document : null;
			const activeDocumentIsRemote = activeDocument ? activeDocument.isRemote : false;
			const selectionIsRemote = selection[0].isRemote;

			// Close currently active tab
			if (activeDocument && selection[0].uri === activeDocument.uri) {
				this.tabDataProvider
					.runProcess(__dirname + '/click_menu_item.sh', [nova.localize('File'), nova.localize('Close Tab')])
					.then(() => {
						activeDocument = workspace.activeTextEditor ? workspace.activeTextEditor.document : null;

						if (activeDocument) {
							this.focusedTab = this.tabDataProvider.getElementByUri(activeDocument.uri);
							this.highlightTab(this.focusedTab || null, { focus: true });
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
						this.tabDataProvider
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
												this.focusedTab = this.tabDataProvider.getElementByUri(value.document.uri);
												this.highlightTab(this.focusedTab || null, { focus: true });
											}
										})
										.catch((err: string) => {
											console.error('Could not open file.', err);
										});

									return;
								}

								// Switch back to remote tab after closing other local tab
								this.openRemoteTab(activeDocument.uri)
									.then(() => {
										if (activeDocument) {
											this.focusedTab = this.tabDataProvider.getElementByUri(activeDocument.uri);
											this.highlightTab(this.focusedTab || null, { focus: true });
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

			this.openRemoteTab(selection[0].uri)
				.then(() => {
					this.tabDataProvider
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
											this.focusedTab = this.tabDataProvider.getElementByUri(value.document.uri);
											this.highlightTab(this.focusedTab || null, { focus: true });
										}
									})
									.catch((err: string) => {
										console.error('Could not open file.', err);
									});

								return;
							}

							// Switch back to remote tab after closing other remote tab
							this.openRemoteTab(activeDocument.uri)
								.then(editor => {

									if (editor) {
										this.focusedTab = this.tabDataProvider.getElementByUri(editor.document.uri);
										this.highlightTab(this.focusedTab || null, { focus: true });
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
			const selection = this.treeView.selection;
			// console.log('Selection: ' + selection[0].name);

			if (!selection[0]) {
				return;
			}

			// Don't do anything with folders
			if (selection[0]?.contextValue?.startsWith('kindGroup')) {
				return;
			}

			const isRemote = selection[0].isRemote;

			// Switch to tab for local file
			if (!isRemote) {
				workspace.openFile(selection[0].uri)
					.then(value => {
						if (value) {
							this.focusedTab = this.tabDataProvider.getElementByUri(value.document.uri);
							this.highlightTab(this.focusedTab || null, { focus: true });
						}
					})
					.catch((err: string) => {
						console.error('Could not open file.', err);
					});
				return;
			}

			// Switch to tab for remote file
			this.openRemoteTab(selection[0].uri)
				.then(editor => {
					if (editor) {
						this.focusedTab = this.tabDataProvider.getElementByUri(editor.document.uri);
						this.highlightTab(this.focusedTab || null, { focus: true });
					}
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
			const selection = this.treeView.selection;

			if (!selection[0]) {
				return;
			}

			// Move kind group up
			if (selection[0] instanceof FolderItem) {
				this.tabDataProvider.moveKindGroup(selection[0], -1);
				return;
			}

			// console.log(JSON.stringify(selection[0]));
			// console.log('Move Up: ' + selection.map((e) => e.name));

			this.tabDataProvider.moveTab(selection[0], -1);
		});

		nova.commands.register('tabs-sidebar.down', () => {
			// Invoked when the 'Move Down' header button is clicked
			const selection = this.treeView.selection;

			if (!selection[0]) {
				return;
			}

			// Move kind group down
			if (selection[0] instanceof FolderItem) {
				this.tabDataProvider.moveKindGroup(selection[0], 1);
				return;
			}

			// console.log(JSON.stringify(selection[0]));
			// console.log('Move Down: ' + selection.map((e) => e.name));

			this.tabDataProvider.moveTab(selection[0], 1);
		});

		nova.commands.register('tabs-sidebar.cleanUpByTabBarOrder', (workspace: Workspace) => {
			//console.log('Clean up by tab bar order clicked');

			this.tabDataProvider.runProcess(__dirname + '/list_menu_items.sh', [nova.localize('Window')])
				.then(result => {
					//console.log(result);

					this.tabDataProvider.cleanUpByTabBarOrder(result);

					this.focusedTab = workspace.activeTextEditor ? this.tabDataProvider.getElementByUri(workspace.activeTextEditor.document.uri) : undefined;
					this.treeView.reload()
						.then(() => {
							this.highlightTab(this.focusedTab || null, { focus: true });
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

			this.tabDataProvider.cleanUpByAlpha();
			this.treeView.reload()
				.then(() => {
					this.highlightTab(this.focusedTab || null, { focus: true });
				})
				.catch(err => {
					console.error('Could not reload treeView.', err);
				});
		});

		nova.commands.register('tabs-sidebar.cleanUpByType', () => {
			if (nova.inDevMode()) console.log('cleanUpByType');

			this.tabDataProvider.cleanUpByType();
			this.treeView.reload()
				.then(() => {
					this.highlightTab(this.focusedTab || null, { focus: true });
				})
				.catch(err => {
					console.error('Could not reload treeView.', err);
				});
		});

		nova.commands.register('tabs-sidebar.sortByAlpha', (workspace: Workspace) => {
			if (nova.inDevMode()) console.log('Sort alphabetically');

			workspace.config.set('eablokker.tabsSidebar.config.sortAlpha', !this.tabDataProvider.sortAlpha);
		});

		nova.commands.register('tabs-sidebar.groupByType', (workspace: Workspace) => {
			if (nova.inDevMode()) console.log('groupByType');

			if (this.groupBy !== 'type') {
				workspace.config.set('eablokker.tabsSidebar.config.groupBy', 'type');
			} else {
				workspace.config.set('eablokker.tabsSidebar.config.groupBy', 'none');
			}
		});

		nova.commands.register('tabs-sidebar.groupByFolder', (workspace: Workspace) => {
			if (nova.inDevMode()) console.log('groupByFolder');

			if (this.groupBy !== 'folder') {
				workspace.config.set('eablokker.tabsSidebar.config.groupBy', 'folder');
			} else {
				workspace.config.set('eablokker.tabsSidebar.config.groupBy', 'none');
			}
		});

		nova.commands.register('tabs-sidebar.showInFilesSidebar', (workspace: Workspace) => {
			if (nova.inDevMode()) console.log('Show in Files Sidebar');

			const selection = this.treeView.selection;

			if (!selection[0]) {
				return;
			}

			// Need to open selected tab in order to invoke command
			workspace.openFile(selection[0].uri)
				.then(() => {
					this.tabDataProvider
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
			const selection = this.treeView.selection;

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
			const selection = this.treeView.selection;

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
			const selection = this.treeView.selection;

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
			const selection = this.treeView.selection;

			if (selection[0] instanceof FolderItem) {
				this.tabDataProvider.loadData(workspace.textDocuments);
			} else {
				this.tabDataProvider.loadData(workspace.textDocuments, selection[0] || undefined);
			}

			this.initFileWatcher();

			this.treeView.reload();
		});
	}

	initFileWatcher() {
		// Don't watch files if workspace is not bound to folder
		if (this.showGitStatus === 'never' || !nova.workspace.path) {
			return;
		}

		// Find git executable
		this.tabDataProvider.runProcess('/usr/bin/which', ['git'])
			.then(result => {
				this.gitPath = result.trim();

				if (nova.inDevMode()) console.log('System has Git executable at', this.gitPath);

				// Check if workspace has git repo
				this.tabDataProvider.runProcess(this.gitPath, ['-C', nova.workspace.path || '', 'rev-parse'])
					.then(() => {
						if (nova.inDevMode()) console.log('Workspace has Git repo');

						this.updateGitStatus();

						// Prevent excessive watch events
						let watchTimeoutID = setTimeout(() => {
							//
						});

						this.fileWatcher = nova.fs.watch(null, () => { /**/ });

						this.fileWatcher.onDidChange(path => {
							clearTimeout(watchTimeoutID);
							watchTimeoutID = setTimeout(() => {
								if (nova.inDevMode()) console.log('File changed', path);

								const pathSplit = nova.path.split(nova.path.dirname(path));

								// Don't respond to changes to nova config
								if (pathSplit[pathSplit.length - 1] === '.nova' && nova.path.basename(path) === 'Configuration.json') {
									if (nova.inDevMode()) console.log('Dont respond to config changes');
									return;
								}

								this.updateGitStatus();
							}, 200);
						});
					})
					.catch(err => {
						console.warn('Could not find Git repo in current workspace', err);
					});
			})
			.catch(err => {
				console.error('Could not find git executable', err);
			});
	}

	openRemoteTab(uri: string): Promise<TextEditor | null | undefined> {
		return new Promise((resolve, reject) => {
			const element = this.tabDataProvider.getElementByUri(uri);

			if (!element) {
				console.warn('No tab element found for uri ' + uri);
				return;
			}

			let basename = nova.path.basename(element.uri);
			let parentPath = '';
			const isUnique = this.tabDataProvider.isUniqueName(element);

			// Differentiate remote file by common parent path
			if (!isUnique) {
				const commonBasePath = this.tabDataProvider.getCommonBasePath(element);
				parentPath = decodeURI(nova.path.dirname(element.uri).substring(commonBasePath.length));
			}

			if (parentPath.length) {
				basename += ' – ' + parentPath;
			}

			this.tabDataProvider
				.runProcess(__dirname + '/click_project_item_by_name.sh', [nova.localize('Window'), basename])
				.then(() => {
					// console.log('Menu item ' + basename + ' of Window menu clicked');
					setTimeout(() => {
						const editor = nova.workspace.activeTextEditor;

						resolve(editor);
					}, 1);
				})
				.catch(err => {
					console.error('Could not click project item by filename.', err);
					reject(err);
				});
		});
	}

	highlightTab(tab: TabItem | FolderItem | null, options?: { select?: boolean | undefined, focus?: boolean | undefined, reveal?: number | undefined } | undefined) {
		const activeTabUri = nova.workspace.activeTextEditor ? nova.workspace.activeTextEditor.document.uri : undefined;
		const gotoTabUri = tab?.uri;

		if (activeTabUri !== gotoTabUri) {
			this.openTabWhenFocusSidebar = false;
		}
		this.treeView.reveal(tab, options);
	}

	updateGitStatus(reload = true) {
		this.tabDataProvider.getGitStatus(this.gitPath)
			.then(gitStatuses => {
				gitStatuses.forEach(gitStatus => {
					if (!reload) {
						return;
					}

					const path = nova.path.join(nova.workspace.path || '', gitStatus.path);
					const element = this.tabDataProvider.getElementByPath(path);

					// console.log('gitStatus.path', path);
					// console.log('element', element);

					// Don't reload treeview if that file is not open in workspace
					if (!element) {
						return;
					}

					const activeEditor = this.tabDataProvider.getElementByUri(nova.workspace.activeTextEditor?.document.uri || '');

					this.treeView.reload(element)
						.then(() => {
							this.highlightTab(activeEditor || null);
						})
						.catch(err => {
							console.error('Could not reload treeView.', err);
						});
				});
			})
			.catch((err: Error) => {
				console.error('Could not update git statuses', err);
			});
	}
}


exports.activate = function() {
	// Do work when the extension is activated
	new App();
};

exports.deactivate = function() {
	// Clean up state before the extension is deactivated
};

export { App };
