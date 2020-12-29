import { Injectable } from "@angular/core";

import { Observable } from "../types/observer";
import { SavageSVG } from "../types/svg";
import { IDocumentEvent } from "../canvas/document/document.component";
import { ISnapTarget, DragEvent } from "../canvas/directives/draggable.directive";


export interface ICanvasTool {
	name: string;
	multiselect: boolean;
	handleDrag: (event: IDocumentEvent) => void;
	handleClick: (event: IDocumentEvent) => void;
	handleMouseDown: (event: IDocumentEvent) => void;
	handleKeyDown: (event: IDocumentEvent) => void;
}


@Injectable({
	providedIn: "root"
})
export class CanvasService {
	registry: Record<string, SVGElement> = {};
	selection: Observable<SavageSVG>[] = [];
	tools: Record<string, ICanvasTool> = {};
	activeTool = "OBJECT";

	grid: number;
	guides: ISnapTarget[] = [];
	boundaries: { x: number, y: number, w: number, h: number };
	get snap(): ISnapTarget[] { return [
		{
			...this.boundaries,
			corner: "all",
			edge: "both",
			side: "both",
		}, {
			step: this.grid,
			corner: "all",
			edge: "both",
			side: "both",
		},
		...this.guides?.map((g) => ({
			...g,
			corner: "all",
			edge: "both",
			side: "both",
		} as ISnapTarget)),
	]; }

	constructor() { }
}
