import { Injectable } from "@angular/core";
import { SnapPosition } from "@interactjs/modifiers/snap/pointer";

import { Observable } from "../types/observer";
import { SavageSVG } from "../types/svg";
import { IDocumentEvent } from "../canvas/document/document.component";


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
	scale = 1;

	grid: {
		enabled: boolean,
		step: number,
		limits: { top: number, left: number, bottom: number, right: number }
	} = {
		enabled: false,
		step: 50,
		limits: { top: 0, left: 0, bottom: 50, right: 50 },
	};
	guides: SnapPosition[] = [];
	snapping: boolean;

	constructor() { }
}
