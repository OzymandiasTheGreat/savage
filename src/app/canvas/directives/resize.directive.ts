import { Directive, OnInit, OnDestroy, ElementRef, Output, EventEmitter } from "@angular/core";


@Directive({
	selector: "[appResize]"
})
export class ResizeDirective implements OnInit, OnDestroy {
	// @ts-ignore
	private observer: ResizeObserver;
	// tslint:disable-next-line
	@Output() resize: EventEmitter<DOMRect>;

	constructor(protected host: ElementRef) {
		this.resize = new EventEmitter<DOMRect>();
		// @ts-ignore
		this.observer = new ResizeObserver((entries) => {
			this.resize.emit(entries[0].contentRect);
		});
	}

	ngOnInit(): void {
		this.observer.observe(this.host.nativeElement);
	}

	ngOnDestroy(): void {
		this.observer.unobserve(this.host.nativeElement);
	}
}
