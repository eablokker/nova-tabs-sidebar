type TabGroupNames = {[uuid: string]: string};

class TabGroupItem {
	name: string;
	uuid: string;
	contextValue: string | undefined;
	children: TabGroupItem[];
	parent: TabGroupItem | null;

	constructor(name: string) {
		this.name = name;
		this.uuid = this.randomUUID();
		this.children = [];
		this.parent = null;
	}
	
	randomUUID() {
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
	
	constructor() {
		this.flatItems = [];
		
		const tabGroups = nova.workspace.config.get('tabGroups', 'array');
		
		if (tabGroups) {
			this.refresh(tabGroups);
		}
	}
	
	refresh(tabGroups: string[]) {
		this.flatItems = [];
		
		tabGroups?.forEach((item) => {
			this.flatItems.push(new TabGroupItem(item));
		});
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