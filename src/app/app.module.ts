import { BrowserModule } from "@angular/platform-browser";
import { NgModule } from "@angular/core";

import { AppRoutingModule } from "./app-routing.module";
import { MaterialModule } from "./material.module";
import { InterfaceModule } from "./interface/interface.module";
import { CanvasModule } from "./canvas/canvas.module";
import { AppComponent } from "./app.component";


@NgModule({
	declarations: [
		AppComponent,
	],
	entryComponents: [],
	imports: [
		BrowserModule,
		AppRoutingModule,
		MaterialModule,
		InterfaceModule,
		CanvasModule,
	],
	providers: [],
	bootstrap: [AppComponent]
})
export class AppModule { }
