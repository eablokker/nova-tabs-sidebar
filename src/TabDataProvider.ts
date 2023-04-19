import { App } from './main';

type GitStatus = {
	status: string;
	path: string;
};

type SyntaxNames = {[name: string]: string};

class ListItem {
	name: string;
	contextValue: string | undefined;
	_syntax: string | null;
	extension: string | undefined;
	path: string | undefined;
	uri: string;
	isRemote: boolean;

	constructor(name: string) {
		this.name = name;
		this._syntax = null;
		this.path = '';
		this.uri = '';
		this.isRemote = false;
	}

	get syntax() {
		return this._syntax;
	}

	set syntax(syntax: string | null) {
		this._syntax = syntax;
	}
}

class TabItem extends ListItem {
	path: string | undefined;
	_isDirty: boolean;
	isUntitled: boolean;
	isTrashed: boolean;
	children: TabItem[];
	parent: FolderItem | null;
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
		this._isDirty = tab.isDirty;
		this.isUntitled = tab.isUntitled;
		this.isTrashed = trashRegex.test(decodeURI(tab.uri));
		this.children = [];
		this.parent = null;
		this._syntax = tab.syntax || 'plaintext';
		this.extension = nova.path.extname(tab.path || '').replace(/^\./, '');
		this.contextValue = tab.isRemote ? 'remote-tab' : 'tab';
	}

	get isDirty() {
		return this._isDirty;
	}

	set isDirty(isDirty: boolean) {
		this._isDirty = isDirty;
	}
}

class FolderItem extends ListItem {
	children: TabItem[];
	parent: FolderItem | null;
	count: number | undefined;

	constructor(name: string, options?: { syntax?: string | null, extName?: string }) {
		super(name);

		this._syntax = options?.syntax || 'plaintext';
		this.extension = options?.extName;
		this.contextValue = 'kindGroup';
		this.children = [];
		this.parent = null;
		this.count = undefined;
	}

	addChild(element: TabItem) {
		element.parent = this;
		this.children.push(element);
	}
}

class TabDataProvider {
	app: App;
	flatItems: TabItem[];
	groupedItems: FolderItem[];
	customOrder: string[];
	customKindGroupsOrder: string[];
	gitStatuses: GitStatus[];
	_sortAlpha: boolean | null;
	_groupByKind: boolean | null;
	collapsedKindGroups: string[];

	constructor(app: App) {
		this.app = app;

		this.flatItems = [];
		this.groupedItems = [];
		this.gitStatuses = [];

		this._sortAlpha = nova.workspace.config.get('eablokker.tabsSidebar.config.sortAlpha', 'boolean');
		this._groupByKind = this.app.groupByKind;
		this.customOrder = nova.workspace.config.get('eablokker.tabsSidebar.config.customTabOrder', 'array') || [];
		this.customKindGroupsOrder = nova.workspace.config.get('eablokker.tabsSidebar.config.customKindGroupsOrder', 'array') || [];
		this.collapsedKindGroups = nova.workspace.config.get('eablokker.tabsSidebar.config.collapsedKindGroups', 'array') || [];
	}

	get sortAlpha() {
		return this._sortAlpha;
	}

	set sortAlpha(sortAlpha: boolean | null) {
		this._sortAlpha = sortAlpha;

		this.sortItems();
	}

	get groupByKind() {
		return this._groupByKind;
	}

	set groupByKind(groupByKind: boolean | null) {
		this._groupByKind = groupByKind;

		this.sortItems();
	}

	loadData(documentTabs: readonly TextDocument[], focusedTab?: TabItem) {
		// Remove closed tabs from custom order
		if (this.customOrder.length) {
			this.customOrder = this.customOrder.filter(path => {
				return documentTabs.some(tab => tab.path === path);
			});
		}

		// Remove closed tabs from flat list
		this.flatItems.forEach((item, i, self) => {
			const tabIsClosed = documentTabs.every(tab => tab.uri !== item.uri);
			if (tabIsClosed) {
				// Remove from flat items
				self.splice(i, 1);
			}
		});

		// Remove closed tabs from kind groups
		this.groupedItems.forEach((folder, i, self) => {
			folder.children.forEach((child, i2, self2) => {
				const tabIsClosed = documentTabs.every(tab => tab.uri !== child.uri);
				const syntaxChanged = child.syntax && folder.syntax !== child.syntax;

				console.log(folder.syntax, child.syntax);

				if (tabIsClosed || syntaxChanged) {
					self2.splice(i2, 1);
				}

				// Remove folder if now empty
				if (!folder.children.length) {
					self.splice(i, 1);
				}
			});
		});

		// Remove closed kind groups from custom order
		if (this.customKindGroupsOrder.length && this.groupedItems.length) {
			this.customKindGroupsOrder = this.customKindGroupsOrder.filter(syntax => {
				return this.groupedItems.some(group => {
					const syntaxName = group.syntax || 'plaintext';
					return syntax === syntaxName;
				});
			});
		}

		// Add newly opened tabs
		documentTabs.forEach(tab => {
			// Hide untitled tabs
			if (tab.isUntitled || !tab.path) {
				return;
			}

			// Check if tab is new in custom order
			const tabIsNewInCustomOrder = this.customOrder.every(path => path !== tab.path);

			// Add new tab to custom order
			if (tabIsNewInCustomOrder) {
				// Splice new tab into array just after active editor or las focused tab
				let tabIndex = -1;
				if (focusedTab) {
					tabIndex = this.customOrder.findIndex(path => path === focusedTab.path);
				}

				if (tabIndex > -1) {
					this.customOrder.splice(tabIndex + 1, 0, tab.path);
				} else {
					this.customOrder.push(tab.path);
				}
			}

			// Check if tab is new in flat items
			const tabIsNew = this.flatItems.every(item => item.uri !== tab.uri);

			// Add tab to flat items if new
			if (tabIsNew) {
				const tabName = this.basename(tab.path || 'untitled');
				const element = new TabItem(tabName, tab);

				this.flatItems.push(element);
			}

			// Check if tab is new in grouped items
			const tabIsNewInGroup = this.groupedItems.every(group => {
				return group.children.every(item => item.uri !== tab.uri);
			});

			if (tabIsNewInGroup) {
				const tabName = this.basename(tab.path || 'untitled');
				const element = new TabItem(tabName, tab);

				// Add tab to grouped items if new
				const tabSyntax = tab.syntax || 'plaintext';
				const folder = this.groupedItems.find(group => group.syntax === tabSyntax);

				// Add tab to folder if folder already exists
				if (folder) {
					const childIndex = folder.children.findIndex(child => child.uri === tab.uri);
					if (childIndex < 0) {
						folder.addChild(Object.assign({}, element));
					}
				} else {
					// Add new folder if it doesn't exist yet

					// Title case syntax name
					const titleCaseName = tabSyntax
						.split(' ')
						.map((s) => s.charAt(0).toUpperCase() + s.substring(1))
						.join(' ');

					let extName = nova.path.extname(tab.path || '').replace(/^\./, '');

					if (tabSyntax === 'plaintext') {
						extName = '';
					}

					const newFolder = new FolderItem(
						this.app.syntaxNames[tabSyntax as keyof SyntaxNames] || titleCaseName,
						{ syntax: tab.syntax, extName: extName }
					);

					newFolder.addChild(Object.assign({}, element));
					this.groupedItems.push(newFolder);

					if (this.customKindGroupsOrder.indexOf(tabSyntax) < 0) {
						this.customKindGroupsOrder.push(tabSyntax);
					}
				}
			}
		});

		nova.workspace.config.set('eablokker.tabsSidebar.config.customKindGroupsOrder', this.customKindGroupsOrder);
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

				// Return error status when checking if file is ignored in Git
				if (args[2] === 'check-ignore') {
					resolve(status.toString());
				}

				if (status > 0) {
					reject(new Error('Process returned error status ' + status + ' when executing ' + scriptPath + ' ' + args.join(' ')));
				}

				if (errorString.length) {
					reject(new Error(errorString));
				} else {
					resolve(outString);
				}
			});

			process.start();
		});
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
		this.app.focusedTab = toItem;

		// Reload each item that got swapped
		Promise.all([this.app.treeView.reload(fromItem), this.app.treeView.reload(toItem)])
			.then(() => {
				this.app.highlightTab(toItem, { focus: true });
			})
			.catch(err => {
				console.error(err);
			});
	}

	moveKindGroup(group: FolderItem, distance: number) {
		// Original tab path
		const syntax = group.syntax || 'plaintext';

		// Get item indexes
		const fromItemIndex = this.groupedItems.findIndex(item => item.syntax === syntax);
		const toItemIndex = fromItemIndex + distance;

		if (toItemIndex < 0 || toItemIndex >= this.groupedItems.length) {
			return;
		}

		const fromItem = this.groupedItems[fromItemIndex];

		// Update custom order
		const fromIndex = this.groupedItems.findIndex(group => group.syntax === syntax);
		const toIndex = fromIndex + distance;

		if (toIndex < 0 || toIndex >= this.groupedItems.length) {
			return;
		}

		// Move group
		const item = this.groupedItems.splice(fromIndex, 1)[0];
		this.groupedItems.splice(toIndex, 0, item);

		// Update group contextValues
		this.updateGroupContexts();

		// Update saved groups order
		this.customKindGroupsOrder = this.groupedItems.map(group => group.syntax || 'plaintext');
		nova.workspace.config.set('eablokker.tabsSidebar.config.customKindGroupsOrder', this.customKindGroupsOrder);

		// Reload treeview
		this.app.treeView.reload()
			.then(() => {
				this.app.highlightTab(fromItem, { focus: true });
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
				const element = this.getElementByPath(path);

				if (!element) {
					return basename;
				}

				const isUnique = this.isUniqueName(element);

				if (isUnique) {
					return basename;
				}

				const commonBasePath = this.getCommonBasePath(element);
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
			return this.getElementByPath(path);
		});

		this.customOrder.sort((a, b) => {
			const aElement = elementArray.find(item => item?.path === a);
			const bElement = elementArray.find(item => item?.path === b);

			if (!aElement || !bElement || !aElement.syntax || !bElement.syntax ) {
				return 0;
			}

			return aElement.syntax.localeCompare(bElement.syntax);
		});
		nova.workspace.config.set('eablokker.tabsSidebar.config.customTabOrder', this.customOrder);

		this.sortItems();
	}

	updateGroupContexts() {
		this.groupedItems.forEach((group, i) => {
			if (this.groupedItems.length === 1) {
				group.contextValue = 'kindGroup-only';
			} else if (i === 0) {
				group.contextValue = 'kindGroup-first';
			} else if (i === this.groupedItems.length - 1) {
				group.contextValue = 'kindGroup-last';
			} else {
				group.contextValue = 'kindGroup';
			}
		});
	}

	getGitStatus(gitPath: string): Promise<GitStatus[]> {
		if (nova.inDevMode()) console.log('getGitStatus()');

		return new Promise((resolve, reject) => {
			const projectPath = nova.workspace.path;

			if (!projectPath) {
				return;
			}

			// '--no-optional-locks' git option to prevent watching changes on .git/index.lock
			this
				.runProcess(gitPath, ['--no-optional-locks', 'status', '--porcelain', '-uall'], projectPath)
				.then(result => {
					const gitStatusRegex = new RegExp('([ ADMRCU?!]{2}) "?([0-9a-zA-Z@_. /-]+) ?-?>? ?([0-9a-zA-Z@_. /-]*)', 'gm');
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

	// Sorting function
	byCustomOrder(a: TabItem, b: TabItem) {
		if (this.customOrder.indexOf(a.path || '') < 0) {
			return 1;
		}
		return this.customOrder.indexOf(a.path || '') - this.customOrder.indexOf(b.path || '');
	}

	// Sorting function
	byCustomKindGroupsOrder(a: FolderItem, b: FolderItem) {
		if (this.customKindGroupsOrder.indexOf(a.syntax || 'plaintext') < 0) {
			return 1;
		}
		return this.customKindGroupsOrder.indexOf(a.syntax || 'plaintext') - this.customKindGroupsOrder.indexOf(b.syntax || 'plaintext');
	}

	sortItems() {
		// Sort custom ordered items by custom order
		this.flatItems.sort(this.byCustomOrder.bind(this));

		// Sort folders by custom order
		this.groupedItems.sort(this.byCustomKindGroupsOrder.bind(this));

		// Sort folder children by custom order
		this.groupedItems.forEach(item => {
			item.children.sort(this.byCustomOrder.bind(this));
		});

		// Set context of position in list
		this.flatItems.forEach((tab, i) => {
			if (this.flatItems.length === 1) {
				tab.contextValue = tab.isRemote ? 'remote-only' : 'only';
			} else if (i === 0) {
				tab.contextValue = tab.isRemote ? 'remote-first' : 'first';
			} else if (i === this.flatItems.length - 1) {
				tab.contextValue = tab.isRemote ? 'remote-last' : 'last';
			} else {
				tab.contextValue = tab.isRemote ? 'remote-tab' : 'tab';
			}
		});

		// Set context of position of group in list
		this.updateGroupContexts();

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

			item.contextValue = element.contextValue;
			item.descriptiveText = this.app.showGroupCount ? '(' + element.children.length + ')' : '';
			item.identifier = element.syntax || element.extension;
			item.image = '__filetype.' + element.extension;

			if (!element.extension) {
				item.image = '__filetype.blank';
			}

			if (element.syntax === 'plaintext') {
				item.image = '__filetype.blank';
			}

			item.tooltip = '';

			let collapsibleState = TreeItemCollapsibleState.Expanded;

			if (this.collapsedKindGroups.indexOf(element.syntax || '') > -1) {
				collapsibleState = TreeItemCollapsibleState.Collapsed;
			}

			item.collapsibleState = collapsibleState;
		}
		else {
			let name = element.name;
			let description = '';

			if (element.isDirty) {
				switch (this.app.unsavedSymbolLocation) {
				case 'never':
					break;
				case 'after-filename':
					description = (this.app.unsavedSymbol || '⚫︎') + ' ';
					break;
				case 'before-filename':
				default:
					name = (this.app.unsavedSymbol || '⚫︎') + ' ' + name;
					break;
				}
			}

			item = new TreeItem(name);

			if (!element.extension) {
				item.image = '__filetype.blank';
			}

			if (element.name === '.editorconfig') {
				item.image = 'filetype-config-editorconfig';
			}

			if (element.name === '.gitignore') {
				item.image = 'filetype-config-gitignore';
			}

			if (element.extension === 'map') {
				if (element.name.endsWith('.js.map')) {
					item.image = '__filetype.js.map';
				}

				if (element.name.endsWith('.css.map')) {
					item.image = '__filetype.css.map';
				}
			}

			if (element.name.endsWith('.d.ts')) {
				item.image = '__filetype.d.ts';
			}

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

					if (foundStatus.status.length && (this.app.showGitStatus === 'text' || this.app.showGitStatus === 'both')) {
						description += '[' + foundStatus.status.trim() + '] ';
					}

					if (this.app.showGitStatus === 'icon' || this.app.showGitStatus === 'both') {
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
			let parentFolder = '';
			const isUnique = this.isUniqueName(element);

			// Always show parent folder if config setting is toggled on
			if (this.app.alwaysShowParentFolder) {
				const tabDirArray = nova.path.split(nova.path.dirname(element.path || ''));
				parentFolder = decodeURI(tabDirArray[tabDirArray.length - 1]);

				if (parentFolder !== '.Trash') {
					description += '‹ ' + parentFolder;
				}
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
						// Don't show trash folder as parent
						if (i === 0 && dir === '.Trash') {
							return;
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

export { SyntaxNames, TabItem, FolderItem, TabDataProvider };
