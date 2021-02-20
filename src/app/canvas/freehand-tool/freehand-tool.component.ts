import { Component, OnInit, OnDestroy, Input, ViewChild, ElementRef } from "@angular/core";
import { nanoid } from "nanoid/non-secure";
import { Path, Point } from "paper";

import { Observable } from "../../types/observer";
import { SavageSVG, screen2svg, findParent, CONTAINER_RENDER } from "../../types/svg";
import { ICanvasTool, CanvasService } from "../../services/canvas.service";
import { HistoryService } from "../../services/history.service";
import { IDocumentEvent } from "../document/document.component";


@Component({
	selector: "app-freehand-tool",
	templateUrl: "./freehand-tool.component.html",
	styleUrls: ["./freehand-tool.component.scss"]
})
export class FreehandToolComponent implements ICanvasTool, OnInit, OnDestroy {
	private path: paper.Path = null;
	public drawing: SavageSVG = null;
	name: "FREEHAND" = "FREEHAND";
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
	simplify = 2.5;
	smooth: { type: "continuous" | "catmull-rom" | "geometric", factor?: number } = null;

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

	handleClick(event: IDocumentEvent): void { }

	handleDblClick(event: IDocumentEvent): void { }

	handleDrag(event: IDocumentEvent): void { }

	handleMouseDown(event: IDocumentEvent): void {
		const ev: PointerEvent = <PointerEvent> event.event;
		const point = screen2svg(this.overlay.nativeElement, { x: ev.clientX, y: ev.clientY });
		this.path = new Path();
		this.path.add(new Point(point.x, point.y));
		this.drawing = {
			nid: nanoid(13),
			name: "path",
			type: "element",
			value: "",
			children: <any> [],
			attributes: <any> {
				d: this.path.pathData,
				fill: "none",
				stroke: "currentColor",
				"stroke-width": `${this.wx}`,
			},
		};
	}

	handleMouseMove(event: PointerEvent): void {
		if (this.path && this.drawing) {
			const point = screen2svg(this.overlay.nativeElement, { x: event.clientX, y: event.clientY });
			this.path.add(new Point(point.x, point.y));
			this.drawing.attributes.d = this.path.pathData;
		}
	}

	handleMouseUp(event: PointerEvent): void {
		if (this.path && this.drawing) {
			this.path.simplify(this.simplify);
			if (this.smooth) {
				this.path.smooth(this.smooth);
			}
			this.drawing.attributes.d = this.path.pathData;
			if (this.selection.length) {
				if (CONTAINER_RENDER.includes(this.selection[0].name)) {
					this.selection[0].children.push(<any> this.drawing);
				} else {
					const parent = findParent(this.document, this.selection[0].nid);
					parent.children.push(<any> this.drawing);
				}
			} else {
				this.document.children.push(<any> this.drawing);
			}
		}
		this.path = null;
		this.drawing = null;
	}

	handleKeyDown(event: IDocumentEvent): void { }
}
