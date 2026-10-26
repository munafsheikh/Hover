/**
 * Floating preview popup injected into the page.
 */
export class Popup {
    constructor({ width = 400, height = 400, onClose } = {}) {
        this.width = width;
        this.height = height;
        this.onClose = onClose;
        this.element = null;
        this.contentDiv = null;
    }

    create() {
        if (this.element) return;

        const el = document.createElement('div');
        el.className = 'hover-extension-popup';
        el.style.cssText = `position: fixed; background: white; color: #222;
            border: 1px solid #ccc; border-radius: 5px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2); z-index: 2147483647;
            padding: 10px; display: none; overflow: auto;
            font-family: Arial, sans-serif; font-size: 14px;`;

        const header = document.createElement('div');
        header.style.cssText = `display: flex; justify-content: space-between;
            margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px;`;
        const title = document.createElement('div');
        title.style.fontWeight = 'bold';
        title.textContent = 'Hover - Image Preview';
        const close = document.createElement('button');
        close.className = 'hover-extension-close';
        close.textContent = '×';
        close.style.cssText =
            'background: none; border: none; font-size: 20px; cursor: pointer; padding: 0 5px;';
        close.addEventListener('click', () => this.hide(true));
        header.append(title, close);

        this.contentDiv = document.createElement('div');
        this.contentDiv.className = 'hover-extension-content';

        el.append(header, this.contentDiv);
        document.body.appendChild(el);
        this.element = el;
    }

    setSize(width, height) {
        this.width = width || this.width;
        this.height = height || this.height;
    }

    show(x, y) {
        this.create();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const pw = Math.min(this.width, vw - 20);
        const ph = Math.min(this.height, vh * 0.8);
        const left = x + pw + 10 > vw ? Math.max(10, x - pw - 10) : x + 10;
        const top = y + ph + 10 > vh ? Math.max(10, vh - ph - 10) : y + 10;

        Object.assign(this.element.style, {
            width: `${pw}px`,
            maxHeight: `${ph}px`,
            left: `${left}px`,
            top: `${top}px`,
            display: 'block'
        });
    }

    /**
     * @param {boolean} byUser true when the user dismissed the popup
     */
    hide(byUser = false) {
        if (!this.isVisible()) return;
        this.element.style.display = 'none';
        this.contentDiv.replaceChildren();
        this.onClose?.(byUser);
    }

    isVisible() {
        return this.element?.style.display === 'block';
    }

    contains(node) {
        return !!this.element && !!node && this.element.contains(node);
    }

    getContentDiv() {
        this.create();
        return this.contentDiv;
    }
}
