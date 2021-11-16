/**
 * Author: John Wesley M
 * Interface Component Element
 */

interface Dictionary<T> {
    [Key: string]: T;
}

export class Controller {
    Scope: Dictionary<HTMLElement[]> = {};
    App: HTMLElement = null;
    Initialised: boolean = false;
    constructor() {
        this.App = document.querySelector("[ice-app='" + this.constructor.name + "']");
    }
    Init() {
        if (!this.Initialised) {
            if (this.App === null) {
                throw "App " + this.constructor.name + " not found";
            }
            let elements = this.App.querySelectorAll("[ice-name]");
            let name = '';
            elements.forEach((ice: Element) => {
                name = ice.getAttribute("ice-name").toString();
                if (this.Scope[name] == undefined) {
                    this.Scope[name] = new Array<HTMLElement | HTMLSelectElement | HTMLInputElement | HTMLFormElement>();
                }
                if (ice instanceof HTMLElement) {
                    this.Scope[name].push(ice);
                }
            });
            this.App.dispatchEvent(new Event("ScopeInitialised"));
        }
        this.Initialised = true;
    }
}
