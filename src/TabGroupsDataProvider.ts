type TabGroupNames = {[uuid: string]: string};

class TabGroupItem {
	name: string;
	uuid: string;
	configString: string;
	contextValue: string | undefined;
	children: TabGroupItem[];
	parent: TabGroupItem | null;

	constructor(name: string, uuid?: string) {
		this.name = name;
		this.uuid = uuid || TabGroupItem.randomUUID();
		this.configString = this.uuid + ':' + this.name;
		this.children = [];
		this.parent = null;
	}

	static randomUUID() {
		let uuid: string;

		if (nova.version[0] >= 10) {
			// @ts-ignore
			uuid = nova.crypto.randomUUID();
		} else {
			let u = Date.now().toString(16) + Math.random().toString(16) + '0'.repeat(16);
			uuid = [u.substr(0,8), u.substr(8,4), '4000-8' + u.substr(13,3), u.substr(16,12)].join('-');
		}

		return uuid;
	}
}

class TabGroupsDataProvider {
	flatItems: TabGroupItem[];
	configRegex: RegExp;

	constructor() {
		this.flatItems = [];
		this.configRegex = /^([^:]*):(.*)$/;

		const tabGroups = nova.workspace.config.get('eablokker.tabsSidebar.config.tabGroups', 'array');

		if (!tabGroups) {
			return;
		}

		const tabGroupItems = tabGroups.map((configString) => {
			const matches = configString.match(this.configRegex);

			if (!matches || matches.length < 2) {
				return new TabGroupItem('Untitled');
			}

			const uuid = matches[1];
			const name = matches[2];

			return new TabGroupItem(name, uuid);
		});

		this.loadData(tabGroupItems);
	}

	loadData(tabGroups: TabGroupItem[]) {
		this.flatItems = [];

		tabGroups?.forEach((tabGroup) => {
			this.flatItems.push(tabGroup);
		});
	}

	addItem(name: string | null) {
		const tabGroup = new TabGroupItem(name || 'Untitled');

		const tabGroups = nova.workspace.config.get('eablokker.tabsSidebar.config.tabGroups', 'array') || [];
		tabGroups.push(tabGroup.configString);
		nova.workspace.config.set('eablokker.tabsSidebar.config.tabGroups', tabGroups);

		this.flatItems.push(tabGroup);
	}

	removeItemByConfigString(configString: string) {
		const tabGroups = nova.workspace.config.get('eablokker.tabsSidebar.config.tabGroups', 'array');
		if (!tabGroups) {
			return;
		}

		const filteredTabGroups = tabGroups.filter((configStringToFilter) => {
			return configString !== configStringToFilter;
		});

		nova.workspace.config.set('eablokker.tabsSidebar.config.tabGroups', filteredTabGroups);

		// Remove config key if empty
		if (filteredTabGroups.length <= 0) {
			nova.workspace.config.remove('eablokker.tabsSidebar.config.tabGroups');
		}

		// Get UUID
		const matches = configString.match(this.configRegex);
		if (!matches || matches.length < 2) {
			return;
		}
		const uuid = matches[1];

		// Get index of item to remove
		const index = this.flatItems.findIndex((groupItem) => {
			return groupItem.uuid === uuid;
		});

		this.flatItems.splice(index, 1);
	}

	getChildren(element: TabGroupItem) {
		// Requests the children of an element
		if (!element) {
			return this.flatItems;
		}
		else {
			return element.children;
		}
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

		item.identifier = element.uuid;
		// item.descriptiveText = element.uuid;

		return item;
	}
}

export { TabGroupItem, TabGroupsDataProvider };
