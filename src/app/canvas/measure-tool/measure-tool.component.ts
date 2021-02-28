import { Component, OnInit, OnDestroy, Input, ViewChild, ElementRef } from "@angular/core";

import { Observable } from "../../types/observer";
import { SavageSVG, screen2svg } from "../../types/svg";
import { ICanvasTool, CanvasService } from "../../services/canvas.service";
import { IDocumentEvent } from "../document/document.component";
import { ObjectToolComponent } from "../object-tool/object-tool.component";


@Component({
	selector: "app-measure-tool",
	templateUrl: "./measure-tool.component.html",
	styleUrls: ["./measure-tool.component.scss"]
})
export class MeasureToolComponent implements ICanvasTool, OnInit, OnDestroy {
	name: "MEASURE" = "MEASURE";
	@Input() scale: number;
	@Input() document: Observable<SavageSVG>;
	@Input() scrollable: HTMLElement;
	@Input() selection: Observable<SavageSVG>[];
	get wx(): number {
		const viewBox = parseFloat(this.document.attributes.viewBox?.split(" ")[2]);
		const width = parseFloat(this.document.attributes.width || `${viewBox}`);
		return width / viewBox || 1.5;
	}
	get hx(): number {
		const viewBox = parseFloat(this.document.attributes.viewBox?.split(" ")[3]);
		const height = parseFloat(this.document.attributes.height || `${viewBox}`);
		return height / viewBox || 1.5;
	}
	@ViewChild("overlay", { static: true }) overlay: ElementRef<SVGSVGElement>;
	draw: boolean;
	drawing: { top: number, left: number, bottom: number, right: number, dist: string } = null;
	initX = 0;
	initY = 0;

	constructor(
		public canvas: CanvasService,
	) {
		this.canvas.tools[this.name] = this;
	}

	ngOnInit(): void { }

	ngOnDestroy(): void {
		delete this.canvas.tools[this.name];
	}

	handleDrag(event: IDocumentEvent): void { }

	handleClick(event: IDocumentEvent): void { }

	handleDblClick(event: IDocumentEvent): void { }

	handleMouseDown(event: IDocumentEvent): void {
		const ev = <PointerEvent> event.event;
		const point = screen2svg(this.overlay.nativeElement, { x: ev.pageX, y: ev.pageY });
		this.initX = point.x;
		this.initY = point.y;
		this.drawing = null;
		this.draw = true;
	}

	handleMouseMove(event: PointerEvent): void {
		if (this.draw) {
			const point = screen2svg(this.overlay.nativeElement, { x: event.pageX, y: event.pageY });
			const top = Math.min(this.initY, point.y);
			const left = Math.min(this.initX, point.x);
			const bottom = Math.max(this.initY, point.y);
			const right = Math.max(this.initX, point.x);
			const dist = Math.hypot(right - left, bottom - top).toFixed(2);
			this.drawing = { top, left, bottom, right, dist };
		}
	}

	handleMouseUp(event: PointerEvent): void {
		this.draw = false;
	}

	handleKeyDown(event: IDocumentEvent): void {
		(<ObjectToolComponent> this.canvas.tools.OBJECT).handleKeyDown(event);
	}
}
