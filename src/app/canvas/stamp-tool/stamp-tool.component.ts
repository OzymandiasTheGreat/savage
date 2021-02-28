import { Component, OnInit, OnDestroy, Input, ViewChild, ElementRef } from "@angular/core";
import { nanoid } from "nanoid/non-secure";
import { CompoundPath, Rectangle, Point, Size } from "paper";

import { Observable } from "../../types/observer";
import { SavageSVG, screen2svg, findParent } from "../../types/svg";
import { ICanvasTool, CanvasService } from "../../services/canvas.service";
import { IDocumentEvent } from "../document/document.component";
import { HistoryService } from "../../services/history.service";
import { ObjectToolComponent } from "../object-tool/object-tool.component";


@Component({
	selector: "app-stamp-tool",
	templateUrl: "./stamp-tool.component.html",
	styleUrls: ["./stamp-tool.component.scss"]
})
export class StampToolComponent implements ICanvasTool, OnInit, OnDestroy {
	name: "STAMP" = "STAMP";
	@Input() scale: number;
	@Input() document: Observable<SavageSVG>;
	@Input() scrollable: HTMLElement;
	@Input() selection: Observable<SavageSVG>[];
	get wx(): number {
		const viewBox = parseFloat(this.document.attributes.viewBox?.split(" ")[2]);
		const width = parseFloat(this.document.attributes.width || `${viewBox}`);
		return viewBox / width * 1.5 || 1.5;
	}
	get hx(): number {
		const viewBox = parseFloat(this.document.attributes.viewBox?.split(" ")[3]);
		const height = parseFloat(this.document.attributes.height || `${viewBox}`);
		return viewBox / height * 1.5 || 1.5;
	}
	@ViewChild("overlay", { static: true }) overlay: ElementRef<SVGSVGElement>;
	d: string;
	drawing: SavageSVG = null;
	cx: number;
	cy: number;

	constructor(
		public canvas: CanvasService,
		public history: HistoryService,
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
		if (this.d) {
			const ev = <PointerEvent> event.event;
			const point = screen2svg(this.overlay.nativeElement, { x: ev.pageX, y: ev.pageY });
			this.cx = point.x;
			this.cy = point.y;
			this.drawing = {
				nid: nanoid(13),
				name: "path",
				type: "element",
				value: "",
				children: <any> [],
				attributes: <any> {
					d: this.d,
					fill: "none",
					stroke: "currentColor",
					"stroke-width": `${this.wx}`,
				},
			};
		}
	}

	handleMouseMove(event: PointerEvent): void {
		if (this.d && this.drawing) {
			const path = new CompoundPath(this.d);
			const point = screen2svg(this.overlay.nativeElement, { x: event.pageX, y: event.pageY });
			const r = Math.max(Math.abs(point.x - this.cx), Math.abs(point.y - this.cy));
			const rect = new Rectangle(new Point(this.cx - r / 2, this.cy - r / 2), new Size(r, r));
			path.fitBounds(rect);
			this.drawing.attributes.d = path.pathData;
			path.remove();
		}
	}

	handleMouseUp(event: PointerEvent): void {
		if (this.d && this.drawing) {
			const parent = this.selection.length ? findParent(this.document, this.selection[0].nid) : this.document;
			if (parent) {
				const index = this.selection.length ? parent.children.indexOf(this.selection[0]) + 1 : parent.children.length;
				parent.children.splice(index, 0, <any> this.drawing);
				this.history.snapshot("Apply stamp");
			}
		}
		this.drawing = null;
	}

	handleKeyDown(event: IDocumentEvent): void {
		(<ObjectToolComponent> this.canvas.tools.OBJECT).handleKeyDown(event);
	}
}
