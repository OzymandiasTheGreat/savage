import { Component, Inject } from "@angular/core";
import { MatBottomSheetRef, MAT_BOTTOM_SHEET_DATA } from "@angular/material/bottom-sheet";
import { get } from "idb-keyval";
import { stringify, parse, INode } from "svgson";
import { html, css } from "js-beautify";

import { DARK_MODE } from "../drawer/drawer.component";
import { Observable } from "../../types/observer";
import { SavageSVG } from "../../types/svg";


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
	mode: "XML" | "CSS" = "XML";
	xml: string;
	css: string;

	constructor(
		private ref: MatBottomSheetRef,
		@Inject(MAT_BOTTOM_SHEET_DATA) public data: { data: Observable<SavageSVG> },
	) {
		get(DARK_MODE).then((mode) => {
			if (mode) {
				this.options.theme = "vs-dark";
			} else {
				this.options.theme = "vs";
			}
			this.options = {...this.options};
		});
		const style = this.data.data.children.find((c) => c.name === "style");
		this.css = css(style?.children[0]?.value || "", {
			end_with_newline: true,
			max_preserve_newlines: 3,
		});
		this.xml = html(stringify(<any> this.data.data), {
			end_with_newline: true,
			max_preserve_newlines: 3,
		});
	}

	switch(mode: "XML" | "CSS"): void {
		this.mode = mode;
		this.options.language = mode === "XML" ? "xml" : "css";
		this.options = {...this.options};
	}

	save(): void {
		parse(this.xml).then((tree) => {
			if (this.css) {
				let style = tree.children.find((c) => c.name === "style");
				if (!style || !style.children.length) {
					style = {
						name: "style",
						type: "element",
						value: "",
						attributes: {},
						children: [{
							name: "",
							type: "text",
							value: "",
							attributes: {},
							children: [],
						}],
					};
					tree.children.unshift(style);
				}
				style.children[0].value = this.css;
			}
			this.ref.dismiss(stringify(tree));
		});
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
					this.save();
					break;
			}
		} else if (event.altKey && event.shiftKey && !event.ctrlKey) {
			switch (event.key) {
				case "C":
					event.preventDefault();
					event.stopPropagation();
					this.switch("CSS");
					break;
				case "X":
					event.preventDefault();
					event.stopPropagation();
					this.switch("XML");
					break;
			}
		}
	}
}
