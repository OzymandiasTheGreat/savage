import { INode} from "svgson";
import { Matrix, inverse, applyToPoint, applyToPoints, Point as ArrayPoint } from "transformation-matrix";

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


export const SVGElements = {
	render: ["a", "circle", "ellipse", "g", "image", "line", "path", "polygon",
		"polyline", "rect", "svg", "use"],
	renderRef: ["linearGradient", "pattern", "radialGradient", "symbol", "filter", "mask"],
	text: ["text", "textPath", "tspan"],
	unsupported: ["switch", "meshgradient", "mesh", "hatch", "title", "unknown", "foreignObject",
		"hatchpath", "meshpatch", "meshrow", "view", "desc", "metadata", "animate",
		"animateMotion", "animateTransform", "discard", "set", "mpath"],
	deprecated: ["animateColor", "missing-glyph", "font", "font-face", "font-face-format",
		"font-face-name", "font-face-src", "font-face-uri", "hkern", "vkern", "solidcolor",
		"altGlyph", "altGlyphDef", "altGlyphItem", "glyph", "glyphRef", "tref",
		"color-profile", "cursor"],
	primitives: ["feBlend", "feColorMatrix", "feComponentTransfer", "feComposite",
		"feConvolveMatrix", "feDiffuseLighting", "feDisplacementMap", "feDropShadow",
		"feFlood", "feFuncA", "feFuncB", "feFuncG", "feFuncR", "feGaussianBlur", "feImage",
		"feMerge", "feMergeNode", "feMorphology", "feOffset", "feSpecularLighting", "feTile",
		"feTurbulence", "feDistantLight", "fePointLight", "feSpotLight"],
	other: ["defs", "clipPath", "marker", "script", "style", "stop"],
};


export const CONTAINMENT_MAP = {
	a: [...SVGElements.render.slice(1), "text"],
	g: [...SVGElements.render, "text"],
	svg: [...SVGElements.render, "text", "defs", "symbol", "style", "script"],
	defs: [...SVGElements.render, ...SVGElements.renderRef, "clipPath", "marker"],
	clipPath: [...SVGElements.render.slice(1), "text"],
	marker: [...SVGElements.render, "text"],
	linearGradient: ["stop"],
	radialGradient: ["stop"],
	pattern: [...SVGElements.render, "text"],
	symbol: [...SVGElements.render, "text"],
	mask: [...SVGElements.render, "text", "linearGradient", "radialGradient", "pattern", "filter"],
	filter: [...SVGElements.primitives],
	text: [...SVGElements.text.slice(1)],
};


export const KNOWN_ELEMENTS = SVGElements.render.concat(
	SVGElements.renderRef,
	SVGElements.text,
	SVGElements.primitives,
	SVGElements.other,
	SVGElements.deprecated,
	SVGElements.unsupported,
);


export const ELEMENTS_SKIP = SVGElements.unsupported.concat(SVGElements.deprecated);
