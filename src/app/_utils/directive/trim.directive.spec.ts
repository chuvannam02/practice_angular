import { TrimDirective } from './trim.directive';

describe('TrimDirective', () => {
  it('should create an instance', () => {
    // @ts-expect-error"
      const directive = new TrimDirective();
    expect(directive).toBeTruthy();
  });
});
