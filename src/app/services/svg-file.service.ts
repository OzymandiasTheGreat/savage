import { Injectable } from "@angular/core";
import { Observable, ReplaySubject } from "rxjs";
import { parse as parseSVG, INode } from "svgson";
import { Observable as Observer } from "object-observer";
import { nanoid } from "nanoid/non-secure";
import { PaperScope } from "paper";

import { Observable as ObserverType, recursiveUnobserve } from "../types/observer";
import { SavageSVG, SavageRecentSVG, GRAPHICS } from "../types/svg";


const SAVAGE_RECENT_SVG = "SAVAGE_RECENT_SVG_";


export interface IDef {
	nid: string;
	id: string;
}


export interface IDefinitions {
	gradients: IDef[];
	patterns: IDef[];
	masks: IDef[];
	filters: IDef[];
	symbols: IDef[];
	paths: IDef[];
	markers: IDef[];
	graphics: IDef[];
	clipPaths: IDef[];
}


@Injectable({
	providedIn: "root"
})
export class SvgFileService {
	paper: paper.PaperScope;
	private _currentFile: ObserverType<SavageSVG>;
	private _openFile: ReplaySubject<ObserverType<SavageSVG>>;
	openFile: Observable<ObserverType<SavageSVG>>;
	private _definitions: IDefinitions;
	private _definitions$: ReplaySubject<IDefinitions>;
	definitions: Observable<IDefinitions>;
	recent: SavageRecentSVG[] = [];
	textNodes: string[];
	graphics: IDef[] = [];

	constructor() {
		this.paper = new PaperScope();
		this._openFile = new ReplaySubject<ObserverType<SavageSVG>>();
		this.openFile = this._openFile.asObservable();
		this.openFile.subscribe((file) => {
			(<any> window).svg = file;
			file.observe((change) => {
				this._definitions$.next(this._definitions);
			});
		});
		this._definitions$ = new ReplaySubject<IDefinitions>();
		this.definitions = this._definitions$.asObservable();

		for (let i = 0; i < 5; i++) {
			const recent: SavageRecentSVG = JSON.parse(window.localStorage.getItem(SAVAGE_RECENT_SVG + i) || "null");
			if (recent) {
				this.recent.push(recent);
			}
		}
	}

	private transformNode(node: INode): INode {
		const nid = nanoid(13);
		(<SavageSVG> node).nid = nid;
		if (node.type === "text") {
			this.textNodes.push(nid);
		}
		if (node.name === "a") {
			node.attributes.target = "_blank";
		}
		if (node.name === "script") {
			node.attributes.href = "";
			node.attributes["xlink:href"] = "";
		}

		// DEFINITIONS
		if (node.attributes.id) {
			if (["linearGradient", "radialGradient"].includes(node.name)) {
				this._definitions.gradients.push({ nid, id: node.attributes.id });
			} else if (node.name === "pattern") {
				this._definitions.patterns.push({ nid, id: node.attributes.id });
			} else if (node.name === "mask") {
				this._definitions.masks.push({ nid, id: node.attributes.id });
			} else if (node.name === "filter") {
				this._definitions.filters.push({ nid, id: node.attributes.id });
			} else if (node.name === "symbol") {
				this._definitions.symbols.push({ nid, id: node.attributes.id });
			} else if (node.name === "marker") {
				this._definitions.markers.push({ nid, id: node.attributes.id });
			} else if (node.name === "clipPath") {
				this._definitions.clipPaths.push({ nid, id: node.attributes.id });
			} else if (node.name === "path") {
				this._definitions.paths.push({ nid, id: node.attributes.id });
			}
			if (node.name !== "use" && GRAPHICS.includes(node.name)) {
				this.graphics.push({ nid, id: node.attributes.id });
			}
		}

		return node;
	}

	private ensureDefs(node: INode): void {
		const defsArr = node.children.filter((n) => n.name === "defs");
		if (defsArr.length) {
			const first = defsArr.shift();
			first.children.concat(...defsArr.map((n) => n.children).flat());
			defsArr.forEach((n) => node.children.splice(node.children.indexOf(n), 1));
		} else {
			const defs: SavageSVG = {
				nid: nanoid(13),
				name: "defs",
				type: "element",
				value: "",
				attributes: <any> {},
				children: <any> [],
			};
			node.children.unshift(<INode> defs);
		}
	}

	private async parseSVG(data: string): Promise<SavageSVG> {
		this._definitions =  {
			gradients: [], patterns: [], masks: [], filters: [], symbols: [], paths: [], markers: [], graphics: [], clipPaths: [],
		};
		return parseSVG(data, { transformNode: this.transformNode.bind(this) }).then((ast) => {
			const width = ast.attributes.width;
			const height = ast.attributes.height;
			this.paper.setup(new this.paper.Size(parseFloat(width), parseFloat(height)));
			this.ensureDefs(ast);
			this._definitions$.next(this._definitions);
			return <SavageSVG> ast;
		});
	}

	openUploadSVG(file: File): void {
		const reader = new FileReader();

		reader.addEventListener("load", (e) => {
			this.textNodes = [];
			this.parseSVG(<string> e.target.result).then((svg) => {
				// console.log(svg);
				let index: number;
				const savageFile: SavageRecentSVG = { name: file.name, data: <string> e.target.result, modified: Date.now() };
				this.recent.sort((a, b) => b.modified - a.modified);
				if (this.recent.length < 5) {
					index = this.recent.push(savageFile) - 1;
				} else {
					const oldest = Math.max(...this.recent.map((r) => r.modified));
					index = this.recent.findIndex((r) => r.modified === oldest);
					this.recent[index] = savageFile;
				}
				window.localStorage.setItem(SAVAGE_RECENT_SVG + index, JSON.stringify(savageFile));
				this._currentFile = <ObserverType<SavageSVG>> Observer.from(svg);
				this._openFile.next(this._currentFile);
			}).catch((err) => console.error(err));
		});

		reader.readAsText(file);
	}

	openRecentSVG(file: SavageRecentSVG): void {
		this.textNodes = [];
		this.parseSVG(file.data).then((svg) => {
			console.log(svg);
			file.modified = Date.now();
			this.recent.sort((a, b) => b.modified - a.modified);
			const index = this.recent.indexOf(file);
			window.localStorage.setItem(SAVAGE_RECENT_SVG + index, JSON.stringify(file));
			this._currentFile = <ObserverType<SavageSVG>> Observer.from(svg);
			this._openFile.next(this._currentFile);
		});
	}
}
