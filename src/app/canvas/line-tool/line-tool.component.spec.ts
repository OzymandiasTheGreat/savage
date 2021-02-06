import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LineToolComponent } from './line-tool.component';

describe('LineToolComponent', () => {
  let component: LineToolComponent;
  let fixture: ComponentFixture<LineToolComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ LineToolComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(LineToolComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
