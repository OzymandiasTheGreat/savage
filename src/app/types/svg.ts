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


// export interface SVGCoreAttributes {
// 	"id": string;
// 	"tabindex": number;
// }


// export interface SVGStyleAttributes {
// 	"class": string;
// 	"style": string;
// }


// export interface SVGPresentationAttributes {
// 	"clip-path": string;
// 	"clip-rule": "nonzero" | "evenodd" | "inherit";
// 	"color": string;
// 	"color-interpolation": "auto" | "sRGB" | "linearRGB";
// 	"display": "none" | "contents" | "block" | "inline" | "run-in" | "flow" | "flow-root" | "table"
// 		| "flex" | "grid" | "ruby" | "list-item" | "table-row-group" | "table-header-group"
// 		| "table-footer-group" | "table-row" | "table-cell" | "table-column-group"
// 		| "table-column" | "table-caption" | "ruby-base" | "ruby-text" | "ruby-base-container"
// 		| "ruby-text-container";
// 	"overflow": "visible" | "hidden" | "scroll" | "auto";
// 	"pointer-events": "bounding-box" | "visiblePainted" | "visibleFill" | "visibleStroke"
// 		| "visible" | "painted" | "fill" | "stroke" | "all" | "none";
// }


// export interface SVGShapeAttributes {
// 	"cursor": string |  "auto" | "crosshair" | "default" | "pointer" | "move"
// 		| "e-resize" | "ne-resize" | "nw-resize" | "n-resize" | "se-resize"
// 		| "sw-resize" | "s-resize" | "w-resize"| "text" | "wait" | "help" | "inherit";
// 	"fill": string;
// 	"fill-opacity": number | string;
// 	"fill-rule": "nonzero" | "evenodd";
// 	"filter": string;
// 	"marker-end": string;
// 	"marker-mid": string;
// 	"marker-start": string;
// 	"mask": string;
// 	"mask-image": string;
// 	"mask-mode": "alpha" | "luminance" | "match-source";
// 	"mask-repeat": string;
// 	"mask-position": string;
// 	"mask-clip": "no-clip" | "fill-box" | "stroke-box" | "view-box" | "margin-box"
// 		| "border-box" | "padding-box" | "content-box";
// 	"mask-origin": "fill-box" | "stroke-box" | "view-box" | "margin-box" | "border-box"
// 		| "padding-box" | "content-box";
// 	"mask-size": string | "cover" | "contain";
// 	"mask-composite": "add" | "subtract" | "intersect" | "exclude";
// 	"opacity": number;
// 	"shape-rendering": "auto" | "optimizeSpeed" | "crispEdges" | "geometricPrecision";
// 	"stroke": string;
// }


// export interface SVGTextAttributes {
// 	"alignment-baseline": "baseline" | "text-before-edge" | "middle" | "central"
// 		| "text-after-edge" | "ideographic" | "alphabetic" | "hanging" | "mathematical"
// 		| "top" | "center" | "bottom";
// 	"direction": "ltr" | "rtl";
// 	"dominant-baseline": "auto" | "text-bottom" | "alphabetic" | "ideographic"
// 		| "middle" | "central" | "mathematical" | "hanging" | "text-top";
// 	"font-family": string;
// 	"font-size": number | string;
// 	"font-size-adjust": number;
// 	"font-stretch": string | "normal" | "ultra-condensed" | "extra-condensed"
// 		| "condensed" | "semi-condensed" | "semi-expanded" | "expanded" | 'extra-expanded'
// 		| "ultra-expanded";
// 	"font-style": "normal" | "italic" | "oblique";
// 	"font-variant": string | "small-caps" | "all-small-caps" | "petite-caps"
// 		| "all-petite-caps" | "unicase" | "titling-caps" | "ordinal" | "slashed-zero";
// 	"font-weight": number | "normal" | "bold" | "bolder" | "lighter";
// 	"letter-spacing": "normal" | number;
// }


// export interface SVGFilterAttributes {
// 	"color-interpolation-filters": "auto" | "sRGB" | "linearRGB";
// 	"flood-color": string;
// 	"flood-opacity": number;
// 	"lighting-color": string;
// }


// export interface SVGGradientAttributes {
// 	"stop-color": "currentcolor" | string;
// 	"stop-opacity": number;
// }
