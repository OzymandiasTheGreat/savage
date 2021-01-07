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
	scale = 1;
	get guides(): { width: number, height: number, top: number, left: number, borderRight: number, borderBottom: number }[] {
		const guides: { width: number, height: number, top: number, left: number, borderRight: number, borderBottom: number }[] = [];
		for (const target of this.canvas.guides) {
			if (target.x) {
				guides.push({
					width: 0,
					height: 100,
					top: 0,
					left: <number> target.x + this.container.nativeElement.offsetLeft,
					borderRight: 1,
					borderBottom: 0,
				});
			} else {
				guides.push({
					width: 100,
					height: 0,
					top: <number> target.y + this.container.nativeElement.offsetTop,
					left: 0,
					borderRight: 0,
					borderBottom: 1,
				});
			}
		}
		return guides;
	}
	get gridX(): number[] {
		const grid: number[] = [];
		if (this.container) {
			const offset = (this.scrollable.nativeElement.clientWidth % this.container.nativeElement.clientWidth) / 2;
			for (let i = 0; i < this.scrollable.nativeElement.clientWidth; i += this.canvas.grid.step) {
				grid.push(offset + i);
			}
		}
		return grid;
	}
	get gridY(): number[] {
		const grid: number[] = [];
		if (this.container) {
			const offset = (this.scrollable.nativeElement.clientHeight % this.container.nativeElement.clientHeight) / 2;
			for (let i = 0; i < this.scrollable.nativeElement.clientHeight; i += this.canvas.grid.step) {
				grid.push(offset + i);
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
				this.canvas.boundaries = { x: rect.x, y: rect.y, w: rect.width, h: rect.height };
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
			this.scale += 0.01 * -event.deltaY;
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
