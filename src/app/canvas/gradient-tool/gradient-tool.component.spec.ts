import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GradientToolComponent } from './gradient-tool.component';

describe('GradientToolComponent', () => {
  let component: GradientToolComponent;
  let fixture: ComponentFixture<GradientToolComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GradientToolComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GradientToolComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
