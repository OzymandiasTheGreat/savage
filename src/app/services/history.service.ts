import { Injectable } from "@angular/core";
import { Subject, Observable as RxObservable } from "rxjs";

import { Change, Observable, recursiveUnobserve } from "../types/observer";
import { SavageSVG } from "../types/svg";
import { SvgFileService } from "./svg-file.service";


export interface HistorySnapshot {
	name: string;
	start: number;
	end: number;
}


@Injectable({
	providedIn: "root"
})
export class HistoryService {
	private currentFile: Observable<SavageSVG>;
	private history: Change[];
	private observer = this.changeObserver.bind(this);
	private currentIndex = 0;
	private _operation: Subject<boolean>;
	_undo: HistorySnapshot[] = [];
	_redo: HistorySnapshot[] = [];
	operation: RxObservable<boolean>;

	constructor(
		protected file: SvgFileService,
	) {
		this.file.openFile.subscribe((openFile) => {
			if (this.currentFile) {
				this.currentFile.unobserve(this.observer);
			}
			this.history = [];
			this._undo = [];
			this._redo = [];
			this.currentFile = openFile;
			this.currentFile.observe(this.observer);
		});
		this._operation = new Subject<boolean>();
		this.operation = this._operation.asObservable();
	}

	private changeObserver(changes: Change[]): void {
		this.history = this.history.concat(changes);
		this._redo = [];
	}

	snapshot(name: string): void {
		this._undo.push({ name, start: this.currentIndex, end: this.history.length });
		this.currentIndex = this.history.length;
		this.file.save();
	}

	undo(amount: number): void {
		this._operation.next(true);
		const snapshots = this._undo.slice().reverse();
		const last = snapshots[0];
		const first = snapshots[amount - 1];
		const history = this.history.slice(first.start, last.end);
		this.currentFile.unobserve(this.observer);
		for (const change of history.reverse()) {
			if (change.type === "insert") {
				if (typeof change.path[change.path.length - 1] === "number") {
					const node = change.object.splice(change.path[change.path.length - 1], 1)[0];
					recursiveUnobserve(node);
				} else {
					delete change.object[change.path[change.path.length - 1]];
				}
			} else if (change.type === "update") {
				if (typeof change.path[change.path.length - 1] === "number") {
					const node = change.object[change.path[change.path.length - 1]];
					recursiveUnobserve(node);
				}
				change.object[change.path[change.path.length - 1]] = change.oldValue;
			} else if (change.type === "delete") {
				if (typeof change.path[change.path.length - 1] === "number") {
					change.object.splice(change.path[change.path.length - 1], 0, change.oldValue);
				} else {
					change.object[change.path[change.path.length - 1]] = change.oldValue;
				}
			}
		}
		this.currentFile.observe(this.observer);
		const slice = this._undo.splice(this._undo.length - amount, amount);
		this._redo = this._redo.concat(slice.reverse());
		this._operation.next(false);
		this.file.save();
	}

	redo(amount: number): void {
		this._operation.next(true);
		const snapshots = this._redo.slice().reverse().slice(0, amount);
		this.currentFile.unobserve(this.observer);
		for (const snapshot of snapshots) {
			const history = this.history.slice(snapshot.start, snapshot.end);
			for (const change of history) {
				if (change.type === "delete") {
					if (typeof change.path[change.path.length - 1] === "number") {
						change.object.splice(change.path[change.path.length - 1], 1);
					} else {
						delete change.object[change.path[change.path.length - 1]];
					}
				} else if (change.type === "update") {
					change.object[change.path[change.path.length - 1]] = change.value;
				} else if (change.type === "insert") {
					if (typeof change.path[change.path.length - 1] === "number") {
						change.object.splice(change.path[change.path.length - 1], 0, change.value);
					} else {
						change.object[change.path[change.path.length - 1]] = change.value;
					}
				}
			}
		}
		this.currentFile.observe(this.observer);
		this._undo = this._undo.concat(this._redo.splice(this._redo.length - amount, amount).reverse());
		this._operation.next(false);
		this.file.save();
	}
}
