import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, ChangeDetectorRef } from "@angular/core";

import { Observable } from "../../types/observer";
import { findParent, SavageSVG } from "../../types/svg";
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
	@ViewChild("doc", { static: false }) container: ElementRef<SVGSVGElement>;
	document: Observable<SavageSVG>;
	pointerMoved = false;
	panning: { enabled: boolean, prevX: number, prevY: number } = { enabled: false, prevX: null, prevY: null };

	protected globalListeners: Record<string, Array<(event: Event) => void>> = {};
	protected canvasListeners: Record<string, Array<(event: Event) => void>> = {};

	constructor(
		protected cdRef: ChangeDetectorRef,
		protected file: SvgFileService,
		public canvas: CanvasService,
	) {
		this.globalListeners.keyup = [this.onKeyUp.bind(this)];
		this.globalListeners.mousemove = [this.onMouseMove.bind(this)];
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

	onMouseDown(event: MouseEvent): void {
		this.handleMouseDown({ event, node: null });
	}

	onMouseMove(event: MouseEvent): void {
		if (Math.abs(event.movementX) > 5 || Math.abs(event.movementY) > 5) {
			this.pointerMoved = true;
		}
		if (this.panning.enabled) {
			const dx = ((this.panning.prevX || event.screenX) - event.screenX) * 15;
			const dy = ((this.panning.prevY || event.screenY) - event.screenY) * 15;
			this.panning.prevX = event.screenX;
			this.panning.prevY = event.screenY;
			this.element.nativeElement.scrollBy({ behavior: "smooth", top: dy, left: dx });
		}
	}

	onKeyDown(event: KeyboardEvent): void {
		if (event.key === " ") {
			event.preventDefault();
			this.panning = { enabled: true, prevX: null, prevY: null };
		}
	}

	onKeyUp(event: KeyboardEvent): void {
		if (event.key === " ") {
			// event.preventDefault();
			this.panning = { enabled: false, prevX: null, prevY: null };
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

	handleMouseDown(event: IDocumentEvent): void {
		const multiselect = this.canvas.tools[this.canvas.activeTool]?.multiselect;
		const node = event.node;
		const ctrl = (<MouseEvent> event.event).ctrlKey;
		const shift = (<MouseEvent> event.event).shiftKey;
		const alt = (<MouseEvent> event.event).altKey;
		if (!node) {
			if (!shift) {
				this.canvas.selection = [];
			}
		} else if (shift && ctrl) {
			return;
		} else if (shift && alt && multiselect) {
			const parent = findParent(this.document, node.nid);
			if (!this.canvas.selection.includes(parent)) {
				this.canvas.selection = [...this.canvas.selection, parent];
			}
		} else if (ctrl && alt) {
			if (multiselect) {
				const parent = findParent(this.document, node.nid);
				this.canvas.selection = this.canvas.selection.filter((n) => n.nid !== parent.nid);
			} else {
				this.canvas.selection = [];
			}
		} else if (ctrl) {
			if (multiselect) {
				this.canvas.selection = this.canvas.selection.filter((n) => n.nid !== node.nid);
			} else {
				this.canvas.selection = [];
			}
		} else if (alt) {
			const parent = findParent(this.document, node.nid);
			this.canvas.selection = [parent];
		} else if (shift && multiselect) {
			if (!this.canvas.selection.includes(node)) {
				this.canvas.selection = [...this.canvas.selection, node];
			}
		} else {
			this.canvas.selection = [node];
		}
	}

	handleKeyDown(event: IDocumentEvent): void {
		this.canvas.tools[this.canvas.activeTool]?.handleKeyDown(event);
		this.cdRef.detectChanges();
	}
}
