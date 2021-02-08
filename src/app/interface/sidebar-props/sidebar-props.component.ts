import { Component, OnInit, Input } from "@angular/core";

import { Observable } from "../../types/observer";
import { SavageSVG } from "../../types/svg";
import { HistoryService } from "../../services/history.service";


const MDN_URI = "https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute";


@Component({
	selector: "app-sidebar-props",
	templateUrl: "./sidebar-props.component.html",
	styleUrls: ["./sidebar-props.component.scss"]
})
export class SidebarPropsComponent implements OnInit {
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
	) { }

	ngOnInit(): void { }

	help(attr: string): void {
		window.open(`${MDN_URI}/${attr}`, "_blank");
	}

	edited(): void {
		this.history.snapshot("Property edited");
	}
}
