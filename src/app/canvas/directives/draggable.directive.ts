import { Directive, ElementRef, Input, Output, EventEmitter, OnInit, OnChanges, OnDestroy, SimpleChanges } from "@angular/core";
import interact from "interactjs";
import { Interactable, DragEvent, SnapTarget } from "@interactjs/types/index";


@Directive({
	selector: "[appDraggable]",
})
export class DraggableDirective implements OnInit, OnChanges, OnDestroy {
	private draggable: Interactable;
	@Input() enabled = true;
	@Input() grid: { enabled: boolean, step: number, limits: { top: number, left: number, bottom: number, right: number } };
	@Input() guides: SnapTarget[];
	@Input() snap: boolean;
	@Input() doc: SVGSVGElement;
	@Output() dragging: EventEmitter<DragEvent>;

	constructor(
		protected host: ElementRef<HTMLElement>,
	) {
		this.dragging = new EventEmitter<DragEvent>();
	}

	ngOnInit(): void {
		let snap = [];
		if (this.snap) {
			snap = [...this.guides];
			if (this.grid.enabled) {
				snap.push(interact.snappers.grid({ x: this.grid.step, y: this.grid.step }));
			}
		}
		this.draggable = interact(this.host.nativeElement).draggable({
			autoScroll: { enabled: true },
			inertia: { enabled: false },
			enabled: this.enabled,
			modifiers: [interact.modifiers.snap({ targets: snap, range: 20, origin: this.doc, relativePoints: [{ x: 0, y: 0 }] })],

		}).on("mousedown", (event: MouseEvent) => {
			event.stopPropagation();
		}).on(["dragmove", "dragend"], (event: DragEvent) => {
			this.dragging.emit(event);
		}).styleCursor(false);
	}

	ngOnChanges(changes: SimpleChanges): void {
		if (this.draggable) {
			let snap = [];
			if (this.snap) {
				snap = [...this.guides];
				if (this.grid.enabled) {
					snap.push(interact.snappers.grid({ x: this.grid.step, y: this.grid.step }));
				}
			}
			this.draggable.set({
				drag: {
					autoScroll: { enabled: true },
					inertia: { enabled: false },
					enabled: this.enabled,
					modifiers: [interact.modifiers.snap({ targets: snap, range: 20, origin: this.doc, relativePoints: [{ x: 0, y: 0 }] })],
				},
			}).on("mousedown", (event: MouseEvent) => {
				event.stopPropagation();
			}).on(["dragmove", "dragend"], (event: DragEvent) => {
				this.dragging.emit(event);
			}).styleCursor(false);
		}
	}

	ngOnDestroy(): void {
		this.draggable.unset();
	}
}
