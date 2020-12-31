import { Component, OnInit, OnDestroy, Input, ViewChild, ElementRef } from "@angular/core";
import { Path, Segment, Point, Matrix, Rectangle, Size } from "paper";
import { compose, fromDefinition, fromTransformAttribute } from "transformation-matrix";
import { nanoid } from "nanoid/non-secure";

import { Change, Observable } from "../../types/observer";
import { SavageSVG, screen2svg, find } from "../../types/svg";
import { ICanvasTool, CanvasService } from "../../services/canvas.service";
import { IDocumentEvent } from "../document/document.component";
import { DragEvent } from "../directives/draggable.directive";


@Component({
	selector: "app-path-tool",
	templateUrl: "./path-tool.component.html",
	styleUrls: ["./path-tool.component.scss"]
})
export class PathToolComponent implements ICanvasTool, OnInit, OnDestroy {
	private _node: Observable<SavageSVG>;
	private _path: paper.Path;
	private _matrix: paper.Matrix;
	private _transformObserver = (changes: Change[]) => {
		for (const change of changes) {
			if (change.path[change.path.length - 1] === "transform") {
				const m = compose(fromDefinition(fromTransformAttribute(change.value)));
				this.path?.transform(this._matrix.inverted());
				this._matrix = new Matrix(m.a, m.b, m.c, m.d, m.e, m.f);
				this.path?.transform(this._matrix);
			}
		}
	}
	private _dObserver = (changes: Change[]) => {
		for (const change of changes) {
			if (change.path[change.path.length - 1] === "d" && this.external) {
				this.path.pathData = change.value;
			}
		}
	}
	name: "PATH" = "PATH";
	external = true;
	@Input() document: Observable<SavageSVG>;
	@Input() scrollable: HTMLElement;
	@Input() set node(value) {
		const node = (<Observable<SavageSVG>[]> <unknown> value).filter((n) => n.name === "path")[0];
		this._node?.attributes.unobserve(this._transformObserver);
		this._node?.attributes.unobserve(this._dObserver);
		this._node = node || null;
		if (this._path) {
			this._path.remove();
		}
		this._path = !!node ? new Path(node.attributes.d) : null;
		if (this._path) {
			if (node?.attributes.transform) {
				const m = compose(fromDefinition(fromTransformAttribute(node.attributes.transform)));
				this._matrix = new Matrix(m.a, m.b, m.c, m.d, m.e, m.f);
			} else {
				this._matrix = new Matrix(1, 0, 0, 1, 0, 0);
			}
			this.path.transform(this._matrix);
			node?.attributes.observe(this._transformObserver);
			node?.attributes.observe(this._dObserver);
		}
	}
	get node(): Observable<SavageSVG> { return this._node; }
	get path(): paper.Path { return this._path; }
	get segments(): paper.Segment[] { return this._path ? this._path.segments : []; }
	get d(): string {
		if (this.path && this._matrix) {
			const clone = this.path.clone();
			clone.transform(this._matrix.inverted());
			return clone.pathData;
		}
		return this.path.pathData;
	}
	get wx(): number {
		return (parseFloat(this.document.attributes.viewBox?.split(" ")[2]) || parseFloat(this.document.attributes.width)) / 350;
	}
	get hx(): number {
		return (parseFloat(this.document.attributes.viewBox?.split(" ")[3]) || parseFloat(this.document.attributes.height)) / 350;
	}
	@ViewChild("overlay", { static: true }) overlay: ElementRef<SVGSVGElement>;
	selectbox: paper.Rectangle = null;
	selection: paper.Segment[];

	private mouseDownTimeout: any;

	constructor(
		public canvas: CanvasService,
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
		const mEvent = <MouseEvent> event.event;
		const shift = mEvent.shiftKey;
		const position = screen2svg(this.overlay.nativeElement, { x: mEvent.clientX, y: mEvent.clientY });
		if (this.path) {
			if (shift) {
				const point = new Point(position.x, position.y);
				const location = this.path.getNearestLocation(point);
				const previous = location.segment;
				const segment = new Segment(point);
				this.path.insertSegments(previous.index + 1, [segment]);
				const clone = this.path.clone({ insert: false, deep: false });
				clone.transform(this._matrix.inverted());
				this.external = false;
				this.node.attributes.d = clone.pathData;
				this.external = true;
			} else {
				const point = new Point(position.x, position.y);
				const segment = new Segment(point);
				this.path.addSegments([segment]);
				const clone = this.path.clone({ insert: false, deep: false });
				clone.transform(this._matrix.inverted());
				this.external = false;
				this.node.attributes.d = clone.pathData;
				this.external = true;
			}
		} else {
			const nid = nanoid(13);
			const path: SavageSVG = {
				nid,
				name: "path",
				type: "element",
				value: "",
				children: <any> [],
				attributes: <any> { d: `M ${position.x},${position.y}` },
			};
			this.document.children.push(<any> path);
			this.canvas.selection = [find(this.document, nid)];
		}
	}

	handleMouseDown(event: IDocumentEvent): void {
		const ev = <MouseEvent> event.event;
		const point = screen2svg(this.overlay.nativeElement, { x: ev.clientX, y: ev.clientY });
		this.selectbox = new Rectangle(new Point(point.x, point.y), new Size(0, 0));
		if (!this.mouseDownTimeout) {
			this.mouseDownTimeout = setTimeout(() => {
				const node = event.node;
				clearTimeout(this.mouseDownTimeout);
				this.mouseDownTimeout = null;
				if (!this.selectbox) {
					if (!node || node.name !== "path") {
						this.canvas.selection = [];
					} else {
						this.canvas.selection = [node];
					}
					if (node !== this.node) {
						this.selection = [];
					}
				}
			}, 550);
		}
	}

	handleMouseMove(event: MouseEvent): void {
		if (this.selectbox) {
			const point = screen2svg(this.overlay.nativeElement, { x: event.clientX, y: event.clientY });
			this.selectbox.size.set(point.x - this.selectbox.x, point.y - this.selectbox.y);
		}
	}

	handleMouseUp(event: MouseEvent): void {
		if (this.selectbox) {
			this.selection = [];
			for (const segment of this.segments) {
				if (segment.point.isInside(this.selectbox)) {
					this.selection.push(segment);
				}
			}
		}
		this.selectbox = null;
	}

	handleDrag(event: IDocumentEvent): void { }

	handleKeyDown(event: IDocumentEvent): void { }

	onSegmentDown(segment: paper.Segment, event: MouseEvent): void {
		event.preventDefault();
		event.stopPropagation();
		const ctrl = event.ctrlKey;
		const shift = event.shiftKey;
		if (shift && ctrl) {
			return;
		} else if (shift) {
			this.selection.push(segment);
		} else if (ctrl) {
			this.selection = this.selection.filter((s) => s !== segment);
		} else {
			this.selection = [segment];
		}
		(<SVGElement> event.target).focus();
	}

	onKeyDown(segment: paper.Segment, event: KeyboardEvent): void {
		const alt = event.altKey;
		const ctrl = event.ctrlKey;
		const shift = event.shiftKey;
		let clone: paper.Path;
		switch (event.key) {
			case "ArrowLeft":
				event.preventDefault();
				event.stopPropagation();
				// segment.point.set(segment.point.x - (alt ? this.wx : this.wx * 5), segment.point.y);
				for (const seg of this.selection) {
					seg.point.set(seg.point.x - (alt ? this.wx : this.wx * 5), seg.point.y);
				}
				clone = this.path.clone({ insert: false, deep: false });
				clone.transform(this._matrix.inverted());
				this.external = false;
				this.node.attributes.d = clone.pathData;
				this.external = true;
				break;
			case "ArrowRight":
				event.preventDefault();
				event.stopPropagation();
				// segment.point.set(segment.point.x + (alt ? this.wx : this.wx * 5), segment.point.y);
				for (const seg of this.selection) {
					seg.point.set(seg.point.x + (alt ? this.wx : this.wx * 5), seg.point.y);
				}
				clone = this.path.clone({ insert: false, deep: false });
				clone.transform(this._matrix.inverted());
				this.external = false;
				this.node.attributes.d = clone.pathData;
				this.external = true;
				break;
			case "ArrowUp":
				event.preventDefault();
				event.stopPropagation();
				// segment.point.set(segment.point.x, segment.point.y - (alt ? this.wx : this.wx * 5));
				for (const seg of this.selection) {
					seg.point.set(seg.point.x, seg.point.y - (alt ? this.wx : this.wx * 5));
				}
				clone = this.path.clone({ insert: false, deep: false });
				clone.transform(this._matrix.inverted());
				this.external = false;
				this.node.attributes.d = clone.pathData;
				this.external = true;
				break;
			case "ArrowDown":
				event.preventDefault();
				event.stopPropagation();
				// segment.point.set(segment.point.x, segment.point.y + (alt ? this.wx : this.wx * 5));
				for (const seg of this.selection) {
					seg.point.set(seg.point.x, seg.point.y + (alt ? this.wx : this.wx * 5));
				}
				clone = this.path.clone({ insert: false, deep: false });
				clone.transform(this._matrix.inverted());
				this.external = false;
				this.node.attributes.d = clone.pathData;
				this.external = true;
				break;
			case "Delete":
				event.preventDefault();
				event.stopPropagation();
				for (const seg of this.selection) {
					this.path.removeSegment(seg.index);
				}
				this.selection = [];
				clone = this.path.clone({ insert: false, deep: false });
				clone.transform(this._matrix.inverted());
				this.external = false;
				this.node.attributes.d = clone.pathData;
				this.external = true;
				break;
			case "a":
				event.preventDefault();
				event.stopPropagation();
				if (ctrl && !shift && !alt) {
					this.selection = [...this.segments];
				}
				break;
			case "A":
				event.preventDefault();
				event.stopPropagation();
				if (ctrl && shift && !alt) {
					this.selection = [];
				}
				break;
			case "i":
				event.preventDefault();
				event.stopPropagation();
				if (ctrl && !alt) {
					const selection = [...this.selection];
					this.selection = this.segments.filter((s) => !selection.includes(s));
				}
				break;
		}
	}

	handleSegmentDrag(index: number, event: DragEvent): void {
		const position = screen2svg(this.overlay.nativeElement, { x: event.x, y: event.y });
		const previous = screen2svg(this.overlay.nativeElement, { x: event.prevX, y: event.prevY });
		const d = { x: position.x - previous.x, y: position.y - previous.y };
		for (const segment of this.selection) {
			segment.point.set(segment.point.x + d.x, segment.point.y + d.y);
		}
		// this.segments[index].point.set(position.x, position.y);
		const clone = this.path.clone({ insert: false, deep: false });
		clone.transform(this._matrix.inverted());
		this.external = false;
		this.node.attributes.d = clone.pathData;
		this.external = true;
	}

	handleHandleDrag(segment: paper.Segment, handle: "in" | "out", event: DragEvent): void {
		const position = screen2svg(this.overlay.nativeElement, { x: event.x, y: event.y });
		const previous = screen2svg(this.overlay.nativeElement, { x: event.prevX, y: event.prevY });
		const d = { x: position.x - previous.x, y: position.y - previous.y };
		const point = segment[handle === "in" ? "handleIn" : "handleOut"];
		point.set(point.x + d.x, point.y + d.y);
		const clone = this.path.clone({ insert: false, deep: false });
		clone.transform(this._matrix.inverted());
		this.external = false;
		this.node.attributes.d = clone.pathData;
		this.external = true;
	}
}
