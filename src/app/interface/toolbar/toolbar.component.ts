import { Component, OnInit, ViewChild } from "@angular/core";
import { MatDrawer } from "@angular/material/sidenav";
import { MatBottomSheet } from "@angular/material/bottom-sheet";
import { stringify } from "svgson";
import { html } from "js-beautify";
import { getDiff, applyDiff } from "recursive-diff";

import { Observable, recursiveUnobserve } from "../../types/observer";
import { SavageSVG } from "../../types/svg";
import { CanvasService } from "../../services/canvas.service";
import { SvgFileService } from "../../services/svg-file.service";
import { HistoryService } from "../../services/history.service";
import { HotkeyService } from "../../services/hotkey.service";
import { CodeEditorSheetComponent } from "../code-editor-sheet/code-editor-sheet.component";


@Component({
	selector: "app-toolbar",
	templateUrl: "./toolbar.component.html",
	styleUrls: ["./toolbar.component.scss"]
})
export class ToolbarComponent implements OnInit {
	disabled = true;
	document: Observable<SavageSVG>;
	@ViewChild("options", { static: true }) options: MatDrawer;
	get applyMatrix(): boolean { return (<any> this.canvas.tools.OBJECT)?.applyTransform || true; }
	set applyMatrix(val: boolean) {
		if (this.canvas.tools.OBJECT) {
			(<any> this.canvas.tools.OBJECT).applyTransform = val;
		}
	}
	get regularPolygon(): boolean { return (<any> this.canvas.tools.POLYGON)?.regular || true; }
	set regularPolygon(val: boolean) {
		if (this.canvas.tools.POLYGON) {
			(<any> this.canvas.tools.POLYGON).regular = val;
		}
	}
	get polygonSides(): number { return (<any> this.canvas.tools.POLYGON).sides || 5; }
	set polygonSides(val: number) {
		if (this.canvas.tools.POLYGON) {
			(<any> this.canvas.tools.POLYGON).sides = val;
		}
	}
	get polyline(): boolean { return (<any> this.canvas.tools.LINE).poly; }
	set polyline(val: boolean) {
		if (this.canvas.tools.LINE) {
			(<any> this.canvas.tools.LINE).poly = val;
		}
	}
	get freehandSimplify(): number { return (<any> this.canvas.tools.FREEHAND).simplify; }
	set freehandSimplify(val: number) {
		if (this.canvas.tools.FREEHAND) {
			(<any> this.canvas.tools.FREEHAND).simplify = val;
		}
	}
	get freehandSmooth(): { type: "continuous" | "catmull-rom" | "geometric", factor?: number } {
		return (<any> this.canvas.tools.FREEHAND).smooth;
	}
	set freehandSmooth(val: { type: "continuous" | "catmull-rom" | "geometric", factor?: number }) {
		if (this.canvas.tools.FREEHAND) {
			(<any> this.canvas.tools.FREEHAND).smooth = val;
		}
	}
	get gradientRadial(): boolean { return (<any> this.canvas.tools.GRADIENT).radial; }
	set gradientRadial(val: boolean) {
		if (this.canvas.tools.GRADIENT) {
			(<any> this.canvas.tools.GRADIENT).radial = val;
		}
	}
	get gradientStroke(): boolean { return (<any> this.canvas.tools.GRADIENT).stroke; }
	set gradientStroke(val: boolean) {
		if (this.canvas.tools.GRADIENT) {
			(<any> this.canvas.tools.GRADIENT).stroke = val;
		}
	}

	constructor(
		public canvas: CanvasService,
		public file: SvgFileService,
		public history: HistoryService,
		public hotkey: HotkeyService,
		protected sheet: MatBottomSheet,
	) { }

	ngOnInit(): void {
		this.file.openFile.subscribe((file) => {
			this.document = file;
			this.disabled = !file;
			this.canvas.activeTool = "OBJECT";
		});
		this.hotkey.triggered.subscribe((key) => {
			if (!this.disabled) {
				switch (key) {
					case "raw":
						this.rawEdit();
						break;
					case "object":
						this.setTool("OBJECT");
						break;
					case "path":
						this.setTool("PATH");
						break;
					case "line":
						this.setTool("LINE");
						break;
					case "rect":
						this.setTool("RECT");
						break;
					case "circle":
						this.setTool("CIRCLE");
						break;
					case "polygon":
						this.setTool("POLYGON");
						break;
					case "freehand":
						this.setTool("FREEHAND");
						break;
					case "text":
						this.setTool("TEXT");
						break;
					case "gradient":
						this.setTool("GRADIENT");
						break;
					case "options":
						this.rightClick(null);
						break;
				}
			}
		});
	}

	setTool(value: string): void {
		if (!this.disabled) {
			this.canvas.activeTool = value;
		}
	}

	rightClick(event: PointerEvent): void {
		event?.preventDefault();
		this.options.toggle();
	}

	rawEdit(): void {
		const ref = this.sheet.open(CodeEditorSheetComponent, {
			data: { data: html(stringify(<any> this.document), {
				end_with_newline: true,
				max_preserve_newlines: 3,
			}) },
			panelClass: "savage-app-bottom-sheet",
		});

		ref.afterDismissed().subscribe((data) => {
			if (data) {
				this.file.parseSVG(data).then((ast) => {
					const diff = getDiff(this.document, ast, true);
					for (const delta of diff) {
						if (!(delta.op === "update" && delta.path[delta.path.length - 1] === "nid")) {
							if (delta.op === "delete" && delta.path[delta.path.length - 2] === "children") {
								recursiveUnobserve(delta.oldVal);
							}
							applyDiff(this.document, [delta]);
						}
					}
					this.history.snapshot("Raw SVG edited");
				});
			}
		});
	}
}
