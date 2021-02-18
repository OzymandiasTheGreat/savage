import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CodeEditorSheetComponent } from './code-editor-sheet.component';

describe('CodeEditorSheetComponent', () => {
  let component: CodeEditorSheetComponent;
  let fixture: ComponentFixture<CodeEditorSheetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CodeEditorSheetComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CodeEditorSheetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
