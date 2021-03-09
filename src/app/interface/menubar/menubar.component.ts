import { Component, OnInit, Input } from "@angular/core";
import { MatSidenav } from "@angular/material/sidenav";
import { MatDialog } from "@angular/material/dialog";
import { BreakpointObserver, Breakpoints } from "@angular/cdk/layout";
import { stringify } from "svgson";
import { html } from "js-beautify";
import svgo from "svgo/dist/svgo.browser.js";
import Canvg from "canvg";

import { HistoryService } from "../../services/history.service";
import { CanvasService } from "../../services/canvas.service";
import { SvgFileService } from "../../services/svg-file.service";
import { HotkeyService } from "../../services/hotkey.service";
import { GuideDialogComponent } from "../guide-dialog/guide-dialog.component";
import { ShortcutsDialogComponent } from "../shortcuts-dialog/shortcuts-dialog.component";
import { ViewDialogComponent } from "../view-dialog/view-dialog.component";


@Component({
	selector: "app-menubar",
	templateUrl: "./menubar.component.html",
	styleUrls: ["./menubar.component.scss"]
})
export class MenubarComponent implements OnInit {
	@Input() sidedrawer: MatSidenav;
	@Input() sidebar: MatSidenav;
	disabled = true;
	document: any;
	get zoom(): number { return this.canvas.scale * 100; }
	set zoom(val: number) { this.canvas.scale = val / 100; }
	stars: number;
	saved: boolean;
	smallScreen: boolean;

	constructor(
		protected dialog: MatDialog,
		protected breakpoint: BreakpointObserver,
		public history: HistoryService,
		public canvas: CanvasService,
		public file: SvgFileService,
		public hotkey: HotkeyService,
	) {
		fetch("https://api.github.com/repos/OzymandiasTheGreat/savage").then((response) => {
			if (response.ok) {
				return response.json();
			}
			return { stargazers_count: 13 };
		}).then((data) => this.stars = data.stargazers_count);
	}

	ngOnInit(): void {
		this.file.openFile.subscribe((file) => {
			this.document = file;
			this.disabled = !file;
		});
		this.file.saved.subscribe((saved) => this.saved = saved);
		this.hotkey.triggered.subscribe((key) => {
			if (key === "shortcuts") {
				this.showShortcuts();
			}
			if (!this.disabled) {
				switch (key) {
					case "download":
						this.download();
						break;
					case "download-optimized":
						this.downloadOptimized();
						break;
					case "download-png":
						this.downloadPNG();
						break;
				}
			}
		});
		this.breakpoint.observe([Breakpoints.XSmall, Breakpoints.Small, Breakpoints.Medium]).subscribe((result) => {
			this.smallScreen = result.matches;
		});
	}

	openView(): void {
		const ref = this.dialog.open(ViewDialogComponent, { data: { document: this.document } });
	}

	download(): void {
		const blob = new Blob([html(stringify(this.document), {
			end_with_newline: true,
			max_preserve_newlines: 3,
		})], {type: "image/svg+xml"});
		const elem = document.createElement("a");
		elem.href = (<any> URL).createObjectURL(blob, { oneTimeOnly: true });
		elem.download = this.file.openFileName || "New document.svg";
		elem.style.display = "none";
		document.body.appendChild(elem);
		elem.click();
		document.body.removeChild(elem);
	}

	downloadOptimized(): void {
		const blob = new Blob([svgo.optimize(stringify(this.document), {
			plugins: svgo.extendDefaultPlugins([{ name: "removeAttrs", params: { attrs: ["data.*"] } }]),
		}).data], {type: "image/svg+xml"});
		const elem = document.createElement("a");
		elem.href = (<any> URL).createObjectURL(blob, { oneTimeOnly: true });
		elem.download = this.file.openFileName || "New document.svg";
		elem.style.display = "none";
		document.body.appendChild(elem);
		elem.click();
		document.body.removeChild(elem);
	}

	downloadPNG(): void {
		const width = parseFloat(this.document.attributes.width);
		const height = parseFloat(this.document.attributes.height);
		const canvas = document.createElement("canvas");
		canvas.width = width;
		canvas.height = height;
		canvas.style.position = "fixed";
		canvas.style.left = "-1000vw";
		document.body.appendChild(canvas);
		const ctx = canvas.getContext("2d");
		Canvg.fromString(ctx, stringify(this.document), { anonymousCrossOrigin: true }).render();
		setTimeout(() => {
			const elem = document.createElement("a");
			elem.href = canvas.toDataURL("image/png");
			elem.download = this.file.openFileName ? this.file.openFileName.replace(/\.svg$/g, "") + ".png" : "New document.png";
			elem.style.display = "none";
			document.body.appendChild(elem);
			elem.click();
			document.body.removeChild(elem);
			document.body.removeChild(canvas);
		}, 750);
	}

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

	openRepo(): void {
		window.open("https://github.com/OzymandiasTheGreat/savage", "_blank");
	}

	showShortcuts(): void {
		const ref = this.dialog.open(ShortcutsDialogComponent, { width: "80vw", height: "90vh" });
	}
}
