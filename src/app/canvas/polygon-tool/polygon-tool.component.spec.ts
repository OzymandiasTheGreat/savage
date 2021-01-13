import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PolygonToolComponent } from './polygon-tool.component';

describe('PolygonToolComponent', () => {
  let component: PolygonToolComponent;
  let fixture: ComponentFixture<PolygonToolComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PolygonToolComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PolygonToolComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
