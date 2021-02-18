import { Component, OnInit, ViewChild } from "@angular/core";
import { MatAccordion, MatExpansionPanel } from "@angular/material/expansion";

import { SvgFileService } from "../../services/svg-file.service";
import { CanvasService } from "../../services/canvas.service";
import { HotkeyService } from "../../services/hotkey.service";


@Component({
	selector: "app-sidebar",
	templateUrl: "./sidebar.component.html",
	styleUrls: ["./sidebar.component.scss"]
})
export class SidebarComponent implements OnInit {
	@ViewChild("accordion", { static: true }) accordion: MatAccordion;
	@ViewChild("elemPanel", { static: true }) elemPanel: MatExpansionPanel;
	@ViewChild("propPanel", { static: true }) propPanel: MatExpansionPanel;
	@ViewChild("presentationPanel", { static: true }) presentationPanel: MatExpansionPanel;
	@ViewChild("textPanel", { static: true }) textPanel: MatExpansionPanel;
	@ViewChild("transformPanel", { static: true }) transformPanel: MatExpansionPanel;

	constructor(
		public file: SvgFileService,
		public canvas: CanvasService,
		public hotkey: HotkeyService,
	) { }

	ngOnInit(): void {
		this.hotkey.triggered.subscribe((key) => {
			switch (key) {
				case "elements":
				case "elem-toolbar":
					this.accordion.closeAll();
					this.elemPanel.open();
					break;
			}
		});
	}

	onKeyDown(event: KeyboardEvent): void {
		if (!event.ctrlKey && !event.shiftKey && !event.altKey
			&& ["input", "textarea", "select"].includes((<HTMLElement> event.target).tagName.toLowerCase())) {
			// Prevent single-key hotkeys from triggering when editing props
			event.stopPropagation();
		}
	}
}
