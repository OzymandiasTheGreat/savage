import { Component, OnInit, Input } from "@angular/core";
import { MatSidenav } from "@angular/material/sidenav";

import { HistoryService } from "../../services/history.service";


@Component({
	selector: "app-menubar",
	templateUrl: "./menubar.component.html",
	styleUrls: ["./menubar.component.scss"]
})
export class MenubarComponent implements OnInit {
	@Input() sidedrawer: MatSidenav;
	@Input() sidebar: MatSidenav;

	constructor(
		public history: HistoryService,
	) { }

	ngOnInit(): void { }
}
