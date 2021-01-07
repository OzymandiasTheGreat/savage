import { Component, Inject } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";


export interface HrefData {
	href: string;
	autocomplete?: string[];
}


@Component({
	selector: "app-href-dialog",
	templateUrl: "./href-dialog.component.html",
	styleUrls: ["./href-dialog.component.scss"]
})
export class HrefDialogComponent {
	constructor(
		public dialogRef: MatDialogRef<HrefDialogComponent>,
		@Inject(MAT_DIALOG_DATA) public data: HrefData,
	) { }

	cancel(): void {
		this.dialogRef.close();
	}
}
