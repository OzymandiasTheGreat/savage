import { Component, OnInit, OnDestroy, Input, ViewChild, ElementRef } from "@angular/core";
import { nanoid } from "nanoid/non-secure";
import { compose, fromDefinition, fromTransformAttribute, Matrix, applyToPoint, inverse } from "transformation-matrix";
import { parse as pointsParse, serialize as pointsSerialize } from "svg-numbers";
import { Point, Rectangle, Size } from "paper";

import { Observable, Change } from "../../types/observer";
import { SavageSVG, screen2svg, findParent, find } from "../../types/svg";
import { ICanvasTool, CanvasService } from "../../services/canvas.service";
import { HistoryService } from "../../services/history.service";
import { IDocumentEvent } from "../document/document.component";
import { DragEvent } from "../directives/draggable.directive";
import { ObjectToolComponent } from "../object-tool/object-tool.component";


@Component({
	selector: "app-line-tool",
	templateUrl: "./line-tool.component.html",
	styleUrls: ["./line-tool.component.scss"]
})
export class LineToolComponent implements ICanvasTool, OnInit, OnDestroy {
	private node: Observable<SavageSVG>;
	private mouseDownTimeout: any;
	private _points: PointArrayNotation[];
	private _pointsObserver = (changes: Change[]) => {
		for (const change of changes) {
			if (change.path[change.path.length - 1] === "points" && this.external) {
				this._points = pointsParse(this.node.attributes.points).reduce((result, val, index, array) => {
					if (index % 2 === 0) {
						result.push(array.slice(index, index + 2));
					}
					return result;
				}, []);
			}
		}
	}
	protected drawing: SavageSVG = null;
	name: "LINE" = "LINE";
	external = true;
	@Input() scale: number;
	@Input() document: Observable<SavageSVG>;
	@Input() scrollable: HTMLElement;
	@Input() set selection(value) {
		this.node?.attributes.unobserve(this._pointsObserver);
		this.node = (<Observable<SavageSVG>[]> <unknown> value).filter((n) => ["line", "polyline"].includes(n.name))[0] || null;
		if (this.node && this.node.name === "polyline") {
			this._points = pointsParse(this.node.attributes.points).reduce((result, val, index, array) => {
				if (index % 2 === 0) {
					result.push(array.slice(index, index + 2));
				}
				return result;
			}, []);
			this.node.attributes.observe(this._pointsObserver);
		} else {
			this._points = null;
		}
	}
	get selection(): Observable<SavageSVG> { return this.node; }
	get wx(): number {
		return (parseFloat(this.document.attributes.viewBox?.split(" ")[2]) || parseFloat(this.document.attributes.width)) / 350;
	}
	get hx(): number {
		return (parseFloat(this.document.attributes.viewBox?.split(" ")[3]) || parseFloat(this.document.attributes.height)) / 350;
	}
	get points(): PointArrayNotation[] { return this._points; }
	get matrix(): Matrix {
		if (this.selection?.attributes.transform) {
			return compose(fromDefinition(fromTransformAttribute(this.selection.attributes.transform)));
		}
		return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
	}
	@ViewChild("overlay", { static: true }) overlay: ElementRef<SVGSVGElement>;
	selectbox: paper.Rectangle = null;
	selectedPoints: Array<number | "start" | "end"> = [];
	poly = false;

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

	handleDblClick(event: IDocumentEvent): void {
		clearTimeout(this.mouseDownTimeout);
		this.mouseDownTimeout = null;
		if (this.poly) {
			const mEvent = <PointerEvent> event.event;
			const position = screen2svg(this.overlay.nativeElement, { x: mEvent.clientX, y: mEvent.clientY });
			const point = applyToPoint(inverse(this.matrix), position);
			if (this.points) {
				if (mEvent.shiftKey) {
					const distance = (a: PointArrayNotation, b: PointArrayNotation) => Math.sqrt(Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2));
					const distances = this.points.map((p) => distance(p, [point.x, point.y]));
					const index = distances.indexOf(Math.min(...distances));
					this.points.splice(index, 0, [point.x, point.y]);
					this.external = false;
					this.selection.attributes.points = pointsSerialize(this.points);
					this.external = true;
					this.history.snapshot("Insert point");
				} else {
					this.points.push([point.x, point.y]);
					this.external = false;
					this.selection.attributes.points = pointsSerialize(this.points);
					this.external = true;
					this.history.snapshot("Add point");
				}
			} else {
				const nid = nanoid(13);
				const node: SavageSVG = {
					nid,
					name: "polyline",
					type: "element",
					value: "",
					children: <any> [],
					attributes: <any> { points: `${position.x},${position.y}`, stroke: "currentColor" },
				};
				this.document.children.push(<any> node);
				this.canvas.selection = [find(this.document, nid)];
				this.history.snapshot("Add polyline element");
			}
		} else {
			const mEvent = <PointerEvent> event.event;
			const position = screen2svg(this.overlay.nativeElement, { x: mEvent.clientX, y: mEvent.clientY });
			if (this.drawing) {
				const parent = findParent(this.document, this.selection?.nid);
				this.drawing.attributes.x2 = `${position.x}`;
				this.drawing.attributes.y2 = `${position.y}`;
				if (parent) {
					parent.children.push(<any> this.drawing);
				} else {
					this.document.children.push(<any> this.drawing);
				}
				this.drawing = null;
				this.history.snapshot("Add line element");
			} else {
				this.drawing = {
					nid: nanoid(13),
					name: "line",
					type: "element",
					value: "",
					children: <any> [],
					attributes: <any> { x1: `${position.x}`, y1: `${position.y}`, stroke: "currentColor" },
				};
			}
		}
	}

	handleDrag(event: IDocumentEvent): void { }

	handleMouseDown(event: IDocumentEvent): void {
		const ev = <PointerEvent> event.event;
		const point = screen2svg(this.overlay.nativeElement, { x: ev.clientX, y: ev.clientY });
		this.selectbox = new Rectangle(new Point(point.x, point.y), new Size(0, 0));
		if (!this.mouseDownTimeout) {
			this.mouseDownTimeout = setTimeout(() => {
				clearTimeout(this.mouseDownTimeout);
				this.mouseDownTimeout = null;
				if (!this.selectbox) {
					if (!event.node) {
						this.canvas.selection = [];
					} else {
						this.canvas.selection = [event.node];
					}
					if (event.node !== this.node) {
						this.selectedPoints = [];
					}
				}
			}, 550);
		}
	}

	handleMouseMove(event: PointerEvent): void {
		const point = screen2svg(this.overlay.nativeElement, { x: event.clientX, y: event.clientY });
		if (this.selectbox) {
			if (this.selectbox.x <= point.x) {
				this.selectbox.size.width = point.x - this.selectbox.x;
			} else {
				this.selectbox.size.width += this.selectbox.x - point.x;
				this.selectbox.x = point.x;
			}
			if (this.selectbox.y <= point.y) {
				this.selectbox.size.height = point.y - this.selectbox.y;
			} else {
				this.selectbox.size.height += this.selectbox.y - point.y;
				this.selectbox.y = point.y;
			}
		}
		if (this.drawing) {
			this.drawing.attributes.x2 = `${point.x}`;
			this.drawing.attributes.y2 = `${point.y}`;
		}
	}

	handleMouseUp(event: PointerEvent): void {
		if (this.selectbox) {
			this.selectedPoints = [];
			if (this.points) {
				this.points.forEach((point: PointArrayNotation, index) => {
					const p = new Point(...applyToPoint(this.matrix, point));
					if (p.isInside(this.selectbox)) {
						this.selectedPoints.push(index);
					}
				});
			} else if (this.selection) {
				const start = new Point(
					...applyToPoint(this.matrix, [parseFloat(this.selection.attributes.x1), parseFloat(this.selection.attributes.y1)]));
				const end = new Point(
					...applyToPoint(this.matrix, [parseFloat(this.selection.attributes.x2), parseFloat(this.selection.attributes.y2)]));
				if (start.isInside(this.selectbox)) {
					this.selectedPoints.push("start");
				}
				if (end.isInside(this.selectbox)) {
					this.selectedPoints.push("end");
				}
			}
		}
		this.selectbox = null;
	}

	handleKeyDown(event: IDocumentEvent): void {
		(<ObjectToolComponent> this.canvas.tools.OBJECT).handleKeyDown(event);
	}

	get bbox(): DOMRect {
		const rect = this.canvas.registry[this.selection?.nid]?.getBoundingClientRect();
		if (rect) {
			const lt = screen2svg(this.overlay.nativeElement, { x: rect.x, y: rect.y });
			const rb = screen2svg(this.overlay.nativeElement, { x: rect.right, y: rect.bottom });
			return new DOMRect(lt.x, lt.y, rb.x - lt.x, rb.y - lt.y);
		}
		return new DOMRect(0, 0, 0, 0);
	}

	transformed(point: PointArrayNotation): PointObjectNotation {
		return applyToPoint(this.matrix, { x: point[0], y: point[1] });
	}

	onPointDown(index: number | "start" | "end", event: PointerEvent): void {
		event.preventDefault();
		event.stopPropagation();
		if (event.ctrlKey && event.shiftKey) {
			return;
		} else if (event.ctrlKey && !event.shiftKey && !event.altKey) {
			this.selectedPoints.splice(this.selectedPoints.indexOf(index), 1);
		} else if (event.shiftKey && !event.ctrlKey && !event.altKey) {
			this.selectedPoints.push(index);
		} else if (!event.shiftKey && !event.ctrlKey && !event.altKey) {
			this.selectedPoints = [index];
		}
		(<SVGElement> event.target).focus();
	}

	pointsMove(d: PointObjectNotation): void {
		if (this.selectedPoints.every((i) => typeof i === "number")) {
			for (const index of this.selectedPoints) {
				let point = applyToPoint(this.matrix, <PointArrayNotation> this.points[index]);
				point[0] += d.x;
				point[1] += d.y;
				point = applyToPoint(inverse(this.matrix), point);
				this.points[index][0] = point[0];
				this.points[index][1] = point[1];
			}
			this.external = false;
			this.selection.attributes.points = pointsSerialize(this.points);
			this.external = true;
		} else {
			let start: PointObjectNotation = { x: parseFloat(this.selection.attributes.x1), y: parseFloat(this.selection.attributes.y1) };
			let end: PointObjectNotation = { x: parseFloat(this.selection.attributes.x2), y: parseFloat(this.selection.attributes.y2) };
			start = applyToPoint(this.matrix, start);
			end = applyToPoint(this.matrix, end);
			if (this.selectedPoints.includes("start")) {
				start.x += d.x;
				start.y += d.y;
			}
			if (this.selectedPoints.includes("end")) {
				end.x += d.x;
				end.y += d.y;
			}
			start = applyToPoint(inverse(this.matrix), start);
			end = applyToPoint(inverse(this.matrix), end);
			this.selection.attributes.x1 = `${start.x}`;
			this.selection.attributes.y1 = `${start.y}`;
			this.selection.attributes.x2 = `${end.x}`;
			this.selection.attributes.y2 = `${end.y}`;
		}
	}

	handlePointDrag(index: number | "start" | "end", event: DragEvent): void {
		const position = screen2svg(this.overlay.nativeElement, { x: event.x, y: event.y });
		const previous = screen2svg(this.overlay.nativeElement, { x: event.prevX, y: event.prevY });
		const d = { x: position.x - previous.x, y: position.y - previous.y };
		this.pointsMove(d);
		if (event.end) {
			this.history.snapshot("Move point");
		}
	}

	onKeyDown(index: number | "start" | "end", event: KeyboardEvent): void {
		const alt = event.altKey;
		const ctrl = event.ctrlKey;
		const shift = event.shiftKey;
		switch (event.key) {
			case "ArrowLeft":
				event.preventDefault();
				event.stopPropagation();
				this.pointsMove({ x: -5 * this.wx, y: 0 });
				this.history.snapshot("Move point");
				break;
			case "ArrowRight":
				event.preventDefault();
				event.stopPropagation();
				this.pointsMove({ x: 5 * this.wx, y: 0 });
				this.history.snapshot("Move point");
				break;
			case "ArrowUp":
				event.preventDefault();
				event.stopPropagation();
				this.pointsMove({ x: 0, y: -5 * this.hx });
				this.history.snapshot("Move point");
				break;
			case "ArrowDown":
				event.preventDefault();
				event.stopPropagation();
				this.pointsMove({ x: 0, y: 5 * this.hx });
				this.history.snapshot("Move point");
				break;
			case "Delete":
				event.preventDefault();
				event.stopPropagation();
				let deleted: boolean;
				for (const i of [...this.selectedPoints].sort().reverse()) {
					if (i !== "start" && i !== "end") {
						this.points.splice(i, 1);
						deleted = true;
					}
				}
				if (deleted) {
					this.external = false;
					this.selection.attributes.points = pointsSerialize(this.points);
					this.external = true;
					this.history.snapshot("Remove point");
				}
				break;
			case "a":
				if (ctrl && !shift && !alt) {
					event.preventDefault();
					event.stopPropagation();
					this.selectedPoints = this.points.map((v, i) => i);
				}
				break;
			case "A":
				if (ctrl && shift && !alt) {
					event.preventDefault();
					event.stopPropagation();
					this.selectedPoints = [];
				}
				break;
			case "i":
				if (ctrl && !alt) {
					event.preventDefault();
					event.stopPropagation();
					const selection = [...this.selectedPoints];
					this.selectedPoints = this.points.map((v, i) => i).filter((i) => !selection.includes(i));
				}
				break;
		}
	}
}
