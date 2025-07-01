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
        try {
            let elements = ScopeElement.querySelectorAll("[ice-name]");
            let name = '';
            for (let ice of elements) {
                name = ice.getAttribute("ice-name");
                name = name.replace(/-(.)/g, function (match, group1) {
                    return group1.toUpperCase();
                });
                name = name.charAt(0).toLowerCase() + name.slice(1);
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
            ScopeElement.dispatchEvent(new Event('scope-initialised'));
        } catch (e) {
            throw "Could not initialise scope for " + ScopeElement.getAttribute("ice-name");
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
    constructor(appContainer = null) {
        this.Scope = null;
        /**
         * This element contains the app node
         * Dispatches "scope-initialised" event once the app scope is initialised
         */
        this.App = appContainer;

        this.componentObjects = new ContextStore();
    }

    Init() {
        return new Promise((resolve, reject) => {
            try {
                if (this.App === null) {
                    this.App = document.querySelector("[ice-app='" + this.constructor.name + "']");
                }
                if (this.App === null) {
                    throw "App " + AppName + " not found";
                }
                this.Scope = new ICEScope(this.App);
                resolve();
            } catch (e) {
                reject(e);
            }
        });
    }

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
                            console.log("Make sure the path is correct and that the script file is accessible for component " + componentName);
                        }
                        if (!component.default) {
                            console.log("Controller [" + className + "] not found");
                            reject("Controller [" + className + "] not found");
                        }
                        let instance = new component.default(pageElement);
                        if (instance instanceof Controller) {
                            return instance;
                        } else {
                            console.log("Invalid page app class");
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
                        console.log("Unregistered component found " + componentName);
                        return;
                    }
                    import(path).then(component => {
                        if (undefined === component) {
                            console.log("Make sure the path is correct and that the script file is accessible for component " + componentName);
                        }
                        if (!Object.hasOwn(component, componentName)) {
                            console.log("Controller [" + componentName + "] not found");
                        }
                        let instance = new component[componentName](el);
                        if (instance instanceof Controller) {
                            return instance;
                        } else {
                            console.log("Invalid controller class");
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


