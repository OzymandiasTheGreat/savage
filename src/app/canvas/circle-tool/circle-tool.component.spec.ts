import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CircleToolComponent } from './circle-tool.component';

describe('CircleToolComponent', () => {
  let component: CircleToolComponent;
  let fixture: ComponentFixture<CircleToolComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CircleToolComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CircleToolComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
