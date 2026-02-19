"use strict";

/**
 * Author: John Wesley M
 * Interface Component Element
 */

export class ICEScope {
    /**
     * Scope class. Creates a node with only ice
     * @param {HTMLElement} ScopeElement
     */
    constructor(ScopeElement) {
        this.__Scope_element__ = ScopeElement;
        this.LoadScope();
    }

    UpdateScope() {
        this.LoadScope(true);
    }

    LoadScope(update = false) {
        try {
            if (update) {
                this.PruneScope();
            }
            let elements = this.__Scope_element__.querySelectorAll("[ice-name]");
            let name = '';
            for (let ice of elements) {
                name = ice.getAttribute("ice-name");
                if (name === "__Scope_element__") {
                    throw "__Scope_element__ is a reserved name";
                }
                name = name.replace(/-(.)/g, function (match, group1) {
                    return group1.toUpperCase();
                });
                name = name.charAt(0).toLowerCase() + name.slice(1);
                if (update && this[name]) {
                    if (Object.is(this[name], ice)) {
                        continue;
                    } else if (Array.isArray(this[name]) && this[name].includes(ice)) {
                        continue;
                    }
                }
                if (this[name] !== undefined) {
                    if (this[name] instanceof HTMLElement) {
                        let tmp = this[name];
                        this[name] = [tmp, ice];
                    } else {
                        this[name].push(ice);
                    }
                } else {
                    this[name] = ice;
                }
            }
            this.__Scope_element__.dispatchEvent(new Event('scope-initialised'));
        } catch (e) {
            throw "Could not initialise scope for " + this.__Scope_element__.getAttribute("ice-name");
        }
    }

    PruneScope() {
        for (const key of Object.keys(this)) {
            if (key === "__Scope_element__") {
                continue;
            }
            const value = this[key];

            if (value instanceof Element) {
                if (!this.__Scope_element__.contains(value)) {
                    delete this[key];
                }
            } else if (Array.isArray(value)) {
                const filtered = value.filter(el => el instanceof Element && this.__Scope_element__.contains(el));

                if (filtered.length === 0) {
                    delete this[key];
                } else {
                    this[key] = filtered;
                }
            }
        }
    }
}


export class ContextStore {
    constructor() {
        return new Proxy(this, {
            get(target, prop) {
                return prop in target ? target[prop] : undefined;
            }, set(target, prop, value) {
                target[prop] = value;
                return true;
            }, deleteProperty(target, prop) {
                if (prop in target) {
                    delete target[prop];
                    return true;
                }
                return false;
            }, has(target, prop) {
                return prop in target;
            }
        });
    }
}

export class Controller {
    constructor(appContainer = null, isPageApp = false) {
        this.Scope = null;
        /**
         * This element contains the app node
         * Dispatches "scope-initialised" event once the app scope is initialised
         */
        this.App = appContainer;
        this.isPageApp = isPageApp;

        this.componentObjects = new ContextStore();
    }

    Init() {
        return new Promise((resolve, reject) => {
            try {
                if (this.App === null) {
                    if (this.isPageApp) {
                        this.App = document.querySelector("[ice-page-app]");
                    } else {
                        this.App = document.querySelector("[ice-app='" + this.constructor.name + "']");
                    }
                }
                if (this.App === null) {
                    reject("App " + AppName + " not found");
                }
                this.Scope = new ICEScope(this.App);
                resolve();
            } catch (e) {
                reject(e);
            }
        });
    }

    /**
     * @deprecated
     */
    __UpdateUI(element, content) {
        return new Promise((resolve, reject) => {
            if (element instanceof HTMLElement) {
                element.innerHTML = content;
                resolve();
            } else {
                reject();
            }
        });
    }

    __RenderComponent(container, dataSet, componentFunction, ...args) {
        __render.__component(container, dataSet, componentFunction, this.Scope, ...args);
    }
}

const DynamicComponentLoader = function () {
    this.componentRegistry = new Map();
    this.instances = [];
    this.register = function (componentName, filePath) {
        this.componentRegistry.set(componentName, filePath);
    };

    this.loadPageApps = function () {
        return new Promise((resolve, reject) => {
            try {
                let pageElement = document.querySelector("[ice-page-app]");
                if (pageElement) {
                    let location = "./PageApps" + window.location.pathname;
                    if (location.endsWith("/")) {
                        location += "/Index";
                    }
                    let className = location.split("/").reverse()[0];
                    import(location).then(component => {
                        if (undefined === component) {
                            console.error("Make sure the path is correct and that the script file is accessible for component " + componentName);
                        }
                        if (!component.default) {
                            console.error("Controller [" + className + "] not found");
                            reject("Controller [" + className + "] not found");
                        }
                        let instance = new component.default(pageElement);
                        if (instance instanceof Controller) {
                            return instance;
                        } else {
                            console.error("Invalid page app class");
                        }
                    });
                }
                resolve('success');
            } catch (e) {
                reject(e);
            }
        });
    }

    this.startLoadingComponents = function () {
        let counter = 0;
        let loaded = 0;
        return new Promise((resolve, reject) => {
            try {
                document.querySelectorAll("[ice-app]").forEach(el => {
                    counter++;
                    let componentName = el.getAttribute("ice-app");
                    let path = this.componentRegistry.get(componentName);
                    if (undefined === path) {
                        return;
                    }
                    import(path).then(component => {
                        if (undefined === component) {
                            console.error("Make sure the path is correct and that the script file is accessible for component " + componentName);
                        }
                        if (!Object.hasOwn(component, componentName)) {
                            console.error("Controller [" + componentName + "] not found");
                        }
                        let instance = new component[componentName](el);
                        if (instance instanceof Controller) {
                            return instance;
                        } else {
                            console.error("Invalid controller class");
                        }
                        this.instances.push(instance);
                        loaded++;
                    });
                });
                resolve('success');
            } catch (e) {
                reject(e);
            }
        });
    };
};

export var appEvents = new EventTarget();

export function StartICEApp() {
    dynamicComponentLoader.loadPageApps().catch((err) => {
        console.error(err);
    })
    dynamicComponentLoader.startLoadingComponents().then(() => {
        appEvents.dispatchEvent(new Event('component_load_complete'));
    }).catch(e => {
        console.error(e)
    });
}

export var dynamicComponentLoader = new DynamicComponentLoader();
export const __render = {
    __safe: (value) => value || "",
    __if: (condition, content, defaultValue = '') => condition ? content : defaultValue,
    /**
     * Bind and render ui component
     * @param container container to render the template in
     * @param dataSet data to bind to the template. When data changes the tempalte will be re-rendered
     * @param componentFunction template function
     * @param scopeVar scope variable to update if ice found inside the tempalte
     * @returns {(function())|(function(): *)}
     * @private
     */
    __component: (container, dataSet, componentFunction, scopeVar = null, ...args) => {
        if (!(container instanceof HTMLElement))
            throw "container should be an instance of HTMLElement";
        if (!dataSet || typeof dataSet.on !== "function")
            throw "dataSet should be a reactive object";

        const render = data => {
            const templateString = componentFunction(data, ...args)
            updateDOMFromTemplate(templateString, container, 20)
            // container.innerHTML = componentFunction(data, ...args);
        }

        render(dataSet);

        const unsubscribe = dataSet.on(() => render(dataSet));

        setTimeout(() => {
            if (container.querySelector("[ice-name]")) {
                scopeVar?.UpdateScope();
            }
        })
        return unsubscribe;
    }
};


export class StateVar {
    constructor(initial = null) {
        this._listeners = new Set();

        if (typeof initial === 'object' && initial !== null) {
            this._data = Array.isArray(initial) ? [...initial] : {...initial};
        } else {
            this._data = initial; // primitive
        }

        return new Proxy(this, {
            get: (target, prop) => {

                // class methods / fields
                if (prop in target) {
                    const value = target[prop];
                    if (typeof value === 'function') return value.bind(target);
                    return value;
                }

                // primitive dataset
                if (typeof target._data === 'object') {
                    const value = target._data[prop];
                    if (typeof value === 'function') return value.bind(target._data);
                    return target._data[prop];
                } else if (prop) {
                    return target._data;
                }
            },

            set: (target, prop, value) => {
                // setting class fields
                if (prop in target) {
                    target[prop] = value;
                    return true;
                }

                // primitive dataset
                if (typeof target._data !== 'object' || target._data === null) {
                    if (prop === 'value') {
                        const old = target._data;
                        if (old === value) return true;
                        target._data = value;
                        target._emit('value', value, old);
                    }
                    return true;
                }

                // object / array dataset
                const old = target._data[prop];
                if (old === value) return true;

                Reflect.set(target._data, prop, value);
                target._emit(prop, value, old);
                return true;
            },

            deleteProperty: (target, prop) => {
                if (typeof target._data === 'object' && target._data !== null && prop in target._data) {
                    const old = target._data[prop];
                    Reflect.deleteProperty(target._data, prop);
                    target._emit(prop, undefined, old);
                }
                return true;
            }
        });
    }

    on(fn) {
        this._listeners.add(fn);
        return () => this._listeners.delete(fn);
    }

    replace(newData) {
        if (typeof newData === 'object') {
            this._data = Array.isArray(newData) ? [...newData] : {...newData};
        }
        this._data = newData;
        this._emit('*', this._data, null);
    }

    hasValue(prop) {
        return this._data[prop] !== null && this._data[prop] !== undefined;
    }

    values() {
        if (typeof this._data === 'object' || typeof this._data === 'function') {
            return Array.isArray(this._data) ? [...this._data] : {...this._data};
        } else {
            return this._data;
        }
    }

    hasAnyValue() {
        for (const key in this._data) {
            if (this._data[key] !== null && this._data[key] !== undefined) {
                return true;
            }
        }
        return false;
    }

    _emit(prop, value, old) {
        for (const fn of this._listeners) {
            fn(prop, value, old);
        }
    }
}

export class Variable {
    constructor(initial = {}) {
        this.listeners = new Set();
        this._scheduled = false;
        this._destroyed = false;

        if (initial !== null)
            this.data = this._makeReactive(initial);
    }

    _makeReactive(obj) {
        const self = this;

        return new Proxy(obj, {
            set(target, prop, value) {
                const old = target[prop];
                if (old === value) return true;

                target[prop] = value;
                self._emit();
                return true;
            },
            deleteProperty(target, prop) {
                delete target[prop];
                self._emit();
                return true;
            }
        });
    }

    subscribe(fn) {
        if (this._destroyed) return () => {
        };
        this.listeners.add(fn);
        return () => this.listeners.delete(fn);
    }

    get() {
        return this.data;
    }

    replace(newData) {
        if (this._destroyed) return;
        this.data = this._makeReactive(newData);
        this._emit();
    }

    _emit() {
        if (this._scheduled) return;

        this._scheduled = true;
        queueMicrotask(() => {
            if (this._destroyed) return;

            this._scheduled = false;
            for (const fn of this.listeners) {
                try {
                    fn(this.data);
                } catch (e) {
                    console.error("Dataset listener error:", e);
                }
            }
        });
    }

    destroy() {
        this.listeners.clear();
        this._destroyed = true;
    }
}


function updateDOMFromTemplate(templateString, realRoot, maxDepth = 50) {
    if (!templateString || !templateString.trim()) return;

    const template = document.createElement('template');
    template.innerHTML = templateString.trim();

    try {
        diffChildren(realRoot, template.content, 0, maxDepth);
    } catch (err) {
        if (err.message === "dangerous path change") {
            console.warn("Depth exceeded. Replacing container contents.");
            realRoot.innerHTML = templateString;
        } else {
            throw err;
        }
    }
}


function diffChildren(realParent, newParent, depth, maxDepth) {
    if (depth > maxDepth) {
        throw new Error("dangerous path change");
    }

    const realChildren = Array.from(realParent.childNodes);
    const newChildren = Array.from(newParent.childNodes);

    const max = Math.max(realChildren.length, newChildren.length);

    for (let i = 0; i < max; i++) {
        const realChild = realChildren[i];
        const newChild = newChildren[i];

        // Add
        if (!realChild && newChild) {
            realParent.appendChild(newChild.cloneNode(true));
            continue;
        }

        // Remove
        if (realChild && !newChild) {
            realChild.remove();
            continue;
        }

        // Diff existing
        diffNode(realChild, newChild, depth + 1, maxDepth);
    }
}


function diffNode(realNode, newNode, depth, maxDepth) {
    if (depth > maxDepth) {
        throw new Error("dangerous path change");
    }

    // Replace if structurally different
    if (realNode.nodeType !== newNode.nodeType ||
        realNode.nodeName !== newNode.nodeName) {
        realNode.replaceWith(newNode.cloneNode(true));
        return;
    }

    // Text node
    if (realNode.nodeType === Node.TEXT_NODE) {
        if (realNode.textContent !== newNode.textContent) {
            realNode.textContent = newNode.textContent;
        }
        return;
    }

    // Element node: sync attributes
    syncAttributes(realNode, newNode);

    // Recurse children
    diffChildren(realNode, newNode, depth + 1, maxDepth);
}


function syncAttributes(realEl, newEl) {
    const realAttrs = Array.from(realEl.attributes);
    const newAttrs = Array.from(newEl.attributes);

    // Remove old attributes
    for (let attr of realAttrs) {
        if (!newEl.hasAttribute(attr.name)) {
            realEl.removeAttribute(attr.name);
        }
    }

    // Add or update attributes
    for (let attr of newAttrs) {
        if (realEl.getAttribute(attr.name) !== attr.value) {
            realEl.setAttribute(attr.name, attr.value);
        }
    }
}
