import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { DomSanitizer } from "@angular/platform-browser";
import { HttpClientModule } from "@angular/common/http";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";

import { MatIconModule, MatIconRegistry } from "@angular/material/icon";
import { MatToolbarModule } from "@angular/material/toolbar";
import { MatButtonModule } from "@angular/material/button";
import { MatButtonToggleModule } from "@angular/material/button-toggle";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatDividerModule } from "@angular/material/divider";
import { MatSidenavModule } from "@angular/material/sidenav";
import { MatExpansionModule } from "@angular/material/expansion";
import { MatListModule } from "@angular/material/list";
import { MatInputModule } from "@angular/material/input";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatMenuModule } from "@angular/material/menu";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { MatTreeModule } from "@angular/material/tree";
import { MatTabsModule } from "@angular/material/tabs";

import { DragDropModule } from "@angular/cdk/drag-drop";

import { NgxMatFileInputModule } from "@angular-material-components/file-input";
import { TreeModule } from "@circlon/angular-tree-component";
import { EditableModule, EDITABLE_CONFIG, EditableConfig } from "@ngneat/edit-in-place";


@NgModule({
	declarations: [],
	imports: [
		CommonModule,
		BrowserAnimationsModule,
		HttpClientModule,
		FormsModule,
		ReactiveFormsModule,
		MatIconModule,
		MatToolbarModule,
		MatButtonModule,
		MatButtonToggleModule,
		MatTooltipModule,
		MatDividerModule,
		MatSidenavModule,
		MatExpansionModule,
		MatListModule,
		MatInputModule,
		MatFormFieldModule,
		MatMenuModule,
		MatSlideToggleModule,
		MatTreeModule,
		MatTabsModule,
		DragDropModule,
		NgxMatFileInputModule,
		TreeModule,
		EditableModule,
	],
	exports: [
		BrowserAnimationsModule,
		HttpClientModule,
		FormsModule,
		ReactiveFormsModule,
		MatIconModule,
		MatToolbarModule,
		MatButtonModule,
		MatButtonToggleModule,
		MatTooltipModule,
		MatDividerModule,
		MatSidenavModule,
		MatExpansionModule,
		MatListModule,
		MatInputModule,
		MatFormFieldModule,
		MatMenuModule,
		MatSlideToggleModule,
		MatTreeModule,
		MatTabsModule,
		DragDropModule,
		NgxMatFileInputModule,
		TreeModule,
		EditableModule,
	],
	providers: [
		{
			provide: EDITABLE_CONFIG,
			useValue: {
				openBindingEvent: "dblclick",
			} as EditableConfig,
		},
	]
})
export class MaterialModule {
	constructor(matIconRegistry: MatIconRegistry, domSanitizer: DomSanitizer) {
		matIconRegistry.addSvgIconSet(
			domSanitizer.bypassSecurityTrustResourceUrl("./assets/mdi.svg"),
		);
	}
}
