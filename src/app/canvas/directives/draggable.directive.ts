import { Directive, ElementRef, Input, Output, EventEmitter, OnInit, OnChanges, OnDestroy, SimpleChanges } from "@angular/core";
import Draggable from "plain-draggable";


export interface DragEvent {
	x: number;
	y: number;
	prevX: number;
	prevY: number;
	end: boolean;
	draggable: Draggable;
	position: IDragPosition;
}


export interface IDragPosition {
	left: number;
	top: number;
	snapped?: boolean;
	autoScroll?: boolean;
}


export type IDragFunction = (position: IDragPosition) => boolean | void;


export interface IRect {
	left: number;
	x?: number;
	top: number;
	y?: number;
	width?: number;
	right?: number;
	height?: number;
	bottom?: number;
}


export interface ISnapTarget {
	x?: {
		start?: number,
		end?: number,
		step?: number,
	} | number;
	y?: {
		start?: number,
		end?: number,
		step?: number,
	} | number;
	step?: number;
	boundingBox?: IRect | HTMLElement;
	gravity?: number;
	corner?: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "all";
	side?: "start" | "end" | "both";
	center?: boolean;
	edge?: "inside" | "outside" | "both";
	base?: "containment" | "document";
}


export interface IDraggableOptions {
	containment?: IRect | HTMLElement | SVGElement;
	autoScroll?: boolean | HTMLElement | SVGElement;
	snap?: Array<ISnapTarget | number | string>;
	handle?: HTMLElement | SVGElement;
	zIndex?: number;
	onDrag?: IDragFunction;
	onMove?: IDragFunction;
	onDragStart?: (event: MouseEvent) => boolean | void;
	onMoveStart?: IDragFunction;
	onDragEnd?: IDragFunction;
}


@Directive({
	selector: "[appDraggable]",
})
export class DraggableDirective implements OnInit, OnChanges, OnDestroy {
	private draggable: Draggable;
	@Input() containment: IDraggableOptions["containment"];
	@Input() autoScroll: IDraggableOptions["autoScroll"];
	@Input() snap: IDraggableOptions["snap"];
	@Input() handle: IDraggableOptions["handle"];
	@Input() zIndex: IDraggableOptions["zIndex"];
	@Input() disabled: boolean;
	@Input() transform: string;
	@Input() style: string;
	@Output() dragging: EventEmitter<DragEvent>;

	private listeners: Record<string, (event: MouseEvent) => void>;
	private movePosition: { x: number, y: number };
	private prevPosition: IDragPosition;
	private restrict: boolean;

	constructor(
		protected host: ElementRef<HTMLElement>,
	) {
		Draggable.draggableCursor = false;
		Draggable.draggingCursor = false;
		this.dragging = new EventEmitter<DragEvent>();
		this.listeners = {
			mousedown: this.restrictDown.bind(this),
			mouseup: this.restrictUp.bind(this),
			mousemove: this.restrictMove.bind(this),
		};
		for (const [event, func] of Object.entries(this.listeners)) {
			(<HTMLElement> this.host.nativeElement).addEventListener(event, func);
		}
	}

	private restrictDown(event: MouseEvent): void {
		this.movePosition = { x: event.clientX, y: event.clientY };
		this.restrict = false;
	}

	private restrictUp(event: MouseEvent): void {
		this.draggable.containment = this.containment;
		this.movePosition = null;
		this.restrict = false;
	}

	private restrictMove(event: MouseEvent): void {
		if (this.movePosition) {
			const el = this.containment instanceof HTMLElement || this.containment instanceof SVGElement ? this.containment : null;
			const rect = <DOMRect> (el?.getBoundingClientRect() || el);
			const dx = Math.abs(this.movePosition.x - event.clientX);
			const dy = Math.abs(this.movePosition.y - event.clientY);
			if (event.ctrlKey && !this.restrict) {
				this.draggable.containment = dx > dy
					? { x: rect.x, y: rect.y, width: rect.width, height: 0 } as IRect
					: { x: rect.x, y: rect.y, width: 0, height: rect.height } as IRect;
				this.restrict = true;
			} else if (!event.ctrlKey && this.restrict) {
				this.draggable.containment = this.containment;
				this.restrict = false;
			}
		}
	}

	private handleEvent(position: IDragPosition, end: boolean = false): void {
		if (this.prevPosition) {
			const event: DragEvent = {
				x: position.left,
				y: position.top,
				prevX: this.prevPosition.left,
				prevY: this.prevPosition.top,
				end,
				draggable: this.draggable,
				position,
			};
			this.dragging.emit(event);
			(<HTMLElement> this.host.nativeElement).setAttribute("transform", this.transform || "");
			(<HTMLElement> this.host.nativeElement).setAttribute("style", this.style || "");
		}
		if (end) {
			this.prevPosition = null;
		} else {
			this.prevPosition = position;
		}
	}

	private resetTransform(): void {
		(<HTMLElement> this.host.nativeElement).setAttribute("transform", this.transform || "");
		(<HTMLElement> this.host.nativeElement).setAttribute("style", this.style || "");
	}

	ngOnInit(): void {
		this.draggable = new Draggable(this.host.nativeElement, {
			containment: this.containment,
			autoScroll: this.autoScroll,
			snap: this.snap,
			handle: this.handle,
			zIndex: this.zIndex,
			onDrag: (args) => this.handleEvent(args),
			onMove: (args) => this.resetTransform(),
			onMoveStart: (args) => { this.prevPosition = { left: args.left, top: args.top }; },
			onDragEnd: () => this.handleEvent({ left: this.prevPosition?.left, top: this.prevPosition?.top }, true),
		} as IDraggableOptions);
		this.draggable.disabled = this.disabled;
		this.style = this.style || this.host.nativeElement.getAttribute("style");
		(<HTMLElement> this.host.nativeElement).setAttribute("transform", this.transform || "");
		(<HTMLElement> this.host.nativeElement).setAttribute("style", this.style || "");
	}

	ngOnChanges(changes: SimpleChanges): void {
		for (const [attr, change] of Object.entries(changes)) {
			if (this.draggable) {
				this.draggable[attr] = change.currentValue;
			}
		}
	}

	ngOnDestroy(): void {
		this.draggable.remove();
		for (const [event, func] of Object.entries(this.listeners)) {
			(<HTMLElement> this.host.nativeElement).removeEventListener(event, func);
		}
	}
}
