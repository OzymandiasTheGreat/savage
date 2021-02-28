import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";

import { MaterialModule } from "../material.module";

import { AttrsDirective } from "./directives/attrs.directive";
import { RegistryDirective } from "./directives/registry.directive";
import { DraggableDirective } from "./directives/draggable.directive";
import { CanvasComponent } from "./canvas/canvas.component";
import { DocumentComponent } from "./document/document.component";
import { ObjectToolComponent } from "./object-tool/object-tool.component";
import { PathToolComponent } from "./path-tool/path-tool.component";
import { TextToolComponent } from "./text-tool/text-tool.component";
import { ResizeDirective } from "./directives/resize.directive";
import { RectToolComponent } from "./rect-tool/rect-tool.component";
import { CircleToolComponent } from "./circle-tool/circle-tool.component";
import { PolygonToolComponent } from "./polygon-tool/polygon-tool.component";
import { LineToolComponent } from "./line-tool/line-tool.component";
import { FreehandToolComponent } from "./freehand-tool/freehand-tool.component";
import { GradientToolComponent } from "./gradient-tool/gradient-tool.component";
import { ShapeToolComponent } from "./shape-tool/shape-tool.component";
import { StampToolComponent } from "./stamp-tool/stamp-tool.component";
import { EyeDropperToolComponent } from "./eye-dropper-tool/eye-dropper-tool.component";
import { MeasureToolComponent } from "./measure-tool/measure-tool.component";


@NgModule({
	declarations: [
		AttrsDirective,
		RegistryDirective,
		DraggableDirective,
		CanvasComponent,
		DocumentComponent,
		ObjectToolComponent,
		PathToolComponent,
		TextToolComponent,
		ResizeDirective,
		RectToolComponent,
		CircleToolComponent,
		PolygonToolComponent,
		LineToolComponent,
		FreehandToolComponent,
		GradientToolComponent,
		ShapeToolComponent,
		StampToolComponent,
		EyeDropperToolComponent,
		MeasureToolComponent,
	],
	imports: [
		CommonModule,
		MaterialModule,
	],
	exports: [
		AttrsDirective,
		RegistryDirective,
		DraggableDirective,
		CanvasComponent,
	],
})
export class CanvasModule { }
