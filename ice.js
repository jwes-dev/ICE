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
                name = name.replace(/-(.)/g, function(match, group1) {
                    return group1.toUpperCase();
                })
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

export class Controller {

    constructor() {
        this.Scope = null;
        /**
         * This element contains the app node
         * Dispatches "scope-initialised" event once the app scope is initialised
         */
        this.App = null;
    }

    Init() {
        return new Promise((resolve, reject) => {
            try {
                this.App = document.querySelector("[ice-app='" + this.constructor.name + "']");
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
}

const BootstrapComponent = function () {
    this.componentList = new Map();
    this.components = [];
    this.register = (componentClass) => {
        this.componentList.set(componentClass.name, componentClass)
    }
    this.doBootstrap = () => {
        document.querySelectorAll("[ice-app]").forEach(el => {
            let className = el.getAttribute("ice-app");
            this.components.push(this.getInstance(className));
        });
    }
    this.getInstance = (name) => {
        if (this.componentList.has(name)) {
            var instance = new (this.componentList.get(name))();
            if (instance instanceof Controller) {
                return instance;
            } else {
                throw "Invalid controller class";
            }
        } else {
            throw "Controller [" + name + "] not found";
        }
    }
}

export var bootstrapComponent = new BootstrapComponent();
