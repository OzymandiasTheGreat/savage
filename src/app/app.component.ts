import { Component, OnInit, ViewChild } from "@angular/core";
import { MatSidenav } from "@angular/material/sidenav";
import googleFonts from "google-fonts-complete/google-fonts.json";

import { HotkeyService } from "./services/hotkey.service";


@Component({
	selector: "app-root",
	templateUrl: "./app.component.html",
	styleUrls: ["./app.component.scss"]
})
export class AppComponent implements OnInit {
	title = "savage";
	@ViewChild("sidedrawer", { static: true }) sidedrawer: MatSidenav;
	@ViewChild("sidebar", { static: true }) sidebar: MatSidenav;

	constructor(
		public hotkey: HotkeyService,
	) { }

	ngOnInit(): void {
		setTimeout(async () => {
			for (const [family, font] of Object.entries(googleFonts)) {
				for (const [style, variant] of Object.entries(font.variants)) {
					for (const [weight, props] of Object.entries(variant)) {
						const fontFace = new FontFace(family, `url(${(<any> props).url.ttf})`, {
							style,
							weight,
						});
						await fontFace.load().then(() => document.fonts.add(fontFace))
							.catch((err) => console.warn(`Skipping font: ${family}`));
					}
				}
			}
		}, 1750);
	}

	onKeyDown(event: KeyboardEvent): void {
		const alt = event.altKey;
		const ctrl = event.ctrlKey;
		const shift = event.shiftKey;
		switch (event.key) {
			case " ":
				if (ctrl && !alt && !shift) {
					event.preventDefault();
					event.stopPropagation();
					this.hotkey.trigger("raw");
				}
				break;
			case "s":
				if (!ctrl && !alt && !shift) {
					this.hotkey.trigger("object");
				}
				break;
			case "n":
				if (!ctrl && !alt && !shift) {
					this.hotkey.trigger("path");
				}
				break;
			case "r":
				if (!ctrl && !alt && !shift) {
					this.hotkey.trigger("rect");
				}
				break;
			case "e":
				if (!ctrl && !alt && !shift) {
					this.hotkey.trigger("circle");
				} else if (ctrl && !alt && !shift) {
					event.preventDefault();
					this.sidebar.open();
					this.hotkey.trigger("elements");
				}
				break;
			case "E":
				if (ctrl && shift && !alt) {
					event.preventDefault();
					this.sidebar.open();
					this.hotkey.trigger("elem-toolbar");
				}
				break;
			case "p":
				if (!ctrl && !alt && !shift) {
					this.hotkey.trigger("polygon");
				}
				break;
			case "P":
				if (ctrl && !alt && shift) {
					event.preventDefault();
					this.hotkey.trigger("options");
				}
				break;
			case "l":
				if (!ctrl && !alt && !shift) {
					this.hotkey.trigger("line");
				}
				break;
			case "f":
				if (!ctrl && !alt && !shift) {
					this.hotkey.trigger("freehand");
				}
				break;
			case "t":
				if (!ctrl && !alt && !shift) {
					this.hotkey.trigger("text");
				}
				break;
			case "g":
				if (!ctrl && !alt && !shift) {
					this.hotkey.trigger("gradient");
				}
				break;
			case "o":
				if (ctrl && !alt && !shift) {
					event.preventDefault();
					this.sidedrawer.toggle();
				}
				break;
			case "`":
				if (ctrl && !alt && !shift) {
					event.preventDefault();
					this.sidebar.toggle();
				}
				break;
		}
	}
}
