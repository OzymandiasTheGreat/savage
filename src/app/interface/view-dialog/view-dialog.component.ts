import { Component, OnInit, Inject } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";

import { Observable } from "../../types/observer";
import { SavageSVG } from "../../types/svg";


export interface ViewData {
	document: Observable<SavageSVG>;
}


@Component({
	selector: "app-view-dialog",
	templateUrl: "./view-dialog.component.html",
	styleUrls: ["./view-dialog.component.scss"]
})
export class ViewDialogComponent implements OnInit {

	constructor(
		public ref: MatDialogRef<ViewDialogComponent>,
		@Inject(MAT_DIALOG_DATA) public data: ViewData,
	) { }

	ngOnInit(): void { }
}
