import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewDocumentDialogComponent } from './new-document-dialog.component';

describe('NewDocumentDialogComponent', () => {
  let component: NewDocumentDialogComponent;
  let fixture: ComponentFixture<NewDocumentDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NewDocumentDialogComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NewDocumentDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
