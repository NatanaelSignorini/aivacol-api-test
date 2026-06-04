import 'reflect-metadata';
import { IS_PUBLIC_KEY, Public } from './public.decorator';

describe('Public decorator', () => {
  it('exports metadata key', () => {
    expect(IS_PUBLIC_KEY).toBe('isPublic');
  });

  it('marks route handler as public', () => {
    class TestController {
      @Public()
      login(): void {}
    }

    expect(
      Reflect.getMetadata(IS_PUBLIC_KEY, TestController.prototype.login),
    ).toBe(true);
  });
});
