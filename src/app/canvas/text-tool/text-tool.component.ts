import { Component, OnInit, OnDestroy, Input, ViewChild, ElementRef } from "@angular/core";
import { nanoid } from "nanoid/non-secure";

import { Observable, recursiveUnobserve } from "../../types/observer";
import { SavageSVG, findText, screen2svg, svg2screen, findParent, find } from "../../types/svg";
import { ICanvasTool, CanvasService } from "../../services/canvas.service";
import { SvgFileService, IDefinitions } from "../../services/svg-file.service";
import { IDocumentEvent } from "../document/document.component";


@Component({
	selector: "app-text-tool",
	templateUrl: "./text-tool.component.html",
	styleUrls: ["./text-tool.component.scss"]
})
export class TextToolComponent implements ICanvasTool, OnInit, OnDestroy {
	private _node: Observable<SavageSVG>;
	name: "TEXT" = "TEXT";
	@Input() document: Observable<SavageSVG>;
	@Input() scrollable: HTMLElement;
	@Input() set node(value) {
		const node = (<Observable<SavageSVG>[]> <unknown> value).filter((n) => ["text", "tspan", "textPath"].includes(n.name))[0];
		this._node = node || null;
		if (this._node) {
			this.text = findText(this._node);
			this.textParent = findParent(this.document, this.text.nid);
		}
	}
	get node(): Observable<SavageSVG> { return this._node; }
	@ViewChild("overlay", { static: true }) overlay: ElementRef<HTMLDivElement>;
	@ViewChild("ref", { static: true }) ref: ElementRef<SVGSVGElement>;
	@ViewChild("editable", {static: false }) editable: ElementRef<HTMLTextAreaElement>;
	text: Observable<SavageSVG>;
	textParent: Observable<SavageSVG>;
	pathIds: IDefinitions["paths"];

	constructor(
		public canvas: CanvasService,
		public svg: SvgFileService,
	) {
		this.canvas.tools[this.name] = this;
	}

	ngOnInit(): void {
		this.svg.definitions.subscribe((defs) => {
			this.pathIds = defs.paths;
		});
	}

	ngOnDestroy(): void {
		delete this.canvas.tools[this.name];
	}

	handleClick(event: IDocumentEvent): void { }

	handleDblClick(event: IDocumentEvent): void { }

	handleMouseDown(event: IDocumentEvent): void {
		let node = event.node;
		const ev: MouseEvent = <MouseEvent> event.event;
		if (!node || !["text", "tspan", "textPath"].includes(node.name)) {
			const position = screen2svg(this.ref.nativeElement, { x: ev.clientX, y: ev.clientY });
			if (this.node && !this.text.value.trim()) {
				this.node.attributes.x = `${position.x}`;
				this.node.attributes.y = `${position.y}`;
			} else {
				const text: SavageSVG = {
					nid: nanoid(13),
					name: "",
					type: "text",
					value: "",
					attributes: <any> {},
					children: <any> [],
				};
				const textParent: SavageSVG = {
					nid: nanoid(13),
					name: "tspan",
					type: "element",
					value: "",
					attributes: <any> {},
					children: <any> [text],
				};
				node = <Observable<SavageSVG>> {
					nid: nanoid(13),
					name: "text",
					type: "element",
					value: "",
					attributes: <any> { x: `${position.x}`, y: `${position.y}` },
					children: <any> [textParent],
				};
				this.document.children.push(node);
				node = find(this.document, node.nid);
				this.canvas.selection = [node];
			}
		} else {
			if (this.node && !this.text.value.trim()) {
				const parent = findParent(this.document, this.node.nid);
				const index = parent.children.findIndex((n) => n.nid === this.node.nid);
				parent.children.splice(index, 1);
				recursiveUnobserve(this.node);
			}
			this.canvas.selection = [node];
		}
		setTimeout(() => {
			this.editable?.nativeElement?.focus();
		}, 150);
	}

	handleMouseMove(event: MouseEvent): void { }

	handleMouseUp(event: MouseEvent): void { }

	handleDrag(event: IDocumentEvent): void { }

	handleKeyDown(event: IDocumentEvent): void { }

	get bbox(): DOMRect {
		if (this.text.value.trim()) {
			return this.canvas.registry[this.node.nid]?.getBoundingClientRect();
		}
		const point = svg2screen(this.ref.nativeElement, { x: parseFloat(this.node.attributes.x), y: parseFloat(this.node.attributes.y) });
		return new DOMRect(point.x, point.y, 1, 1);
	}

	onInput(event: InputEvent): void {
		this.text.value = (<HTMLTextAreaElement> event.target).value.trim();
	}

	onPathInput(event: InputEvent): void {
		const value = (<HTMLInputElement> event.target).value.trim();
		if (value) {
			if (this.textParent.name !== "textPath") {
				this.textParent.name = "textPath";
				delete this.textParent.attributes.x;
				delete this.textParent.attributes.y;
				delete this.textParent.attributes.dx;
				delete this.textParent.attributes.dy;
			}
			this.textParent.attributes.href = value;
		} else {
			if (this.textParent.name === "textPath") {
				this.textParent.name = "tspan";
				delete this.textParent.attributes.href;
			}
		}
	}

	onPathComplete(value: string): void {
		if (this.textParent.name !== "textPath") {
			this.textParent.name = "textPath";
			delete this.textParent.attributes.x;
			delete this.textParent.attributes.y;
			delete this.textParent.attributes.dx;
			delete this.textParent.attributes.dy;
			this.textParent.attributes.href = value;
		}
	}

	onMouseDown(event: MouseEvent): void {
		event.stopPropagation();
	}

	onKeyDown(event: KeyboardEvent): void {
		event.stopPropagation();
		if (event.key === "Escape") {
			this.canvas.selection = [];
		}
	}
}
