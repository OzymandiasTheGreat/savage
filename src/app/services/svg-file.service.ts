import { Injectable } from "@angular/core";
import { Observable, ReplaySubject } from "rxjs";
import { parse as parseSVG, INode } from "svgson";
import { Observable as Observer } from "object-observer";
import { nanoid } from "nanoid/non-secure";
import { PaperScope } from "paper";

import { Observable as ObserverType, recursiveUnobserve } from "../types/observer";
import { SavageSVG, SavageRecentSVG } from "../types/svg";


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
}


@Injectable({
	providedIn: "root"
})
export class SvgFileService {
	paper: paper.PaperScope;
	private _currentFile: ObserverType<SavageSVG>;
	private _openFile: ReplaySubject<ObserverType<SavageSVG>>;
	openFile: Observable<ObserverType<SavageSVG>>;
	private _definitions: ReplaySubject<IDefinitions>;
	definitions: Observable<IDefinitions>;
	recent: SavageRecentSVG[] = [];

	constructor() {
		this.paper = new PaperScope();
		this._openFile = new ReplaySubject<ObserverType<SavageSVG>>();
		this.openFile = this._openFile.asObservable();
		this.openFile.subscribe((file) => {
			(<any> window).svg = file;
			file.observe((change) => {
				// console.log(change);
				const definitions = this.parseDefs(<SavageSVG> this._currentFile);
				this.findSymbols(<SavageSVG> this._currentFile, definitions);
				this.findPaths(<SavageSVG> this._currentFile, definitions);
				this._definitions.next(definitions);
			});
		});
		this._definitions = new ReplaySubject<IDefinitions>();
		this.definitions = this._definitions.asObservable();

		for (let i = 0; i < 5; i++) {
			const recent: SavageRecentSVG = JSON.parse(window.localStorage.getItem(SAVAGE_RECENT_SVG + i) || "null");
			if (recent) {
				this.recent.push(recent);
			}
		}
	}

	private transformNode(node: INode): INode {
		(<SavageSVG> node).nid = nanoid(13);
		if (node.name === "script") {
			node.attributes.src = "";
			node.value = "";
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
		return parseSVG(data, { transformNode: this.transformNode }).then((ast) => {
			const width = ast.attributes.width;
			const height = ast.attributes.height;
			this.paper.setup(new this.paper.Size(parseFloat(width), parseFloat(height)));
			this.ensureDefs(ast);
			const definitions = this.parseDefs(<SavageSVG> ast);
			this.findSymbols(<SavageSVG> ast, definitions);
			this.findPaths(<SavageSVG> ast, definitions);
			this._definitions.next(definitions);
			return <SavageSVG> ast;
		});
	}

	private parseDefs(node: SavageSVG): IDefinitions {
		const definitions: IDefinitions = { gradients: [], patterns: [], masks: [], filters: [], symbols: [], paths: [] };
		const defs = node.children.find((n) => n.name === "defs");
		const recurse = (children: SavageSVG[]) => {
			children.forEach((n) => {
				switch (n.name) {
					case "linearGradient":
					case "radialGradient":
						definitions.gradients.push({ nid: n.nid, id: n.attributes.id });
						break;
					case "pattern":
						definitions.patterns.push({ nid: n.nid, id: n.attributes.id });
						break;
					case "mask":
						definitions.masks.push({ nid: n.nid, id: n.attributes.id });
						break;
					case "filter":
						definitions.filters.push({ nid: n.nid, id: n.attributes.id });
						break;
					case "symbol":
						definitions.symbols.push({ nid: n.nid, id: n.attributes.id });
				}
				recurse(<SavageSVG[]> n.children);
			});
		};
		recurse(<SavageSVG[]> defs.children);
		return definitions;
	}

	private findSymbols(node: SavageSVG, defs: IDefinitions): void {
		const recurse = (n: SavageSVG) => {
			if (n.name === "symbol") {
				defs.symbols.push({ nid: n.nid, id: n.attributes.id });
			}
			n.children.forEach((c) => recurse(<SavageSVG> c));
		};
		recurse(node);
	}

	private findPaths(node: SavageSVG, defs: IDefinitions): void {
		const recurse = (n: SavageSVG) => {
			if (n.name === "path" && n.attributes.id) {
				defs.paths.push({ nid: n.nid, id: n.attributes.id });
			}
			n.children.forEach((c) => recurse(<SavageSVG> c));
		};
		recurse(node);
	}

	openUploadSVG(file: File): void {
		const reader = new FileReader();

		reader.addEventListener("load", (e) => {
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
