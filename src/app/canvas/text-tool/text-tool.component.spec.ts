import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TextToolComponent } from './text-tool.component';

describe('TextToolComponent', () => {
  let component: TextToolComponent;
  let fixture: ComponentFixture<TextToolComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TextToolComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TextToolComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
