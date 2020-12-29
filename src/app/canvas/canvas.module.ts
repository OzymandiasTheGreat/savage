import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";

import { AttrsDirective } from "./directives/attrs.directive";
import { RegistryDirective } from "./directives/registry.directive";
import { DraggableDirective } from "./directives/draggable.directive";
import { CanvasComponent } from "./canvas/canvas.component";
import { DocumentComponent } from "./document/document.component";
import { ObjectToolComponent } from "./object-tool/object-tool.component";
import { PathToolComponent } from "./path-tool/path-tool.component";


@NgModule({
	declarations: [
		AttrsDirective,
		RegistryDirective,
		DraggableDirective,
		CanvasComponent,
		DocumentComponent,
		ObjectToolComponent,
		PathToolComponent,
	],
	imports: [
		CommonModule,
	],
	exports: [
		AttrsDirective,
		RegistryDirective,
		DraggableDirective,
		CanvasComponent,
	],
})
export class CanvasModule { }
