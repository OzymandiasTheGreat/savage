import { Component, OnInit, OnDestroy, Input, ViewChild, ElementRef } from "@angular/core";
import { nanoid } from "nanoid/non-secure";
import { compose, fromDefinition, fromTransformAttribute, Matrix, applyToPoint, inverse } from "transformation-matrix";
import { Path, Point, Rectangle, Size } from "paper";
import { parse as pointsParse, serialize as pointsSerialize } from "svg-numbers";
import { DragEvent } from "@interactjs/types/index";

import { Change, Observable } from "../../types/observer";
import { SavageSVG, screen2svg, findParent, find } from "../../types/svg";
import { ICanvasTool, CanvasService } from "../../services/canvas.service";
import { HistoryService } from "../../services/history.service";
import { IDocumentEvent } from "../document/document.component";
import { ObjectToolComponent } from "../object-tool/object-tool.component";


export interface SavagePolygon {
	star: boolean;
	sides: number;
	cx: number;
	cy: number;
	r1: number;
	r2: number;
}


@Component({
	selector: "app-polygon-tool",
	templateUrl: "./polygon-tool.component.html",
	styleUrls: ["./polygon-tool.component.scss"]
})
export class PolygonToolComponent implements ICanvasTool, OnInit, OnDestroy {
	private node: Observable<SavageSVG>;
	private draw: boolean;
	protected drawing: SavageSVG;
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
	name: "POLYGON" = "POLYGON";
	external = true;
	@Input() scale: number;
	@Input() document: Observable<SavageSVG>;
	@Input() scrollable: HTMLElement;
	@Input() set selection(value) {
		this.node?.attributes.unobserve(this._pointsObserver);
		this.node = (<Observable<SavageSVG>[]> <unknown> value).filter((n) => n.name === "polygon")[0] || null;
		if (this.node) {
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
		const viewBox = parseFloat(this.document.attributes.viewBox?.split(" ")[2]);
		const width = parseFloat(this.document.attributes.width || `${viewBox}`);
		return width / viewBox || 1.5;
	}
	get hx(): number {
		const viewBox = parseFloat(this.document.attributes.viewBox?.split(" ")[3]);
		const height = parseFloat(this.document.attributes.height || `${viewBox}`);
		return height / viewBox || 1.5;
	}
	get poly(): SavagePolygon {
		if (this.selection?.attributes["data-savage-polygon"]) {
			return JSON.parse(this.selection.attributes["data-savage-polygon"]);
		}
		return null;
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
	selectedPoints: number[] = [];
	regular = true;
	sides = 5;

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
		if (!this.regular) {
			const mEvent = <PointerEvent> event.event;
			const position = screen2svg(this.overlay.nativeElement, { x: mEvent.pageX, y: mEvent.pageY });
			const point = applyToPoint(inverse(this.matrix), position);
			if (this.points) {
				delete this.selection?.attributes["data-savage-polygon"];
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
					name: "polygon",
					type: "element",
					value: "",
					children: <any> [],
					attributes: <any> { points: `${position.x},${position.y}`, fill: "currentColor" },
				};
				this.document.children.push(<any> node);
				this.canvas.selection = [find(this.document, nid)];
				this.history.snapshot("Add polygon element");
			}
		}
	}

	handleDrag(event: IDocumentEvent): void { }

	handleMouseDown(event: IDocumentEvent): void {
		if (this.regular) {
			this.draw = true;
			if (event.node?.name === "polygon") {
				this.canvas.selection = [event.node];
			} else {
				this.canvas.selection = [];
			}
		} else {
			const ev = <PointerEvent> event.event;
			const point = screen2svg(this.overlay.nativeElement, { x: ev.pageX, y: ev.pageY });
			this.selectbox = new Rectangle(new Point(point.x, point.y), new Size(0, 0));
			if (!this.mouseDownTimeout) {
				this.mouseDownTimeout = setTimeout(() => {
					clearTimeout(this.mouseDownTimeout);
					this.mouseDownTimeout = null;
					if (!this.selectbox) {
						if (!event.node || event.node.name !== "polygon") {
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
	}

	handleMouseMove(event: PointerEvent): void {
		if (this.regular && this.draw) {
			const xy = screen2svg(this.overlay.nativeElement, { x: event.pageX, y: event.pageY });
			if (this.drawing) {
				const poly: SavagePolygon = JSON.parse(this.drawing.attributes["data-savage-polygon"]);
				const d = { x: xy.x - poly.cx, y: xy.y - poly.cy };
				const rd = Math.abs(d.x) > Math.abs(d.y) ? d.x : d.y;
				poly.r1 = rd;
				if (poly.r2 !== null) {
					poly.r2 = rd / 2;
				}
				let path: paper.Path;
				if (poly.star) {
					path = new Path.Star(new Point(poly.cx, poly.cy), poly.sides, poly.r1, poly.r2);
				} else {
					path = new Path.RegularPolygon(new Point(poly.cx, poly.cy), poly.sides, poly.r1);
				}
				this.drawing.attributes.points = pointsSerialize(path.segments.map((s) => [s.point.x, s.point.y]));
				this.drawing.attributes["data-savage-polygon"] = JSON.stringify(poly);
				path.remove();
			} else {
				let path: paper.Path;
				let poly: SavagePolygon;
				if (event.ctrlKey && !event.shiftKey && !event.altKey) {
					path = new Path.Star(new Point(xy.x, xy.y), this.sides, 2.5, 5);
					poly = { star: true, cx: xy.x, cy: xy.y, sides: this.sides, r1: 5, r2: 2.5 };
				} else if (!event.ctrlKey && !event.shiftKey && !event.altKey) {
					path = new Path.RegularPolygon(new Point(xy.x, xy.y), this.sides, 5);
					poly = { star: false, cx: xy.x, cy: xy.y, sides: this.sides, r1: 5, r2: null };
				}
				if (path) {
					this.drawing = {
						nid: nanoid(13),
						name: "polygon",
						type: "element",
						value: "",
						attributes: <any> {
							points: pointsSerialize(path.segments.map((s) => [s.point.x, s.point.y])),
							fill: "currentColor",
							"data-savage-polygon": JSON.stringify(poly),
						},
						children: <any> [],
					};
					path.remove();
				}
			}
		} else if (this.selectbox) {
			const point = screen2svg(this.overlay.nativeElement, { x: event.pageX, y: event.pageY });
			if (this.selectbox.x < point.x) {
				this.selectbox.size.width = point.x - this.selectbox.x;
			} else {
				this.selectbox.size.width += this.selectbox.x - point.x;
				this.selectbox.x = point.x;
			}
			if (this.selectbox.y < point.y) {
				this.selectbox.size.height = point.y - this.selectbox.y;
			} else {
				this.selectbox.size.height += this.selectbox.y - point.y;
				this.selectbox.y = point.y;
			}
		}
	}

	handleMouseUp(event: PointerEvent): void {
		this.draw = false;
		if (this.regular && this.drawing) {
			const parent = this.selection ? findParent(this.document, this.selection.nid) : this.document;
			if (parent) {
				const index = this.selection ? parent.children.indexOf(this.selection) + 1 : parent.children.length;
				parent.children.splice(index, 0, <any> this.drawing);
				this.history.snapshot("Add element");
			}
		} else if (this.selectbox) {
			this.selectedPoints = [];
			if (this.points) {
				this.points.forEach((point: PointArrayNotation, index) => {
					const p = new Point(...applyToPoint(this.matrix, point));
					if (p.isInside(this.selectbox)) {
						this.selectedPoints.push(index);
					}
				});
			}
		}
		this.drawing = null;
		this.selectbox = null;
	}

	handleKeyDown(event: IDocumentEvent): void {
		(<ObjectToolComponent> this.canvas.tools.OBJECT).handleKeyDown(event);
	}

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

	transformed(point: [number, number]): { x: number, y: number } {
		return applyToPoint(this.matrix, { x: point[0], y: point[1] });
	}

	move(event: DragEvent): void {
		(<ObjectToolComponent> this.canvas.tools.OBJECT).moveNodeApplied(this.selection, event.delta);
		if (this.poly) {
			const poly = {...this.poly};
			poly.cx += event.dx;
			poly.cy += event.dy;
			this.selection.attributes["data-savage-polygon"] = JSON.stringify(poly);
		}
		if (event.type === "dragend") {
			this.history.snapshot("Move (translate) element");
		}
	}

	radius(radius: "r1" | "r2", event: DragEvent): void {
		const poly = {...this.poly};
		poly[radius] += event.dx;
		let path: paper.Path;
		if (poly.star) {
			path = new Path.Star(new Point(poly.cx, poly.cy), poly.sides, poly.r1, poly.r2);
		} else {
			path = new Path.RegularPolygon(new Point(poly.cx, poly.cy), poly.sides, poly.r1);
		}
		this.selection.attributes.points = pointsSerialize(path.segments.map((s) => [s.point.x, s.point.y]));
		this.selection.attributes["data-savage-polygon"] = JSON.stringify(poly);
		path.remove();
	}

	onPointDown(index: number, event: PointerEvent): void {
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
		for (const pointIndex of this.selectedPoints) {
			let point = applyToPoint(this.matrix, <PointArrayNotation> this.points[pointIndex]);
			point[0] += d.x;
			point[1] += d.y;
			point = applyToPoint(inverse(this.matrix), point);
			this.points[pointIndex][0] = point[0];
			this.points[pointIndex][1] = point[1];
		}
		this.external = false;
		delete this.selection.attributes["data-savage-polygon"];
		this.selection.attributes.points = pointsSerialize(this.points);
		this.external = true;
	}

	handlePointDrag(index: number, event: DragEvent): void {
		this.pointsMove(event.delta);
		if (event.type === "dragend") {
			this.history.snapshot("Move point");
		}
	}

	onKeyDown(index: number, event: KeyboardEvent): void {
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
				for (const i of [...this.selectedPoints].sort().reverse()) {
					this.points.splice(i, 1);
				}
				this.external = false;
				delete this.selection.attributes["data-savage-polygon"];
				this.selection.attributes.points = pointsSerialize(this.points);
				this.external = true;
				this.history.snapshot("Remove point");
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
