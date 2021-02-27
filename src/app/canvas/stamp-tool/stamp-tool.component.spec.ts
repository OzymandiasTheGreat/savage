import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StampToolComponent } from './stamp-tool.component';

describe('StampToolComponent', () => {
  let component: StampToolComponent;
  let fixture: ComponentFixture<StampToolComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StampToolComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(StampToolComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
