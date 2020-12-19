import { Component, OnInit } from "@angular/core";
import { FormControl } from "@angular/forms";

import { SvgFileService } from "../../services/svg-file.service";


@Component({
	selector: "app-drawer",
	templateUrl: "./drawer.component.html",
	styleUrls: ["./drawer.component.scss"]
})
export class DrawerComponent implements OnInit {
	openControl: FormControl;

	constructor(
		public file: SvgFileService,
	) {
		this.openControl = new FormControl("");
	}

	ngOnInit(): void {
		this.openControl.valueChanges.subscribe((file) => {
			this.file.openUploadSVG(file);
		});
	}
}
