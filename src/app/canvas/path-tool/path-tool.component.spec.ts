import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PathToolComponent } from './path-tool.component';

describe('PathToolComponent', () => {
  let component: PathToolComponent;
  let fixture: ComponentFixture<PathToolComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PathToolComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PathToolComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
