import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MeasureToolComponent } from './measure-tool.component';

describe('MeasureToolComponent', () => {
  let component: MeasureToolComponent;
  let fixture: ComponentFixture<MeasureToolComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MeasureToolComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MeasureToolComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
