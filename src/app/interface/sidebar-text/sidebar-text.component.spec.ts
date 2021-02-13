import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SidebarTextComponent } from './sidebar-text.component';

describe('SidebarTextComponent', () => {
  let component: SidebarTextComponent;
  let fixture: ComponentFixture<SidebarTextComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SidebarTextComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SidebarTextComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
