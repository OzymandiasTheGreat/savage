import { Directive, ElementRef, Input, OnChanges, OnDestroy, SimpleChanges } from "@angular/core";

import { Observable, Change, } from "../../types/observer";
import { SavageSVG } from "../../types/svg";


@Directive({
	selector: "[appAttrs]"
})
export class AttrsDirective implements OnChanges, OnDestroy {
	@Input("appAttrs") data: Observable<SavageSVG>;
	@Input() skipAttrs: string[] = [];
	protected attrs: string[] = [];
	protected listener: (event: Change[]) => void;

	constructor(
		protected host: ElementRef<HTMLElement>,
	) {
		this.listener = this.onAttrChange.bind(this);
	}

	protected setAttr(key: string, value?: string): void {
		if (!this.skipAttrs.includes(key)) {
			if (value !== undefined && value !== null) {
				this.host.nativeElement.setAttribute(key, value);
				this.attrs.push(key);
			} else if (this.host.nativeElement.hasAttribute(key)) {
				this.host.nativeElement.removeAttribute(key);
			}
		}
	}

	protected remAttr(key: string): void {
		if (!this.skipAttrs.includes(key)) {
			if (this.host.nativeElement.hasAttribute(key)) {
				this.host.nativeElement.removeAttribute(key);
			}
		}
	}

	protected remAll(): void {
		for (const key of this.attrs) {
			if (this.host.nativeElement.hasAttribute(key)) {
				this.host.nativeElement.removeAttribute(key);
			}
		}
	}

	protected onAttrChange(changes): void {
		for (const change of changes) {
			const key = change.path[change.path.length - 1];
			switch (change.type) {
				case "insert":
				case "update":
					this.setAttr(key, change.value);
					break;
				case "delete":
					this.remAttr(key);
			}
		}
	}

	ngOnChanges(changes: SimpleChanges): void {
		if (changes.data) {
			const oldData: Observable<SavageSVG> = changes.data.previousValue;
			const newData: Observable<SavageSVG> = changes.data.currentValue;
			if (oldData) {
				this.remAll();
				oldData.attributes.unobserve(this.onAttrChange);
			}
			if (newData) {
				for (const [key, value] of Object.entries(newData.attributes)) {
					this.setAttr(key, value);
				}
				this.data.attributes.observe(this.listener);
			}
		}
	}

	ngOnDestroy(): void {
		this.data.attributes.unobserve(this.listener);
	}
}
