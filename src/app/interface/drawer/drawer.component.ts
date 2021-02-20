import { Component, OnInit } from "@angular/core";
import { FormControl } from "@angular/forms";
import { MatDialog } from "@angular/material/dialog";

import { SvgFileService } from "../../services/svg-file.service";
import { NewDocumentDialogComponent } from "../new-document-dialog/new-document-dialog.component";


@Component({
	selector: "app-drawer",
	templateUrl: "./drawer.component.html",
	styleUrls: ["./drawer.component.scss"]
})
export class DrawerComponent implements OnInit {
	openControl: FormControl;
	inlineSVG: FormControl;
	inlineRaster: FormControl;

	constructor(
		protected dialog: MatDialog,
		public file: SvgFileService,
	) {
		this.openControl = new FormControl("");
		this.inlineSVG = new FormControl("");
		this.inlineRaster = new FormControl("");
	}

	ngOnInit(): void {
		this.openControl.valueChanges.subscribe((file) => {
			this.file.openUploadSVG(file);
		});
		this.inlineSVG.valueChanges.subscribe((file) => {
			this.file.inlineSVG(file);
		});
		this.inlineRaster.valueChanges.subscribe((file) => {
			this.file.inlineRaster(file);
		});
	}

	emptyDoc(): void {
		const ref = this.dialog.open(NewDocumentDialogComponent);
		ref.afterClosed().subscribe((dimensions) => {
			if (dimensions) {
				this.file.emptyDoc(dimensions);
			}
		});
	}
}
