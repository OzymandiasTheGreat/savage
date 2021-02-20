import { Component, OnInit, OnDestroy, Input, ViewChild, ElementRef } from "@angular/core";
import { nanoid } from "nanoid/non-secure";
import { compose, fromDefinition, fromTransformAttribute, applyToPoint } from "transformation-matrix";
import partialCircle from "svg-partial-circle";

import { Observable } from "../../types/observer";
import { findParent, SavageSVG, screen2svg } from "../../types/svg";
import { ICanvasTool, CanvasService } from "../../services/canvas.service";
import { HistoryService } from "../../services/history.service";
import { IDocumentEvent } from "../document/document.component";
import { DragEvent } from "../directives/draggable.directive";
import { ObjectToolComponent } from "../object-tool/object-tool.component";


export interface SavageArc {
	cx: number;
	cy: number;
	r: number;
	start: number;
	startX: number;
	startY: number;
	end: number;
	endX: number;
	endY: number;
}


@Component({
	selector: "app-circle-tool",
	templateUrl: "./circle-tool.component.html",
	styleUrls: ["./circle-tool.component.scss"]
})
export class CircleToolComponent implements ICanvasTool, OnInit, OnDestroy {
	private node: Observable<SavageSVG>;
	private draw: boolean;
	protected drawing: SavageSVG;
	name: "CIRCLE" = "CIRCLE";
	@Input() scale: number;
	@Input() document: Observable<SavageSVG>;
	@Input() scrollable: HTMLElement;
	@Input() set selection(value) {
		this.node = (<Observable<SavageSVG>[]> <unknown> value)
			.filter((n) => ["circle", "ellipse"].includes(n.name) || (n.name === "path" && !!n.attributes["data-savage-arc"]))[0] || null;
	}
	get selection(): Observable<SavageSVG> { return this.node; }
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
	get arc(): SavageArc {
		if (this.drawing) {
			if (this.drawing.attributes["data-savage-arc"]) {
				const arc = JSON.parse(this.drawing.attributes["data-savage-arc"]);
				const startX = arc.cx + arc.r * Math.cos(arc.start);
				const startY = arc.cy + arc.r * Math.sin(arc.start);
				const endX = arc.cx + arc.r * Math.cos(arc.end);
				const endY = arc.cy + arc.r * Math.sin(arc.end);
				return { ...arc, startX, startY, endX, endY };
			} else {
				return null;
			}
		} else {
			if (this.selection.attributes["data-savage-arc"]) {
				const arc = JSON.parse(this.selection.attributes["data-savage-arc"]);
				const startX = arc.cx + arc.r * Math.cos(arc.start);
				const startY = arc.cy + arc.r * Math.sin(arc.start);
				const endX = arc.cx + arc.r * Math.cos(arc.end);
				const endY = arc.cy + arc.r * Math.sin(arc.end);
				return { ...arc, startX, startY, endX, endY };
			} else {
				return null;
			}
		}
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
		if (["circle", "ellipse"].includes(event.node?.name) || (event.node?.name === "path" && !!event.node?.attributes["data-savage-arc"])) {
			this.canvas.selection = [event.node];
		} else {
			this.canvas.selection = [];
		}
	}

	handleMouseMove(event: PointerEvent): void {
		if (this.draw) {
			const xy = screen2svg(this.overlay.nativeElement, { x: event.clientX, y: event.clientY });
			if (this.drawing) {
				const cx = parseFloat(this.drawing.attributes.cx);
				const cy = parseFloat(this.drawing.attributes.cy);
				let dx: number;
				let dy: number;
				let d: number;
				switch (this.drawing.name) {
					case "path":
						const arc = JSON.parse(this.drawing.attributes["data-savage-arc"]);
						dx = xy.x - arc.cx;
						dy = xy.y - arc.cy;
						d = Math.max(Math.abs(dx), Math.abs(dy));
						const angle = Math.atan2(xy.y - arc.cy, xy.x - arc.cx);
						arc.r = d;
						arc.start = angle;
						arc.end = angle + 1.57;
						this.drawing.attributes.d = partialCircle(arc.cx, arc.cy, arc.r, arc.start, arc.end).map((c) => c.join(" ")).join(" ");
						this.drawing.attributes["data-savage-arc"] = JSON.stringify(arc);
						break;
					case "circle":
						dx = xy.x - cx;
						dy = xy.y - cy;
						d = Math.max(Math.abs(dx), Math.abs(dy));
						this.drawing.attributes.r = `${d}`;
						break;
					case "ellipse":
						dx = Math.abs(xy.x - cx);
						dy = Math.abs(xy.y - cy);
						this.drawing.attributes.rx = `${dx}`;
						this.drawing.attributes.ry = `${dy}`;
						break;
				}
			} else {
				let name: string;
				if (event.ctrlKey && !event.shiftKey && !event.altKey) {
					name = "circle";
				} else if (event.shiftKey && !event.ctrlKey && !event.altKey) {
					name = "path";
				} else if (!event.ctrlKey && !event.shiftKey && !event.altKey) {
					name = "ellipse";
				} else {
					return;
				}
				let attributes: Record<string, string>;
				switch (name) {
					case "circle":
						attributes = { cx: `${xy.x}`, cy: `${xy.y}`, r: "1", fill: "currentColor" };
						break;
					case "ellipse":
						attributes = { cx: `${xy.x}`, cy: `${xy.y}`, rx: "1", ry: "1", fill: "currentColor" };
						break;
					case "path":
						let arc = partialCircle(xy.x, xy.y, 1, 1.57, 1.57 * 2);
						arc = [["M", xy.x, xy.y], arc[0].map((f) => f === "M" ? "L" : f), arc[1]].map((c) => c.join(" ")).join(" ");
						attributes = {
							d: `${arc}`,
							"data-savage-arc": JSON.stringify({
								cx: xy.x,
								cy: xy.y,
								r: 1,
								start: 1.57,
								end: 1.57 * 2,
								fill: "currentColor",
							}),
						};
						break;
				}
				this.drawing = {
					nid: nanoid(13),
					name,
					type: "element",
					value: "",
					attributes: <any> attributes,
					children: <any> [],
				};
			}
		}
	}

	handleMouseUp(event: PointerEvent): void {
		this.draw = false;
		if (this.drawing) {
			const parent = this.selection ? findParent(this.document, this.selection.nid) : this.document;
			if (parent) {
				const index = this.selection ? parent.children.indexOf(this.selection) + 1 : parent.children.length;
				parent.children.splice(index, 0, <any> this.drawing);
				this.history.snapshot("Add element");
			}
		}
		this.drawing = null;
	}

	handleKeyDown(event: IDocumentEvent): void { }

	get bbox(): DOMRect {
		// const rect = this.canvas.registry[this.selection?.nid]?.getBBox();
		const rect = this.canvas.registry[this.selection?.nid]?.getBoundingClientRect();
		if (rect) {
			// const transform = this.selection.attributes.transform;
			// const matrix = transform
			// 	? compose(fromDefinition(fromTransformAttribute(transform)))
			// 	: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
			// const lt = applyToPoint(matrix, { x: rect.x, y: rect.y });
			const lt = screen2svg(this.overlay.nativeElement, { x: rect.x, y: rect.y });
			const rb = screen2svg(this.overlay.nativeElement, { x: rect.right, y: rect.bottom });
			// return new DOMRect(lt.x, lt.y, rect.width, rect.height);
			return new DOMRect(lt.x, lt.y, rb.x - lt.x, rb.y - lt.y);
		}
		return new DOMRect(0, 0, 0, 0);
	}

	transformed(x: number, y: number): { x: number, y: number } {
		if (this.selection.attributes.transform) {
			const matrix = compose(fromDefinition(fromTransformAttribute(this.selection.attributes.transform)));
			return applyToPoint(matrix, { x, y });
		}
		return { x, y };
	}

	parseAttr(attr: string): number {
		return parseFloat(attr);
	}

	move(event: DragEvent): void {
		const position = screen2svg(this.overlay.nativeElement, { x: event.x, y: event.y });
		const previous = screen2svg(this.overlay.nativeElement, { x: event.prevX, y: event.prevY });
		const d = { x: position.x - previous.x, y: position.y - previous.y };
		(<ObjectToolComponent> this.canvas.tools.OBJECT).moveNodeApplied(this.selection, d);
		if (this.arc) {
			const arc: Omit<SavageArc, "startX" | "startY" | "endX" | "endY"> = {
				cx: this.arc.cx + d.x,
				cy: this.arc.cy + d.y,
				r: this.arc.r,
				start: this.arc.start,
				end: this.arc.end,
			};
			this.selection.attributes["data-savage-arc"] = JSON.stringify(arc);
		}
		if (event.end) {
			this.history.snapshot("Move (translate) element");
		}
	}

	radius(axis: "r" | "rx" | "ry", event: DragEvent): void {
		const position = screen2svg(this.overlay.nativeElement, { x: event.x, y: event.y });
		const previous = screen2svg(this.overlay.nativeElement, { x: event.prevX, y: event.prevY });
		const d: any = { rx: position.x - previous.x, ry: position.y - previous.y };
		d.r = Math.abs(d.rx) > Math.abs(d.ry) ? d.rx : d.ry;
		if (d[axis]) {
			if (this.arc) {
				const arc = {...this.arc};
				arc.r = arc.r + d.r;
				delete arc.startX;
				delete arc.startY;
				delete arc.endX;
				delete arc.endY;
				this.selection.attributes.d = partialCircle(arc.cx, arc.cy, arc.r, arc.start, arc.end).map((c) => c.join(" ")).join(" ");
				this.selection.attributes["data-savage-arc"] = JSON.stringify(arc);
			} else {
				this.selection.attributes[axis] = parseFloat(this.selection.attributes[axis]) + d[axis];
			}
		}
		if (event.end) {
			this.history.snapshot("Scale element");
		}
	}

	changeArc(end: "start" | "end", event: DragEvent): void {
		const position = screen2svg(this.overlay.nativeElement, { x: event.x, y: event.y });
		const angle = Math.atan2(position.y - this.arc.cy, position.x - this.arc.cx);
		const arc = {...this.arc};
		delete arc.startX;
		delete arc.startY;
		delete arc.endX;
		delete arc.endY;
		arc[end] = angle;
		this.selection.attributes.d = partialCircle(arc.cx, arc.cy, arc.r, arc.start, arc.end).map((c) => c.join(" ")).join(" ");
		this.selection.attributes["data-savage-arc"] = JSON.stringify(arc);
	}
}
