import { Component, OnInit } from "@angular/core";

import { CanvasService } from "../../services/canvas.service";


@Component({
	selector: "app-toolbar",
	templateUrl: "./toolbar.component.html",
	styleUrls: ["./toolbar.component.scss"]
})
export class ToolbarComponent implements OnInit {
	get applyMatrix(): boolean { return (<any> this.canvas.tools.OBJECT)?.applyTransform || true; }
	set applyMatrix(val: boolean) {
		if (this.canvas.tools.OBJECT) {
			(<any> this.canvas.tools.OBJECT).applyTransform = val;
		}
	}

	constructor(
		public canvas: CanvasService,
	) { }

	ngOnInit(): void { }

	setTool(value: string): void {
		this.canvas.activeTool = value;
	}
}
