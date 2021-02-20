import { Component, OnInit, Input, ViewChild, ElementRef } from "@angular/core";

import { Observable } from "../../types/observer";
import { SavageSVG, CONTAINER_RENDER } from "../../types/svg";
import { HistoryService } from "../../services/history.service";
import { SvgFileService, IDefinitions } from "../../services/svg-file.service";
import { HotkeyService } from "../../services/hotkey.service";


const MDN_URI = "https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute";
const RENDER = ["circle", "ellipse", "path", "polygon", "polyline", "rect", "text", "textPath", "tspan"];


@Component({
	selector: "app-sidebar-presentation",
	templateUrl: "./sidebar-presentation.component.html",
	styleUrls: ["./sidebar-presentation.component.scss"]
})
export class SidebarPresentationComponent implements OnInit {
	@ViewChild("panel", { static: true }) panel: ElementRef<HTMLElement>;
	@Input() selection: Observable<SavageSVG>[];
	defs: IDefinitions;
	fillWith: "color" | "gradient" | "pattern" = "color";
	strokeWith: "color" | "gradient" | "pattern" = "color";

	constructor(
		public history: HistoryService,
		public file: SvgFileService,
		public hotkey: HotkeyService,
	) { }

	ngOnInit(): void {
		this.file.definitions.subscribe((defs) => this.defs = defs);
		this.hotkey.triggered.subscribe((key) => {
			switch (key) {
				case "presentation":
					setTimeout(() => {
						this.panel.nativeElement.focus();
					}, 250);
					break;
			}
		});
	}

	get includes(): boolean {
		return this.selection.some((e) => [...RENDER, ...CONTAINER_RENDER].includes(e.name));
	}

	help(attr: string): void {
		window.open(`${MDN_URI}/${attr}`, "_blank");
	}

	getAttr(attr: string): string {
		const val = this.selection.filter((e) => [...RENDER, ...CONTAINER_RENDER].includes(e.name))[0]?.attributes[attr];
		if (this.selection.filter((e) => [...RENDER, ...CONTAINER_RENDER].includes(e.name)).every((e) => e.attributes[attr] === val)) {
			return val === undefined ? "" : val;
		}
		return "<MULTIPLE VALUES>";
	}

	setAttr(attr: string, val: any): void {
		this.selection.filter((e) => [...RENDER, ...CONTAINER_RENDER].includes(e.name)).forEach((e) => {
			e.attributes[attr] = val;
		});
		this.history.snapshot("Presentation attribute edited");
	}
}
