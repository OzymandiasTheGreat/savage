import { Directive, Input, ElementRef, OnInit, OnDestroy } from "@angular/core";

import { CanvasService } from "../../services/canvas.service";


@Directive({
	selector: "[appRegistry]"
})
export class RegistryDirective implements OnInit, OnDestroy {
	@Input("appRegistry") nid: string;

	constructor(
		protected host: ElementRef,
		protected canvas: CanvasService,
	) { }

	ngOnInit(): void {
		this.canvas.registry[this.nid] = this.host.nativeElement;
	}

	ngOnDestroy(): void {
		delete this.canvas.registry[this.nid];
	}
}
