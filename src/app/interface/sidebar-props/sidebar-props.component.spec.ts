import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SidebarPropsComponent } from './sidebar-props.component';

describe('SidebarPropsComponent', () => {
  let component: SidebarPropsComponent;
  let fixture: ComponentFixture<SidebarPropsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SidebarPropsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SidebarPropsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
