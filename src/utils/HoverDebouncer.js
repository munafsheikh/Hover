/**
 * Decides when a hover over a code block should open the preview.
 *
 * - Hover intent: a block renders only after the pointer rests on it for
 *   `intentDelay` ms; leaving earlier cancels it.
 * - The block currently shown is never re-rendered by further mouseovers
 *   (moving across child elements fires many).
 * - A block whose preview was dismissed is not reopened for `cooldown` ms,
 *   so closing the popup while the pointer is still on the block sticks.
 * - Hovering a different block is never blocked by another block's timers.
 */
export class HoverDebouncer {
    constructor({ intentDelay = 250, cooldown = 15000, now = Date.now } = {}) {
        this.intentDelay = intentDelay;
        this.cooldown = cooldown;
        this.now = now;
        this.activeKey = null;
        this.dismissed = new WeakMap(); // keyed by element
        this.pendingKey = null;
        this.timer = null;
    }

    /**
     * Schedule `fn` for `key` if allowed. Returns true when scheduled.
     */
    request(key, fn) {
        if (key === this.activeKey || key === this.pendingKey) return false;

        const dismissedAt = this.dismissed.get(key);
        if (dismissedAt !== undefined) {
            if (this.now() - dismissedAt < this.cooldown) return false;
            this.dismissed.delete(key);
        }

        this.cancel();
        this.pendingKey = key;
        this.timer = setTimeout(() => {
            this.timer = null;
            this.pendingKey = null;
            this.activeKey = key;
            fn();
        }, this.intentDelay);
        return true;
    }

    /**
     * Cancel a pending render (optionally only for `key`).
     */
    cancel(key) {
        if (key !== undefined && key !== this.pendingKey) return;
        clearTimeout(this.timer);
        this.timer = null;
        this.pendingKey = null;
    }

    /**
     * The preview for the active block was closed.
     */
    dismiss() {
        if (this.activeKey !== null) {
            this.dismissed.set(this.activeKey, this.now());
        }
        this.activeKey = null;
    }

    setCooldown(ms) {
        this.cooldown = Number.isFinite(ms) && ms >= 0 ? ms : this.cooldown;
    }
}
