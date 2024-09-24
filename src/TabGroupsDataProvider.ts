type TabGroupNames = {[uuid: string]: string};

class TabGroupItem {
	name: string;
	uuid: string;
	configString: string;
	contextValue: string | undefined;
	children: TabGroupChild[];
	parent: TabGroupItem | null;

	constructor(name: string, uuid?: string) {
		this.name = name;
		this.uuid = uuid || TabGroupItem.randomUUID();
		this.configString = this.uuid + ':' + this.name;
		this.children = [];
		this.parent = null;
	}

	addChild(element: TabGroupChild) {
		element.parent = this;
		this.children.push(element);
	}

	static randomUUID() {
		if (nova.version[0] >= 10) {
			// @ts-ignore
			return nova.crypto.randomUUID();
		}

		let u = Date.now().toString(16) + Math.random().toString(16) + '0'.repeat(16);
		return [u.substr(0,8), u.substr(8,4), '4000-8' + u.substr(13,3), u.substr(16,12)].join('-');
	}
}

class TabGroupChild {
	name: string;
	path: string;
	uri: string;
	isRemote: boolean;
	children: TabGroupChild[];
	parent: TabGroupItem | null;

	constructor(name: string) {
		this.name = name;
		this.path = '';
		this.uri = '';
		this.isRemote = false;
		this.children = [];
		this.parent = null;
	}
}

class TabGroupsDataProvider {
	flatItems: TabGroupItem[];
	activeGroup: string;
	expandedGroups: string[];
	configRegex: RegExp;

	constructor() {
		this.flatItems = [];
		this.activeGroup = nova.workspace.config.get('eablokker.tabsSidebar.config.activeTabGroup', 'string') || '__DEFAULT_GROUP__';
		this.expandedGroups = [];
		this.configRegex = /^([^:]*):(.*)$/;

		this.loadData();
	}

	loadData() {
		this.flatItems = [];
		const tabGroups = nova.workspace.config.get('eablokker.tabsSidebar.config.tabGroups', 'array') || [];

		const defaultChildren = nova.workspace.config.get('eablokker.tabsSidebar.config.tabGroupsOrder.__DEFAULT_GROUP__', 'array') || nova.workspace.config.get('eablokker.tabsSidebar.config.customTabOrder', 'array') || [];
		const defaultTabGroupItem = new TabGroupItem(defaultChildren.length + ' Documents', '__DEFAULT_GROUP__');

		defaultChildren.forEach(child => {
			const name = nova.path.basename(child);

			const tabGroupChild = new TabGroupChild(name);
			tabGroupChild.uri = child;
			tabGroupChild.path = decodeURI(tabGroupChild.uri).replace(/^file:\/\//, '').replace(/^ftp:\/\//, '').replace(/^sftp:\/\//, '');
			tabGroupChild.isRemote = tabGroupChild.uri.startsWith('ftp://') || tabGroupChild.uri.startsWith('sftp://');

			defaultTabGroupItem.addChild(tabGroupChild);
		});

		this.flatItems.push(defaultTabGroupItem);

		if (!tabGroups) {
			return;
		}

		const tabGroupItems = tabGroups.map((configString) => {
			const matches = configString.match(this.configRegex);

			if (!matches || matches.length < 3) {
				return new TabGroupItem('Untitled');
			}

			const uuid = matches[1];
			const name = matches[2];

			const tabGroupItem = new TabGroupItem(name, uuid);
			const children = nova.workspace.config.get('eablokker.tabsSidebar.config.tabGroupsOrder.' + uuid, 'array') || [];

			children.forEach(child => {
				const name = nova.path.basename(child);

				const tabGroupChild = new TabGroupChild(name);
				tabGroupChild.uri = child;
				tabGroupChild.path = decodeURI(tabGroupChild.uri).replace(/^file:\/\//, '').replace(/^ftp:\/\//, '').replace(/^sftp:\/\//, '');
				tabGroupChild.isRemote = tabGroupChild.uri.startsWith('ftp://') || tabGroupChild.uri.startsWith('sftp://');

				tabGroupItem.addChild(tabGroupChild);
			});

			return tabGroupItem;
		});

		this.flatItems = this.flatItems.concat(tabGroupItems);
	}

	refresh() {
		this.loadData();
	}

	refreshItem(uuid: string) {
		const element = this.selectItemByUUID(uuid);

		if (!element) {
			return;
		}

		const children = nova.workspace.config.get('eablokker.tabsSidebar.config.tabGroupsOrder.' + uuid, 'array') || nova.workspace.config.get('eablokker.tabsSidebar.config.customTabOrder', 'array') || [];

		element.children = [];

		children.forEach(child => {
			const name = nova.path.basename(child);

			const tabGroupChild = new TabGroupChild(name);
			tabGroupChild.uri = child;
			tabGroupChild.path = decodeURI(tabGroupChild.uri).replace(/^file:\/\//, '').replace(/^ftp:\/\//, '').replace(/^sftp:\/\//, '');
			tabGroupChild.isRemote = tabGroupChild.uri.startsWith('ftp://') || tabGroupChild.uri.startsWith('sftp://');

			element.addChild(tabGroupChild);
		});

		return element;
	}

	addItem(name: string | null) {
		const tabGroup = new TabGroupItem(name || 'Untitled');

		const tabGroups = nova.workspace.config.get('eablokker.tabsSidebar.config.tabGroups', 'array') || [];
		tabGroups.push(tabGroup.configString);

		// Add current document tabs
		const currentTabs = nova.workspace.config.get('eablokker.tabsSidebar.config.customTabOrder', 'array');
		nova.workspace.config.set('eablokker.tabsSidebar.config.tabGroupsOrder.' + tabGroup.uuid, currentTabs);

		// Add new group
		nova.workspace.config.set('eablokker.tabsSidebar.config.tabGroups', tabGroups);

		// Set active group
		nova.workspace.config.set('eablokker.tabsSidebar.config.activeTabGroup', tabGroup.uuid);
		this.activeGroup = tabGroup.uuid;

		// Update tree
		this.flatItems.push(tabGroup);

		return tabGroup;
	}

	openItem(uuid: string) {
		this.activeGroup = uuid;
	}

	selectItemByUUID(uuid: string) {
		return this.flatItems.find((tabGroup) => {
			return tabGroup.uuid === uuid;
		}) || null;
	}

	renameItemByConfigString(configString: string, newName: string) {
		const tabGroups = nova.workspace.config.get('eablokker.tabsSidebar.config.tabGroups', 'array') || [];

		const matches = configString.match(this.configRegex);
		if (!matches || matches.length < 3) {
			return;
		}

		const uuid = matches[1];

		const renamedTabGroups = tabGroups.map((prevConfigString) => {
			if (prevConfigString === configString) {
				return uuid + ':' + newName;
			}

			return prevConfigString;
		});

		const tabGroupItemToRename = this.flatItems.find((tabGroup) => {
			return tabGroup.uuid === uuid;
		});

		if (!tabGroupItemToRename) {
			return;
		}

		// Update config and tree
		nova.workspace.config.set('eablokker.tabsSidebar.config.tabGroups', renamedTabGroups);
		tabGroupItemToRename.name = newName;
	}

	removeItemByConfigString(configString: string) {
		const tabGroups = nova.workspace.config.get('eablokker.tabsSidebar.config.tabGroups', 'array') || [];

		const filteredTabGroups = tabGroups.filter((configStringToFilter) => {
			return configString !== configStringToFilter;
		});

		// Get UUID
		const matches = configString.match(this.configRegex);
		if (!matches || matches.length < 3) {
			return;
		}
		const uuid = matches[1];

		// Get index of item to remove
		const index = this.flatItems.findIndex((groupItem) => {
			return groupItem.uuid === uuid;
		});

		if (index < 0) {
			return;
		}

		// Update config
		nova.workspace.config.set('eablokker.tabsSidebar.config.tabGroups', filteredTabGroups);

		// Remove tab order
		nova.workspace.config.remove('eablokker.tabsSidebar.config.tabGroupsOrder.' + uuid);

		// Set active group
		this.activeGroup = '__DEFAULT_GROUP__';
		nova.workspace.config.remove('eablokker.tabsSidebar.config.activeTabGroup');

		// Update tree
		this.flatItems.splice(index, 1);

		// Remove tab groups key if empty
		if (filteredTabGroups.length <= 0) {
			nova.workspace.config.remove('eablokker.tabsSidebar.config.tabGroups');
		}
	}

	getChildren(element: TabGroupItem | TabGroupChild) {
		// Requests the children of an element
		if (!element) {
			return this.flatItems;
		}

		return element.children;
	}

	getParent(element: TabGroupItem) {
		// Requests the parent of an element, for use with the reveal() method

		if (element === null) {
			return null;
		}

		return element.parent;
	}

	getTreeItem(element: TabGroupItem) {
		const item = new TreeItem(element.name);

		if (element instanceof TabGroupItem) {
			item.identifier = element.uuid;
			// item.descriptiveText = element.uuid;
			item.command = 'tabs-sidebar.openTabGroup';

			if (element.uuid === '__DEFAULT_GROUP__') {
				item.image = 'desktop-computer';
				item.contextValue = 'currentTabs';
			} else if (element.uuid === this.activeGroup) {
				item.image = 'tab-group-active';
				item.contextValue = 'activeTabGroup';
			} else {
				item.image = 'tab-group';
				item.contextValue = 'tabGroup';
			}

			if (element.children.length) {
				if (element.uuid !== '__DEFAULT_GROUP__') {
					item.descriptiveText = '(' + element.children.length + ')';
				}

				if (this.expandedGroups.indexOf(element.uuid) > -1) {
					item.collapsibleState = TreeItemCollapsibleState.Expanded;
				} else {
					item.collapsibleState = TreeItemCollapsibleState.Collapsed;
				}
			}
		}

		if (element instanceof TabGroupChild) {
			item.identifier = element.uri;
			item.path = element.path
			item.tooltip = element.path.replace(nova.path.expanduser('~'), '~');
			// item.image = '__filetype.' + nova.path.extname(element.uri);
			item.contextValue = 'document';
			item.command = 'tabs-sidebar.openTabGroup';

			if (element.isRemote) {
				item.descriptiveText = '☁️';
			}
		}

		return item;
	}
}

export { TabGroupItem, TabGroupChild, TabGroupsDataProvider };
