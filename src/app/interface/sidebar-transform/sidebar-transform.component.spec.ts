import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SidebarTransformComponent } from './sidebar-transform.component';

describe('SidebarTransformComponent', () => {
  let component: SidebarTransformComponent;
  let fixture: ComponentFixture<SidebarTransformComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SidebarTransformComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SidebarTransformComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
