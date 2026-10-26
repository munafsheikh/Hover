describe('raf-shim', () => {
    let nativeCallbacks;

    beforeEach(() => {
        jest.resetModules();
        jest.useFakeTimers();
        nativeCallbacks = new Map();
        let id = 0;
        global.window = {
            requestAnimationFrame: (cb) => {
                nativeCallbacks.set(++id, cb);
                return id;
            },
            cancelAnimationFrame: (handle) => nativeCallbacks.delete(handle)
        };
        require('./raf-shim');
    });

    afterEach(() => {
        jest.useRealTimers();
        delete global.window;
    });

    test('falls back to a timer when no frame is painted', () => {
        const cb = jest.fn();
        window.requestAnimationFrame(cb);
        jest.advanceTimersByTime(49);
        expect(cb).not.toHaveBeenCalled();
        jest.advanceTimersByTime(1);
        expect(cb).toHaveBeenCalledTimes(1);
    });

    test('runs once when a real frame arrives first', () => {
        const cb = jest.fn();
        window.requestAnimationFrame(cb);
        [...nativeCallbacks.values()][0](123);
        jest.runAllTimers();
        expect(cb).toHaveBeenCalledTimes(1);
        expect(cb).toHaveBeenCalledWith(123);
        expect(nativeCallbacks.size).toBe(0);
    });

    test('cancel stops both paths', () => {
        const cb = jest.fn();
        const handle = window.requestAnimationFrame(cb);
        window.cancelAnimationFrame(handle);
        jest.runAllTimers();
        expect(cb).not.toHaveBeenCalled();
        expect(nativeCallbacks.size).toBe(0);
    });
});
