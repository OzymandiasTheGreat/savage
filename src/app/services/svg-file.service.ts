import { Injectable } from "@angular/core";
import { Observable, ReplaySubject } from "rxjs";
import { parse as parseSVG, INode, stringify } from "svgson";
import { Observable as Observer } from "object-observer";
import { nanoid } from "nanoid/non-secure";
import { PaperScope } from "paper";
import { get, set } from "idb-keyval";
import parseStyle from "style-to-object";

import { Observable as ObserverType, recursiveUnobserve } from "../types/observer";
import { SavageSVG, SavageRecentSVG, GRAPHICS } from "../types/svg";


const SAVAGE_RECENT_SVG = "SAVAGE_RECENT_SVG";
const SUPPORTED_STYLES = ["alignment-baseline", "baseline-shift", "clip-path", "clip-rule", "color",
	"color-interpolation", "color-interpolation-filters", "cursor", "direction", "display",
	"dominant-baseline", "fill", "fill-opacity", "fill-rule", "filter", "flood-color", "flood-opacity",
	"font-family", "font-size", "font-size-adjust", "font-stretch", "font-style", "font-variant",
	"font-weight", "image-rendering", "letter-spacing", "lighting-color", "marker-end", "marker-mid",
	"marker-start", "mask", "opacity", "overflow", "pointer-events", "shape-rendering", "stop-color",
	"stop-opacity", "stroke", "stroke-dasharray", "stroke-dashoffset", "stroke-linecap", "stroke-linejoin",
	"stroke-miterlimit", "stroke-opacity", "stroke-width", "text-anchor", "text-decoration", "text-rendering",
	"transform", "transform-origin", "unicode-bidi", "vector-effect", "visibility", "word-spacing", "writing-mode"];


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
	openFileName: string = null;
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

		get(SAVAGE_RECENT_SVG).then((recent) => this.recent = (<SavageRecentSVG[]> recent).sort((a, b) => b.modified - a.modified));
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
		if (node.name === "image") {
			node.attributes.crossorigin = "anonymous";
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

		if (node.attributes.style) {
			const styles = parseStyle(node.attributes.style);
			for (const [key, value] of Object.entries(styles)) {
				if (SUPPORTED_STYLES.includes(key)) {
					node.attributes[key] = value;
				}
			}
			delete node.attributes.style;
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

	async parseSVG(data: string): Promise<SavageSVG> {
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
				const savageFile: SavageRecentSVG = { name: file.name, data: <string> e.target.result, modified: Date.now() };
				this.recent.unshift(savageFile);
				this.recent = this.recent.slice(0, 5);
				set(SAVAGE_RECENT_SVG, this.recent);
				this._currentFile = <ObserverType<SavageSVG>> Observer.from(svg);
				this._openFile.next(this._currentFile);
			}).catch((err) => console.error(err));
		});

		reader.readAsText(file);
		this.openFileName = file.name;
	}

	openRecentSVG(file: SavageRecentSVG): void {
		this.textNodes = [];
		this.parseSVG(file.data).then((svg) => {
			file.modified = Date.now();
			this.recent.sort((a, b) => b.modified - a.modified);
			set(SAVAGE_RECENT_SVG, this.recent);
			this._currentFile = <ObserverType<SavageSVG>> Observer.from(svg);
			this._openFile.next(this._currentFile);
		});
		this.openFileName = file.name;
	}

	openRemoteSVG(url: string): void {
		this.textNodes = [];
		let filename: string;
		fetch(url).then((response) => {
			if (response.ok) {
				filename = response.headers.get("content-disposition") || "Remote.svg";
				return response.text();
			}
			return null;
		}).then((str) => {
			if (str) {
				this.recent.unshift({ name: filename, data: str, modified: Date.now() });
				this.recent = this.recent.slice(0, 5);
				set(SAVAGE_RECENT_SVG, this.recent);
				return this.parseSVG(str);
			}
			return null;
		}).then((svg) => {
			if (svg) {
				this.openFileName = filename;
				this._currentFile = Observer.from(svg);
				this._openFile.next(this._currentFile);
			}
		});
	}

	emptyDoc(dimensions: { width: number, height: number }): void {
		this.textNodes = [];
		const node: INode = {
			name: "svg",
			type: "element",
			value: "",
			attributes: { xmlns: "http://www.w3.org/2000/svg", width: `${dimensions.width}`, height: `${dimensions.height}` },
			children: [{
				name: "defs",
				type: "element",
				value: "",
				attributes: {},
				children: [],
			}],
		};
		this.recent.unshift({ name: "New_document.svg", data: stringify(node), modified: Date.now() });
		this.recent = this.recent.slice(0, 5);
		set(SAVAGE_RECENT_SVG, this.recent);
		this._currentFile = Observer.from(node);
		this._openFile.next(this._currentFile);
		this.openFileName = "New_document.svg";
	}

	inlineSVG(file: File): void {
		const reader = new FileReader();

		reader.addEventListener("load", (e) => {
			this.parseSVG(<string> e.target.result).then((svg) => {
				this._currentFile.children.push(<any> svg);
			}).catch((err) => console.error(err));
		});

		reader.readAsText(file);
	}

	inlineRaster(file: File): void {
		const reader = new FileReader();

		reader.addEventListener("load", (e) => {
			const image: SavageSVG = {
				nid: nanoid(13),
				name: "image",
				type: "element",
				value: "",
				attributes: <any> { href: <string> e.target.result },
				children: <any> [],
			};
			this._currentFile.children.push(<any> image);
		});

		reader.readAsDataURL(file);
	}
}
