/**
 * Author: John Wesley M
 * Interface Component Element
 */

export class ControllerScope {
	/**
	 * Scope class. Creates a node with only ice
	 * @param {HTMLElement} ScopeElement 
	 */
	constructor(ScopeElement) {
		let elements = ScopeElement.querySelectorAll("[ice-name]");
		let name = '';
		for (let ice of elements) {
			name = ice.getAttribute("ice-name");
			if(name.endsWith("[]")) {
				name = name.replace("[]", "");
				if(this[name] !== undefined) {
					this[name].push(ice);
				} else {
					this[name] = [ice];
				}
			} else {
				this[name] = ice;
			}
		}
	}
}

export class Controller {
	constructor() {
		this.Scope = null;
	}
	Init() {
		this.App = document.querySelector("[ice-app='" + this.constructor.name + "']");
		if (this.App === null) {
			throw "App " + AppName + " not found";
		}
		this.Scope = new ControllerScope(this.App);
	}
}
