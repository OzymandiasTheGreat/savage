import { Component, OnInit, OnDestroy, Input, ViewChild, ElementRef } from "@angular/core";
import { nanoid } from "nanoid/non-secure";
import { Path, CompoundPath, Point, Rectangle, Size } from "paper";

import { Observable } from "../../types/observer";
import { SavageSVG, screen2svg, findParent } from "../../types/svg";
import { ICanvasTool, CanvasService } from "../../services/canvas.service";
import { IDocumentEvent } from "../document/document.component";
import { HistoryService } from "../../services/history.service";
import { ObjectToolComponent } from "../object-tool/object-tool.component";


@Component({
	selector: "app-shape-tool",
	templateUrl: "./shape-tool.component.html",
	styleUrls: ["./shape-tool.component.scss"]
})
export class ShapeToolComponent implements ICanvasTool, OnInit, OnDestroy {
	name: "SHAPE" = "SHAPE";
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
	cx = 0;
	cy = 0;
	draw = false;
	drawing: SavageSVG = null;
	mode: "spiral" | "heart" | "arrow" | "donut" | "cylinder" | "cube" | "pyramid" | "cone" = "spiral";
	spiralSegmentCount = 7;
	arrowHeadWidth = 32;
	arrowHeadHeight = 28;
	arrowWidth = 24;
	donutWidth = 10;

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
		this.draw = true;
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
				d: `M ${point.x},${point.y}`,
				fill: "none",
				stroke: "currentColor",
				"stroke-width": `${this.wx}`,
			},
		};
	}

	handleMouseMove(event: PointerEvent): void {
		if (this.draw && this.drawing) {
			const path = new CompoundPath(this.drawing.attributes.d);
			const cx = this.cx;
			const cy = this.cy;
			const point = screen2svg(this.overlay.nativeElement, { x: event.pageX, y: event.pageY });
			const r = Math.max(Math.abs(point.x - cx), Math.abs(point.y - cy));
			let d: string;
			path.removeChildren();
			path.moveTo(new Point(cx, cy));

			switch (this.mode) {
				case "spiral":
					d = this.spiral(path, r, this.spiralSegmentCount);
					this.drawing.attributes.d = d;
					break;
				case "arrow":
					const angle = Math.atan2(cx - point.x, point.y - cy) * 180 / Math.PI;
					d = this.arrow(path, Math.max(r, this.arrowHeadHeight), angle);
					this.drawing.attributes.d = d;
					break;
				case "heart":
					d = this.heart(path, r * 2);
					this.drawing.attributes.d = d;
					break;
				case "donut":
					d = this.donut(r);
					this.drawing.attributes.d = d;
					break;
				case "cylinder":
					d = this.cylinder(path, Math.abs(point.x - cx), Math.abs(point.y - cy));
					this.drawing.attributes.d = d;
					break;
				case "cube":
					d = this.cube(path, Math.abs(point.x - cx), Math.abs(point.y - cy));
					this.drawing.attributes.d = d;
					break;
				case "pyramid":
					d = this.pyramid(path, Math.abs(point.x - cx), Math.abs(point.y - cy));
					this.drawing.attributes.d = d;
					break;
				case "cone":
					d = this.cone(path, Math.abs(point.x - cx), Math.abs(point.y - cy));
					this.drawing.attributes.d = d;
					break;
			}
			path.remove();
		}
	}

	handleMouseUp(event: PointerEvent): void {
		this.draw = false;
		if (this.drawing) {
			const parent = this.selection.length ? findParent(this.document, this.selection[0].nid) : this.document;
			if (parent) {
				const index = this.selection.length ? parent.children.indexOf(this.selection[0]) + 1 : parent.children.length;
				parent.children.splice(index, 0, <any> this.drawing);
				this.history.snapshot("Draw shape");
			}
		}
		this.drawing = null;
	}

	handleKeyDown(event: IDocumentEvent): void {
		(<ObjectToolComponent> this.canvas.tools.OBJECT).handleKeyDown(event);
	}

	spiral(path: paper.CompoundPath, r: number, count: number): string {
		const cx = this.cx;
		const cy = this.cy;
		const stepSize = 2 * Math.PI / count;
		const endAngle = 2 * Math.PI * count;
		let finished = false;

		path.moveTo(new Point(cx, cy));
		for (let angle = 0; !finished; angle += stepSize) {
			if (angle > endAngle) {
				angle = endAngle;
				finished = true;
			}
			const rotatedAngle = angle + 90;
			const x = cx + angle * Math.cos(rotatedAngle);
			const y = cy + angle * Math.sin(rotatedAngle);
			path.lineTo(new Point(x, y));
		}
		path.smooth({ type: "continuous" });
		path.fitBounds(new Rectangle(cx - r, cy - r, r * 2, r * 2));
		return path.pathData;
	}

	arrow(path: paper.CompoundPath, length: number, angle: number): string {
		const cx = this.cx;
		const cy = this.cy;

		path.lineTo(new Point(cx + this.arrowWidth / 2, cy));
		path.lineTo(new Point(cx + this.arrowWidth / 2, cy + length - this.arrowHeadHeight));
		path.lineTo(new Point(cx + this.arrowHeadWidth / 2, cy + length - this.arrowHeadHeight));
		path.lineTo(new Point(cx, cy + length));
		path.lineTo(new Point(cx - this.arrowHeadWidth / 2, cy + length - this.arrowHeadHeight));
		path.lineTo(new Point(cx - this.arrowWidth / 2, cy + length - this.arrowHeadHeight));
		path.lineTo(new Point(cx - this.arrowWidth / 2, cy));
		path.lineTo(new Point(cx, cy));
		path.rotate(angle, new Point(cx, cy));
		return path.pathData;
	}

	heart(path: paper.CompoundPath, width: number): string {
		const cx = this.cx;
		const cy = this.cy;
		path.moveTo(new Point(cx - width / 2, cy));
		path.arcTo(new Point(cx - width / 4, cy - width * 0.4), new Point(cx, cy - width * 0.2));
		path.arcTo(new Point(cx + width / 4, cy - width * 0.4), new Point(cx + width / 2, cy));
		path.curveTo(new Point(cx + width * 0.3, cy + width * 0.3), new Point(cx, cy + width * 0.6));
		path.curveTo(new Point(cx - width * 0.3, cy + width * 0.3), new Point(cx - width / 2, cy));
		return path.pathData;
	}

	donut(r: number): string {
		const circleOut = new Path.Circle(new Point(this.cx, this.cy), r);
		const circleIn = new Path.Circle(new Point(this.cx, this.cy), r - this.donutWidth);
		const donut = circleOut.subtract(circleIn);
		const d = donut.pathData;
		circleOut.remove();
		circleIn.remove();
		donut.remove();
		return d;
	}

	cylinder(path: paper.CompoundPath, width: number, height: number): string {
		const cx = this.cx;
		const cy = this.cy;
		path.moveTo(new Point(cx - width * 0.5, cy + height * 0.2));
		path.lineTo(new Point(cx - width * 0.5, cy + height * 0.8));
		path.arcTo(new Point(cx, cy + height), new Point(cx + width * 0.5, cy + height * 0.8));
		path.lineTo(new Point(cx + width * 0.5, cy + height * 0.2));
		path.moveTo(new Point(cx + width * 0.5, cy + height * 0.2));
		path.cubicCurveTo(
			new Point(cx + width * 0.45, cy + height * 0.47),
			new Point(cx - width * 0.45, cy + height * 0.47),
			new Point(cx - width * 0.5, cy + height * 0.2));
		const ellipse = new Path.Ellipse(new Rectangle(new Point(cx - width * 0.5, cy), new Size(width, height * 0.4)));
		path.addChild(ellipse);
		return path.pathData;
	}

	cube(path: paper.CompoundPath, width: number, height: number): string {
		const cx = this.cx;
		const cy = this.cy;
		path.moveTo(new Point(cx - width * 0.3, cy - height * 0.3));
		path.lineTo(new Point(cx + width * 0.5, cy - height * 0.3));
		path.lineTo(new Point(cx + width * 0.5, cy + height * 0.4));
		path.lineTo(new Point(cx + width * 0.3, cy + height * 0.7));
		path.lineTo(new Point(cx - width * 0.5, cy + height * 0.7));
		path.lineTo(new Point(cx - width * 0.5, cy));
		path.lineTo(new Point(cx - width * 0.3, cy - height * 0.3));
		path.moveTo(new Point(cx - width * 0.5, cy));
		path.lineTo(new Point(cx + width * 0.3, cy));
		path.lineTo(new Point(cx + width * 0.5, cy - height * 0.3));
		path.moveTo(new Point(cx + width * 0.3, cy));
		path.lineTo(new Point(cx + width * 0.3, cy + height * 0.7));
		path.moveTo(new Point(cx - width * 0.5, cy));
		path.lineTo(new Point(cx + width * 0.3, cy));
		path.lineTo(new Point(cx + width * 0.5, cy - height * 0.3));		return path.pathData;
	}

	pyramid(path: paper.CompoundPath, width: number, height: number): string {
		const cx = this.cx;
		const cy = this.cy;
		path.moveTo(new Point(cx - width * 0.05, cy + height * 0.5));
		path.lineTo(new Point(cx - width * 0.5, cy + height * 0.3));
		path.lineTo(new Point(cx + width * 0.05, cy + height * 0.1));
		path.lineTo(new Point(cx + width * 0.5, cy + height * 0.3));
		path.lineTo(new Point(cx - width * 0.05, cy + height * 0.5));
		path.lineTo(new Point(cx - width * 0.05, cy - height * 0.5));
		path.lineTo(new Point(cx - width * 0.5, cy + height * 0.3));
		path.lineTo(new Point(cx - width * 0.05, cy - height * 0.5));
		path.lineTo(new Point(cx + width * 0.5, cy + height * 0.3));
		path.moveTo(new Point(cx - width * 0.5, cy + height * 0.3));
		path.lineTo(new Point(cx - width * 0.05, cy - height * 0.5));
		path.lineTo(new Point(cx + width * 0.05, cy + height * 0.1));
		return path.pathData;
	}

	cone(path: paper.CompoundPath, width: number, height: number): string {
		const cx = this.cx;
		const cy = this.cy;
		const ellipse = new Path.Ellipse(new Rectangle(new Point(cx - width * 0.5, cy + height * 0.1), new Size(width, height * 0.4)));
		path.addChild(ellipse);
		path.moveTo(new Point(cx - width * 0.5, cy + height * 0.275));
		path.lineTo(new Point(cx, cy - height * 0.5));
		path.lineTo(new Point(cx + width * 0.5, cy + height * 0.275));
		return path.pathData;
	}
}
