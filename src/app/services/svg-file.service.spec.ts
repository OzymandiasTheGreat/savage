import { TestBed } from '@angular/core/testing';

import { SvgFileService } from './svg-file.service';

describe('SvgFileService', () => {
  let service: SvgFileService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SvgFileService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
