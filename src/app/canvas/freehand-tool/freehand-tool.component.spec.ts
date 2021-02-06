import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FreehandToolComponent } from './freehand-tool.component';

describe('FreehandToolComponent', () => {
  let component: FreehandToolComponent;
  let fixture: ComponentFixture<FreehandToolComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FreehandToolComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FreehandToolComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
