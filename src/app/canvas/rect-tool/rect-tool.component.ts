import { Component, OnInit, OnDestroy, Input, ViewChild, ElementRef } from "@angular/core";
import { nanoid } from "nanoid/non-secure";

import { Observable } from "../../types/observer";
import { SavageSVG, findParent, screen2svg } from "../../types/svg";
import { ICanvasTool, CanvasService } from "../../services/canvas.service";
import { HistoryService } from "../../services/history.service";
import { IDocumentEvent } from "../document/document.component";
import { DragEvent } from "../directives/draggable.directive";
import { ObjectToolComponent } from "../object-tool/object-tool.component";


@Component({
	selector: "app-rect-tool",
	templateUrl: "./rect-tool.component.html",
	styleUrls: ["./rect-tool.component.scss"]
})
export class RectToolComponent implements ICanvasTool, OnInit, OnDestroy {
	private rect: Observable<SavageSVG>;
	private draw: boolean;
	protected drawing: SavageSVG;
	name: "RECT" = "RECT";
	@Input() scale: number;
	@Input() document: Observable<SavageSVG>;
	@Input() scrollable: HTMLElement;
	@Input() set selection(value) {
		this.rect = (<Observable<SavageSVG>[]> <unknown> value).filter((s) => s.name === "rect")[0] || null;
	}
	get selection(): Observable<SavageSVG> { return this.rect; }
	get wx(): number {
		return (parseFloat(this.document.attributes.viewBox?.split(" ")[2]) || parseFloat(this.document.attributes.width)) / 350;
	}
	get hx(): number {
		return (parseFloat(this.document.attributes.viewBox?.split(" ")[3]) || parseFloat(this.document.attributes.height)) / 350;
	}
	get rx(): number {
		return parseFloat(this.selection.attributes.rx) || parseFloat(this.selection.attributes.ry) || 0;
	}
	get ry(): number {
		return parseFloat(this.selection.attributes.ry) || parseFloat(this.selection.attributes.rx) || 0;
	}
	@ViewChild("overlay", { static: true }) overlay: ElementRef<SVGSVGElement>;

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
		this.draw = true;
		if (event.node?.name === "rect") {
			this.canvas.selection = [event.node];
		}
	}

	handleMouseMove(event: PointerEvent): void {
		if (this.draw) {
			const xy = screen2svg(this.overlay.nativeElement, { x: event.clientX, y: event.clientY });
			if (this.drawing) {
				const tl = { x: parseFloat(this.drawing.attributes.x), y: parseFloat(this.drawing.attributes.y) };
				if (event.ctrlKey) {
					const maxXY = Math.abs(xy.x) > Math.abs(xy.y) ? xy.x : xy.y;
					const maxTL = Math.abs(tl.x) > Math.abs(tl.y) ? tl.x : tl.y;
					const side = Math.max(parseFloat(this.drawing.attributes.width), parseFloat(this.drawing.attributes.height));
					if (maxXY > tl.x) {
						this.drawing.attributes.width = `${maxXY - maxTL}`;
					} else {
						const width = tl.x - maxXY + side;
						this.drawing.attributes.width = `${width}`;
						this.drawing.attributes.x = `${maxXY}`;
					}
					if (maxXY > tl.y) {
						this.drawing.attributes.height = `${maxXY - maxTL}`;
					} else {
						const height = tl.y - maxXY + side;
						this.drawing.attributes.height = `${height}`;
						this.drawing.attributes.y = `${maxXY}`;
					}
				} else {
					if (xy.x > tl.x) {
						this.drawing.attributes.width = `${xy.x - tl.x}`;
					} else {
						const width = tl.x - xy.x + parseFloat(this.drawing.attributes.width);
						this.drawing.attributes.width = `${width}`;
						this.drawing.attributes.x = `${xy.x}`;
					}
					if (xy.y > tl.y) {
						this.drawing.attributes.height = `${xy.y - tl.y}`;
					} else {
						const height = tl.y - xy.y + parseFloat(this.drawing.attributes.height);
						this.drawing.attributes.height = `${height}`;
						this.drawing.attributes.y = `${xy.y}`;
					}
				}
			} else {
				this.drawing = {
					nid: nanoid(13),
					name: "rect",
					type: "element",
					value: "",
					attributes: <any> { x: `${xy.x}`, y: `${xy.y}`, width: "1", height: "1" },
					children: <any> [],
				};
			}
		}
	}

	handleMouseUp(event: PointerEvent): void {
		this.draw = false;
		if (this.drawing) {
			const parent = this.selection ? findParent(this.document, this.selection.nid) : this.document;
			const index = this.selection ? parent.children.indexOf(this.selection) + 1 : parent.children.length;
			parent.children.splice(index, 0, <any> this.drawing);
			this.history.snapshot("Add element");
		}
		this.drawing = null;
	}

	handleKeyDown(event: IDocumentEvent): void {
		(<ObjectToolComponent> this.canvas.tools.OBJECT).handleKeyDown(event);
	}

	get bbox(): DOMRect {
		const rect = this.canvas.registry[this.selection?.nid]?.getBoundingClientRect();
		if (rect) {
			const lt = screen2svg(this.overlay.nativeElement, { x: rect.left, y: rect.top });
			const rb = screen2svg(this.overlay.nativeElement, { x: rect.right, y: rect.bottom });
			return new DOMRect(lt.x, lt.y, rb.x - lt.x, rb.y - lt.y);
		}
		return new DOMRect(0, 0, 0, 0);
	}

	scaleSelection(corner: "topLeft" | "topRight" | "bottomRight" | "bottomLeft", event: DragEvent): void {
		const position = screen2svg(this.overlay.nativeElement, { x: event.x, y: event.y });
		const previous = screen2svg(this.overlay.nativeElement, { x: event.prevX, y: event.prevY });
		const d = { x: position.x - previous.x, y: position.y - previous.y };
		(<ObjectToolComponent> this.canvas.tools.OBJECT).scaleNodeApplied(this.selection, corner, d, this.bbox);
		if (event.end) {
			this.history.snapshot("Scale element");
		}
	}

	radius(axis: "rx" | "ry", event: DragEvent): void {
		const position = screen2svg(this.overlay.nativeElement, { x: event.x, y: event.y });
		const previous = screen2svg(this.overlay.nativeElement, { x: event.prevX, y: event.prevY });
		const d = { rx: previous.x - position.x, ry: position.y - previous.y};
		if (d[axis]) {
			this.selection.attributes[axis] = `${this[axis] + d[axis]}`;
		}
		if (event.end) {
			this.history.snapshot("Change corner radius");
		}
	}

	move(event: DragEvent): void {
		const position = screen2svg(this.overlay.nativeElement, { x: event.x, y: event.y });
		const previous = screen2svg(this.overlay.nativeElement, { x: event.prevX, y: event.prevY });
		const d = { x: position.x - previous.x, y: position.y - previous.y };
		(<ObjectToolComponent> this.canvas.tools.OBJECT).moveNodeApplied(this.selection, d);
		if (event.end) {
			this.history.snapshot("Move (translate) element");
		}
	}
}
