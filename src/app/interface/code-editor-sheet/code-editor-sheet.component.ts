import { Component, Inject } from "@angular/core";
import { MatBottomSheetRef, MAT_BOTTOM_SHEET_DATA } from "@angular/material/bottom-sheet";


@Component({
	selector: "app-code-editor-sheet",
	templateUrl: "./code-editor-sheet.component.html",
	styleUrls: ["./code-editor-sheet.component.scss"]
})
export class CodeEditorSheetComponent {
	options = {
		theme: "vs",
		language: "xml",
		fontFamily: "Fira Code",
		fontSize: "13px",
		codeLens: false,
		copyWithSyntaxHighlighting: false,
		cursorSurroundingLines: 2,
		dragAndDrop: true,
		formatOnPaste: true,
		minimap: { enabled: false },
		mouseWheelZoom: true,
		multiCursorModifier: "ctrlCmd",
		scrollBeyondLastLine: false,
	};

	constructor(
		private ref: MatBottomSheetRef,
		@Inject(MAT_BOTTOM_SHEET_DATA) public data: { data: string },
	) { }

	save(): void {
		this.ref.dismiss(this.data.data);
	}

	close(): void {
		this.ref.dismiss(null);
	}

	onKeyDown(event: KeyboardEvent): void {
		if (event.ctrlKey && !event.shiftKey && !event.altKey) {
			switch (event.key) {
				case "s":
					event.preventDefault();
					event.stopPropagation();
					this.ref.dismiss(this.data.data);
					break;
			}
		}
	}
}
