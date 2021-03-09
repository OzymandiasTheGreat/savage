import { Component, OnInit, Input, ViewChild, ElementRef } from "@angular/core";

import { Observable } from "../../types/observer";
import { SavageSVG, findParent } from "../../types/svg";
import { HistoryService } from "../../services/history.service";
import { HotkeyService } from "../../services/hotkey.service";
import { SvgFileService } from "../../services/svg-file.service";


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
	document: Observable<SavageSVG>;

	constructor(
		public history: HistoryService,
		public hotkey: HotkeyService,
		public file: SvgFileService,
	) { }

	ngOnInit(): void {
		this.file.openFile.subscribe((file) => this.document = file);
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

	edited(animation?: boolean): void {
		if (animation) {
			// Chrome bug workaround. If animation with no attributes is added
			// animation doesn't start when attributes are edited
			// We need to remove and re-add the whole animation element
			// But this is a big performance hit
			// Breaks too many things
			// const parent = findParent(this.document, this.selection[0].nid);
			// const index = parent.children.indexOf(this.selection[0]);
			// const node = parent.children.splice(index, 1)[0];
			// parent.children.splice(index, 0, node);
		}
		this.history.snapshot("Property edited");
	}
}
