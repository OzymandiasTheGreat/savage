import { Component, OnInit, ViewChild } from "@angular/core";
import { MatDrawer } from "@angular/material/sidenav";
import { MatBottomSheet } from "@angular/material/bottom-sheet";
import { MatSelectionListChange } from "@angular/material/list";
import { MatButtonToggleChange } from "@angular/material/button-toggle";
import { MatIconRegistry } from "@angular/material/icon";
import { getDiff, applyDiff } from "recursive-diff";
import mdiIcons from "@mdi/svg/meta.json";

import { Observable, recursiveUnobserve } from "../../types/observer";
import { SavageSVG } from "../../types/svg";
import { CanvasService } from "../../services/canvas.service";
import { SvgFileService } from "../../services/svg-file.service";
import { HistoryService } from "../../services/history.service";
import { HotkeyService } from "../../services/hotkey.service";
import { CodeEditorSheetComponent } from "../code-editor-sheet/code-editor-sheet.component";


export interface MDIIcon {
	"id": string;
	"name": string;
	"codepoint": string;
	"aliases": string[];
	"tags": string[];
	"author": string;
	"version": string;
}


export interface Icon {
	name: string;
	query: string[];
}


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
	get shapeMode(): string { return (<any> this.canvas.tools.SHAPE).mode; }
	set shapeMode(val: string) {
		if (this.canvas.tools.SHAPE) {
			(<any> this.canvas.tools.SHAPE).mode = val;
		}
	}
	get spiralSegmentCount(): number { return (<any> this.canvas.tools.SHAPE).spiralSegmentCount; }
	set spiralSegmentCount(val: number) {
		if (this.canvas.tools.SHAPE) {
			(<any> this.canvas.tools.SHAPE).spiralSegmentCount = val;
		}
	}
	get arrowHeadWidth(): number { return (<any> this.canvas.tools.SHAPE).arrowHeadWidth; }
	set arrowHeadWidth(val: number) {
		if (this.canvas.tools.SHAPE) {
			(<any> this.canvas.tools.SHAPE).arrowHeadWidth = val;
		}
	}
	get arrowHeadHeight(): number { return (<any> this.canvas.tools.SHAPE).arrowHeadHeight; }
	set arrowHeadHeight(val: number) {
		if (this.canvas.tools.SHAPE) {
			(<any> this.canvas.tools.SHAPE).arrowHeadHeight = val;
		}
	}
	get arrowWidth(): number { return (<any> this.canvas.tools.SHAPE).arrowWidth; }
	set arrowWidth(val: number) {
		if (this.canvas.tools.SHAPE) {
			(<any> this.canvas.tools.SHAPE).arrowWidth = val;
		}
	}
	get donutWidth(): number { return (<any> this.canvas.tools.SHAPE).donutWidth; }
	set donutWidth(val: number) {
		if (this.canvas.tools.SHAPE) {
			(<any> this.canvas.tools.SHAPE).donutWidth = val;
		}
	}
	icons: Icon[];
	stampResults: Icon[];
	get eyedropperField(): string { return (<any> this.canvas.tools.EYEDROPPER).field; }
	set eyedropperField(val: string) {
		if (this.canvas.tools.EYEDROPPER) {
			(<any> this.canvas.tools.EYEDROPPER).field = val;
		}
	}

	constructor(
		public canvas: CanvasService,
		public file: SvgFileService,
		public history: HistoryService,
		public hotkey: HotkeyService,
		protected sheet: MatBottomSheet,
		protected registry: MatIconRegistry,
	) { }

	ngOnInit(): void {
		this.icons = (<MDIIcon[]> mdiIcons).map((i) => {
			let query: string[] = [];
			query.push(i.name);
			query = query.concat(i.aliases);
			query = query.concat(i.tags);
			return { name: i.name, query };
		});
		this.stampResults = this.icons.slice(0, 35);
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
			data: { data: this.document },
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

	shapeModeChanged(change: MatSelectionListChange): void {
		this.shapeMode = change.options.filter((o) => o.selected)[0].value;
	}

	onKeyDown(event: KeyboardEvent): void {
		event.stopPropagation();
	}

	onStampQuery(event: InputEvent): void {
		const query = (<HTMLInputElement> event.target).value;
		event.stopPropagation();
		this.stampResults = this.icons.filter((i) => i.query.some((q) => q.includes(query.toLowerCase()))).slice(0, 35);
	}

	onStampSelected(change: MatButtonToggleChange): void {
		const icon: Icon = change.value;
		this.registry.getNamedSvgIcon(icon.name).subscribe((svg) => {
			(<any> this.canvas.tools.STAMP).d = (<SVGPathElement> svg.firstChild).getAttribute("d");
			console.log((<any> this.canvas.tools.STAMP).d);
		});
	}

	eyedropperFieldChanged(change: MatSelectionListChange): void {
		this.eyedropperField = change.options.filter((o) => o.selected)[0].value;
	}
}
