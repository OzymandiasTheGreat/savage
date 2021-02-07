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
	get regularPolygon(): boolean { return (<any> this.canvas.tools.POLYGON)?.regular || true; }
	set regularPolygon(val: boolean) {
		if (this.canvas.tools.POLYGON) {
			(<any> this.canvas.tools.POLYGON).regular = val;
		}
	}
	get polygonSides(): number { return (<any> this.canvas.tools.POLYGON).sides || 5; }
	set polygonSides(val: number) {
		if (this.canvas.tools.POLYGON) {
			(<any> this.canvas.tools.POLYGON).sides = val;
		}
	}
	get polyline(): boolean { return (<any> this.canvas.tools.LINE).poly; }
	set polyline(val: boolean) {
		if (this.canvas.tools.LINE) {
			(<any> this.canvas.tools.LINE).poly = val;
		}
	}
	get freehandSimplify(): number { return (<any> this.canvas.tools.FREEHAND).simplify; }
	set freehandSimplify(val: number) {
		if (this.canvas.tools.FREEHAND) {
			(<any> this.canvas.tools.FREEHAND).simplify = val;
		}
	}
	get freehandSmooth(): { type: "continuous" | "catmull-rom" | "geometric", factor?: number } {
		return (<any> this.canvas.tools.FREEHAND).smooth;
	}
	set freehandSmooth(val: { type: "continuous" | "catmull-rom" | "geometric", factor?: number }) {
		if (this.canvas.tools.FREEHAND) {
			(<any> this.canvas.tools.FREEHAND).smooth = val;
		}
	}
	get gradientRadial(): boolean { return (<any> this.canvas.tools.GRADIENT).radial; }
	set gradientRadial(val: boolean) {
		if (this.canvas.tools.GRADIENT) {
			(<any> this.canvas.tools.GRADIENT).radial = val;
		}
	}
	get gradientStroke(): boolean { return (<any> this.canvas.tools.GRADIENT).stroke; }
	set gradientStroke(val: boolean) {
		if (this.canvas.tools.GRADIENT) {
			(<any> this.canvas.tools.GRADIENT).stroke = val;
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
