import { Component, OnInit, Input, Output, EventEmitter } from "@angular/core";
import { INode, stringify } from "svgson";
import { DragEvent } from "@interactjs/types/index";

import { Observable } from "../../types/observer";
import { SavageSVG, findParent } from "../../types/svg";
import { CanvasService } from "../../services/canvas.service";


export interface IDocumentEvent {
	event: DragEvent | MouseEvent | TouchEvent | KeyboardEvent;
	node: Observable<SavageSVG>;
}


@Component({
	selector: "app-document",
	templateUrl: "./document.component.html",
	styleUrls: ["./document.component.scss"]
})
export class DocumentComponent implements OnInit {
	@Input() scale: number;
	@Input() document: Observable<SavageSVG>;
	@Input() scrollable: HTMLElement;
	@Output() dragging: EventEmitter<IDocumentEvent>;
	@Output() handleClick: EventEmitter<IDocumentEvent>;
	@Output() handleDblClick: EventEmitter<IDocumentEvent>;
	@Output() handleMouseDown: EventEmitter<IDocumentEvent>;
	@Output() handleKeyDown: EventEmitter<IDocumentEvent>;

	constructor(
		public canvas: CanvasService,
	) {
		this.dragging = new EventEmitter<IDocumentEvent>();
		this.handleClick = new EventEmitter<IDocumentEvent>();
		this.handleDblClick = new EventEmitter<IDocumentEvent>();
		this.handleMouseDown = new EventEmitter<IDocumentEvent>();
		this.handleKeyDown = new EventEmitter<IDocumentEvent>();
	}

	ngOnInit(): void { }

	canMove(node: Observable<SavageSVG>): boolean {
		if (this.canvas.activeTool === "OBJECT") {
			return true;
		}
		return false;
	}

	onDrag(event: DragEvent, node: Observable<SavageSVG>): void {
		this.dragging.emit({ event, node });
	}

	onClick(event: MouseEvent, node: Observable<SavageSVG>): void {
		event.stopPropagation();
		this.handleClick.emit({ event, node });
	}

	onDblClick(event: MouseEvent, node: Observable<SavageSVG>): void {
		event.stopPropagation();
		this.handleDblClick.emit({ event, node });
	}

	onMouseDown(event: MouseEvent, node: Observable<SavageSVG>): void {
		if (["tspan", "textPath"].includes(node.name)) {
			const findText = (n) => {
				if (n.name === "text") {
					return n;
				}
				return findText(findParent(this.document, n.nid));
			};
			this.canvas.registry[findText(node)?.nid]?.focus();
			return;
		}
		event.stopPropagation();
		this.handleMouseDown.emit({ event, node });
		(<SVGElement> event.target).focus();
	}

	onKeyDown(event: KeyboardEvent, node: Observable<SavageSVG>): void {
		if (event.key !== " ") {
			this.handleKeyDown.emit({ event, node });
		}
	}

	stringify(node: INode): string {
		return node.children.map((n) => stringify(n)).join("\n");
	}
}
