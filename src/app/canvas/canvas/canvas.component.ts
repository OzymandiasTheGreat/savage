import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, ChangeDetectorRef } from "@angular/core";

import { Observable } from "../../types/observer";
import { SavageSVG } from "../../types/svg";
import { SvgFileService } from "../../services/svg-file.service";
import { CanvasService } from "../../services/canvas.service";
import { IDocumentEvent } from "../document/document.component";


@Component({
	selector: "app-canvas",
	templateUrl: "./canvas.component.html",
	styleUrls: ["./canvas.component.scss"]
})
export class CanvasComponent implements OnInit, OnDestroy, AfterViewInit {
	@ViewChild("element", { static: true }) element: ElementRef<HTMLDivElement>;
	@ViewChild("scrollable", { static: true }) scrollable: ElementRef<HTMLDivElement>;
	@ViewChild("doc", { static: false }) container: ElementRef<HTMLDivElement>;
	document: Observable<SavageSVG>;
	pointerMoved = false;
	panning = false;
	get scale(): number { return this.canvas.scale; }
	set scale(val: number) { this.canvas.scale = val; }
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
	get guides(): { x1: number, x2: number, y1: number, y2: number }[] {
		const guides: { x1: number, x2: number, y1: number, y2: number }[] = [];
		for (const target of this.canvas.guides) {
			if (target.x) {
				guides.push({
					x1: target.x,
					x2: target.x,
					y1: 0,
					y2: parseFloat(this.height),
				});
			} else {
				guides.push({
					x1: 0,
					x2: parseFloat(this.width),
					y1: target.y,
					y2: target.y,
				});
			}
		}
		return guides;
	}
	get gridX(): number[] {
		const grid: number[] = [];
		if (this.container) {
			const width = parseFloat(this.width) + this.canvas.grid.step;
			for (let i = 0; i < width; i += this.canvas.grid.step) {
				grid.push(i);
			}
		}
		return grid;
	}
	get gridY(): number[] {
		const grid: number[] = [];
		if (this.container) {
			const height = parseFloat(this.height) + this.canvas.grid.step;
			for (let i = 0; i < height; i += this.canvas.grid.step) {
				grid.push(i);
			}
		}
		return grid;
	}

	protected globalListeners: Record<string, Array<(event: Event) => void>> = {};
	protected canvasListeners: Record<string, Array<(event: Event) => void>> = {};

	constructor(
		protected cdRef: ChangeDetectorRef,
		protected file: SvgFileService,
		public canvas: CanvasService,
	) {
		this.globalListeners.keyup = [this.onKeyUp.bind(this)];
		this.globalListeners.mousemove = [this.onMouseMove.bind(this)];
		this.globalListeners.mouseup = [this.onMouseUp.bind(this)];
		this.canvasListeners.click = [
			(event: MouseEvent) => this.handleClick({ node: null, event }),
		];
	}

	ngOnInit(): void {
		for (const [event, listeners] of Object.entries(this.globalListeners)) {
			for (const listener of listeners) {
				document.addEventListener(event, listener);
			}
		}
		for (const [event, listeners] of Object.entries(this.canvasListeners)) {
			for (const listener of listeners) {
				this.element.nativeElement.addEventListener(event, listener);
			}
		}
		this.file.openFile.subscribe((file) => {
			this.document = file;
			const width = this.scrollable.nativeElement.getBoundingClientRect().width;
			const height = this.scrollable.nativeElement.getBoundingClientRect().height;
			this.canvas.grid = { ...this.canvas.grid, limits: { top: 0, left: 0, right: width, bottom: height } };
		});
	}

	ngOnDestroy(): void {
		for (const [event, listeners] of Object.entries(this.globalListeners)) {
			for (const listener of listeners) {
				document.removeEventListener(event, listener);
			}
		}
		for (const [event, listeners] of Object.entries(this.canvasListeners)) {
			for (const listener of listeners) {
				this.element.nativeElement.removeEventListener(event, listener);
			}
		}
	}

	ngAfterViewInit(): void {
		this.file.openFile.subscribe((file) => {
			setTimeout(() => {
				const rect = this.container.nativeElement.getBoundingClientRect();
				this.container.nativeElement.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
			}, 100);
		});
	}

	get width(): string {
		if (this.document?.attributes.width) {
			return this.document.attributes.width;
		}
		return this.document?.attributes.viewbox.split(" ")[2];
	}

	get height(): string {
		if (this.document?.attributes.height) {
			return this.document.attributes.height;
		}
		return this.document?.attributes.viewbox.split(" ")[3];
	}

	zoom(event: WheelEvent): void {
		if (event.ctrlKey) {
			event.preventDefault();
			event.stopPropagation();
			let scale = this.scale;
			scale += 0.01 * -event.deltaY;
			this.scale = Math.min(Math.max(scale, 0.25), 2.5);
		}
	}

	onMouseDown(event: MouseEvent): void {
		this.handleMouseDown({ event, node: null });
	}

	onMouseMove(event: MouseEvent): void {
		if (Math.abs(event.movementX) > 5 || Math.abs(event.movementY) > 5) {
			this.pointerMoved = true;
		}
		if (this.panning) {
			if ((Math.abs(event.movementX) > 5 || Math.abs(event.movementY) > 12)) {
				const dx = Math.min(Math.max(event.movementX * 7, -75), 75);
				const dy = Math.min(Math.max(event.movementY * 7, -75), 75);
				this.element.nativeElement.scrollBy({ behavior: "smooth", top: dy, left: dx });
			}
		} else {
			this.canvas.tools[this.canvas.activeTool]?.handleMouseMove(event);
		}
	}

	onMouseUp(event: MouseEvent): void {
		this.canvas.tools[this.canvas.activeTool]?.handleMouseUp(event);
	}

	onDblClick(event: MouseEvent): void {
		this.handleDblClick({ node: null, event });
	}

	onKeyDown(event: KeyboardEvent): void {
		if (event.key === " ") {
			event.preventDefault();
			this.panning = true;
		} else {
			this.handleKeyDown({ node: null, event });
		}
	}

	onKeyUp(event: KeyboardEvent): void {
		if (event.key === " ") {
			// event.preventDefault();
			this.panning = false;
		}
	}

	handleDrag(event: IDocumentEvent): void {
		this.canvas.tools[this.canvas.activeTool]?.handleDrag(event);
	}

	handleClick(event: IDocumentEvent): void {
		if (!this.pointerMoved) {
			this.canvas.tools[this.canvas.activeTool]?.handleClick(event);
		}
		this.pointerMoved = false;
	}

	handleDblClick(event: IDocumentEvent): void {
		this.canvas.tools[this.canvas.activeTool]?.handleDblClick(event);
	}

	handleMouseDown(event: IDocumentEvent): void {
		this.canvas.tools[this.canvas.activeTool]?.handleMouseDown(event);
	}

	handleKeyDown(event: IDocumentEvent): void {
		this.canvas.tools[this.canvas.activeTool]?.handleKeyDown(event);
		this.cdRef.detectChanges();
	}
}
