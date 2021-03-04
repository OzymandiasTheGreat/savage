import { INode} from "svgson";
import { Matrix, inverse, applyToPoint, applyToPoints, Point as ArrayPoint, compose, fromDefinition, fromTransformAttribute } from "transformation-matrix";

import { Observable } from "./observer";


export interface SavageSVG extends Omit<INode, "attributes" | "children"> {
	nid: string;
	attributes: Observable<Record<string, string>>;
	children: Observable<Observable<SavageSVG>[]>;
}


export interface SavageRecentSVG {
	name: string;
	data: string;
	modified: number;
}


export function find(root: Observable<SavageSVG>, nid: string): Observable<SavageSVG> {
	let node: Observable<SavageSVG>;

	root.children?.some((n) => {
		if (n.nid === nid) {
			return node = n;
		}
		return node = find(n, nid);
	});
	return node || null;
}


export function findParent(root: Observable<SavageSVG>, nid: string): Observable<SavageSVG> | null {
	let node: Observable<SavageSVG>;

	root.children?.some((n) => {
		if (n.nid === nid) {
			return node = root;
		}
		return node = findParent(n, nid);
	});
	return node || null;
}


export function extractMatrix(node: Observable<SavageSVG>, root: Observable<SavageSVG>): Matrix {
	const matrices: Matrix[] = [];
	let parent = node;
	while (parent !== null) {
		if (parent.attributes.transform) {
			matrices.push(compose(fromDefinition(fromTransformAttribute(parent.attributes.transform))));
		}
		parent = findParent(root, parent.nid);
	}
	return compose({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }, ...matrices);
}


export function updateIds(root: Observable<SavageSVG>, oldId: string, newId: string): void {
	const attrs = ["clip-path", "cursor", "fill", "filter", "marker-end", "marker-mid", "marker-start", "mask", "stroke"];
	const recurse = (node: Observable<SavageSVG>) => {
		attrs.forEach((attr) => {
			if (node.attributes[attr]) {
				if (node.attributes[attr].includes(oldId)) {
					node.attributes[attr] = `url(#${newId})`;
				}
			}
		});
		if (node.attributes.href && node.attributes.href === oldId) {
			node.attributes.href = newId;
		}
		node.children.forEach((c) => recurse(c));
	};
	recurse(root);
}


export function findText(root: Observable<SavageSVG>): Observable<SavageSVG> {
	let text: Observable<SavageSVG>;

	root.children?.some((n) => {
		if (n.type === "text") {
			return text = n;
		}
		return text = findText(n);
	});
	return text || null;
}


export interface Point {
	x: number;
	y: number;
}


export function screen2svg(svg: SVGSVGElement, screen: Point): Point {
	const ctm = svg.getScreenCTM();
	const point = svg.createSVGPoint();
	point.x = screen.x;
	point.y = screen.y;
	const target = point.matrixTransform(ctm.inverse());
	return { x: target.x, y: target.y };
}


export function svg2screen(svg: SVGSVGElement, point: Point): Point {
	const ctm = svg.getScreenCTM();
	const svgPoint = svg.createSVGPoint();
	svgPoint.x = point.x;
	svgPoint.y = point.y;
	const target = svgPoint.matrixTransform(ctm);
	return { x: target.x, y: target.y };
}


export function applyTransformed(xy: Point, d: Point, matrix: Matrix): Point {
	xy = applyToPoint(matrix, xy);
	return applyToPoint(inverse(matrix), { x: xy.x + d.x, y: xy.y + d.y });
}


export function applyTransformedPoly(points: ArrayPoint[], d: Point, matrix: Matrix): ArrayPoint[] {
	points = applyToPoints(matrix, points);
	return applyToPoints(inverse(matrix), points.map((p) => <ArrayPoint> [p[0] + d.x, p[1] + d.y]));
}


export const ANIMATION = ["animate", "animateMotion", "animateTransform", "discard", "mpath", "set"];
export const CONTAINER_RENDER = ["a", "g", "svg", "switch"];
export const CONTAINER_NORENDER = ["defs", "marker", "mask", "pattern", "symbol"];
export const CONTAINER = [...CONTAINER_RENDER, ...CONTAINER_NORENDER];
export const DESCRIPTION = ["desc", "metadata", "title"];
export const GRAPHICS = ["circle", "ellipse", "foreignObject", "image", "line",
	"path", "polygon", "polyline", "rect", "text", "use"];
export const PRIMITIVES = ["feBlend", "feColorMatrix", "feComponentTransfer", "feComposite",
	"feConvolveMatrix", "feDiffuseLighting", "feDisplacementMap", "feDropShadow", "feFlood",
	"feFuncA", "feFuncB", "feFuncG", "feFuncR", "feGaussianBlur", "feImage", "feMerge",
	"feMergeNode", "feMorphology", "feOffset", "feSpecularLighting", "feTile", "feTurbulence"];
export const STRUCTURAL = ["defs", "g", "svg", "symbol", "use"];
export const TEXT = ["textPath", "tspan"];
export const RENDER = [...CONTAINER_RENDER, ...GRAPHICS];
export const RENDER_REF = ["linearGradient", "pattern", "radialGradient", "symbol", "filter", "mask", "clipPath"];
export const OBSOLETE = ["altGlyph", "altGlyphDef", "altGlyphItem", "animateColor", "cursor",
	"font", "font-face", "font-face-format", "font-face-name", "font-face-src", "font-face-uri",
	"glyph", "glyphRef", "hkern", "missing-glyph", "tref", "vkern", "script"];


export const NO_CONTAINMENT = ["animate", "animateTransform", "desc", "discard",
	"foreignObject", "metadata", "set", "style", "title"];
export const CONTAINMENT_MAP = {
	a: [...ANIMATION, ...DESCRIPTION, ...GRAPHICS, ...CONTAINER],
	animateMotion: ["mpath"],
	circle: [...ANIMATION, ...DESCRIPTION],
	clipPath: [...ANIMATION, ...DESCRIPTION, ...GRAPHICS],
	defs: [...ANIMATION, ...CONTAINER, ...DESCRIPTION, ...GRAPHICS, ...RENDER_REF],
	ellipse: [...ANIMATION, ...DESCRIPTION],
	feBlend: ANIMATION,
	feColorMatrix: ANIMATION,
	feComponentTransfer: ["feFuncA", "feFuncR", "feFuncB", "feFuncG"],
	feComposite: ANIMATION,
	feConvolveMatrix: ANIMATION,
	feDiffuseLighting: ["feDistantLight", "fePointLight", "feSpotLight"],
	feDisplacementMap: ANIMATION,
	feDistantLight: ANIMATION,
	feDropShadow: ANIMATION,
	feFlood: ANIMATION,
	feFuncA: ANIMATION,
	feFuncB: ANIMATION,
	feFuncG: ANIMATION,
	feFuncR: ANIMATION,
	feGaussianBlur: ANIMATION,
	feImage: ANIMATION,
	feMerge: ["feMergeNode"],
	feMergeNode: ANIMATION,
	feMorphology: ANIMATION,
	feOffset: ANIMATION,
	fePointLight: ANIMATION,
	feSpecularLighting: ["feDistantLight", "fePointLight", "feSpotLight"],
	feSpotLight: ANIMATION,
	feTile: ANIMATION,
	feTurbulence: ANIMATION,
	filter: [...ANIMATION, ...DESCRIPTION, ...PRIMITIVES],
	g: [...ANIMATION, ...CONTAINER, ...GRAPHICS, ...DESCRIPTION, ...RENDER_REF],
	image: [...ANIMATION, ...DESCRIPTION],
	line: [...ANIMATION, ...DESCRIPTION],
	linearGradient: [...ANIMATION, ...DESCRIPTION, "stop"],
	marker: [...ANIMATION, ...CONTAINER, ...GRAPHICS, ...DESCRIPTION, ...RENDER_REF],
	mask: [...ANIMATION, ...CONTAINER, ...GRAPHICS, ...DESCRIPTION, ...RENDER_REF],
	mpath: [...DESCRIPTION],
	path: [...ANIMATION, ...DESCRIPTION],
	pattern: [...ANIMATION, ...CONTAINER, ...GRAPHICS, ...DESCRIPTION, ...RENDER_REF],
	polygon: [...ANIMATION, ...DESCRIPTION],
	polyline: [...ANIMATION, ...DESCRIPTION],
	radialGradient: [...ANIMATION, ...DESCRIPTION, "stop"],
	rect: [...ANIMATION, ...DESCRIPTION],
	stop: ANIMATION,
	svg: [...ANIMATION, ...CONTAINER, ...GRAPHICS, ...DESCRIPTION, ...RENDER_REF],
	switch: [...ANIMATION, ...DESCRIPTION, ...CONTAINER_RENDER, ...GRAPHICS],
	symbol: [...ANIMATION, ...CONTAINER, ...GRAPHICS, ...DESCRIPTION, ...RENDER_REF],
	text: [...ANIMATION, ...DESCRIPTION, ...TEXT],
	textPath: [...ANIMATION, ...DESCRIPTION, "tspan"],
	tspan: [...ANIMATION, ...DESCRIPTION, "tspan"],
	use: [...ANIMATION, ...DESCRIPTION],
	root: [...ANIMATION, ...CONTAINER_RENDER, ...GRAPHICS, ...DESCRIPTION],
};
