import { Component, OnInit, OnDestroy, Input, ViewChild, ElementRef } from "@angular/core";
import equal from "fast-deep-equal/es6";
import { klona } from "klona";
import { nanoid } from "nanoid/non-secure";
import { CompoundPath, Point as PathPoint, Matrix as PathMatrix, Rectangle } from "paper";
import {
	compose, fromDefinition, fromTransformAttribute, Matrix, applyToPoint, applyToPoints,
	translate, scale, toSVG, inverse, smoothMatrix, rotateDEG, skew } from "transformation-matrix";
import { parse as pointsParse, serialize as pointsSerialize } from "svg-numbers";

import { Observable, recursiveUnobserve } from "../../types/observer";
import { find, findParent, SavageSVG, screen2svg, applyTransformed, applyTransformedPoly, Point } from "../../types/svg";
import { ICanvasTool, CanvasService } from "../../services/canvas.service";
import { IDocumentEvent } from "../document/document.component";
import { DragEvent } from "../directives/draggable.directive";
import { HistoryService } from "../../services/history.service";


const selectableNodes: string[] = ["a", "circle", "ellipse", "foreignObject", "g", "image", "line", "path", "polygon", "polyline", "rect", "svg", "switch", "text", "use"];
const movableNodes: string[] = ["circle",  "ellipse", "image", "rect",  "use", "line", "path", "polygon", "polyline"];
const scalableNodes: string[] = ["circle",  "ellipse", "image", "rect", "line", "path", "polygon", "polyline"];
const rotatableNodes: string[] = ["line", "path", "polygon", "polyline"];
const skewableNodes: string[] = ["line", "path", "polygon", "polyline"];


@Component({
	selector: "app-object-tool",
	templateUrl: "./object-tool.component.html",
	styleUrls: ["./object-tool.component.scss"]
})
export class ObjectToolComponent implements ICanvasTool, OnInit, OnDestroy {
	private _selection: Observable<SavageSVG>[];
	name: "OBJECT" = "OBJECT";
	applyTransform = true;
	mode: "scale" | "rotate" | "skew" = "scale";
	@Input() scale: number;
	@Input() document: Observable<SavageSVG>;
	@Input() scrollable: HTMLElement;
	@Input() set selection(value) {
		if (!equal(value, this._selection)) {
			this.mode = "scale";
		}
		this._selection = value;
	}
	get selection(): Observable<SavageSVG>[] { return this._selection.filter((n) => selectableNodes.includes(n.name)); }
	get wx(): number {
		return (parseFloat(this.document.attributes.viewBox?.split(" ")[2]) || parseFloat(this.document.attributes.width)) / 350;
	}
	get hx(): number {
		return (parseFloat(this.document.attributes.viewBox?.split(" ")[3]) || parseFloat(this.document.attributes.height)) / 350;
	}
	@ViewChild("overlay", { static: true }) overlay: ElementRef<SVGSVGElement>;
	selectbox: paper.Rectangle = null;

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

	bbox(node: Observable<SavageSVG>): DOMRect {
		const rect = this.canvas.registry[node?.nid]?.getBBox();
		if (rect) {
			const transform = node.attributes.transform;
			const matrix = transform
				? compose(fromDefinition(fromTransformAttribute(transform)))
				: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
			const lt = applyToPoint(matrix, { x: rect.x, y: rect.y });
			return new DOMRect(lt.x, lt.y, rect.width, rect.height);
		}
		return new DOMRect(0, 0, 0, 0);
	}

	onClick(event: MouseEvent, node: Observable<SavageSVG>): void {
		event.stopPropagation();
	}

	onMouseDown(event: MouseEvent, node: Observable<SavageSVG>): void {
		event.stopPropagation();
	}

	handleDrag(event: IDocumentEvent): void {
		this.selectbox = null;
		const drag = <DragEvent> event.event;
		const position = screen2svg(this.overlay.nativeElement, { x: drag.x, y: drag.y });
		const previous = screen2svg(this.overlay.nativeElement, { x: drag.prevX, y: drag.prevY });
		const d = { x: position.x - previous.x, y: position.y - previous.y };
		for (const node of this.selection) {
			if (movableNodes.includes(node.name) && this.applyTransform) {
				this.moveNodeApplied(node, d);
			} else {
				this.moveNode(node, d);
			}
		}
		if ((<DragEvent> event.event).end) {
			this.history.snapshot("Move (translate) element");
		}
	}

	handleClick(event: IDocumentEvent): void {
		switch (this.mode) {
			case "scale":
				this.mode = "rotate";
				break;
			case "rotate":
				this.mode = "skew";
				break;
			case "skew":
				this.mode = "scale";
				break;
			default:
				this.mode = "scale";
		}
	}

	handleDblClick(event: IDocumentEvent): void { }

	handleMouseDown(event: IDocumentEvent): void {
		const ev: MouseEvent = <MouseEvent> event.event;
		const node = event.node;
		const ctrl = ev.ctrlKey;
		const shift = ev.shiftKey;
		const alt = ev.altKey;
		if (!node) {
			if (!shift) {
				const point = screen2svg(this.overlay.nativeElement, { x: ev.pageX, y: ev.pageY });
				this.selectbox = new Rectangle(point.x, point.y, 0, 0);
				this.canvas.selection = [];
			}
		} else if (shift && ctrl) {
			return;
		} else if (shift && alt) {
			const parent = findParent(this.document, node.nid);
			if (!this.canvas.selection.includes(parent)) {
				this.canvas.selection = [...this.canvas.selection, parent];
			}
		} else if (ctrl && alt) {
			const parent = findParent(this.document, node.nid);
			this.canvas.selection = this.canvas.selection.filter((n) => n.nid !== parent.nid);
		} else if (ctrl) {
			this.canvas.selection = this.canvas.selection.filter((n) => n.nid !== node.nid);
		} else if (alt) {
			const parent = findParent(this.document, node.nid);
			this.canvas.selection = [parent];
		} else if (shift) {
			if (!this.canvas.selection.includes(node)) {
				this.canvas.selection = [...this.canvas.selection, node];
			}
		} else {
			this.canvas.selection = [node];
		}
	}

	handleMouseMove(event: MouseEvent): void {
		if (this.selectbox) {
			const point = screen2svg(this.overlay.nativeElement, { x: event.pageX, y:  event.pageY });
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

	handleMouseUp(event: MouseEvent): void {
		if (this.selectbox) {
			this.canvas.selection = [];
			for (const [nid, el ]of Object.entries(this.canvas.registry)) {
				const node = find(this.document, nid);
				if (node && selectableNodes.includes(node.name)) {
					const bbox = this.bbox(node);
					if (new PathPoint(bbox.x, bbox.y).isInside(this.selectbox)
						|| new PathPoint(bbox.right, bbox.y).isInside(this.selectbox)
						|| new PathPoint(bbox.right, bbox.bottom).isInside(this.selectbox)
						|| new PathPoint(bbox.x, bbox.bottom).isInside(this.selectbox)) {
						this.canvas.selection.push(node);
					}
				}
			}
			this.selectbox = null;
		}
	}

	handleKeyDown(event: IDocumentEvent): void {
		const ev: KeyboardEvent = <KeyboardEvent> event.event;
		let node = event.node;
		let parent: Observable<SavageSVG>;
		let index: number;
		switch (ev.key) {
			case "ArrowLeft":
				ev.preventDefault();
				for (const n of this.selection) {
					if (movableNodes.includes(n.name) && this.applyTransform) {
						this.moveNodeApplied(n, { x: ev.altKey ? -1 : -5, y: 0 });
					} else {
						this.moveNode(n, { x: ev.altKey ? -1 : -5, y: 0 });
					}
				}
				this.history.snapshot("Move (translate) element");
				break;
			case "ArrowRight":
				ev.preventDefault();
				for (const n of this.selection) {
					if (movableNodes.includes(n.name) && this.applyTransform) {
						this.moveNodeApplied(n, { x: ev.altKey ? 1 : 5, y: 0 });
					} else {
						this.moveNode(n, { x: ev.altKey ? 1 : 5, y: 0 });
					}
				}
				this.history.snapshot("Move (translate) element");
				break;
			case "ArrowUp":
				ev.preventDefault();
				for (const n of this.selection) {
					if (movableNodes.includes(n.name) && this.applyTransform) {
						this.moveNodeApplied(n, { x: 0, y: ev.altKey ? -1 : -5 });
					} else {
						this.moveNode(n, { x: 0, y: ev.altKey ? -1 : -5 });
					}
				}
				this.history.snapshot("Move (translate) element");
				break;
			case "ArrowDown":
				ev.preventDefault();
				for (const n of this.selection) {
					if (movableNodes.includes(n.name) && this.applyTransform) {
						this.moveNodeApplied(n, { x: 0, y: ev.altKey ? 1 : 5 });
					} else {
						this.moveNode(n, { x: 0, y: ev.altKey ? 1 : 5 });
					}
				}
				this.history.snapshot("Move (translate) element");
				break;
			case "Delete":
				ev.preventDefault();
				for (const n of this.selection) {
					parent = findParent(this.document, n.nid);
					index = parent.children.findIndex((nd) => nd.nid === n.nid);
					parent.children.splice(index, 1);
					recursiveUnobserve(n);
				}
				this.history.snapshot("Remove element");
				break;
			case "PageUp":
				ev.preventDefault();
				parent = findParent(this.document, node.nid);
				index = parent.children.findIndex((n) => n.nid === node.nid);
				parent.children.splice(index, 1);
				parent.children.splice(index > 0 ? index - 1 : index, 0, node);
				setTimeout(() => {
					this.canvas.registry[node.nid]?.focus();
				}, 150);
				this.history.snapshot("Reorder element");
				break;
			case "PageDown":
				ev.preventDefault();
				parent = findParent(this.document, node.nid);
				index = parent.children.findIndex((n) => n.nid === node.nid);
				parent.children.splice(index, 1);
				parent.children.splice(index + 1, 0, node);
				setTimeout(() => {
					this.canvas.registry[node.nid]?.focus();
				}, 150);
				this.history.snapshot("Reorder element");
				break;
			case "d":
				if (ev.ctrlKey && !ev.shiftKey && !ev.altKey) {
					ev.preventDefault();
					ev.stopPropagation();
					for (const n of this.selection) {
						parent = findParent(this.document, n.nid);
						index = parent.children.findIndex((nd) => nd.nid === n.nid);
						const copy = klona(n);
						copy.nid = nanoid(13);
						parent.children.splice(index + 1, 0, copy);
					}
					this.history.snapshot("Duplicate element");
				}
				break;
			case "g":
				if (ev.ctrlKey && !ev.shiftKey && !ev.altKey) {
					ev.preventDefault();
					ev.stopPropagation();
					let children: Observable<SavageSVG>[] = [];
					for (node of this.selection) {
						parent = findParent(this.document, node.nid);
						index = parent.children.findIndex((n) => n.nid === node.nid);
						children = children.concat(parent.children.splice(index, 1));
					}
					const group: SavageSVG = {
						name: "g",
						type: "element",
						value: "",
						nid: nanoid(13),
						attributes: <any> {},
						children: <any> children,
					};
					const nIds = children.map((n) => n.nid);
					this.canvas.selection = this.selection.filter((n) => !nIds.includes(n.nid));
					this.document.children.push(<any> group);
					setTimeout(() => {
						this.canvas.selection.push(this.document.children[this.document.children.length - 1]);
						this.canvas.registry[children[children.length - 1]?.nid]?.focus();
					}, 150);
					this.history.snapshot("Group elements");
				}
				break;
			case "G":
				if (ev.shiftKey && ev.ctrlKey && !ev.altKey) {
					node = this.selection[this.selection.length - 1];
					if (node && ["a", "g", "svg"].includes(node.name)) {
						ev.preventDefault();
						ev.stopPropagation();
						parent = findParent(this.document, node.nid);
						index = parent.children.findIndex((n) => n.nid === node.nid);
						parent.children.splice(index, 1);
						node.unobserve();
						node.attributes.unobserve();
						node.children.unobserve();
						for (const child of node.children) {
							parent.children.push(child);
						}
						this.canvas.selection = this.selection.filter((n) => n.nid !== node.nid);
						this.canvas.selection = [...this.selection, ...node.children];
						setTimeout(() => {
							this.canvas.registry[node.children[node.children.length - 1]?.nid]?.focus();
						}, 150);
					}
					this.history.snapshot("Ungroup elements");
				}
				break;
			case "a":
				if (ev.ctrlKey && !ev.shiftKey && !ev.altKey) {
					ev.preventDefault();
					ev.stopPropagation();
					this.canvas.selection = [];
					for (const nid of Object.keys(this.canvas.registry)) {
						const n = find(this.document, nid);
						if (selectableNodes.includes(n.name)) {
							this.canvas.selection.push(n);
						}
					}
				}
				break;
			case "A":
				if (ev.ctrlKey && ev.shiftKey && !ev.altKey) {
					ev.preventDefault();
					ev.stopPropagation();
					this.canvas.selection = [];
				}
				break;
			case "i":
				if (ev.ctrlKey && !ev.altKey) {
					ev.preventDefault();
					ev.stopPropagation();
					const old = this.selection.map((n) => n.nid);
					this.canvas.selection = [];
					for (const nid of Object.keys(this.canvas.registry)) {
						if (!old.includes(nid)) {
							const n = find(this.document, nid);
							if (selectableNodes.includes(n.name)) {
								this.canvas.selection.push(n);
							}
						}
					}
				}
				break;
		}
	}

	moveNode(node: Observable<SavageSVG>, d: Point): void {
		let matrix: Matrix;
		switch (node.name) {
			case "tspan":
			case "textPath":
				const findText = (n: Observable<SavageSVG>): Observable<SavageSVG> => {
					const p = findParent(this.document, n.nid);
					if (p.name === "text") {
						return p;
					}
					return findParent(this.document, p.nid);
				};
				const parent = findText(node);
				if (parent.attributes.transform) {
					matrix = compose(fromDefinition(fromTransformAttribute(parent.attributes.transform)));
				} else {
					matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
				}
				parent.attributes.transform = toSVG(smoothMatrix(compose(translate(d.x, d.y), matrix), 10 ** 7));
				break;
			default:
				if (node.attributes.transform) {
					matrix = compose(fromDefinition(fromTransformAttribute(node.attributes.transform)));
				} else {
					matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
				}
				node.attributes.transform = toSVG(smoothMatrix(compose(translate(d.x, d.y), matrix), 10 ** 7));
				break;
		}
	}

	moveNodeApplied(node: Observable<SavageSVG>, d: Point): void {
		let matrix: Matrix;
		let point: Point;
		if (node.attributes.transform) {
			matrix = compose(fromDefinition(fromTransformAttribute(node.attributes.transform)));
		} else {
			matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
		}
		switch (node.name) {
			case "circle":
			case "ellipse":
				const cx = parseFloat(node.attributes.cx || "0");
				const cy = parseFloat(node.attributes.cy || "0");
				point = applyTransformed({ x: cx, y: cy }, { x: d.x, y: d.y }, matrix);
				node.attributes.cx = `${point.x}`;
				node.attributes.cy = `${point.y}`;
				break;
			case "image":
			case "rect":
			case "use":
				const x = parseFloat(node.attributes.x || "0");
				const y = parseFloat(node.attributes.y || "0");
				point = applyTransformed({ x, y }, { x: d.x, y: d.y }, matrix);
				node.attributes.x = `${point.x}`;
				node.attributes.y = `${point.y}`;
				break;
			case "line":
				const x1 = parseFloat(node.attributes.x1 || "0");
				const y1 = parseFloat(node.attributes.y1 || "0");
				const x2 = parseFloat(node.attributes.x2 || "0");
				const y2 = parseFloat(node.attributes.y2 || "0");
				const point2 = applyTransformed({ x: x2, y: y2 }, { x: d.x, y: d.y }, matrix);
				point = applyTransformed({ x: x1, y: y1 }, { x: d.x, y: d.y }, matrix);
				node.attributes.x1 = `${point.x}`;
				node.attributes.y1 = `${point.y}`;
				node.attributes.x2 = `${point2.x}`;
				node.attributes.y2 = `${point2.y}`;
				break;
			case "path":
				const path = new CompoundPath(node.attributes.d);
				const inverseMatrix = inverse(matrix);
				path.transform(new PathMatrix([matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f]));
				path.translate(new PathPoint(d.x, d.y));
				path.transform(new PathMatrix([inverseMatrix.a, inverseMatrix.b, inverseMatrix.c, inverseMatrix.d, inverseMatrix.e, inverseMatrix.f]));
				node.attributes.d = path.pathData;
				path.remove();
				break;
			case "polygon":
			case "polyline":
				const points: Point[] = pointsParse(node.attributes.points)
					.reduce((result, value, index, array) => {
					if (index % 2 === 0) {
						result.push(array.slice(index, index + 2));
					}
					return result;
				}, []);
				const coords = applyTransformedPoly(points, { x: d.x, y: d.y }, matrix);
				node.attributes.points = pointsSerialize(coords);
				break;
		}
	}

	scaleNode(node: Observable<SavageSVG>, corner: "topLeft" | "topRight" | "bottomRight" | "bottomLeft", event: DragEvent): void {
		const position = screen2svg(this.overlay.nativeElement, { x: event.x, y: event.y });
		const previous = screen2svg(this.overlay.nativeElement, { x: event.prevX, y: event.prevY });
		const d = { x: position.x - previous.x, y: position.y - previous.y };
		const bbox = this.bbox(node);
		let sx: number;
		let sy: number;
		if (scalableNodes.includes(node.name) && this.applyTransform) {
			this.scaleNodeApplied(node, corner, d, bbox);
		} else {
			let matrix: Matrix;
			if (node.attributes.transform) {
				matrix = compose(fromDefinition(fromTransformAttribute(node.attributes.transform)));
			} else {
				matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
			}
			switch (corner) {
				case "topLeft":
					sx = bbox.width / (bbox.width + d.x);
					sy = bbox.height / (bbox.height + d.y);
					matrix = compose(scale(sx, sy, bbox.right, bbox.bottom), matrix);
					break;
				case "topRight":
					sx = bbox.width / (bbox.width - d.x);
					sy = bbox.height / (bbox.height + d.y);
					matrix = compose(scale(sx, sy, bbox.x, bbox.bottom), matrix);
					break;
				case "bottomLeft":
					sx = bbox.width / (bbox.width + d.x);
					sy = bbox.height / (bbox.height - d.y);
					matrix = compose(scale(sx, sy, bbox.right, bbox.y), matrix);
					break;
				case "bottomRight":
					sx = bbox.width / (bbox.width - d.x);
					sy = bbox.height / (bbox.height - d.y);
					matrix = compose(scale(sx, sy, bbox.x, bbox.y), matrix);
					break;
			}
			node.attributes.transform = toSVG(smoothMatrix(matrix, 10 ** 7));
		}
		if (event.end) {
			this.history.snapshot("Scale element");
		}
	}

	scaleNodeApplied(
		node: Observable<SavageSVG>, corner: "topLeft" | "topRight" | "bottomRight" | "bottomLeft", d: Point, bbox: DOMRect,
	): void {
		let matrix: Matrix;
		let point: Point;
		if (node.attributes.transform) {
			matrix = compose(fromDefinition(fromTransformAttribute(node.attributes.transform)));
		} else {
			matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
		}
		const cx = parseFloat(node.attributes.cx || "0");
		const cy = parseFloat(node.attributes.cy || "0");
		let sx: number;
		let sy: number;
		switch (corner) {
			case "topLeft":
				switch (node.name) {
					case "circle":
						const r = parseFloat(node.attributes.r || "1");
						const rd = Math.abs(d.x) > Math.abs(d.y) ? d.x : d.y;
						point = applyTransformed({ x: cx, y: cy }, d, matrix);
						node.attributes.cx = `${point.x}`;
						node.attributes.cy = `${point.y}`;
						node.attributes.r = `${Math.max(r - rd, 1)}`;
						break;
					case "ellipse":
						const rx = parseFloat(node.attributes.rx || "1");
						const ry = parseFloat(node.attributes.ry || "1");
						point = applyTransformed({ x: cx, y: cy }, d, matrix);
						node.attributes.cx = `${point.x}`;
						node.attributes.cy = `${point.y}`;
						node.attributes.rx = `${Math.max(rx - d.x, 1)}`;
						node.attributes.ry = `${Math.max(ry - d.y, 1)}`;
						break;
					case "image":
					case "rect":
						const x = parseFloat(node.attributes.x || "0");
						const y = parseFloat(node.attributes.y || "0");
						const w = parseFloat(node.attributes.width || "1");
						const h = parseFloat(node.attributes.height || "1");
						point = applyTransformed({ x, y }, { x: d.x, y: d.y }, matrix);
						node.attributes.width = `${w - d.x}`;
						node.attributes.height = `${h - d.y}`;
						node.attributes.x = `${point.x}`;
						node.attributes.y = `${point.y}`;
						break;
					case "line":
						const x1 = parseFloat(node.attributes.x1 || "0");
						const y1 = parseFloat(node.attributes.y1 || "0");
						const x2 = parseFloat(node.attributes.x2 || "0");
						const y2 = parseFloat(node.attributes.y2 || "0");
						const point2 = applyTransformed({ x: x2, y: y2 }, { x: d.x, y: d.y }, matrix);
						point = applyTransformed({ x: x1, y: y1 }, { x: d.x, y: d.y }, matrix);
						node.attributes.x1 = `${point.x}`;
						node.attributes.y1 = `${point.y}`;
						node.attributes.x2 = `${point2.x - d.x}`;
						node.attributes.y2 = `${point2.y - d.y}`;
						break;
					case "polygon":
					case "polyline":
						const points: Point[] = pointsParse(node.attributes.points)
							.reduce((result, value, index, array) => {
							if (index % 2 === 0) {
								result.push(array.slice(index, index + 2));
							}
							return result;
						}, []);
						sx = bbox.width / (bbox.width + d.x);
						sy = bbox.height / (bbox.height + d.y);
						node.attributes.points = pointsSerialize(
							applyToPoints(compose(inverse(matrix), scale(sx, sy, bbox.right, bbox.bottom)), applyToPoints(matrix, points))
						);
						break;
					case "path":
						const path = new CompoundPath(node.attributes.d);
						const pathMatrix = new PathMatrix([matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f]);
						path.transform(pathMatrix);
						sx = bbox.width / (bbox.width + d.x);
						sy = bbox.height / (bbox.height + d.y);
						path.scale(sx, sy, new PathPoint(bbox.right, bbox.bottom));
						path.transform(pathMatrix.inverted());
						node.attributes.d = path.pathData;
						path.remove();
						break;
				}
				break;
			case "topRight":
				switch (node.name) {
					case "circle":
						const r = parseFloat(node.attributes.r || "1");
						const rd = Math.abs(d.x) > Math.abs(d.y) ? d.x : d.y;
						point = applyTransformed({ x: cx, y: cy }, d, matrix);
						node.attributes.cx = `${point.x}`;
						node.attributes.cy = `${point.y}`;
						node.attributes.r = `${Math.max(r - rd, 1)}`;
						break;
					case "ellipse":
						const rx = parseFloat(node.attributes.rx || "1");
						const ry = parseFloat(node.attributes.ry || "1");
						point = applyTransformed({ x: cx, y: cy }, d, matrix);
						node.attributes.cx = `${point.x}`;
						node.attributes.cy = `${point.y}`;
						node.attributes.rx = `${Math.max(rx + d.x, 1)}`;
						node.attributes.ry = `${Math.max(ry - d.y, 1)}`;
						break;
					case "image":
					case "rect":
						const x = parseFloat(node.attributes.x || "0");
						const y = parseFloat(node.attributes.y || "0");
						const w = parseFloat(node.attributes.width || "1");
						const h = parseFloat(node.attributes.height || "1");
						point = applyTransformed({ x, y }, { x: d.x, y: d.y }, matrix);
						node.attributes.width = `${w + d.x}`;
						node.attributes.height = `${h - d.y}`;
						node.attributes.x = `${point.x - d.x}`;
						node.attributes.y = `${point.y}`;
						break;
					case "line":
						const x1 = parseFloat(node.attributes.x1 || "0");
						const y1 = parseFloat(node.attributes.y1 || "0");
						const x2 = parseFloat(node.attributes.x2 || "0");
						const y2 = parseFloat(node.attributes.y2 || "0");
						const point2 = applyTransformed({ x: x2, y: y2 }, { x: d.x, y: d.y }, matrix);
						point = applyTransformed({ x: x1, y: y1 }, { x: d.x, y: d.y }, matrix);
						node.attributes.x1 = `${point.x - d.x}`;
						node.attributes.y1 = `${point.y}`;
						node.attributes.x2 = `${point2.x}`;
						node.attributes.y2 = `${point2.y - d.y}`;
						break;
					case "polygon":
					case "polyline":
						const points: Point[] = pointsParse(node.attributes.points)
							.reduce((result, value, index, array) => {
							if (index % 2 === 0) {
								result.push(array.slice(index, index + 2));
							}
							return result;
						}, []);
						sx = bbox.width / (bbox.width - d.x);
						sy = bbox.height / (bbox.height + d.y);
						node.attributes.points = pointsSerialize(
							applyToPoints(compose(inverse(matrix), scale(sx, sy, bbox.x, bbox.bottom)), applyToPoints(matrix, points))
						);
						break;
					case "path":
						const path = new CompoundPath(node.attributes.d);
						const pathMatrix = new PathMatrix([matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f]);
						path.transform(pathMatrix);
						sx = bbox.width / (bbox.width - d.x);
						sy = bbox.height / (bbox.height + d.y);
						path.scale(sx, sy, new PathPoint(bbox.x, bbox.bottom));
						path.transform(pathMatrix.inverted());
						node.attributes.d = path.pathData;
						path.remove();
						break;
				}
				break;
			case "bottomLeft":
				switch (node.name) {
					case "circle":
						const r = parseFloat(node.attributes.r || "1");
						const rd = Math.abs(d.x) > Math.abs(d.y) ? d.x : d.y;
						point = applyTransformed({ x: cx, y: cy }, d, matrix);
						node.attributes.cx = `${point.x}`;
						node.attributes.cy = `${point.y}`;
						node.attributes.r = `${Math.max(r - rd, 1)}`;
						break;
					case "ellipse":
						const rx = parseFloat(node.attributes.rx || "1");
						const ry = parseFloat(node.attributes.ry || "1");
						point = applyTransformed({ x: cx, y: cy }, d, matrix);
						node.attributes.cx = `${point.x}`;
						node.attributes.cy = `${point.y}`;
						node.attributes.rx = `${Math.max(rx - d.x, 1)}`;
						node.attributes.ry = `${Math.max(ry + d.y, 1)}`;
						break;
					case "image":
					case "rect":
						const x = parseFloat(node.attributes.x || "0");
						const y = parseFloat(node.attributes.y || "0");
						const w = parseFloat(node.attributes.width || "1");
						const h = parseFloat(node.attributes.height || "1");
						point = applyTransformed({ x, y }, { x: d.x, y: d.y }, matrix);
						node.attributes.width = `${w - d.x}`;
						node.attributes.height = `${h + d.y}`;
						node.attributes.x = `${point.x}`;
						node.attributes.y = `${point.y - d.y}`;
						break;
					case "line":
						const x1 = parseFloat(node.attributes.x1 || "0");
						const y1 = parseFloat(node.attributes.y1 || "0");
						const x2 = parseFloat(node.attributes.x2 || "0");
						const y2 = parseFloat(node.attributes.y2 || "0");
						const point2 = applyTransformed({ x: x2, y: y2 }, { x: d.x, y: d.y }, matrix);
						point = applyTransformed({ x: x1, y: y1 }, { x: d.x, y: d.y }, matrix);
						node.attributes.x1 = `${point.x}`;
						node.attributes.y1 = `${point.y - d.y}`;
						node.attributes.x2 = `${point2.x - d.x}`;
						node.attributes.y2 = `${point2.y}`;
						break;
					case "polygon":
					case "polyline":
						const points: Point[] = pointsParse(node.attributes.points)
							.reduce((result, value, index, array) => {
							if (index % 2 === 0) {
								result.push(array.slice(index, index + 2));
							}
							return result;
						}, []);
						sx = bbox.width / (bbox.width + d.x);
						sy = bbox.height / (bbox.height - d.y);
						node.attributes.points = pointsSerialize(
							applyToPoints(compose(inverse(matrix), scale(sx, sy, bbox.right, bbox.y)), applyToPoints(matrix, points))
						);
						break;
					case "path":
						const path = new CompoundPath(node.attributes.d);
						const pathMatrix = new PathMatrix([matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f]);
						path.transform(pathMatrix);
						sx = bbox.width / (bbox.width + d.x);
						sy = bbox.height / (bbox.height - d.y);
						path.scale(sx, sy, new PathPoint(bbox.right, bbox.y));
						path.transform(pathMatrix.inverted());
						node.attributes.d = path.pathData;
						path.remove();
						break;
				}
				break;
			case "bottomRight":
				switch (node.name) {
					case "circle":
						const r = parseFloat(node.attributes.r || "1");
						const rd = Math.abs(d.x) > Math.abs(d.y) ? d.x : d.y;
						point = applyTransformed({ x: cx, y: cy }, d, matrix);
						node.attributes.cx = `${point.x}`;
						node.attributes.cy = `${point.y}`;
						node.attributes.r = `${Math.max(r - rd, 1)}`;
						break;
					case "ellipse":
						const rx = parseFloat(node.attributes.rx || "1");
						const ry = parseFloat(node.attributes.ry || "1");
						point = applyTransformed({ x: cx, y: cy }, d, matrix);
						node.attributes.cx = `${point.x}`;
						node.attributes.cy = `${point.y}`;
						node.attributes.rx = `${Math.max(rx + d.x, 1)}`;
						node.attributes.ry = `${Math.max(ry + d.y, 1)}`;
						break;
					case "image":
					case "rect":
						const x = parseFloat(node.attributes.x || "0");
						const y = parseFloat(node.attributes.y || "0");
						const w = parseFloat(node.attributes.width || "1");
						const h = parseFloat(node.attributes.height || "1");
						point = applyTransformed({ x, y }, { x: d.x, y: d.y }, matrix);
						node.attributes.width = `${w + d.x}`;
						node.attributes.height = `${h + d.y}`;
						node.attributes.x = `${point.x - d.x}`;
						node.attributes.y = `${point.y - d.y}`;
						break;
					case "line":
						const x1 = parseFloat(node.attributes.x1 || "0");
						const y1 = parseFloat(node.attributes.y1 || "0");
						const x2 = parseFloat(node.attributes.x2 || "0");
						const y2 = parseFloat(node.attributes.y2 || "0");
						const point2 = applyTransformed({ x: x2, y: y2 }, { x: d.x, y: d.y }, matrix);
						point = applyTransformed({ x: x1, y: y1 }, { x: d.x, y: d.y }, matrix);
						node.attributes.x1 = `${point.x - d.x}`;
						node.attributes.y1 = `${point.y - d.y}`;
						node.attributes.x2 = `${point2.x}`;
						node.attributes.y2 = `${point2.y}`;
						break;
					case "polygon":
					case "polyline":
						const points: Point[] = pointsParse(node.attributes.points)
							.reduce((result, value, index, array) => {
							if (index % 2 === 0) {
								result.push(array.slice(index, index + 2));
							}
							return result;
						}, []);
						sx = bbox.width / (bbox.width - d.x);
						sy = bbox.height / (bbox.height - d.y);
						node.attributes.points = pointsSerialize(
							applyToPoints(compose(inverse(matrix), scale(sx, sy, bbox.x, bbox.y)), applyToPoints(matrix, points))
						);
						break;
					case "path":
						const path = new CompoundPath(node.attributes.d);
						const pathMatrix = new PathMatrix([matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f]);
						path.transform(pathMatrix);
						sx = bbox.width / (bbox.width - d.x);
						sy = bbox.height / (bbox.height - d.y);
						path.scale(sx, sy, new PathPoint(bbox.x, bbox.y));
						path.transform(pathMatrix.inverted());
						node.attributes.d = path.pathData;
						path.remove();
						break;
				}
				break;
		}
	}

	rotateNode(node: Observable<SavageSVG>, event: DragEvent): void {
		const d = { x: event.x - event.prevX, y: event.y - event.prevY };
		const angle = Math.abs(d.x) > Math.abs(d.y) ? d.x : d.y;
		const bbox = this.bbox(node);
		const cx = bbox.x + bbox.width / 2;
		const cy = bbox.y + bbox.height / 2;
		if (rotatableNodes.includes(node.name) && this.applyTransform) {
			this.rotateNodeApplied(node, angle, { x: cx, y: cy });
		} else {
			let matrix: Matrix;
			if (node.attributes.transform) {
				matrix = compose(fromDefinition(fromTransformAttribute(node.attributes.transform)));
			} else {
				matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
			}
			node.attributes.transform = toSVG(smoothMatrix(compose(rotateDEG(angle, cx, cy), matrix), 10 ** 7));
		}
		if (event.end) {
			this.history.snapshot("Rotate element");
		}
	}

	rotateNodeApplied(node: Observable<SavageSVG>, angle: number, c: Point): void {
		let matrix: Matrix;
		if (node.attributes.transform) {
			matrix = compose(fromDefinition(fromTransformAttribute(node.attributes.transform)));
		} else {
			matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
		}
		switch (node.name) {
			case "line":
				const x1 = parseFloat(node.attributes.x1 || "0");
				const y1 = parseFloat(node.attributes.y1 || "0");
				const x2 = parseFloat(node.attributes.x2 || "1");
				const y2 = parseFloat(node.attributes.y2 || "1");
				const [[dx1, dy1], [dx2, dy2]] = applyToPoints(
					compose(inverse(matrix), rotateDEG(angle, c.x, c.y)),
					applyToPoints(matrix, [[x1, y1], [x2, y2]]));
				node.attributes.x1 = `${dx1}`;
				node.attributes.y1 = `${dy1}`;
				node.attributes.x2 = `${dx2}`;
				node.attributes.y2 = `${dy2}`;
				break;
			case "polygon":
			case "polyline":
				const points: Point[] = pointsParse(node.attributes.points)
					.reduce((result, value, index, array) => {
						if (index % 2 === 0) {
							result.push(array.slice(index, index + 2));
						}
						return result;
					}, []);
				node.attributes.points = pointsSerialize(applyToPoints(
					compose(inverse(matrix), rotateDEG(angle, c.x, c.y)),
					applyToPoints(matrix, points)).flat());
				break;
			case "path":
				const path = new CompoundPath(node.attributes.d);
				const pathMatrix = new PathMatrix(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f);
				path.transform(pathMatrix);
				path.rotate(angle, new PathPoint(c.x, c.y));
				path.transform(pathMatrix.inverted());
				node.attributes.d = path.pathData;
				path.remove();
				break;
		}
	}

	skewNode(node: Observable<SavageSVG>, axis: "x" | "y", event: DragEvent): void {
		const position = screen2svg(this.overlay.nativeElement, { x: event.x, y: event.y });
		const previous = screen2svg(this.overlay.nativeElement, { x: event.prevX, y: event.prevY });
		const angle = axis === "x" ? (position.x - previous.x) / 100 : (position.y - previous.y) / 100;
		if (skewableNodes.includes(node.name) && this.applyTransform) {
			this.skewNodeApplied(node, axis, angle);
		} else {
			let matrix: Matrix;
			if (node.attributes.transform) {
				matrix = compose(fromDefinition(fromTransformAttribute(node.attributes.transform)));
			} else {
				matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
			}
			node.attributes.transform = toSVG(smoothMatrix(
				compose(skew(axis === "x" ? angle : 0, axis === "y" ? angle : 0), matrix), 10 ** 7));
		}
		if (event.end) {
			this.history.snapshot("Skew element");
		}
	}

	skewNodeApplied(node: Observable<SavageSVG>, axis: "x" | "y", angle: number): void {
		let matrix: Matrix;
		if (node.attributes.transform) {
			matrix = compose(fromDefinition(fromTransformAttribute(node.attributes.transform)));
		} else {
			matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
		}
		switch (node.name) {
			case "line":
				const x1 = parseFloat(node.attributes.x1 || "0");
				const y1 = parseFloat(node.attributes.y1 || "0");
				const x2 = parseFloat(node.attributes.x2 || "1");
				const y2 = parseFloat(node.attributes.y2 || "1");
				const [[dx1, dy1], [dx2, dy2]] = applyToPoints(
					compose(inverse(matrix), skew(axis === "x" ? angle : 0, axis === "y" ? angle : 0)),
					applyToPoints(matrix, [[x1, y1], [x2, y2]]));
				node.attributes.x1 = `${dx1}`;
				node.attributes.y1 = `${dy1}`;
				node.attributes.x2 = `${dx2}`;
				node.attributes.y2 = `${dy2}`;
				break;
			case "polygon":
			case "polyline":
				const points: Point[] = pointsParse(node.attributes.points)
				.reduce((result, value, index, array) => {
					if (index % 2 === 0) {
						result.push(array.slice(index, index + 2));
					}
					return result;
				}, []);
				node.attributes.points = pointsSerialize(applyToPoints(
					compose(inverse(matrix), skew(axis === "x" ? angle : 0, axis === "y" ? angle : 0)),
					applyToPoints(matrix, points)).flat());
				break;
			case "path":
				const path = new CompoundPath(node.attributes.d);
				const pathMatrix = new PathMatrix(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f);
				path.transform(pathMatrix);
				path.skew(axis === "x" ? angle * 100 : 0, axis === "y" ? angle * 100 : 0);
				path.transform(pathMatrix.inverted());
				node.attributes.d = path.pathData;
				path.remove();
				break;
		}
	}
}
