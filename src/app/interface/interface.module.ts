import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";

import { MaterialModule } from "../material.module";
import { SafeHtmlPipe } from "../pipes/safe.pipe";
import { MenubarComponent } from "./menubar/menubar.component";
import { ToolbarComponent } from "./toolbar/toolbar.component";
import { DrawerComponent } from "./drawer/drawer.component";
import { SidebarComponent } from "./sidebar/sidebar.component";
import { SidebarElementsComponent } from "./sidebar-elements/sidebar-elements.component";


@NgModule({
	declarations: [
		SafeHtmlPipe,
		MenubarComponent,
		ToolbarComponent,
		DrawerComponent,
		SidebarComponent,
		SidebarElementsComponent,
	],
	imports: [
		CommonModule,
		MaterialModule,
	],
	exports: [
		MenubarComponent,
		ToolbarComponent,
		DrawerComponent,
		SidebarComponent,
	],
})
export class InterfaceModule { }