import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";

import { MaterialModule } from "../material.module";
import { SafeHtmlPipe } from "../pipes/safe.pipe";
import { MenubarComponent } from "./menubar/menubar.component";
import { ToolbarComponent } from "./toolbar/toolbar.component";
import { DrawerComponent } from "./drawer/drawer.component";
import { SidebarComponent } from "./sidebar/sidebar.component";
import { SidebarElementsComponent } from "./sidebar-elements/sidebar-elements.component";
import { HrefDialogComponent } from "./href-dialog/href-dialog.component";
import { GuideDialogComponent } from "./guide-dialog/guide-dialog.component";
import { SidebarPropsComponent } from "./sidebar-props/sidebar-props.component";
import { SidebarPresentationComponent } from "./sidebar-presentation/sidebar-presentation.component";
import { SidebarTextComponent } from "./sidebar-text/sidebar-text.component";
import { SidebarTransformComponent } from "./sidebar-transform/sidebar-transform.component";
import { CodeEditorSheetComponent } from "./code-editor-sheet/code-editor-sheet.component";
import { ShortcutsDialogComponent } from "./shortcuts-dialog/shortcuts-dialog.component";
import { NewDocumentDialogComponent } from "./new-document-dialog/new-document-dialog.component";


@NgModule({
	declarations: [
		SafeHtmlPipe,
		MenubarComponent,
		ToolbarComponent,
		DrawerComponent,
		SidebarComponent,
		SidebarElementsComponent,
		HrefDialogComponent,
		GuideDialogComponent,
		SidebarPropsComponent,
		SidebarPresentationComponent,
		SidebarTextComponent,
		SidebarTransformComponent,
		CodeEditorSheetComponent,
		ShortcutsDialogComponent,
		NewDocumentDialogComponent,
	],
	entryComponents: [
		HrefDialogComponent,
		GuideDialogComponent,
		CodeEditorSheetComponent,
		ShortcutsDialogComponent,
		NewDocumentDialogComponent,
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
