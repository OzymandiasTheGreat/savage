import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SidebarElementsComponent } from './sidebar-elements.component';

describe('SidebarElementsComponent', () => {
  let component: SidebarElementsComponent;
  let fixture: ComponentFixture<SidebarElementsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SidebarElementsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SidebarElementsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
