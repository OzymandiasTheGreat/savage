import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GuideDialogComponent } from './guide-dialog.component';

describe('GuideDialogComponent', () => {
  let component: GuideDialogComponent;
  let fixture: ComponentFixture<GuideDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GuideDialogComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GuideDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
