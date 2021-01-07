import { Component, OnInit } from "@angular/core";

import { Observable } from "../../types/observer";
import { SavageSVG } from "../../types/svg";
import { SvgFileService } from "../../services/svg-file.service";
import { CanvasService } from "../../services/canvas.service";




@Component({
	selector: "app-sidebar",
	templateUrl: "./sidebar.component.html",
	styleUrls: ["./sidebar.component.scss"]
})
export class SidebarComponent implements OnInit {
	constructor(
		public file: SvgFileService,
		public canvas: CanvasService,
	) { }

	ngOnInit(): void { }
}
