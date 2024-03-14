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
		this.configRegex = /^[^:]*:(.*)$/;
		
		const tabGroups = nova.workspace.config.get('eablokker.tabsSidebar.config.tabGroups', 'array');
		
		if (!tabGroups) {
			return;
		}
		
		const tabGroupItems = tabGroups.map((configString) => {
			const matches = configString.match(this.configRegex);
			
			if (!matches || matches.length < 2) {
				return new TabGroupItem('Untitled');
			}
			
			const uuid = matches[0];
			const name = matches[1];
			
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
	
	addItem(tabGroup: TabGroupItem) {
		this.flatItems.push(tabGroup);
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
		
		// item.descriptiveText = 'Description';
		
		return item;
	}
}

export { TabGroupItem, TabGroupsDataProvider };