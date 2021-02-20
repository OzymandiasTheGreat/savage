import { Component } from "@angular/core";
import { MatDialogRef } from "@angular/material/dialog";


@Component({
	selector: "app-new-document-dialog",
	templateUrl: "./new-document-dialog.component.html",
	styleUrls: ["./new-document-dialog.component.scss"]
})
export class NewDocumentDialogComponent {
	width = 48;
	height = 48;

	constructor(
		private ref: MatDialogRef<NewDocumentDialogComponent>,
	) { }

	create(): void {
		this.ref.close({ width: this.width, height: this.height });
	}

	cancel(): void {
		this.ref.close(null);
	}
}
