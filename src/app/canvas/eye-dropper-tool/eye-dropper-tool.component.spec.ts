import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EyeDropperToolComponent } from './eye-dropper-tool.component';

describe('EyeDropperToolComponent', () => {
  let component: EyeDropperToolComponent;
  let fixture: ComponentFixture<EyeDropperToolComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EyeDropperToolComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EyeDropperToolComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
