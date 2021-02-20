import { Component, OnInit, Input, ViewChild, ElementRef } from "@angular/core";
import googleFonts from "google-fonts-complete/google-fonts.json";

import { Observable } from "../../types/observer";
import { SavageSVG } from "../../types/svg";
import { HistoryService } from "../../services/history.service";
import { HotkeyService } from "../../services/hotkey.service";


const MDN_URI = "https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute";


@Component({
	selector: "app-sidebar-text",
	templateUrl: "./sidebar-text.component.html",
	styleUrls: ["./sidebar-text.component.scss"]
})
export class SidebarTextComponent implements OnInit {
	@ViewChild("panel", { static: true }) panel: ElementRef<HTMLElement>;
	@Input() selection: Observable<SavageSVG>[];
	families: string[] = [];

	constructor(
		public history: HistoryService,
		public hotkey: HotkeyService,
	) { }

	ngOnInit(): void {
		for (const family of Object.keys(googleFonts)) {
			this.families.push(family);
		}
		this.hotkey.triggered.subscribe((key) => {
			switch (key) {
				case "text-props":
					setTimeout(() => {
						this.panel.nativeElement.focus();
					}, 250);
					break;
			}
		});
	}

	help(attr: string): void {
		window.open(`${MDN_URI}/${attr}`, "_blank");
	}

	edited(): void {
		this.history.snapshot("Text attribute edited");
	}
}
