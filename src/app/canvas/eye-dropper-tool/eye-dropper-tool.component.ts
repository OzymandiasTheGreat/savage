import { Component, OnInit, OnDestroy, Input, ViewChild, ElementRef } from "@angular/core";
import { stringify } from "svgson";
import Canvg from "canvg";

import { Observable } from "../../types/observer";
import { SavageSVG, screen2svg } from "../../types/svg";
import { ICanvasTool, CanvasService } from "../../services/canvas.service";
import { IDocumentEvent } from "../document/document.component";
import { ObjectToolComponent } from "../object-tool/object-tool.component";
import { HistoryService } from "../../services/history.service";


@Component({
	selector: "app-eye-dropper-tool",
	templateUrl: "./eye-dropper-tool.component.html",
	styleUrls: ["./eye-dropper-tool.component.scss"]
})
export class EyeDropperToolComponent implements ICanvasTool, OnInit, OnDestroy {
	name: "EYEDROPPER" = "EYEDROPPER";
	@Input() scale: number;
	@Input() document: Observable<SavageSVG>;
	@Input() scrollable: HTMLElement;
	@Input() selection: Observable<SavageSVG>[];
	@ViewChild("overlay", { static: true }) overlay: ElementRef<SVGSVGElement>;
	field: "document" | "fill" | "stroke" = "document";

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
		const width = parseFloat(this.document.attributes.width);
		const height = parseFloat(this.document.attributes.height);
		const viewbox = this.document.attributes.viewBox
			? this.document.attributes.viewBox.split(" ").map((i) => parseFloat(i))
			: [0, 0, width, height];
		const ev = <PointerEvent> event.event;
		const point = screen2svg(this.overlay.nativeElement, { x: ev.pageX, y: ev.pageY });
		const canvas = document.createElement("canvas");
		canvas.width = width;
		canvas.height = height;
		canvas.style.position = "fixed";
		canvas.style.left = "-1000vw";
		document.body.appendChild(canvas);
		const ctx = canvas.getContext("2d");
		Canvg.fromString(ctx, stringify(<any> this.document), { anonymousCrossOrigin: true }).render();
		setTimeout(() => {
			const color = ctx.getImageData(point.x * (width / viewbox[2]), point.y * (height / viewbox[3]), 1, 1).data;
			const hex = `#${color[0].toString(16)}${color[1].toString(16).padStart(2, "0")}${color[2].toString(16).padStart(2, "0")}${color[3].toString(16).padStart(2, "0")}`;
			document.body.removeChild(canvas);
			switch (this.field) {
				case "document":
					this.document.attributes.color = hex;
					break;
				case "fill":
					this.selection.forEach((n) => n.attributes.fill = hex);
					break;
				case "stroke":
					this.selection.forEach((n) => n.attributes.stroke = hex);
					break;
			}
			this.history.snapshot("Pick color");
		}, 750);
	}

	handleMouseMove(event: PointerEvent): void { }

	handleMouseUp(event: PointerEvent): void { }

	handleKeyDown(event: IDocumentEvent): void {
		(<ObjectToolComponent> this.canvas.tools.OBJECT).handleKeyDown(event);
	}
}
