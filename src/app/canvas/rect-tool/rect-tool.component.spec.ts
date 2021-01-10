import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RectToolComponent } from './rect-tool.component';

describe('RectToolComponent', () => {
  let component: RectToolComponent;
  let fixture: ComponentFixture<RectToolComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RectToolComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RectToolComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
