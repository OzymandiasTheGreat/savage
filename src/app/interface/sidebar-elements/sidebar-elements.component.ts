import { Component, OnInit, OnChanges, Input, SimpleChanges, ViewChild, ElementRef } from "@angular/core";
import { FormControl } from "@angular/forms";
import { MatMenuTrigger } from "@angular/material/menu";
import { MatDialog } from "@angular/material/dialog";
import {
	TreeNode, TREE_ACTIONS, ITreeOptions, IActionMapping, ITreeState, TreeComponent, TreeModel,
} from "@circlon/angular-tree-component";
import { stringify, INode } from "svgson";
import { nanoid } from "nanoid/non-secure";
import { klona } from "klona";
import Text2Svg from "text-to-svg";
import googleFonts from "google-fonts-complete/google-fonts.json";
import element2path from "element-to-path";
import { PathItem, Matrix, CompoundPath } from "paper";
import { compose, fromDefinition, fromTransformAttribute } from "transformation-matrix";

import {
	findParent, CONTAINMENT_MAP, RENDER, RENDER_REF, ANIMATION, OBSOLETE, GRAPHICS, TEXT, PRIMITIVES, DESCRIPTION, find, findText, updateIds,
} from "../../types/svg";
import { Observable, Change, recursiveUnobserve } from "../../types/observer";
import { SavageSVG } from "../../types/svg";
import { SvgFileService, IDefinitions } from "../../services/svg-file.service";
import { CanvasService } from "../../services/canvas.service";
import { HrefDialogComponent, HrefData } from "../href-dialog/href-dialog.component";
import { HistoryService } from "../../services/history.service";
import { HotkeyService } from "../../services/hotkey.service";


@Component({
	selector: "app-sidebar-elements",
	templateUrl: "./sidebar-elements.component.html",
	styleUrls: ["./sidebar-elements.component.scss"]
})
export class SidebarElementsComponent implements OnInit, OnChanges {
	private _treeObserver = (changes: Change[]) => {
		for (const change of changes) {
			// if (change.path.includes("children") && ["insert", "delete"].includes(change.type)) {
			if (!change.path.includes("attributes") && ["insert", "delete"].includes(change.type)) {
				if (!this.historyOp) {
					this.tree.treeModel.update();
				}
				if (change.type === "insert") {
					const name = change.value.name;
					const nid = change.value.nid;
					const id = change.value.attributes.id || "";
					if (PRIMITIVES.includes(name)) {
						this.editablePrimitive[nid] = {
							in: new FormControl("SourceGraphic"),
							in2: new FormControl(""),
							result: new FormControl(""),
						};
					} else {
						this.editableNode[nid] = new FormControl(id);
					}
					if (name === "pattern") {
						this.definitions.patterns.push({ nid, id });
					} else if (["linearGradient", "radialGradient"].includes(name)) {
						this.definitions.gradients.push({ nid, id });
					} else if (name === "filter") {
						this.definitions.filters.push({ nid, id });
					} else if (name === "mask") {
						this.definitions.masks.push({ nid, id });
					} else if (name === "symbol") {
						this.definitions.symbols.push({ nid, id });
					} else if (name === "marker") {
						this.definitions.markers.push({ nid, id });
					} else if (name === "clipPath") {
						this.definitions.clipPaths.push({ nid, id });
					} else if (name !== "use" && GRAPHICS.includes(name)) {
						this.definitions.graphics.push({ nid, id });
					} else if (name === "path") {
						this.definitions.paths.push({ nid, id });
					}
				} else {
					const name = change.oldValue.name;
					const nid = change.oldValue.nid;
					if (PRIMITIVES.includes(name)) {
						delete this.editablePrimitive[nid];
					} else {
						delete this.editableNode[nid];
					}
				}
			}
		}
	}
	@ViewChild("tree", { static: true }) tree: TreeComponent;
	@ViewChild("contextMenu", { static: true }) contextMenu: ElementRef<HTMLDivElement>;
	@ViewChild("contextMenu", { static: true, read: MatMenuTrigger }) contextMenuTrigger: MatMenuTrigger;
	@Input() selection: Observable<SavageSVG>[];
	@Input() scrollable: HTMLDivElement;
	root: Observable<SavageSVG>;
	defs: Observable<SavageSVG>;
	data: Observable<Observable<SavageSVG>[]>;
	definitions: IDefinitions;
	actionMap: IActionMapping = {
		mouse: {
			click: (tree, node, event: MouseEvent) => {
				if (event.ctrlKey) {
					TREE_ACTIONS.TOGGLE_ACTIVE_MULTI(tree, node, event);
					this.canvas.selection.push(node.data);
				} else {
					TREE_ACTIONS.TOGGLE_ACTIVE(tree, node, event);
					this.canvas.selection = [node.data];
				}
			},
			contextMenu: (tree, node, event: MouseEvent) => {
				event.preventDefault();
				// node.setIsActive(true, event.ctrlKey);
				this.contextMenu.nativeElement.style.top = `${event.clientY}px`;
				this.contextMenu.nativeElement.style.left = `${event.clientX}px`;
				this.contextMenuData = { nodes: tree.activeNodes };
				// nodes is undefined without timeout, not sure why
				setTimeout(() => {
					this.contextMenuTrigger.openMenu();
				}, 100);
			},
			drop: (tree, node, event, { from, to }) => {
				tree.moveNode(from, to);
				this.history.snapshot("Reorder element");
			},
		},
		keys: {
			// PageDown
			34: (tree, node, event: KeyboardEvent) => {
				const index = node.index + 2;
				if (index < node.parent.children.length) {
					const target = { dropOnNode: false, index, parent: node.parent };
					tree.moveNode(node, target);
					this.history.snapshot("Reorder element");
				}
			},
			// PageUp
			33: (tree, node, event: KeyboardEvent) => {
				const index = node.index - 1;
				if (index >= 0) {
					const target = { dropOnNode: false, index, parent: node.parent };
					tree.moveNode(node, target);
					this.history.snapshot("Reorder element");
				}
			},
			// Delete
			46: (tree, node, event: KeyboardEvent) => {
				const data = node.parent.data;
				recursiveUnobserve(data.children[node.index]);
				data.children.splice(node.index, 1);
				delete this.editableNode[node.data.nid];
				if (node.data.attributes.id) {
					for (const arr of Object.values(this.definitions)) {
						const index = arr.findIndex((d) => d.nid === node.data.nid);
						if (index) {
							arr.splice(index, 1);
						}
					}
				}
				tree.update();
				this.history.snapshot("Remove element");
			},
			// Y
			89: (tree, node, event: KeyboardEvent) => {
				if (event.ctrlKey && !event.shiftKey && !event.altKey) {
					event.preventDefault();
					event.stopPropagation();
					this.history.redo(1);
				}
			},
			// Z
			90: (tree, node, event: KeyboardEvent) => {
				if (event.ctrlKey && !event.shiftKey && !event.altKey) {
					event.preventDefault();
					event.stopPropagation();
					this.history.undo(1);
				}
			},
			// D
			68: (tree, node, event: KeyboardEvent) => {
				if (event.ctrlKey && !event.shiftKey && !event.altKey) {
					event.preventDefault();
					this.dupeNode(tree.activeNodes);
				}
			},
			// G
			71: (tree, node, event: KeyboardEvent) => {
				if (event.ctrlKey && !event.shiftKey && !event.altKey) {
					event.preventDefault();
					this.groupNodes(tree.activeNodes);
				} else if (event.ctrlKey && event.shiftKey && !event.altKey) {
					event.preventDefault();
					this.ungroupNodes(tree.activeNodes);
				}
			},
			// K
			75: (tree, node, event: KeyboardEvent) => {
				if (event.ctrlKey && !event.shiftKey && !event.altKey) {
					event.preventDefault();
					this.linkNodes(tree.activeNodes);
				}
			}
		}
	};
	options: ITreeOptions;
	state: ITreeState;
	activeView: "shapes" | "defs" = "shapes";
	editableNode: Record<string, FormControl> = {};
	editablePrimitive: Record<string, { in: FormControl, in2: FormControl, result: FormControl }> = {};
	contextMenuData: { nodes: TreeNode[] };
	animation = ANIMATION;
	graphics = (nodes: TreeNode[]) => nodes.every((n) => GRAPHICS.includes(n.data.name) && !["foreignObject", "use"].includes(n.data.name));
	render = RENDER;
	primitives = PRIMITIVES;
	primitivesFiltered = PRIMITIVES.filter((p) => !p.startsWith("feFunc") && !p.endsWith("Node"));
	containmentMap = CONTAINMENT_MAP;
	historyOp: boolean;

	constructor(
		protected dialog: MatDialog,
		protected history: HistoryService,
		protected hotkey: HotkeyService,
		public file: SvgFileService,
		public canvas: CanvasService,
	) { }

	ngOnInit(): void {
		this.options = {
			idField: "nid",
			allowDrag: true,
			scrollOnActivate: true,
			actionMapping: this.actionMap,
			allowDrop: (element: TreeNode, { parent, index }: { parent: TreeNode, index: number }) => {
				if (parent.level === 0) {
					return CONTAINMENT_MAP.svg.includes(element.data.name);
				}
				if (Object.keys(CONTAINMENT_MAP).includes(parent.data.name)) {
					return CONTAINMENT_MAP[parent.data.name].includes(element.data.name);
				}
				return false;
			}
		};

		const editableIds = (node: Observable<SavageSVG>) => {
			if (PRIMITIVES.includes(node.name)) {
				this.editablePrimitive[node.nid] = {
					in: new FormControl(node.attributes.in || "SourceGraphic"),
					in2: new FormControl(node.attributes.in2 || ""),
					result: new FormControl(node.attributes.result || ""),
				};
			} else {
				this.editableNode[node.nid] = new FormControl(node.attributes.id || "");
			}
			node.children.forEach((n) => editableIds(n));
		};
		this.file.openFile.subscribe((file) => {
			const hiddenNodeIds = {};
			this.root?.unobserve(this._treeObserver);
			this.root = file;
			this.defs = file.children.find((n) => n.name === "defs");
			this.data = file.children;
			this.data.forEach((node) => {
				editableIds(node);
				if (this.activeView === "defs") {
					hiddenNodeIds[node.nid] = !["defs", "symbol"].includes(node.name);
				} else {
					hiddenNodeIds[node.nid] = ["defs", "symbol"].includes(node.name);
				}
				for (const nid of this.file.textNodes) {
					hiddenNodeIds[nid] = true;
				}
			});
			this.state = { ...this.state, hiddenNodeIds };
			this.root.observe(this._treeObserver);
		});
		this.file.definitions.subscribe((defs) => this.definitions = defs);
		this.history.operation.subscribe((start) => {
			this.historyOp = start;
			if (!start) {
				this.tree.treeModel.update();
			}
		});
		this.hotkey.triggered.subscribe((key) => {
			switch (key) {
				case "elements":
					document.getElementById("savage-app-sidebar-el-tree").focus();
					this.tree.treeModel.setFocus(true);
					break;
				case "elem-toolbar":
					document.getElementById("savage-app-sidebar-toolbar").focus();
					break;
			}
		});
	}

	ngOnChanges(changes: SimpleChanges): void {
		if (changes.selection) {
			const activeNodeIds = {};
			this.selection.forEach((n) => activeNodeIds[n.nid] = true);
			this.state = { ...this.state, activeNodeIds };
		}
	}

	switchView(view: "shapes" | "defs"): void {
		const hiddenNodeIds = {};
		this.activeView = view;
		this.data?.forEach((node) => {
			if (view === "defs") {
				hiddenNodeIds[node.nid] = !["defs", "symbol"].includes(node.name);
			} else {
				hiddenNodeIds[node.nid] = ["defs", "symbol"].includes(node.name);
			}
			for (const nid of this.file.textNodes) {
				hiddenNodeIds[nid] = true;
			}
		});
		this.state = { ...this.state, hiddenNodeIds };
		this.tree.treeModel.setFocus(true);
		setTimeout(() => {
			const node = this.tree.treeModel.getFirstRoot(true);
			if (node) {
				this.tree.treeModel.setActiveNode(node, true, false);
			}
		}, 100);
	}

	updateId(node: Observable<SavageSVG>): void {
		const id = this.editableNode[node.nid].value;
		if (id) {
			node.attributes.id = id;
			if (node.name === "path") {
				const def = this.definitions.paths.find((d) => d.nid === node.nid);
				if (def) {
					updateIds(this.root, def.id, id);
					def.id = id;
				} else {
					this.definitions.paths.push({ nid: node.nid, id });
				}
			} else if (node.name === "clipPath") {
				const def = this.definitions.clipPaths.find((d) => d.nid === node.nid);
				if (def) {
					updateIds(this.root, def.id, id);
					def.id = id;
				} else {
					this.definitions.clipPaths.push({ nid: node.nid, id });
				}
			} else if (node.name === "filter") {
				const def = this.definitions.filters.find((d) => d.nid === node.nid);
				if (def) {
					updateIds(this.root, def.id, id);
					def.id = id;
				} else {
					this.definitions.filters.push({ nid: node.nid, id });
				}
			} else if (["linearGradient", "radialGradient"].includes(node.name)) {
				const def = this.definitions.gradients.find((d) => d.nid === node.nid);
				if (def) {
					updateIds(this.root, def.id, id);
					def.id = id;
				} else {
					this.definitions.gradients.push({ nid: node.nid, id });
				}
			} else if (node.name === "marker") {
				const def = this.definitions.markers.find((d) => d.nid === node.nid);
				if (def) {
					updateIds(this.root, def.id, id);
					def.id = id;
				} else {
					this.definitions.markers.push({ nid: node.nid, id });
				}
			} else if (node.name === "mask") {
				const def = this.definitions.masks.find((d) => d.nid === node.nid);
				if (def) {
					updateIds(this.root, def.id, id);
					def.id = id;
				} else {
					this.definitions.masks.push({ nid: node.nid, id });
				}
			} else if (node.name === "pattern") {
				const def = this.definitions.patterns.find((d) => d.nid === node.nid);
				if (def) {
					updateIds(this.root, def.id, id);
					def.id = id;
				} else {
					this.definitions.patterns.push({ nid: node.nid, id });
				}
			} else if (node.name === "symbol") {
				const def = this.definitions.symbols.find((d) => d.nid === node.nid);
				if (def) {
					updateIds(this.root, def.id, id);
					def.id = id;
				} else {
					this.definitions.symbols.push({ nid: node.nid, id });
				}
			}
			if (node.name !== "use" && GRAPHICS.includes(node.name)) {
				this.definitions.graphics.push({ nid: node.nid, id });
			}
		}
		this.history.snapshot("Edit ID");
	}

	contextMenuIdentifier(event: MouseEvent): void {
		event.stopPropagation();
	}

	toggleVisibility(node: TreeNode): void {
		if (node.data.attributes.display === "none") {
			node.data.attributes.display = node.data.attributes["data-savage-display"] || "inline";
		} else {
			node.data.attributes["data-savage-display"] = node.data.attributes.display || "inline";
			node.data.attributes.display = "none";
		}
		this.history.snapshot("Toggle visibility");
	}

	shouldPreview(data: Observable<SavageSVG>): boolean {
		return [...RENDER, ...RENDER_REF].includes(data.name);
	}

	getIcon(data: Observable<SavageSVG>): string {
		switch (data.name) {
			case "defs":
				return "signature-freehand";
			case "marker":
				return "map-marker-path";
			case "style":
				return "language-css3";
			case "mpath":
				return "vector-link";
			case "stop":
				return "octagon";
			default:
				if (ANIMATION.includes(data.name)) {
					return "animation-play-outline";
				}
				if (OBSOLETE.includes(data.name)) {
					return "cancel";
				}
				if (TEXT.includes(data.name)) {
					return "format-text";
				}
				if (PRIMITIVES.includes(data.name)) {
					return "function-variant";
				}
				if (DESCRIPTION.includes(data.name)) {
					return "image-text";
				}
		}
	}

	getPreview(data: Observable<SavageSVG>): string {
		const originalViewBox = this.root.attributes.viewBox?.split(" ").map((l) => parseFloat(l));
		const originalWidth = (originalViewBox && originalViewBox[2]) || parseFloat(this.root.attributes.width || "40");
		const originalHeight = (originalViewBox && originalViewBox[3]) || parseFloat(this.root.attributes.height || "40");
		const viewBox = [0, 0, originalWidth, originalHeight].join(" ");

		const defs = this.data.find((node) => node.name === "defs");
		const symbols = this.data.filter((node) => node.name === "symbol");
		const parent: INode = {
			name: "svg",
			type: "element",
			value: "",
			attributes: { style: "width: 100%; height: 100%;", viewBox },
			children: <INode[]> [defs, ...symbols],
		};

		if (RENDER.includes(data.name)) {
			const target = <INode> klona(data);
			target.attributes.display = "inline";
			parent.children.push(target);
		} else if (RENDER_REF.includes(data.name)) {
			let name: string;
			const attributes: Record<string, string> = {
				x: `0`,
				y: `0`,
				width: `${originalWidth}`,
				height: `${originalHeight}`,
				display: "inline",
			};
			switch (data.name) {
				case "clipPath":
					name = "rect";
					attributes["clip-path"] = `url(#${data.attributes.id})`;
					break;
				case "linearGradient":
				case "radialGradient":
				case "pattern":
					name = "rect";
					attributes.fill = `url(#${data.attributes.id})`;
					break;
				case "filter":
					name = "rect";
					attributes.filter = `url(#${data.attributes.id})`;
					break;
				case "mask":
					name = "rect";
					attributes.mask = `url(#${data.attributes.id})`;
					break;
				case "symbol":
					name = "use";
					attributes.href = `#${data.attributes.id}`;
					break;
			}
			const target: INode = {
				name,
				type: "element",
				value: "",
				attributes,
				children: [],
			};
			parent.children.push(target);
		}
		return stringify(parent);
	}

	checkParent(name: string, node: TreeNode): boolean {
		if (node?.parent) {
			if (node.parent.data.name === name) {
				return true;
			}
			return this.checkParent(name, node.parent);
		}
		return false;
	}

	findParent(name: string, node: TreeNode): TreeNode {
		if (node?.parent) {
			if (CONTAINMENT_MAP[node.parent.data.name]?.includes(name)) {
				return node.parent;
			}
			return this.findParent(name, node.parent);
		}
		return null;
	}

	canGroup(nodes: TreeNode[]): boolean {
		return nodes.length && !nodes.some((n) => ["defs", "symbol"].includes(n.data.name));
	}

	canUngroup(nodes: TreeNode[]): boolean {
		return nodes.length && nodes.every((n) => ["g", "a", "svg"].includes(n.data.name));
	}

	canLink(nodes: TreeNode[]): boolean {
		return nodes.length && nodes.every((n) => GRAPHICS.includes(n.data.name));
	}

	canMove(nodes: TreeNode[]): boolean {
		return nodes.length && !nodes.some((n) => ["defs", "symbol"].includes(n.data.name));
	}

	canRemove(nodes: TreeNode[]): boolean {
		return nodes.length && !nodes.some((n) => n.data.name === "defs");
	}

	canText2Path(nodes: TreeNode[]): boolean {
		return nodes.length && nodes.every((n) => ["text", "tspan"].includes(n.data.name) && !n.data.children.some((c) => c.name === "textPath"));
	}

	canBoolean(nodes: TreeNode[]): boolean {
		return nodes.length && nodes.length >= 2 && nodes.some((n) => n.data.name === "path");
	}

	canBreakApart(nodes: TreeNode[]): boolean {
		return nodes.some((n) => n.data.name === "path");
	}

	groupNodes(nodes: TreeNode[]): void {
		const children: Observable<SavageSVG>[] = [];
		const group: SavageSVG = {
			nid: nanoid(13),
			name: "g",
			type: "element",
			value: "",
			attributes: <any> {},
			children: <any> children,
		};
		const firstParent: Observable<SavageSVG> = findParent(this.root, nodes[0]?.data.nid);
		nodes.forEach((node) => {
			const parent = findParent(this.root, node.data.nid);
			children.push(parent.children.splice(parent.children.indexOf(node.data), 1)[0]);
		});
		firstParent?.children.splice(nodes[0].index, 0, <any> group);
		this.history.snapshot("Group elements");
	}

	ungroupNodes(nodes: TreeNode[]): void {
		if (nodes.some((n) => !["g", "a", "svg"].includes(n.data.name))) {
			return;
		}
		nodes.forEach((node) => {
			const children = node.data.children;
			node.data.children = [];
			if (node.parent === null || node.isRoot) {
				this.root.children.splice(node.index, 1, ...children);
			} else {
				(<SavageSVG[]> node.parent.data.children).splice(node.index, 1, ...children);
			}
			recursiveUnobserve(node.data);
		});
		this.tree.treeModel.update();
		this.history.snapshot("Ungroup elements");
	}

	linkNodes(nodes: TreeNode[]): void {
		const dialogRef = this.dialog.open(HrefDialogComponent, {
			data: { href: "" } as HrefData,
		});

		dialogRef.afterClosed().subscribe(result => {
			if (result !== null && result !== undefined) {
				const children: Observable<SavageSVG>[] = [];
				const group: SavageSVG = {
					nid: nanoid(13),
					name: "a",
					type: "element",
					value: "",
					attributes: <any> { href: result, target: "_blank" },
					children: <any> children,
				};
				const firstParent: Observable<SavageSVG> = findParent(this.root, nodes[0]?.data.nid);
				nodes.forEach((node) => {
					const parent = findParent(this.root, node.data.nid);
					children.push(parent.children.splice(parent.children.indexOf(node.data), 1)[0]);
				});
				firstParent?.children.splice(nodes[0].index, 0, <any> group);
			}
			this.tree.treeModel.setFocus(true);
		});
		this.history.snapshot("Link elements");
	}

	moveNodes(nid: string, nodes: TreeNode[]): void {
		const container = find(this.root, nid) || this.root;
		nodes.forEach((node) => {
			if (CONTAINMENT_MAP[container.name].includes(node.data.name)) {
				const parent = findParent(this.root, node.data.nid);
				container.children.push(parent.children.splice(parent.children.indexOf(node.data), 1)[0]);
			}
		});
		this.history.snapshot("Move elements");
	}

	addContainer(name: string, nodes: TreeNode[]): void {
		const nid = nanoid(13);
		const id = `${name}-${nanoid(7)}`;
		const attributes: any = { id };
		const viewBox = this.root.attributes.viewBox || `0 0 ${this.root.attributes.width} ${this.root.attributes.height}`;
		if (name === "pattern") {
			attributes.viewBox = viewBox;
			attributes.width = "10%";
			attributes.height = "10%";
		} else if (name === "marker") {
			attributes.viewBox = viewBox;
			attributes.markerWidth = "5%";
			attributes.markerHeight = "5%";
			attributes.refX = "center";
			attributes.refY = "center";
			attributes.orient = "auto-start-reverse";
		}
		const container: SavageSVG = {
			nid,
			name,
			type: "element",
			value: "",
			attributes,
			children: <any> [],
		};
		this.editableNode[nid] = new FormControl(id);
		const parent = name === "symbol" ? this.root : this.defs;
		nodes.forEach((node) => {
			if (CONTAINMENT_MAP[name].includes(node.data.name)) {
				const nodeParent = findParent(this.root, node.data.nid);
				container.children.push(nodeParent.children.splice(nodeParent.children.indexOf(node.data), 1)[0]);
			}
		});
		parent.children.push(<any> container);
		if (name === "pattern") {
			this.definitions.patterns.push({ nid, id });
		} else if (name === "mask") {
			this.definitions.masks.push({ nid, id });
		} else if (name === "symbol") {
			this.definitions.symbols.push({ nid, id });
		} else if (name === "marker") {
			this.definitions.markers.push({ nid, id });
		} else if (name === "clipPath") {
			this.definitions.clipPaths.push({ nid, id });
		}
		this.history.snapshot("Add element to container");
	}

	removeNodes(nodes: TreeNode[]): void {
		nodes.forEach((node) => {
			const parent = findParent(this.root, node.data.nid);
			const child = parent.children.splice(parent.children.indexOf(node.data), 1)[0];
			recursiveUnobserve(child);
			if (node.data.attributes.id) {
				for (const arr of Object.values(this.definitions)) {
					const index = arr.findIndex((d) => d.nid === node.data.nid);
					if (index) {
						arr.splice(index, 1);
					}
				}
			}
		});
		this.history.snapshot("Remove element");
	}

	addNode(name: string, selection: TreeNode): void {
		const nid = nanoid(13);
		const id = `${name}-${nanoid(7)}`;
		const children: SavageSVG[] = [];
		const node: SavageSVG = {
			name,
			type: "element",
			value: "",
			nid,
			attributes: <any> { id },
			children: <any> children,
		};
		this.editableNode[nid] = new FormControl(id);
		if (["textPath", "tspan"].includes(name)) {
			children.push({
				nid: nanoid(13),
				name: "",
				type: "text",
				value: "",
				attributes: <any> {},
				children: <any> [],
			});
		}
		if (selection.isRoot && selection.data.name !== "defs" && CONTAINMENT_MAP.svg.includes(name)) {
			this.data.push(<any> node);
		} else if (CONTAINMENT_MAP[selection?.data.name].includes(name)) {
			selection.data.children.push(<any> node);
		} else {
			const parent = this.findParent(name, selection);
			parent?.data.children.push(<any> node);
		}
		if (name !== "use" && GRAPHICS.includes(name)) {
			this.definitions.graphics.push({ nid, id });
		}
		this.history.snapshot("Add element");
	}

	addNodeHref(name: string, selection: TreeNode): void {
		const data: HrefData = { href: "" };
		if (name === "use") {
			data.autocomplete = this.definitions.graphics.map((d) => d.id).concat(this.definitions.symbols.map((d) => d.id));
		} else if (name === "textPath") {
			data.autocomplete = this.definitions.paths.map((d) => d.id);
		}
		const ref = this.dialog.open(HrefDialogComponent, { data });

		ref.afterClosed().subscribe((result) => {
			if (result !== null && result !== undefined) {
				const nid = nanoid(13);
				const id = `${name}-${nanoid(7)}`;
				const children: SavageSVG[] = [];
				const node: SavageSVG = {
					name,
					type: "element",
					value: "",
					nid,
					attributes: <any> { id, href: result },
					children: <any> children,
				};
				this.editableNode[nid] = new FormControl(id);
				if (["textPath", "tspan"].includes(name)) {
					children.push({
						nid: nanoid(13),
						name: "",
						type: "text",
						value: "",
						attributes: <any> {},
						children: <any> [],
					});
				}
				if (name === "image") {
					node.attributes.crossorigin = "anonymous";
				}
				if ((!selection || selection?.isRoot) && CONTAINMENT_MAP.svg.includes(name)) {
					this.data.push(<any> node);
				} else if (CONTAINMENT_MAP[selection?.data.name].includes(name)) {
					selection.data.children.push(<any> node);
				} else {
					const parent = this.findParent(name, selection);
					parent?.data.children.push(<any> node);
				}
				if (name !== "use" && GRAPHICS.includes(name)) {
					this.definitions.graphics.push({ nid, id });
				}
			}
			this.tree.treeModel.setFocus(true);
		});
		this.history.snapshot("Add element");
	}

	addPrimitiveNode(name: string, target: TreeNode): void {
		const nid = nanoid(13);
		const primitive: SavageSVG = {
			name,
			type: "element",
			value: "",
			nid,
			attributes: <any> { in: "SourceGraphic", in2: "", result: "" },
			children: <any> [],
		};
		this.editablePrimitive[nid] = {
			in: new FormControl("SourceGraphic"),
			in2: new FormControl(""),
			result: new FormControl(""),
		};
		if (target?.data.name === "filter") {
			target.data.children.push(primitive);
		} else if (CONTAINMENT_MAP[target?.data.name].includes(name)) {
			target.data.children.push(primitive);
		} else {
			const parent = this.findParent("filter", target);
			parent?.data.children.push(primitive);
		}
		this.history.snapshot("Add element");
	}

	text2path(treeNode: TreeNode): void {
		const node: SavageSVG = treeNode.data;
		const x = parseFloat(node.attributes.x || node.children[0].attributes.x || "0");
		const y = parseFloat(node.attributes.y || node.children[0].attributes.y || "0");
		const text = node.children.map((c) => findText(c)?.value).join("");
		const family = node.attributes["font-family"] || "Roboto";
		const style = node.attributes["font-style"] || "normal";
		let weight = node.attributes["font-weight"] || "400";
		const size = parseFloat(node.attributes["font-size"] || "20");


		const font = googleFonts[family] || (<any> googleFonts).Roboto;
		if (weight === "normal") {
			weight = "400";
		} else if (weight === "bold") {
			weight = "700";
		}
		let variant = font.variants[style];
		if (!variant) {
			if (style === "italic") {
				variant = font.variants.oblique;
			} else {
				variant = font.variants.italic;
			}
		}
		if (!variant) {
			variant = font.variants.normal;
		}
		variant = variant[weight];
		if (!variant) {
			variant = variant["400"];
		}
		Text2Svg.load(variant.url.ttf || variant.url.woff, (err, text2svg) => {
			if (err) {
				console.warn(err);
			} else {
				const d = text2svg.getD(text, { x, y, fontSize: size });
				const path: SavageSVG = {
					nid: node.nid,
					name: "path",
					type: "element",
					value: "",
					attributes: <any> { d, ...node.attributes },
					children: <any> [],
				};
				delete path.attributes.x;
				delete path.attributes.y;
				delete path.attributes["font-family"];
				delete path.attributes["font-size"];
				delete path.attributes["font-style"];
				delete path.attributes["font-weight"];
				const index = treeNode.index;
				if (treeNode.parent === null || treeNode.isRoot) {
					this.root.children.splice(index, 1, <any> path);
				} else {
					treeNode.parent.data.children.splice(index, 1, path);
				}
				recursiveUnobserve(<any> node);
				this.tree.treeModel.update();
			}
		});
	}

	shape2path(treeNodes: TreeNode[]): void {
		treeNodes.forEach((treeNode) => {
			if (treeNode.data.name === "text") {
				if (this.canText2Path([treeNode])) {
					this.text2path(treeNode);
				} else {
					console.warn("Cannot convert textPath to path");
				}
			} else if (["image", "use"].includes(treeNode.data.name)) {
				console.warn("Can only convert shapes to path");
			} else {
				const node: SavageSVG = {
					nid: treeNode.data.nid,
					name: "path",
					type: "element",
					value: "",
					attributes: <any> { ...treeNode.data.attributes, d: element2path(treeNode.data) },
					children: <any> [],
				};
				delete node.attributes.points;
				delete node.attributes.x;
				delete node.attributes.x1;
				delete node.attributes.x2;
				delete node.attributes.y;
				delete node.attributes.y1;
				delete node.attributes.y2;
				delete node.attributes.width;
				delete node.attributes.height;
				delete node.attributes.r;
				delete node.attributes.rx;
				delete node.attributes.ry;
				delete node.attributes.cx;
				delete node.attributes.cy;
				if (treeNode.parent === null || treeNode.isRoot) {
					this.root.children.splice(treeNode.index, 1, <any> node);
				} else {
					treeNode.parent.data.children.splice(treeNode.index, 1, node);
				}
				recursiveUnobserve(treeNode.data);
				this.tree.treeModel.update();
			}
		});
		this.history.snapshot("Convert to path");
	}

	booleanOp(op: string, treeNodes: TreeNode[]): void {
		const nodes = [...treeNodes.filter((n) => n.data.name === "path")];
		nodes.reduce((node, summand) => {
			const pathOne = PathItem.create(node.data.attributes.d);
			const pathTwo = PathItem.create(summand.data.attributes.d);
			if (node.data.attributes.transform) {
				const matrix = compose(fromDefinition(fromTransformAttribute(node.data.attributes.transform)));
				pathOne.transform(new Matrix(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f));
			}
			if (summand.data.attributes.transform) {
				const matrix = compose(fromDefinition(fromTransformAttribute(summand.data.attributes.transform)));
				pathTwo.transform(new Matrix(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f));
			}
			let path: paper.PathItem;
			if (op !== "combine") {
				path = pathOne[op](pathTwo);
			} else {
				path = new CompoundPath(pathOne.pathData);
				path.addChild(pathTwo);
			}
			recursiveUnobserve(summand.data);
			if (summand.parent === null || summand.isRoot) {
				this.root.children.splice(this.root.children.indexOf(summand.data), 1);
			} else {
				summand.parent.data.children.splice(summand.parent.data.children.indexOf(summand.data), 1);
			}
			pathOne.remove();
			node.data.attributes.d = path.pathData;
			if (op === "combine") {
				pathTwo.remove();
			}
			path.remove();
			delete node.data.attributes.transform;
			return node;
		});
		this.history.snapshot("Boolean operation");
	}

	breakApart(treeNodes: TreeNode[]): void {
		treeNodes.filter((n) => n.data.name === "path").forEach((node) => {
			const attributes = { ...node.data.attributes };
			const cPath = new CompoundPath(node.data.attributes.d);
			const paths: string[] = cPath.children.map((p: paper.Path) => p.pathData);
			const nodes: SavageSVG[] = paths.map((p) => ({
				nid: nanoid(13),
				name: "path",
				type: "element",
				value: "",
				children: <any> [],
				attributes: { ...attributes, d: p },
			}));
			cPath.remove();
			if (node.parent === null || node.isRoot) {
				this.root.children.splice(node.index, 1, ...<any> nodes);
			} else {
				node.parent.data.children.splice(node.index, 1, ...nodes);
			}
			recursiveUnobserve(node.data);
		});
		this.history.snapshot("Break apart path(s)");
	}

	dupeNode(treeNodes: TreeNode[]): void {
		const changeIds = (node: SavageSVG) => {
			node.nid = nanoid(13);
			node.attributes.id = "";
			node.children.forEach((c) => changeIds(<any> c));
		};
		const makeEditable = (node: SavageSVG) => {
			if (PRIMITIVES.includes(node.name)) {
				node.attributes.in = "SourceGraphic";
				this.editablePrimitive[node.nid] = { in: new FormControl("SourceGraphic"), in2: new FormControl(""), result: new FormControl("") };
			} else {
				this.editableNode[node.nid] = new FormControl(node.attributes.id);
			}
			node.children.forEach((c) => makeEditable(<any> c));
		}
		treeNodes.forEach((treeNode) => {
			const clone = klona(treeNode.data);
			changeIds(clone);
			makeEditable(clone);
			treeNode.parent.data.children.splice(treeNode.index + 1, 0, clone);
		});
		this.history.snapshot("Duplicate element");
	}
}
