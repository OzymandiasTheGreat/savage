import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShortcutsDialogComponent } from './shortcuts-dialog.component';

describe('ShortcutsDialogComponent', () => {
  let component: ShortcutsDialogComponent;
  let fixture: ComponentFixture<ShortcutsDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ShortcutsDialogComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ShortcutsDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
