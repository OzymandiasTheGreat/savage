import { Injectable } from "@angular/core";

import { Observable } from "../types/observer";
import { SavageSVG } from "../types/svg";
import { IDocumentEvent } from "../canvas/document/document.component";
import { ISnapTarget } from "../canvas/directives/draggable.directive";


export interface ICanvasTool {
	name: string;
	handleDrag: (event: IDocumentEvent) => void;
	handleClick: (event: IDocumentEvent) => void;
	handleDblClick: (event: IDocumentEvent) => void;
	handleMouseDown: (event: IDocumentEvent) => void;
	handleMouseMove: (event: MouseEvent) => void;
	handleMouseUp: (event: MouseEvent) => void;
	handleKeyDown: (event: IDocumentEvent) => void;
}


@Injectable({
	providedIn: "root"
})
export class CanvasService {
	registry: Record<string, SVGSVGElement> = {};
	selection: Observable<SavageSVG>[] = [];
	tools: Record<string, ICanvasTool> = {};
	activeTool = null;

	grid: { enabled: boolean, step: number } = { enabled: false, step: 50 };
	guides: ISnapTarget[] = [];
	boundaries: { x: number, y: number, width: number, height: number };
	snapping: boolean;
	get snap(): ISnapTarget[] {
		const targets: ISnapTarget[] = [];
		if (this.snapping) {
			targets.push({ ...this.boundaries, corner: "all" });
			if (this.grid.enabled) {
				targets.push({ step: this.grid.step, gravity: this.grid.step / 4, corner: "all" });
			}
			targets.concat(this.guides.map((g) => ({ ...g, corner: "all" })));
		}
		return targets;
	}

	constructor() { }
}
