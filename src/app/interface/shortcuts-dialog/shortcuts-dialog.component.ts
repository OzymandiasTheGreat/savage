import { Component, OnInit } from "@angular/core";


export interface IShortcut {
	keys: string[];
	desc: string;
}


export interface IShortcuts {
	section: string;
	keys: IShortcut[];
}


@Component({
	selector: "app-shortcuts-dialog",
	templateUrl: "./shortcuts-dialog.component.html",
	styleUrls: ["./shortcuts-dialog.component.scss"]
})
export class ShortcutsDialogComponent implements OnInit {
	shortcuts: IShortcuts[];

	constructor() { }

	ngOnInit(): void {
		fetch("/assets/keys.json").then((response) => {
			if (response.ok) {
				return response.json();
			}
			return [];
		}).then((keys) => this.shortcuts = keys);
	}
}
