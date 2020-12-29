import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ObjectToolComponent } from './object-tool.component';

describe('ObjectToolComponent', () => {
  let component: ObjectToolComponent;
  let fixture: ComponentFixture<ObjectToolComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ObjectToolComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ObjectToolComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
