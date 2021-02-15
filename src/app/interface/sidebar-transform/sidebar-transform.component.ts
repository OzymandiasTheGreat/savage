import { Component, OnInit, Input } from "@angular/core";
import { Matrix, compose, fromDefinition, fromTransformAttribute, toSVG, smoothMatrix, translate, rotate, scale, skew } from "transformation-matrix";
import unmatrix from "unmatrix";

import { Observable } from "../../types/observer";
import { SavageSVG, RENDER } from "../../types/svg";
import { HistoryService } from "../../services/history.service";


@Component({
	selector: "app-sidebar-transform",
	templateUrl: "./sidebar-transform.component.html",
	styleUrls: ["./sidebar-transform.component.scss"]
})
export class SidebarTransformComponent implements OnInit {
	@Input() selection: Observable<SavageSVG>[];
	get matrix(): Matrix {
		const render = this.selection.filter((e) => RENDER.includes(e.name));
		if (render && render.length) {
			const transform = render[0].attributes.transform;
			if (render.every((e) => e.attributes.transform === transform)) {
				return transform
					? compose(fromDefinition(fromTransformAttribute(transform)))
					: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
			}
			return null;
		}
		return undefined;
	}
	set matrix(val: Matrix) {
		const render = this.selection.filter((e) => RENDER.includes(e.name));
		if (render && render.length) {
			const matrix = toSVG(smoothMatrix(val, 10 ** 7));
			render.forEach((e) => e.attributes.transform = matrix);
		}
	}
	get a(): number { return this.matrix.a; }
	set a(val: number) {
		const render = this.selection.filter((e) => RENDER.includes(e.name));
		if (render && render.length) {
			const matrix = toSVG(smoothMatrix({ ...this.matrix, a: val }, 10 ** 7));
			render.forEach((e) => e.attributes.transform = matrix);
		}
	}
	get b(): number { return this.matrix.b; }
	set b(val: number) {
		const render = this.selection.filter((e) => RENDER.includes(e.name));
		if (render && render.length) {
			const matrix = toSVG(smoothMatrix({ ...this.matrix, b: val }, 10 ** 7));
			render.forEach((e) => e.attributes.transform = matrix);
		}
	}
	get c(): number { return this.matrix.c; }
	set c(val: number) {
		const render = this.selection.filter((e) => RENDER.includes(e.name));
		if (render && render.length) {
			const matrix = toSVG(smoothMatrix({ ...this.matrix, c: val }, 10 ** 7));
			render.forEach((e) => e.attributes.transform = matrix);
		}
	}
	get d(): number { return this.matrix.d; }
	set d(val: number) {
		const render = this.selection.filter((e) => RENDER.includes(e.name));
		if (render && render.length) {
			const matrix = toSVG(smoothMatrix({ ...this.matrix, d: val }, 10 ** 7));
			render.forEach((e) => e.attributes.transform = matrix);
		}
	}
	get e(): number { return this.matrix.e; }
	set e(val: number) {
		const render = this.selection.filter((e) => RENDER.includes(e.name));
		if (render && render.length) {
			const matrix = toSVG(smoothMatrix({ ...this.matrix, e: val }, 10 ** 7));
			render.forEach((e) => e.attributes.transform = matrix);
		}
	}
	get f(): number { return this.matrix.f; }
	set f(val: number) {
		const render = this.selection.filter((e) => RENDER.includes(e.name));
		if (render && render.length) {
			const matrix = toSVG(smoothMatrix({ ...this.matrix, f: val }, 10 ** 7));
			render.forEach((e) => e.attributes.transform = matrix);
		}
	}
	translateX = 0;
	translateY = 0;
	rotate = 0;
	scaleX = 0;
	scaleY = 0;
	skewX = 0;
	skewY = 0;

	constructor(
		public history: HistoryService,
	) { }

	ngOnInit(): void { }

	edited(): void {
		this.history.snapshot("Transform attribute edited");
	}

	decompose(): void {
		if (this.matrix) {
			const decomposed = unmatrix.decompose([
				[this.matrix.a, this.matrix.b, 0, 0],
				[this.matrix.c, this.matrix.d, 0, 0],
				[0, 0, 1, 0],
				[this.matrix.e, this.matrix.f, 0, 1],
			]);
			this.translateX = decomposed.translateX;
			this.translateY = decomposed.translateY;
			this.rotate = decomposed.rotate;
			this.scaleX = decomposed.scaleX;
			this.scaleY = decomposed.scaleY;
			this.skewX = decomposed.skewX;
			this.skewY = decomposed.skewY;
		}
	}

	compose(): void {
		if (this.matrix) {
			this.matrix = compose(
				translate(this.translateX, this.translateY),
				rotate(this.rotate),
				scale(this.scaleX, this.scaleY),
				skew(this.skewX, this.skewY),
			);
		}
	}
}
