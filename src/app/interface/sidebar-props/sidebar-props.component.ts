import { Component, OnInit, Input, ViewChild, ElementRef } from "@angular/core";

import { Observable } from "../../types/observer";
import { SavageSVG } from "../../types/svg";
import { HistoryService } from "../../services/history.service";
import { HotkeyService } from "../../services/hotkey.service";


const MDN_URI = "https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute";


@Component({
	selector: "app-sidebar-props",
	templateUrl: "./sidebar-props.component.html",
	styleUrls: ["./sidebar-props.component.scss"]
})
export class SidebarPropsComponent implements OnInit {
	@ViewChild("panel", { static: true }) panel: ElementRef<HTMLElement>;
	@Input() selection: Observable<SavageSVG>[];
	get cls(): string {
		const cls = this.selection[0]?.attributes.class;
		if (this.selection.every((e) => e.attributes.class === cls)) {
			return cls;
		}
		return "<MULTIPLE VALUES>";
	}
	set cls(val: string) {
		this.selection.forEach((e) => e.attributes.class = val);
	}

	constructor(
		public history: HistoryService,
		public hotkey: HotkeyService,
	) { }

	ngOnInit(): void {
		this.hotkey.triggered.subscribe((key) => {
			switch (key) {
				case "properties":
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
		this.history.snapshot("Property edited");
	}
}
