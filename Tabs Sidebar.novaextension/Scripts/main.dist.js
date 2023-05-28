'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise */

var extendStatics = function(d, b) {
    extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
    return extendStatics(d, b);
};

function __extends(d, b) {
    if (typeof b !== "function" && b !== null)
        throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
    extendStatics(d, b);
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}

function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

function __generator(thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
}

var ListItem = /** @class */ (function () {
    function ListItem(name) {
        this.name = name;
        this._syntax = null;
        this.path = '';
        this.uri = '';
        this.isRemote = false;
    }
    Object.defineProperty(ListItem.prototype, "syntax", {
        get: function () {
            return this._syntax;
        },
        set: function (syntax) {
            this._syntax = syntax;
        },
        enumerable: false,
        configurable: true
    });
    return ListItem;
}());
var TabItem = /** @class */ (function (_super) {
    __extends(TabItem, _super);
    function TabItem(name, tab) {
        var _this = _super.call(this, name) || this;
        // Check if in .Trash folder
        var trashRegex = new RegExp('^file://' + nova.path.expanduser('~') + '/.Trash/');
        _this.name = name;
        _this.path = tab.path || undefined;
        _this.uri = tab.uri;
        _this.isRemote = tab.isRemote;
        _this._isDirty = tab.isDirty;
        _this.isUntitled = tab.isUntitled;
        _this.isTrashed = trashRegex.test(decodeURI(tab.uri));
        _this.children = [];
        _this.parent = null;
        _this._syntax = tab.syntax || 'plaintext';
        _this.extension = nova.path.extname(tab.path || '').replace(/^\./, '');
        _this.contextValue = tab.isRemote ? 'remote-tab' : 'tab';
        return _this;
    }
    Object.defineProperty(TabItem.prototype, "isDirty", {
        get: function () {
            return this._isDirty;
        },
        set: function (isDirty) {
            this._isDirty = isDirty;
        },
        enumerable: false,
        configurable: true
    });
    return TabItem;
}(ListItem));
var FolderItem = /** @class */ (function (_super) {
    __extends(FolderItem, _super);
    function FolderItem(name, options) {
        var _this = _super.call(this, name) || this;
        _this._syntax = (options === null || options === void 0 ? void 0 : options.syntax) || 'plaintext';
        _this.extension = options === null || options === void 0 ? void 0 : options.extName;
        _this.contextValue = 'kindGroup';
        _this.children = [];
        _this.parent = null;
        _this.count = undefined;
        return _this;
    }
    FolderItem.prototype.addChild = function (element) {
        element.parent = this;
        this.children.push(element);
    };
    return FolderItem;
}(ListItem));
var TabDataProvider = /** @class */ (function () {
    function TabDataProvider(app) {
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
    Object.defineProperty(TabDataProvider.prototype, "sortAlpha", {
        get: function () {
            return this._sortAlpha;
        },
        set: function (sortAlpha) {
            this._sortAlpha = sortAlpha;
            this.sortItems();
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(TabDataProvider.prototype, "groupByKind", {
        get: function () {
            return this._groupByKind;
        },
        set: function (groupByKind) {
            this._groupByKind = groupByKind;
            this.sortItems();
        },
        enumerable: false,
        configurable: true
    });
    TabDataProvider.prototype.loadData = function (documentTabs, focusedTab) {
        var _this = this;
        // Remove closed tabs from custom order
        if (this.customOrder.length) {
            this.customOrder = this.customOrder.filter(function (path) {
                return documentTabs.some(function (tab) { return tab.path === path; });
            });
        }
        // Remove closed tabs from flat list
        this.flatItems.forEach(function (item, i, self) {
            var tabIsClosed = documentTabs.every(function (tab) { return tab.uri !== item.uri; });
            if (tabIsClosed) {
                // Remove from flat items
                self.splice(i, 1);
            }
        });
        // Remove closed tabs from kind groups
        this.groupedItems.forEach(function (folder, i, self) {
            folder.children.forEach(function (child, i2, self2) {
                var tabIsClosed = documentTabs.every(function (tab) { return tab.uri !== child.uri; });
                var syntaxChanged = child.syntax && folder.syntax !== child.syntax;
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
            this.customKindGroupsOrder = this.customKindGroupsOrder.filter(function (syntax) {
                return _this.groupedItems.some(function (group) {
                    var syntaxName = group.syntax || 'plaintext';
                    return syntax === syntaxName;
                });
            });
        }
        // Add newly opened tabs
        documentTabs.forEach(function (tab) {
            // Hide untitled tabs
            if (tab.isUntitled || !tab.path) {
                return;
            }
            // Check if tab is new in custom order
            var tabIsNewInCustomOrder = _this.customOrder.every(function (path) { return path !== tab.path; });
            // Add new tab to custom order
            if (tabIsNewInCustomOrder) {
                // Splice new tab into array just after active editor or las focused tab
                var tabIndex = -1;
                if (focusedTab) {
                    tabIndex = _this.customOrder.findIndex(function (path) { return path === focusedTab.path; });
                }
                if (tabIndex > -1) {
                    _this.customOrder.splice(tabIndex + 1, 0, tab.path);
                }
                else {
                    _this.customOrder.push(tab.path);
                }
            }
            // Check if tab is new in flat items
            var tabIsNew = _this.flatItems.every(function (item) { return item.uri !== tab.uri; });
            // Add tab to flat items if new
            if (tabIsNew) {
                var tabName = _this.basename(tab.path || 'untitled');
                var element = new TabItem(tabName, tab);
                _this.flatItems.push(element);
            }
            // Check if tab is new in grouped items
            var tabIsNewInGroup = _this.groupedItems.every(function (group) {
                return group.children.every(function (item) { return item.uri !== tab.uri; });
            });
            if (tabIsNewInGroup) {
                var tabName = _this.basename(tab.path || 'untitled');
                var element = new TabItem(tabName, tab);
                // Add tab to grouped items if new
                var tabSyntax_1 = tab.syntax || 'plaintext';
                var folder = _this.groupedItems.find(function (group) { return group.syntax === tabSyntax_1; });
                // Add tab to folder if folder already exists
                if (folder) {
                    var childIndex = folder.children.findIndex(function (child) { return child.uri === tab.uri; });
                    if (childIndex < 0) {
                        folder.addChild(Object.assign({}, element));
                    }
                }
                else {
                    // Add new folder if it doesn't exist yet
                    // Title case syntax name
                    var titleCaseName = tabSyntax_1
                        .split(' ')
                        .map(function (s) { return s.charAt(0).toUpperCase() + s.substring(1); })
                        .join(' ');
                    var extName = nova.path.extname(tab.path || '').replace(/^\./, '');
                    if (tabSyntax_1 === 'plaintext') {
                        extName = '';
                    }
                    var newFolder = new FolderItem(_this.app.syntaxNames[tabSyntax_1] || titleCaseName, { syntax: tab.syntax, extName: extName });
                    newFolder.addChild(Object.assign({}, element));
                    _this.groupedItems.push(newFolder);
                    if (_this.customKindGroupsOrder.indexOf(tabSyntax_1) < 0) {
                        _this.customKindGroupsOrder.push(tabSyntax_1);
                    }
                }
            }
        });
        nova.workspace.config.set('eablokker.tabsSidebar.config.customKindGroupsOrder', this.customKindGroupsOrder);
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
                // Return error status when checking if file is ignored in Git
                if (args[2] === 'check-ignore') {
                    resolve(status.toString());
                }
                if (status > 0) {
                    reject(new Error('Process returned error status ' + status + ' when executing ' + scriptPath + ' ' + args.join(' ')));
                }
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
        var _this = this;
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
        this.app.focusedTab = toItem;
        // Reload each item that got swapped
        Promise.all([this.app.treeView.reload(fromItem), this.app.treeView.reload(toItem)])
            .then(function () {
            _this.app.highlightTab(toItem, { focus: true });
        })
            .catch(function (err) {
            console.error(err);
        });
    };
    TabDataProvider.prototype.moveKindGroup = function (group, distance) {
        var _this = this;
        // Original tab path
        var syntax = group.syntax || 'plaintext';
        // Get item indexes
        var fromItemIndex = this.groupedItems.findIndex(function (item) { return item.syntax === syntax; });
        var toItemIndex = fromItemIndex + distance;
        if (toItemIndex < 0 || toItemIndex >= this.groupedItems.length) {
            return;
        }
        var fromItem = this.groupedItems[fromItemIndex];
        // Update custom order
        var fromIndex = this.groupedItems.findIndex(function (group) { return group.syntax === syntax; });
        var toIndex = fromIndex + distance;
        if (toIndex < 0 || toIndex >= this.groupedItems.length) {
            return;
        }
        // Move group
        var item = this.groupedItems.splice(fromIndex, 1)[0];
        this.groupedItems.splice(toIndex, 0, item);
        // Update group contextValues
        this.updateGroupContexts();
        // Update saved groups order
        this.customKindGroupsOrder = this.groupedItems.map(function (group) { return group.syntax || 'plaintext'; });
        nova.workspace.config.set('eablokker.tabsSidebar.config.customKindGroupsOrder', this.customKindGroupsOrder);
        // Reload treeview
        this.app.treeView.reload()
            .then(function () {
            _this.app.highlightTab(fromItem, { focus: true });
        })
            .catch(function (err) {
            console.error(err);
        });
    };
    TabDataProvider.prototype.cleanUpByTabBarOrder = function (result) {
        var _this = this;
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
                var element = _this.getElementByPath(path);
                if (!element) {
                    return basename;
                }
                var isUnique = _this.isUniqueName(element);
                if (isUnique) {
                    return basename;
                }
                var commonBasePath = _this.getCommonBasePath(element);
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
        var _this = this;
        var elementArray = this.customOrder.map(function (path) {
            return _this.getElementByPath(path);
        });
        this.customOrder.sort(function (a, b) {
            var aElement = elementArray.find(function (item) { return (item === null || item === void 0 ? void 0 : item.path) === a; });
            var bElement = elementArray.find(function (item) { return (item === null || item === void 0 ? void 0 : item.path) === b; });
            if (!aElement || !bElement || !aElement.syntax || !bElement.syntax) {
                return 0;
            }
            return aElement.syntax.localeCompare(bElement.syntax);
        });
        nova.workspace.config.set('eablokker.tabsSidebar.config.customTabOrder', this.customOrder);
        this.sortItems();
    };
    TabDataProvider.prototype.updateGroupContexts = function () {
        var _this = this;
        this.groupedItems.forEach(function (group, i) {
            if (_this.groupedItems.length === 1) {
                group.contextValue = 'kindGroup-only';
            }
            else if (i === 0) {
                group.contextValue = 'kindGroup-first';
            }
            else if (i === _this.groupedItems.length - 1) {
                group.contextValue = 'kindGroup-last';
            }
            else {
                group.contextValue = 'kindGroup';
            }
        });
    };
    TabDataProvider.prototype.getGitStatus = function (gitPath) {
        var _this = this;
        if (nova.inDevMode())
            console.log('getGitStatus()');
        return new Promise(function (resolve, reject) {
            var projectPath = nova.workspace.path;
            if (!projectPath) {
                return;
            }
            // '--no-optional-locks' git option to prevent watching changes on .git/index.lock
            _this
                .runProcess(gitPath, ['--no-optional-locks', 'status', '--porcelain', '-uall'], projectPath)
                .then(function (result) {
                var gitStatusRegex = new RegExp('([ ADMRCU?!]{2}) "?([0-9a-zA-Z@_. /-]+) ?-?>? ?([0-9a-zA-Z@_. /-]*)', 'gm');
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
                // console.log(this.gitStatuses);
                resolve(_this.gitStatuses);
            })
                .catch(function (err) {
                reject(err);
            });
        });
    };
    // Sorting function
    TabDataProvider.prototype.byCustomOrder = function (a, b) {
        if (this.customOrder.indexOf(a.path || '') < 0) {
            return 1;
        }
        return this.customOrder.indexOf(a.path || '') - this.customOrder.indexOf(b.path || '');
    };
    // Sorting function
    TabDataProvider.prototype.byCustomKindGroupsOrder = function (a, b) {
        if (this.customKindGroupsOrder.indexOf(a.syntax || 'plaintext') < 0) {
            return 1;
        }
        return this.customKindGroupsOrder.indexOf(a.syntax || 'plaintext') - this.customKindGroupsOrder.indexOf(b.syntax || 'plaintext');
    };
    TabDataProvider.prototype.sortItems = function () {
        var _this = this;
        // Sort custom ordered items by custom order
        this.flatItems.sort(this.byCustomOrder.bind(this));
        // Sort folders by custom order
        this.groupedItems.sort(this.byCustomKindGroupsOrder.bind(this));
        // Sort folder children by custom order
        this.groupedItems.forEach(function (item) {
            item.children.sort(_this.byCustomOrder.bind(_this));
        });
        // Set context of position in list
        this.flatItems.forEach(function (tab, i) {
            if (_this.flatItems.length === 1) {
                tab.contextValue = tab.isRemote ? 'remote-only' : 'only';
            }
            else if (i === 0) {
                tab.contextValue = tab.isRemote ? 'remote-first' : 'first';
            }
            else if (i === _this.flatItems.length - 1) {
                tab.contextValue = tab.isRemote ? 'remote-last' : 'last';
            }
            else {
                tab.contextValue = tab.isRemote ? 'remote-tab' : 'tab';
            }
        });
        // Set context of position of group in list
        this.updateGroupContexts();
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
            var collapsibleState = TreeItemCollapsibleState.Expanded;
            if (this.collapsedKindGroups.indexOf(element.syntax || '') > -1) {
                collapsibleState = TreeItemCollapsibleState.Collapsed;
            }
            item.collapsibleState = collapsibleState;
        }
        else {
            var name_1 = element.name;
            var description_1 = '';
            if (element.isDirty) {
                switch (this.app.unsavedSymbolLocation) {
                    case 'never':
                        break;
                    case 'after-filename':
                        description_1 = (this.app.unsavedSymbol || '⚫︎') + ' ';
                        break;
                    case 'before-filename':
                    default:
                        name_1 = (this.app.unsavedSymbol || '⚫︎') + ' ' + name_1;
                        break;
                }
            }
            item = new TreeItem(name_1);
            if (!element.extension) {
                item.image = '__filetype.blank';
            }
            if (element.name === '.editorconfig') {
                item.image = 'filetype-config-editorconfig';
            }
            if (element.name === 'Dockerfile') {
                item.image = 'filetype-config-docker';
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
                    // console.log('status', foundStatus.status);
                    if (foundStatus.status.length && (this.app.showGitStatus === 'text' || this.app.showGitStatus === 'both')) {
                        description_1 += '[' + foundStatus.status.replace(' ', '•') + '] ';
                    }
                    if (this.app.showGitStatus === 'icon' || this.app.showGitStatus === 'both') {
                        switch (foundStatus.status) {
                            case ' M':
                            case 'MM':
                            case 'RM':
                            case 'AM':
                                item.image = 'git-modified-inverted';
                                break;
                            case 'M ':
                                item.image = 'git-modified';
                                break;
                            case 'A ':
                                item.image = 'git-added';
                                break;
                            case 'R ':
                                item.image = 'git-renamed';
                                break;
                            case ' R':
                                item.image = 'git-renamed-inverted';
                                break;
                            case '??':
                                item.image = 'git-untracked-inverted';
                                break;
                        }
                    }
                }
            }
            // Calculate parent folder path for description
            var parentFolder = '';
            var isUnique = this.isUniqueName(element);
            // Always show parent folder if config setting is toggled on
            if (this.app.alwaysShowParentFolder) {
                var tabDirArray = nova.path.split(nova.path.dirname(element.path || ''));
                parentFolder = decodeURI(tabDirArray[tabDirArray.length - 1]);
                if (parentFolder !== '.Trash') {
                    description_1 += '‹ ' + parentFolder;
                }
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
                    // Don't show trash folder as parent
                    if (i === 0 && dir === '.Trash') {
                        return;
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

var app;
var App = /** @class */ (function () {
    function App() {
        this.openTabWhenFocusSidebar = true;
        this.gitPath = '/usr/bin/git';
        this.openOnSingleClick = nova.config.get('eablokker.tabs-sidebar.open-on-single-click', 'boolean');
        this.showGitStatus = nova.config.get('eablokker.tabs-sidebar.show-git-status', 'string');
        this.alwaysShowParentFolder = nova.config.get('eablokker.tabs-sidebar.always-show-parent-folder', 'boolean');
        this.showGroupCount = nova.config.get('eablokker.tabs-sidebar.show-group-count', 'boolean');
        this.unsavedSymbol = nova.config.get('eablokker.tabs-sidebar.unsaved-symbol', 'string');
        this.unsavedSymbolLocation = nova.config.get('eablokker.tabs-sidebar.unsaved-symbol-location', 'string');
        this.groupByKind = nova.workspace.config.get('eablokker.tabsSidebar.config.groupByKind', 'boolean');
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
            'objc': 'Objective-C',
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
    App.prototype.init = function () {
        var _this = this;
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
                _this.tabDataProvider
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
        // TreeView implements the Disposable interface
        nova.subscriptions.add(this.treeView);
    };
    App.prototype.deactivate = function () {
        var _a;
        (_a = this.fileWatcher) === null || _a === void 0 ? void 0 : _a.dispose();
    };
    App.prototype.initConfig = function () {
        var _this = this;
        // Watch for config changes
        nova.config.onDidChange('eablokker.tabs-sidebar.open-on-single-click', function (newVal, oldVal) {
            _this.openOnSingleClick = newVal;
        });
        nova.config.onDidChange('eablokker.tabs-sidebar.show-git-status', function (newVal, oldVal) {
            var _a;
            _this.showGitStatus = newVal;
            if (newVal === 'never') {
                (_a = _this.fileWatcher) === null || _a === void 0 ? void 0 : _a.dispose();
            }
            else if (oldVal === 'never' && newVal !== 'never') {
                _this.initFileWatcher();
            }
            _this.treeView.reload();
        });
        nova.config.onDidChange('eablokker.tabs-sidebar.always-show-parent-folder', function (newVal, oldVal) {
            _this.alwaysShowParentFolder = newVal;
            _this.treeView.reload();
        });
        nova.config.onDidChange('eablokker.tabs-sidebar.show-group-count', function (newVal, oldVal) {
            _this.showGroupCount = newVal;
            _this.tabDataProvider.sortItems();
            _this.treeView.reload();
        });
        nova.config.onDidChange('eablokker.tabs-sidebar.unsaved-symbol', function (newVal, oldVal) {
            _this.unsavedSymbol = newVal;
            _this.treeView.reload();
        });
        nova.config.onDidChange('eablokker.tabs-sidebar.unsaved-symbol-location', function (newVal, oldVal) {
            _this.unsavedSymbolLocation = newVal;
            _this.treeView.reload();
        });
        nova.workspace.config.onDidChange('eablokker.tabsSidebar.config.sortAlpha', function (newVal, oldVal) {
            _this.tabDataProvider.sortAlpha = newVal;
            _this.treeView.reload();
        });
        nova.workspace.config.onDidChange('eablokker.tabsSidebar.config.groupByKind', function (newVal, oldVal) {
            _this.groupByKind = newVal;
            _this.tabDataProvider.groupByKind = _this.groupByKind;
            _this.treeView.reload();
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
    };
    App.prototype.initEditorEvents = function () {
        var _this = this;
        // Prevent excessive reloading
        var reloadTimeoutID = setTimeout(function () {
            //
        });
        nova.workspace.onDidAddTextEditor(function (editor) {
            //console.log('Document opened');
            clearTimeout(reloadTimeoutID);
            reloadTimeoutID = setTimeout(function () {
                var reload;
                var folder = _this.tabDataProvider.getFolderBySyntax(editor.document.syntax || 'plaintext');
                _this.tabDataProvider.loadData(nova.workspace.textDocuments, _this.focusedTab);
                if (folder && _this.groupByKind) {
                    reload = _this.treeView.reload(folder);
                }
                else {
                    reload = _this.treeView.reload();
                }
                reload
                    .then(function () {
                    var _a;
                    // Focus tab in sidebar
                    _this.focusedTab = _this.tabDataProvider.getElementByUri(editor.document.uri);
                    if (editor.document.uri === ((_a = nova.workspace.activeTextEditor) === null || _a === void 0 ? void 0 : _a.document.uri)) {
                        _this.highlightTab(_this.focusedTab || null, { focus: true });
                    }
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
                    var folder = _this.tabDataProvider.getFolderBySyntax(destroyedEditor.document.syntax || 'plaintext');
                    if (folder && folder.children.length > 1 && _this.groupByKind) {
                        reload = _this.treeView.reload(folder);
                    }
                    else {
                        reload = _this.treeView.reload();
                    }
                    _this.tabDataProvider.loadData(nova.workspace.textDocuments);
                    reload
                        .then(function () {
                        var document = nova.workspace.activeTextEditor ? nova.workspace.activeTextEditor.document : null;
                        if (document) {
                            _this.focusedTab = _this.tabDataProvider.getElementByUri(document.uri);
                            _this.highlightTab(_this.focusedTab || null, { focus: true });
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
                var _a;
                var selection = _this.treeView.selection[0];
                var document = changedEditor.document;
                // Don't reveal in treeview if it's already selected
                if ((selection === null || selection === void 0 ? void 0 : selection.uri) === document.uri) {
                    return;
                }
                // Only highlight tab if it's the same as the current active tab
                if (document.uri === ((_a = nova.workspace.activeTextEditor) === null || _a === void 0 ? void 0 : _a.document.uri)) {
                    _this.focusedTab = _this.tabDataProvider.getElementByUri(changedEditor.document.uri);
                    _this.highlightTab(_this.focusedTab || null, { focus: true });
                }
            });
            editor.onDidStopChanging(function (changedEditor) {
                //console.log('Document stopped changing');
                var element = _this.tabDataProvider.getElementByUri(editor.document.uri);
                _this.focusedTab = element;
                if (element) {
                    element.isDirty = editor.document.isDirty;
                }
                _this.treeView.reload(_this.focusedTab)
                    .then(function () {
                    _this.highlightTab(_this.focusedTab || null, { focus: true });
                })
                    .catch(function (err) {
                    console.error('Could not reload treeView.', err);
                });
            });
            // Focus tab in sidebar when saving document
            editor.onDidSave(function (savedEditor) {
                //console.log('Document saved');
                var element = _this.tabDataProvider.getElementByUri(savedEditor.document.uri);
                _this.focusedTab = element;
                if (element) {
                    element.isDirty = editor.document.isDirty;
                }
                _this.treeView.reload(_this.focusedTab)
                    .then(function () {
                    _this.highlightTab(_this.focusedTab || null, { focus: true });
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
                var element = _this.tabDataProvider.getElementByUri(document.uri);
                if (!element) {
                    return;
                }
                element.syntax = newSyntax || 'plaintext';
                _this.tabDataProvider.loadData(nova.workspace.textDocuments, _this.focusedTab || undefined);
                _this.treeView.reload()
                    .then(function () {
                    _this.highlightTab(_this.focusedTab || null, { focus: true });
                })
                    .catch(function (err) {
                    console.error('Could not reload treeView.', err);
                });
            });
        });
        this.treeView.onDidChangeSelection(function (selection) {
            if (nova.inDevMode())
                console.log('treeView.onDidChangeSelection');
            //console.log('New selection: ' + selection.map((e) => e.name));
            if (!selection[0]) {
                return;
            }
            // Prevent tab opening when editor selection changes
            if (_this.openTabWhenFocusSidebar === false) {
                _this.openTabWhenFocusSidebar = true;
                return;
            }
            var activeDocument = nova.workspace.activeTextEditor ? nova.workspace.activeTextEditor.document : null;
            if (_this.openOnSingleClick && (!activeDocument || activeDocument.uri !== selection[0].uri)) {
                nova.commands.invoke('tabs-sidebar.open');
            }
        });
        this.treeView.onDidCollapseElement(function (element) {
            // console.log('Collapsed: ' + element?.name);
            if (element === null || element === void 0 ? void 0 : element.syntax) {
                _this.tabDataProvider.collapsedKindGroups.push(element.syntax);
                nova.workspace.config.set('eablokker.tabsSidebar.config.collapsedKindGroups', _this.tabDataProvider.collapsedKindGroups);
            }
        });
        this.treeView.onDidExpandElement(function (element) {
            // console.log('Expanded: ' + element?.name);
            if (element === null || element === void 0 ? void 0 : element.syntax) {
                var index = _this.tabDataProvider.collapsedKindGroups.indexOf(element.syntax);
                if (index > -1) {
                    _this.tabDataProvider.collapsedKindGroups.splice(index, 1);
                    nova.workspace.config.set('eablokker.tabsSidebar.config.collapsedKindGroups', _this.tabDataProvider.collapsedKindGroups);
                }
            }
        });
        this.treeView.onDidChangeVisibility(function () {
            if (nova.inDevMode())
                console.log('Visibility Changed');
        });
    };
    App.prototype.registerCommands = function () {
        var _this = this;
        nova.commands.register('tabs-sidebar.close', function (workspace) {
            // console.log('Close Tab clicked');
            var selection = _this.treeView.selection;
            if (!selection[0]) {
                return;
            }
            var activeDocument = workspace.activeTextEditor ? workspace.activeTextEditor.document : null;
            var activeDocumentIsRemote = activeDocument ? activeDocument.isRemote : false;
            var selectionIsRemote = selection[0].isRemote;
            // Close currently active tab
            if (activeDocument && selection[0].uri === activeDocument.uri) {
                _this.tabDataProvider
                    .runProcess(__dirname + '/click_menu_item.sh', [nova.localize('File'), nova.localize('Close Tab')])
                    .then(function () {
                    activeDocument = workspace.activeTextEditor ? workspace.activeTextEditor.document : null;
                    if (activeDocument) {
                        _this.focusedTab = _this.tabDataProvider.getElementByUri(activeDocument.uri);
                        _this.highlightTab(_this.focusedTab || null, { focus: true });
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
                    _this.tabDataProvider
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
                                    _this.focusedTab = _this.tabDataProvider.getElementByUri(value.document.uri);
                                    _this.highlightTab(_this.focusedTab || null, { focus: true });
                                }
                            })
                                .catch(function (err) {
                                console.error('Could not open file.', err);
                            });
                            return;
                        }
                        // Switch back to remote tab after closing other local tab
                        _this.openRemoteTab(activeDocument.uri)
                            .then(function () {
                            if (activeDocument) {
                                _this.focusedTab = _this.tabDataProvider.getElementByUri(activeDocument.uri);
                                _this.highlightTab(_this.focusedTab || null, { focus: true });
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
            _this.openRemoteTab(selection[0].uri)
                .then(function () {
                _this.tabDataProvider
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
                                _this.focusedTab = _this.tabDataProvider.getElementByUri(value.document.uri);
                                _this.highlightTab(_this.focusedTab || null, { focus: true });
                            }
                        })
                            .catch(function (err) {
                            console.error('Could not open file.', err);
                        });
                        return;
                    }
                    // Switch back to remote tab after closing other remote tab
                    _this.openRemoteTab(activeDocument.uri)
                        .then(function (editor) {
                        if (editor) {
                            _this.focusedTab = _this.tabDataProvider.getElementByUri(editor.document.uri);
                            _this.highlightTab(_this.focusedTab || null, { focus: true });
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
            var _a, _b;
            var selection = _this.treeView.selection;
            // console.log('Selection: ' + selection[0].name);
            if (!selection[0]) {
                return;
            }
            // Don't do anything with folders
            if ((_b = (_a = selection[0]) === null || _a === void 0 ? void 0 : _a.contextValue) === null || _b === void 0 ? void 0 : _b.startsWith('kindGroup')) {
                return;
            }
            var isRemote = selection[0].isRemote;
            // Switch to tab for local file
            if (!isRemote) {
                workspace.openFile(selection[0].uri)
                    .then(function (value) {
                    if (value) {
                        _this.focusedTab = _this.tabDataProvider.getElementByUri(value.document.uri);
                        _this.highlightTab(_this.focusedTab || null, { focus: true });
                    }
                })
                    .catch(function (err) {
                    console.error('Could not open file.', err);
                });
                return;
            }
            // Switch to tab for remote file
            _this.openRemoteTab(selection[0].uri)
                .then(function (editor) {
                if (editor) {
                    _this.focusedTab = _this.tabDataProvider.getElementByUri(editor.document.uri);
                    _this.highlightTab(_this.focusedTab || null, { focus: true });
                }
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
            var selection = _this.treeView.selection;
            if (!selection[0]) {
                return;
            }
            // Move kind group up
            if (selection[0] instanceof FolderItem) {
                _this.tabDataProvider.moveKindGroup(selection[0], -1);
                return;
            }
            // console.log(JSON.stringify(selection[0]));
            // console.log('Move Up: ' + selection.map((e) => e.name));
            _this.tabDataProvider.moveTab(selection[0], -1);
        });
        nova.commands.register('tabs-sidebar.down', function () {
            // Invoked when the 'Move Down' header button is clicked
            var selection = _this.treeView.selection;
            if (!selection[0]) {
                return;
            }
            // Move kind group down
            if (selection[0] instanceof FolderItem) {
                _this.tabDataProvider.moveKindGroup(selection[0], 1);
                return;
            }
            // console.log(JSON.stringify(selection[0]));
            // console.log('Move Down: ' + selection.map((e) => e.name));
            _this.tabDataProvider.moveTab(selection[0], 1);
        });
        nova.commands.register('tabs-sidebar.cleanUpByTabBarOrder', function (workspace) {
            //console.log('Clean up by tab bar order clicked');
            _this.tabDataProvider.runProcess(__dirname + '/list_menu_items.sh', [nova.localize('Window')])
                .then(function (result) {
                //console.log(result);
                _this.tabDataProvider.cleanUpByTabBarOrder(result);
                _this.focusedTab = workspace.activeTextEditor ? _this.tabDataProvider.getElementByUri(workspace.activeTextEditor.document.uri) : undefined;
                _this.treeView.reload()
                    .then(function () {
                    _this.highlightTab(_this.focusedTab || null, { focus: true });
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
            _this.tabDataProvider.cleanUpByAlpha();
            _this.treeView.reload()
                .then(function () {
                _this.highlightTab(_this.focusedTab || null, { focus: true });
            })
                .catch(function (err) {
                console.error('Could not reload treeView.', err);
            });
        });
        nova.commands.register('tabs-sidebar.cleanUpByKind', function () {
            if (nova.inDevMode())
                console.log('cleanUpByKind');
            _this.tabDataProvider.cleanUpByKind();
            _this.treeView.reload()
                .then(function () {
                _this.highlightTab(_this.focusedTab || null, { focus: true });
            })
                .catch(function (err) {
                console.error('Could not reload treeView.', err);
            });
        });
        nova.commands.register('tabs-sidebar.sortByAlpha', function (workspace) {
            if (nova.inDevMode())
                console.log('Sort alphabetically');
            workspace.config.set('eablokker.tabsSidebar.config.sortAlpha', !_this.tabDataProvider.sortAlpha);
        });
        nova.commands.register('tabs-sidebar.groupByKind', function (workspace) {
            if (nova.inDevMode())
                console.log('groupByKind');
            workspace.config.set('eablokker.tabsSidebar.config.groupByKind', !_this.groupByKind);
        });
        nova.commands.register('tabs-sidebar.showInFilesSidebar', function (workspace) {
            if (nova.inDevMode())
                console.log('Show in Files Sidebar');
            var selection = _this.treeView.selection;
            if (!selection[0]) {
                return;
            }
            // Need to open selected tab in order to invoke command
            workspace.openFile(selection[0].uri)
                .then(function () {
                _this.tabDataProvider
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
            var selection = _this.treeView.selection;
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
            var selection = _this.treeView.selection;
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
            var selection = _this.treeView.selection;
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
            var selection = _this.treeView.selection;
            if (selection[0] instanceof FolderItem) {
                _this.tabDataProvider.loadData(workspace.textDocuments);
            }
            else {
                _this.tabDataProvider.loadData(workspace.textDocuments, selection[0] || undefined);
            }
            _this.initFileWatcher();
            _this.treeView.reload();
        });
    };
    App.prototype.initFileWatcher = function () {
        return __awaiter(this, void 0, void 0, function () {
            var gitPath, repoPath, watchTimeoutID;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Don't watch files if workspace is not bound to folder
                        if (this.showGitStatus === 'never' || !nova.workspace.path) {
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, this.tabDataProvider.runProcess('/usr/bin/which', ['git'])
                                .catch(function (err) {
                                console.error('Could not find git executable', err);
                                return null;
                            })];
                    case 1:
                        gitPath = _a.sent();
                        if (!gitPath) {
                            return [2 /*return*/];
                        }
                        this.gitPath = gitPath.trim();
                        if (nova.inDevMode())
                            console.log('System has Git executable at', this.gitPath);
                        return [4 /*yield*/, this.tabDataProvider.runProcess(this.gitPath, ['-C', nova.workspace.path || '', 'rev-parse', '--show-toplevel'])
                                .catch(function (err) {
                                console.warn('Could not find Git repo in current workspace', err);
                                return null;
                            })];
                    case 2:
                        repoPath = _a.sent();
                        if (!repoPath) {
                            return [2 /*return*/];
                        }
                        if (nova.inDevMode())
                            console.log('Workspace has Git repo at', repoPath.trim());
                        this.updateGitStatus();
                        watchTimeoutID = setTimeout(function () {
                            //
                        });
                        this.fileWatcher = nova.fs.watch(null, function () { });
                        this.fileWatcher.onDidChange(function (path) {
                            clearTimeout(watchTimeoutID);
                            watchTimeoutID = setTimeout(function () {
                                if (nova.inDevMode())
                                    console.log('File changed', path);
                                var pathSplit = nova.path.split(nova.path.dirname(path));
                                // Don't respond to changes to nova config
                                if (pathSplit[pathSplit.length - 1] === '.nova' && nova.path.basename(path) === 'Configuration.json') {
                                    if (nova.inDevMode())
                                        console.log('Dont respond to config changes');
                                    return;
                                }
                                // Check if file is ignored in Git
                                _this.tabDataProvider.runProcess(_this.gitPath, ['-C', repoPath.trim(), 'check-ignore', path])
                                    .then(function (status) {
                                    if (nova.inDevMode())
                                        console.log('Git ignored status', status);
                                    // Update git status if changed file is not ignored
                                    if (status === '1') {
                                        _this.updateGitStatus();
                                    }
                                })
                                    .catch(function (err) {
                                    console.error('Could not check Git ignore status', err);
                                });
                            }, 200);
                        });
                        return [2 /*return*/];
                }
            });
        });
    };
    App.prototype.openRemoteTab = function (uri) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var element = _this.tabDataProvider.getElementByUri(uri);
            if (!element) {
                console.warn('No tab element found for uri ' + uri);
                return;
            }
            var basename = nova.path.basename(element.uri);
            var parentPath = '';
            var isUnique = _this.tabDataProvider.isUniqueName(element);
            // Differentiate remote file by common parent path
            if (!isUnique) {
                var commonBasePath = _this.tabDataProvider.getCommonBasePath(element);
                parentPath = decodeURI(nova.path.dirname(element.uri).substring(commonBasePath.length));
            }
            if (parentPath.length) {
                basename += ' – ' + parentPath;
            }
            _this.tabDataProvider
                .runProcess(__dirname + '/click_project_item_by_name.sh', [nova.localize('Window'), basename])
                .then(function () {
                // console.log('Menu item ' + basename + ' of Window menu clicked');
                setTimeout(function () {
                    var editor = nova.workspace.activeTextEditor;
                    resolve(editor);
                }, 1);
            })
                .catch(function (err) {
                console.error('Could not click project item by filename.', err);
                reject(err);
            });
        });
    };
    App.prototype.highlightTab = function (tab, options) {
        var activeTabUri = nova.workspace.activeTextEditor ? nova.workspace.activeTextEditor.document.uri : undefined;
        var gotoTabUri = tab === null || tab === void 0 ? void 0 : tab.uri;
        if (activeTabUri !== gotoTabUri) {
            this.openTabWhenFocusSidebar = false;
        }
        this.treeView.reveal(tab, options);
    };
    App.prototype.updateGitStatus = function (reload) {
        var _this = this;
        if (reload === void 0) { reload = true; }
        this.tabDataProvider.getGitStatus(this.gitPath)
            .then(function (gitStatuses) {
            gitStatuses.forEach(function (gitStatus) {
                var _a;
                if (!reload) {
                    return;
                }
                var path = nova.path.join(nova.workspace.path || '', gitStatus.path);
                var element = _this.tabDataProvider.getElementByPath(path);
                // console.log('gitStatus.path', path);
                // console.log('element', element);
                // Don't reload treeview if that file is not open in workspace
                if (!element) {
                    return;
                }
                var activeEditor = _this.tabDataProvider.getElementByUri(((_a = nova.workspace.activeTextEditor) === null || _a === void 0 ? void 0 : _a.document.uri) || '');
                _this.treeView.reload(element)
                    .then(function () {
                    _this.highlightTab(activeEditor || null);
                })
                    .catch(function (err) {
                    console.error('Could not reload treeView.', err);
                });
            });
        })
            .catch(function (err) {
            console.error('Could not update git statuses', err);
        });
    };
    return App;
}());
exports.activate = function () {
    // Do work when the extension is activated
    app = new App();
};
exports.deactivate = function () {
    // Clean up state before the extension is deactivated
    app.deactivate();
};

exports.App = App;
//# sourceMappingURL=main.dist.js.map
