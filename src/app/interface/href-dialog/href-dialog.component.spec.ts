import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HrefDialogComponent } from './href-dialog.component';

describe('HrefDialogComponent', () => {
  let component: HrefDialogComponent;
  let fixture: ComponentFixture<HrefDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ HrefDialogComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(HrefDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
