import { Component, OnInit, OnDestroy, Input, ViewChild, ElementRef } from "@angular/core";
import { nanoid } from "nanoid/non-secure";

import { Observable } from "../../types/observer";
import { SavageSVG, screen2svg, GRAPHICS, find } from "../../types/svg";
import { ICanvasTool, CanvasService } from "../../services/canvas.service";
import { HistoryService } from "../../services/history.service";
import { IDocumentEvent } from "../document/document.component";


@Component({
	selector: "app-gradient-tool",
	templateUrl: "./gradient-tool.component.html",
	styleUrls: ["./gradient-tool.component.scss"]
})
export class GradientToolComponent implements ICanvasTool, OnInit, OnDestroy {
	protected gradient: Observable<SavageSVG> = null;
	name: "GRADIENT" = "GRADIENT";
	@Input() scale: number;
	@Input() document: Observable<SavageSVG>;
	@Input() scrollable: HTMLElement;
	@Input() selection: Observable<SavageSVG>[];
	get wx(): number {
		return (parseFloat(this.document.attributes.viewBox?.split(" ")[2]) || parseFloat(this.document.attributes.width)) / 350;
	}
	get hx(): number {
		return (parseFloat(this.document.attributes.viewBox?.split(" ")[3]) || parseFloat(this.document.attributes.height)) / 350;
	}
	@ViewChild("overlay", { static: true }) overlay: ElementRef<SVGSVGElement>;
	defs: Observable<SavageSVG>;
	radial = false;
	stroke = false;

	constructor(
		public canvas: CanvasService,
		public history: HistoryService,
	) {
		this.canvas.tools[this.name] = this;
	}

	ngOnInit(): void {
		this.defs = this.document.children.find((e) => e.name === "defs");
	}

	ngOnDestroy(): void {
		delete this.canvas.tools[this.name];
	}

	handleClick(event: IDocumentEvent): void { }

	handleDblClick(event: IDocumentEvent): void { }

	handleDrag(event: IDocumentEvent): void { }

	handleMouseDown(event: IDocumentEvent): void {
		const graphics = this.selection.filter((e) => GRAPHICS.includes(e.name));
		if (graphics) {
			const nid = nanoid(13);
			const id = `gradient-${nanoid(7)}`;
			let gradient: SavageSVG;
			if (this.radial) {
				gradient = {
					nid,
					name: "radialGradient",
					type: "element",
					value: "",
					attributes: <any> {
						id,
						cx: "0.5",
						cy: "0.5",
						r: "1",
						fx: "0.5",
						fy: "0.5",
						fr: "0",
					},
					children: <any> [
						{
							nid: nanoid(13),
							name: "stop",
							type: "element",
							value: "",
							children: <any> [],
							attributes: <any> {
								offset: "0%",
								"stop-color": "currentColor",
							},
						},
						{
							nid: nanoid(13),
							name: "stop",
							type: "element",
							value: "",
							children: <any> [],
							attributes: <any> {
								offset: "100%",
								"stop-color": "#ffffff",
							},
						},
					],
				};
			} else {
				gradient = {
					nid,
					name: "linearGradient",
					type: "element",
					value: "",
					attributes: <any> {
						id,
						x1: "0",
						y1: "0",
						x2: "1",
						y2: "0",
					},
					children: <any> [
						{
							nid: nanoid(13),
							name: "stop",
							type: "element",
							value: "",
							children: <any> [],
							attributes: <any> {
								offset: "0%",
								"stop-color": "currentColor",
							},
						},
						{
							nid: nanoid(13),
							name: "stop",
							type: "element",
							value: "",
							children: <any> [],
							attributes: <any> {
								offset: "100%",
								"stop-color": "#ffffff",
							},
						},
					],
				};
			}
			this.defs.children.push(<any> gradient);
			this.gradient = find(this.defs, nid);
			graphics.forEach((g) => {
				g.attributes[this.stroke ? "stroke" : "fill"] = `url(#${id})`;
			});
		}
	}

	handleMouseMove(event: PointerEvent): void {
		if (this.gradient) {
			const doc = { x: parseFloat(this.document.attributes.width), y: parseFloat(this.document.attributes.height) };
			const point = screen2svg(this.overlay.nativeElement, { x: event.clientX, y: event.clientY });
			if (this.radial) {
				const x = parseFloat(this.gradient.attributes.cx);
				const y = parseFloat(this.gradient.attributes.cy);
				const d = Math.hypot((doc.x / point.x) - x, (doc.y / point.y) - y);
				this.gradient.attributes.r = `${d}`;
			} else {
				this.gradient.attributes.x2 = `${doc.x / point.x}`;
				this.gradient.attributes.y2 = `${doc.y / point.y}`;
			}
		}
	}

	handleMouseUp(event: PointerEvent): void {
		this.gradient = null;
	}

	handleKeyDown(event: IDocumentEvent): void { }
}
