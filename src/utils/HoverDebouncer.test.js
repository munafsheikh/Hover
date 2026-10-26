import { HoverDebouncer } from './HoverDebouncer';

describe('HoverDebouncer', () => {
    let clock;
    let debouncer;
    const a = {};
    const b = {};

    beforeEach(() => {
        jest.useFakeTimers();
        clock = 0;
        debouncer = new HoverDebouncer({
            intentDelay: 200,
            cooldown: 1000,
            now: () => clock
        });
    });

    afterEach(() => jest.useRealTimers());

    test('renders after hover intent delay', () => {
        const fn = jest.fn();
        expect(debouncer.request(a, fn)).toBe(true);
        jest.advanceTimersByTime(199);
        expect(fn).not.toHaveBeenCalled();
        jest.advanceTimersByTime(1);
        expect(fn).toHaveBeenCalledTimes(1);
    });

    test('leaving before the delay cancels', () => {
        const fn = jest.fn();
        debouncer.request(a, fn);
        debouncer.cancel(a);
        jest.runAllTimers();
        expect(fn).not.toHaveBeenCalled();
    });

    test('cancel for another key leaves pending render alone', () => {
        const fn = jest.fn();
        debouncer.request(a, fn);
        debouncer.cancel(b);
        jest.runAllTimers();
        expect(fn).toHaveBeenCalledTimes(1);
    });

    test('repeated mouseovers on the same block do not re-render', () => {
        const fn = jest.fn();
        debouncer.request(a, fn);
        expect(debouncer.request(a, fn)).toBe(false);
        jest.runAllTimers();
        expect(debouncer.request(a, fn)).toBe(false);
        jest.runAllTimers();
        expect(fn).toHaveBeenCalledTimes(1);
    });

    test('a different block renders immediately after the intent delay', () => {
        const fa = jest.fn();
        const fb = jest.fn();
        debouncer.request(a, fa);
        jest.runAllTimers();
        expect(debouncer.request(b, fb)).toBe(true);
        jest.runAllTimers();
        expect(fb).toHaveBeenCalledTimes(1);
    });

    test('switching blocks mid-delay replaces the pending render', () => {
        const fa = jest.fn();
        const fb = jest.fn();
        debouncer.request(a, fa);
        debouncer.request(b, fb);
        jest.runAllTimers();
        expect(fa).not.toHaveBeenCalled();
        expect(fb).toHaveBeenCalledTimes(1);
    });

    test('dismissed block stays closed for the cooldown', () => {
        const fn = jest.fn();
        debouncer.request(a, fn);
        jest.runAllTimers();
        debouncer.dismiss();

        clock = 999;
        expect(debouncer.request(a, fn)).toBe(false);
        clock = 1000;
        expect(debouncer.request(a, fn)).toBe(true);
        jest.runAllTimers();
        expect(fn).toHaveBeenCalledTimes(2);
    });

    test('dismissal does not block other blocks', () => {
        debouncer.request(a, jest.fn());
        jest.runAllTimers();
        debouncer.dismiss();
        expect(debouncer.request(b, jest.fn())).toBe(true);
    });

    test('ignores invalid cooldown values', () => {
        debouncer.setCooldown(NaN);
        expect(debouncer.cooldown).toBe(1000);
        debouncer.setCooldown(0);
        expect(debouncer.cooldown).toBe(0);
    });
});
