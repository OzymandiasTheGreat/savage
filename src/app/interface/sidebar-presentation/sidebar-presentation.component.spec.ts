import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SidebarPresentationComponent } from './sidebar-presentation.component';

describe('SidebarPresentationComponent', () => {
  let component: SidebarPresentationComponent;
  let fixture: ComponentFixture<SidebarPresentationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SidebarPresentationComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SidebarPresentationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
