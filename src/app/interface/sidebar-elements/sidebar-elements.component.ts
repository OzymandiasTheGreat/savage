import { Component, OnInit } from "@angular/core";
import { FormControl } from "@angular/forms";
import { TreeNode, TREE_ACTIONS, ITreeOptions, IActionMapping, ITreeState, TreeModel } from "@circlon/angular-tree-component";
import { stringify, INode } from "svgson";
import { nanoid } from "nanoid/non-secure";

import { SVGElements, KNOWN_ELEMENTS, CONTAINMENT_MAP } from "../../types/svg";
import { Observable, recursiveUnobserve } from "../../types/observer";
import { SavageSVG } from "../../types/svg";
import { SvgFileService, IDefinitions } from "../../services/svg-file.service";


const recursiveIgnore = (node: Observable<SavageSVG>, map: object) => {
	node.children.forEach((n) => {
		if (!KNOWN_ELEMENTS.some((name) => n.name.startsWith(name))) {
			map[n.nid] = true;
		}
		recursiveIgnore(n, map);
	});
};


@Component({
	selector: "app-sidebar-elements",
	templateUrl: "./sidebar-elements.component.html",
	styleUrls: ["./sidebar-elements.component.scss"]
})
export class SidebarElementsComponent implements OnInit {
	root: Observable<SavageSVG>;
	data: Observable<Observable<SavageSVG>[]>;
	definitions: IDefinitions;
	actionMap: IActionMapping = {
		mouse: {
			click: (tree, node, event: MouseEvent) => {
				if (event.ctrlKey) {
					TREE_ACTIONS.TOGGLE_ACTIVE_MULTI(tree, node, event);
				} else {
					TREE_ACTIONS.TOGGLE_ACTIVE(tree, node, event);
				}
			},
			dblClick: () => {},
			contextMenu: (tree, node, event: MouseEvent) => {
				event.preventDefault();
			},
			drop: (tree, node, event, { from, to }) => tree.moveNode(from, to),
		},
		keys: {
			// PageDown
			34: (tree, node, event: KeyboardEvent) => {
				const index = node.index + 2;
				if (index < node.parent.children.length) {
					const target = { dropOnNode: false, index, parent: node.parent };
					tree.moveNode(node, target);
				}
			},
			// PageUp
			33: (tree, node, event: KeyboardEvent) => {
				const index = node.index - 1;
				if (index >= 0) {
					const target = { dropOnNode: false, index, parent: node.parent };
					tree.moveNode(node, target);
				}
			},
			// Delete
			46: (tree, node, event: KeyboardEvent) => {
				const data = node.parent.data;
				recursiveUnobserve(data.children[node.index]);
				data.children.splice(node.index, 1);
				tree.update();
			},
		}
	};
	options: ITreeOptions = {
		idField: "nid",
		allowDrag: true,
		levelPadding: 5,
		nodeHeight: 40,
		useVirtualScroll: true,
		actionMapping: this.actionMap,
		allowDrop: (element: TreeNode, { parent, index }: { parent: TreeNode, index: number }) => {
			if (Object.values(CONTAINMENT_MAP).flat().includes(parent.data.name)) {
				switch (parent.data?.name) {
					case "a":
						return CONTAINMENT_MAP.a.includes(element?.data.name);
					case "g":
						return CONTAINMENT_MAP.g.includes(element?.data.name);
					case "svg":
						return CONTAINMENT_MAP.svg.includes(element?.data.name);
					case "defs":
						return CONTAINMENT_MAP.defs.includes(element?.data.name);
					case "clipPath":
						return CONTAINMENT_MAP.clipPath.includes(element?.data.name);
					case "marker":
						return CONTAINMENT_MAP.marker.includes(element?.data.name);
					case "linearGradient":
						return CONTAINMENT_MAP.linearGradient.includes(element?.data.name);
					case "radialGradient":
						return CONTAINMENT_MAP.radialGradient.includes(element?.data.name);
					case "pattern":
						return CONTAINMENT_MAP.pattern.includes(element?.data.name);
					case "symbol":
						return CONTAINMENT_MAP.symbol.includes(element?.data.name);
					case "mask":
						return CONTAINMENT_MAP.mask.includes(element?.data.name);
					case "filter":
						return CONTAINMENT_MAP.filter.includes(element?.data.name);
					case "text":
						return CONTAINMENT_MAP.text.includes(element?.data.name);
					default:
						return false;
				}
			}
			return false;
		}
	};
	state: ITreeState;
	activeView: "shapes" | "defs" = "shapes";
	controls: Record<string, { id: FormControl, class: FormControl }> = {};

	primitives = SVGElements.primitives;

	constructor(
		public file: SvgFileService,
	) { }

	ngOnInit(): void {
		const initControls = (node: Observable<SavageSVG>) => {
			this.controls[node.nid] = {
				id: new FormControl(node.attributes.id),
				class: new FormControl(node.attributes.class),
			};
			// tslint:disable-next-line
			node.children && node.children.forEach((n) => initControls(n));
		};
		this.file.openFile.subscribe((file) => {
			const hiddenNodeIds = {};
			this.root = file;
			this.data = file.children;
			this.data.forEach((node) => {
				initControls(node);
				if (this.activeView === "defs") {
					hiddenNodeIds[node.nid] = node.name !== "defs";
				} else {
					hiddenNodeIds[node.nid] = node.name === "defs";
				}
				if (!KNOWN_ELEMENTS.some((name) => node.name.startsWith(name))) {
					hiddenNodeIds[node.nid] = true;
				}
				recursiveIgnore(node, hiddenNodeIds);
			});
			this.state = { ...this.state, hiddenNodeIds };
		});
		this.file.definitions.subscribe((defs) => this.definitions = defs);
	}

	// UPDATE
	switchView(view: "shapes" | "defs"): void {
		const hiddenNodeIds = {};
		this.activeView = view;
		this.data?.forEach((node) => {
			if (view === "defs") {
				hiddenNodeIds[node.nid] = node.name !== "defs";
			} else {
				hiddenNodeIds[node.nid] = node.name === "defs";
			}
			if (!KNOWN_ELEMENTS.some((name) => node.name.startsWith(name))) {
				hiddenNodeIds[node.nid] = true;
			}
			recursiveIgnore(node, hiddenNodeIds);
		});
		this.state = { ...this.state, hiddenNodeIds };
	}

	updateIdentifier(node: Observable<SavageSVG>, attr: "id" | "class", control: FormControl): void {
		node.attributes[attr] = control.value;
	}

	formatIdentifier(attr: "id" | "class", value: string): string {
		const prefix = attr === "id" ? "#" : ".";
		return `${prefix}${value ? value.split(" ").map((v) => v.trim()).join(prefix) : ""}`;
	}

	toggleVisibility(node: TreeNode): void {
		if (node.data.attributes.display === "none") {
			node.data.attributes.display = node.data.attributes.dataSavageDisplay || "inline";
		} else {
			node.data.attributes.dataSavageDisplay = node.data.attributes.display;
			node.data.attributes.display = "none";
		}
	}

	getPreviewKey(data: Observable<SavageSVG>): string {
		if (SVGElements.render.includes(data.name)) {
			return "render";
		}
		if (SVGElements.renderRef.includes(data.name)) {
			return "ref";
		}
		return "icon";
	}

	pickPreviewIcon(data: Observable<SavageSVG>): string {
		switch (data.name) {
			case "svg":
				return "svg";
			case "defs":
				return "signature-freehand";
			case "marker":
				return "map-marker-path";
			case "clipPath":
				return "content-cut";
			case "style":
				return "language-css3";
			case "script":
				return "cancel";
			case "mpath":
				return "vector-link";
			case "stop":
				return "octagon";
			default:
				if (SVGElements.text.includes(data.name)) {
					return "format-text";
				}
				if (SVGElements.unsupported.includes(data.name)) {
					return "lifebuoy";
				}
				if (SVGElements.deprecated.includes(data.name)) {
					return "exclamation-thick";
				}
				if (SVGElements.primitives.includes(data.name)) {
					return "function-variant";
				}
		}
	}

	generatePreview(key: string, data: Observable<SavageSVG>): string {
		const width = (this.root.attributes.width && parseFloat(this.root.attributes.width));
		const height = (this.root.attributes.height && parseFloat(this.root.attributes.height));
		const origViewbox = this.root.attributes.viewBox?.split(" ").map((u) => parseFloat(u));
		const viewboxWidth = (origViewbox && origViewbox[2]) || width || 40;
		const viewboxHeight = (origViewbox && origViewbox[3]) || height || 40;
		const viewbox = [0, 0, viewboxWidth, viewboxHeight].join(" ");
		const defs = this.data.find((node) => node.name === "defs");
		const symbol = this.data.filter((node) => node.name === "symbol");
		const parent = {
			name: "svg",
			type: "element",
			value: "",
			attributes: { width: "40", height: "40", viewbox },
			children: <INode[]> [...symbol],
		};
		let target: INode;
		// tslint:disable-next-line
		defs && parent.children.unshift(<INode> defs);
		if (key === "render") {
			target = <INode> { ...data };
			target.attributes = <INode["attributes"]> <unknown> { ...data.attributes, display: "inline" };
			parent.children.push(<INode> target);
		} else if (key === "ref") {
			switch (data.name) {
				case "linearGradient":
				case "radialGradient":
				case "pattern":
					target = {
							name: "rect",
							type: "element",
							value: "",
							attributes: {
								x: "0",
								y: "0",
								width: viewboxWidth.toString(),
								height: viewboxHeight.toString(),
								fill: `url(#${data.attributes.id})`,
								display: "inline",
							},
							children: [],
						};
					parent.children.push(target);
					break;
				case "symbol":
					target = {
						name: "use",
						type: "element",
						value: "",
						attributes: {
							x: "0",
							y: "0",
							width: viewboxWidth.toString(),
							height: viewboxHeight.toString(),
							href: `#${data.attributes.id}`,
							display: "inline",
						},
						children: [],
					};
					parent.children.push(target);
					break;
				case "filter":
					target = {
						name: "rect",
						type: "element",
						value: "",
						attributes: {
							x: "0",
							y: "0",
							width: viewboxWidth.toString(),
							height: viewboxHeight.toString(),
							filter: `url(#${data.attributes.id})`,
							display: "inline",
						},
						children: [],
					};
					parent.children.push(target);
					break;
				case "mask":
					target = {
						name: "rect",
						type: "element",
						value: "",
						attributes: {
							x: "0",
							y: "0",
							width: viewboxWidth.toString(),
							height: viewboxHeight.toString(),
							mask: `url(#${data.attributes.id})`,
							display: "inline",
						},
						children: [],
					};
					parent.children.push(target);
					break;
			}
		}
		return stringify(parent);
	}

	removeNodes(tree: TreeModel): void {
		const remove = (node: TreeNode) => {
			const parent = node.parent.data;
			if (!node.isRoot) {
				recursiveUnobserve(node.data);
			}
			parent.children.splice(node.index, 1);
			delete this.controls[node.id];
		};
		[...tree.activeNodes].reverse().forEach(remove);
		tree.update();
	}

	addNode(name: string, tree: TreeModel): void {
		const activeNode: TreeNode = tree.activeNodes[tree.activeNodes.length - 1];
		const id = `${name}-${nanoid(7)}`;
		const node = {
			name,
			type: "element",
			value: "",
			nid: id,
			attributes: <any> { id },
			children: [],
		};
		this.controls[id] = { id: new FormControl(id), class: new FormControl("") };
		if (activeNode && CONTAINMENT_MAP[activeNode.data.name]?.includes(name)) {
			activeNode.data.children.push(node);
		} else if (activeNode && CONTAINMENT_MAP[activeNode.parent.data.name]?.includes(name)) {
			activeNode.parent.data.children.push(node);
		} else if (CONTAINMENT_MAP.svg.includes(name)) {
			this.root.children.push(<any> node);
		} else {
			const validParent: string[] = [];
			for (const [parent, elems] of Object.entries(CONTAINMENT_MAP)) {
				if (elems.includes(name)) {
					validParent.push(parent);
				}
			}
			console.warn(`Element ${name} can only be created in ${validParent.join(", ")}`);
		}
		tree.update();
		(<TreeNode> tree.getNodeById(node.nid))?.setActiveAndVisible();
	}

	dupeNode(tree: TreeModel): void {
		const dupe = (node: SavageSVG) => {
			const attributes = { ...node.attributes, id: `copy-${node.attributes.id}` };
			const children = node.children.map((n) => dupe(<SavageSVG> n));
			const copy = { ...node, nid: nanoid(13), attributes, children };
			return copy;
		};
		tree.activeNodes.forEach((node: TreeNode) => {
			if (node.data.name !== "defs") {
				const copy = dupe(node.data);
				node.parent.data.children.splice(node.index + 1, 0, copy);
			}
		});
		tree.update();
	}

	move2ref(tree: TreeModel, ref: string): void {
		let parent;
		if (ref === "defs") {
			parent = this.root.children.find((n) => n.name === "defs");
		} else {
			parent = tree.getNodeById(ref)?.data;
		}
		tree.activeNodes.forEach((n: TreeNode) => {
			const node = n.parent.data.children.splice(n.index, 1)[0];
			parent?.children.push(node);
		});
		tree.update();
	}
}
