import { Component, OnInit, OnDestroy, Input, ViewChild, ElementRef } from "@angular/core";
import * as equal from "fast-deep-equal/es6";
import { klona } from "klona";
import { nanoid } from "nanoid/non-secure";
import { Path, Point as PathPoint, Matrix as PathMatrix } from "paper";
import {
	compose, fromDefinition, fromTransformAttribute, Matrix, applyToPoint, applyToPoints,
	translate, scale, toSVG, inverse, smoothMatrix, rotateDEG, skew } from "transformation-matrix";
import { parse as pointsParse, serialize as pointsSerialize } from "svg-numbers";

import { Observable, recursiveUnobserve } from "../../types/observer";
import { findParent, SavageSVG, screen2svg, applyTransformed, applyTransformedPoly, Point } from "../../types/svg";
import { ICanvasTool, CanvasService } from "../../services/canvas.service";
import { IDocumentEvent } from "../document/document.component";
import { DragEvent } from "../directives/draggable.directive";


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
	multiselect = true;
	applyTransform = true;
	mode: "scale" | "rotate" | "skew" = "scale";
	@Input() document: Observable<SavageSVG>;
	@Input() scrollable: HTMLElement;
	@Input() set selection(value) {
		if (!equal(value, this._selection)) {
			this.mode = "scale";
		}
		this._selection = value;
	}
	get selection(): Observable<SavageSVG>[] { return this._selection; }
	@ViewChild("overlay", { static: true }) overlay: ElementRef<SVGSVGElement>;

	constructor(
		public canvas: CanvasService,
	) {
		this.canvas.tools[this.name] = this;
	}

	ngOnInit(): void { }

	ngOnDestroy(): void {
		delete this.canvas.tools[this.name];
	}

	bbox(node: Observable<SavageSVG>): DOMRect {
		const rect = this.canvas.registry[node?.nid]?.getBoundingClientRect();
		if (rect) {
			const lt = screen2svg(this.overlay.nativeElement, { x: rect.left, y: rect.top });
			const rb = screen2svg(this.overlay.nativeElement, { x: rect.right, y: rect.bottom });
			return new DOMRect(lt.x, lt.y, rb.x - lt.x, rb.y - lt.y);
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

	handleMouseDown(event: IDocumentEvent): void {
		//
	}

	handleKeyDown(event: IDocumentEvent): void {
		const ev: KeyboardEvent = <KeyboardEvent> event.event;
		let node = event.node;
		let parent: Observable<SavageSVG>;
		let index: number;
		switch (ev.key) {
			case "ArrowLeft":
				ev.preventDefault();
				if (movableNodes.includes(node.name) && this.applyTransform) {
					this.moveNodeApplied(node, { x: ev.altKey ? -1 : -5, y: 0 });
				} else {
					this.moveNode(node, { x: ev.altKey ? -1 : -5, y: 0 });
				}
				break;
			case "ArrowRight":
				ev.preventDefault();
				if (movableNodes.includes(node.name) && this.applyTransform) {
					this.moveNodeApplied(node, { x: ev.altKey ? 1 : 5, y: 0 });
				} else {
					this.moveNode(node, { x: ev.altKey ? 1 : 5, y: 0 });
				}
				break;
			case "ArrowUp":
				ev.preventDefault();
				if (movableNodes.includes(node.name) && this.applyTransform) {
					this.moveNodeApplied(node, { x: 0, y: ev.altKey ? -1 : -5 });
				} else {
					this.moveNode(node, { x: 0, y: ev.altKey ? -1 : -5 });
				}
				break;
			case "ArrowDown":
				ev.preventDefault();
				if (movableNodes.includes(node.name) && this.applyTransform) {
					this.moveNodeApplied(node, { x: 0, y: ev.altKey ? 1 : 5 });
				} else {
					this.moveNode(node, { x: 0, y: ev.altKey ? 1 : 5 });
				}
				break;
			case "Delete":
				ev.preventDefault();
				parent = findParent(this.document, node.nid);
				index = parent.children.findIndex((n) => n.nid === node.nid);
				parent.children.splice(index, 1);
				recursiveUnobserve(node);
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
				break;
			case "d":
				if (ev.ctrlKey && !ev.shiftKey && !ev.altKey) {
					ev.preventDefault();
					ev.stopPropagation();
					parent = findParent(this.document, node.nid);
					index = parent.children.findIndex((n) => n.nid === node.nid);
					const copy = klona(node);
					copy.nid = nanoid(13);
					parent.children.splice(index + 1, 0, copy);
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
					this.canvas.selection = this.canvas.selection.filter((n) => !nIds.includes(n.nid));
					this.document.children.push(<any> group);
					setTimeout(() => {
						this.canvas.selection.push(this.document.children[this.document.children.length - 1]);
						this.canvas.registry[children[children.length - 1]?.nid]?.focus();
					}, 150);
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
						this.canvas.selection = this.canvas.selection.filter((n) => n.nid !== node.nid);
						this.canvas.selection = [...this.canvas.selection, ...node.children];
						setTimeout(() => {
							this.canvas.registry[node.children[node.children.length - 1]?.nid]?.focus();
						}, 150);
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
				const path = new Path(node.attributes.d);
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
						const path = new Path(node.attributes.d);
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
						const rd = Math.abs(d.x) > Math.abs(d.y) ? -d.x : d.y;
						point = applyToPoint(matrix, { x: cx, y: cy });
						node.attributes.cx = `${point.x - rd}`;
						node.attributes.cy = `${point.y + rd}`;
						node.attributes.r = `${Math.max(r - rd, 1)}`;
						break;
					case "ellipse":
						const rx = parseFloat(node.attributes.rx || "1");
						const ry = parseFloat(node.attributes.ry || "1");
						point = applyToPoint(matrix, { x: cx, y: cy });
						node.attributes.cx = `${point.x + d.x}`;
						node.attributes.cy = `${point.y + d.y}`;
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
						const path = new Path(node.attributes.d);
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
						const rd = Math.abs(d.x) > Math.abs(d.y) ? d.x : -d.y;
						point = applyToPoint(matrix, { x: cx, y: cy });
						node.attributes.cx = `${point.x + rd}`;
						node.attributes.cy = `${point.y - rd}`;
						node.attributes.r = `${Math.max(Math.abs(r - rd), 1)}`;
						break;
					case "ellipse":
						const rx = parseFloat(node.attributes.rx || "1");
						const ry = parseFloat(node.attributes.ry || "1");
						point = applyToPoint(matrix, { x: cx, y: cy });
						node.attributes.cx = `${point.x + d.x}`;
						node.attributes.cy = `${point.y + d.y}`;
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
						const path = new Path(node.attributes.d);
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
						const rd = Math.abs(d.x) > Math.abs(d.y) ? -d.x : -d.y;
						point = applyToPoint(matrix, { x: cx, y: cy });
						node.attributes.cx = `${point.x - rd}`;
						node.attributes.cy = `${point.y - rd}`;
						node.attributes.r = `${Math.max(Math.abs(r - rd), 1)}`;
						break;
					case "ellipse":
						const rx = parseFloat(node.attributes.rx || "1");
						const ry = parseFloat(node.attributes.ry || "1");
						point = applyToPoint(matrix, { x: cx, y: cy });
						node.attributes.cx = `${point.x + d.x}`;
						node.attributes.cy = `${point.y + d.y}`;
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
						const path = new Path(node.attributes.d);
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
				const path = new Path(node.attributes.d);
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
				const path = new Path(node.attributes.d);
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
