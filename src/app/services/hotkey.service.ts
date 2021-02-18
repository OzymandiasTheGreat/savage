import { Injectable } from "@angular/core";
import { Subject, Observable } from "rxjs";


@Injectable({
	providedIn: "root"
})
export class HotkeyService {
	private _triggered: Subject<string>;
	triggered: Observable<string>;

	constructor() {
		this._triggered = new Subject<string>();
		this.triggered = this._triggered.asObservable();
	}

	trigger(key: string): void {
		this._triggered.next(key);
	}
}
