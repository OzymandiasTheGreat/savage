import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShapeToolComponent } from './shape-tool.component';

describe('ShapeToolComponent', () => {
  let component: ShapeToolComponent;
  let fixture: ComponentFixture<ShapeToolComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ShapeToolComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ShapeToolComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
