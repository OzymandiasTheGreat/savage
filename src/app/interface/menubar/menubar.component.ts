import { Component, OnInit, Input } from "@angular/core";
import { MatSidenav } from "@angular/material/sidenav";
import { MatDialog } from "@angular/material/dialog";

import { HistoryService } from "../../services/history.service";
import { CanvasService } from "../../services/canvas.service";
import { GuideDialogComponent } from "../guide-dialog/guide-dialog.component";


@Component({
	selector: "app-menubar",
	templateUrl: "./menubar.component.html",
	styleUrls: ["./menubar.component.scss"]
})
export class MenubarComponent implements OnInit {
	@Input() sidedrawer: MatSidenav;
	@Input() sidebar: MatSidenav;

	constructor(
		protected dialog: MatDialog,
		public history: HistoryService,
		public canvas: CanvasService,
	) { }

	ngOnInit(): void { }

	toggleSnapping(): void {
		this.canvas.snapping = !this.canvas.snapping;
	}

	toggleGrid(): void {
		this.canvas.grid.enabled = !this.canvas.grid.enabled;
	}

	setGrid(): void {
		const ref = this.dialog.open(GuideDialogComponent, { data: { position: this.canvas.grid.step } });
		ref.afterClosed().subscribe((step) => {
			if (step) {
				this.canvas.grid.step = step;
			}
		});
	}

	addGuide(orientation: "vertical" | "horizontal"): void {
		const ref = this.dialog.open(GuideDialogComponent, { data: { position: 0 } });
		ref.afterClosed().subscribe((position) => {
			if (position) {
				switch (orientation) {
					case "vertical":
						this.canvas.guides.push({ x: position });
						break;
					case "horizontal":
						this.canvas.guides.push({ y: position });
						break;
				}
			}
		});
	}

	removeGuide(guide: any): void {
		this.canvas.guides.splice(this.canvas.guides.indexOf(guide), 1);
	}
}
