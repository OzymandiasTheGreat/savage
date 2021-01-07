import { Component, Inject } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";


@Component({
	selector: "app-guide-dialog",
	templateUrl: "./guide-dialog.component.html",
	styleUrls: ["./guide-dialog.component.scss"]
})
export class GuideDialogComponent {

	constructor(
		public dialogRef: MatDialogRef<GuideDialogComponent>,
		@Inject(MAT_DIALOG_DATA) public data: { position: number },
	) { }

	cancel(): void {
		this.dialogRef.close();
	}
}
