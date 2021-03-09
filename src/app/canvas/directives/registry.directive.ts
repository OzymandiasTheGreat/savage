import { Directive, Input, ElementRef, OnInit, OnDestroy } from "@angular/core";

import { CanvasService } from "../../services/canvas.service";


@Directive({
	selector: "[appRegistry]"
})
export class RegistryDirective implements OnInit {
	@Input("appRegistry") nid: string;

	constructor(
		protected host: ElementRef,
		protected canvas: CanvasService,
	) { }

	ngOnInit(): void {
		this.canvas.registry[this.nid] = this.host.nativeElement;
	}

	// Race condition: when rearranging elements new element get created before
	// existing element is removed, removing both from the registry
	// ngOnDestroy(): void {
	// 	delete this.canvas.registry[this.nid];
	// }
}
