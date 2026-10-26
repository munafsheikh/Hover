import { BaseContentHandler } from './BaseContentHandler';
import { StringMatcher } from '../utils/StringMatcher';

export class PlantUMLHandler extends BaseContentHandler {
    constructor() {
        super('plantuml', 'renderPlantUML');
    }

    canHandle(content) {
        return StringMatcher.findPlantUMLBlocks(content).length > 0;
    }

    getClassIdentifiers() {
        return ['language-plantuml', 'language-puml'];
    }

    toBlocks(content) {
        return StringMatcher.findPlantUMLBlocks(content).map((match) => ({
            kind: 'plantuml',
            code: match.content.trim()
        }));
    }
}

export class JsonHandler extends BaseContentHandler {
    constructor() {
        super('json', 'renderPlantUML');
    }

    canHandle(content) {
        const trimmed = content.trim();
        if (!/^[[{]/.test(trimmed)) return false;
        try {
            JSON.parse(trimmed);
            return true;
        } catch {
            return false;
        }
    }

    getClassIdentifiers() {
        return ['language-json'];
    }

    toBlocks(content) {
        const formatted = JSON.stringify(JSON.parse(content.trim()), null, 2);
        return [
            { kind: 'plantuml', code: `@startjson\n${formatted}\n@endjson` }
        ];
    }
}

export class SvgHandler extends BaseContentHandler {
    constructor() {
        super('svg', 'renderSVG');
    }

    canHandle(content) {
        const trimmed = content.trim().toLowerCase();
        return trimmed.startsWith('<svg') && trimmed.includes('</svg>');
    }

    getClassIdentifiers() {
        return ['language-svg'];
    }

    toBlocks(content) {
        return [{ kind: 'svg', code: content.trim() }];
    }
}

export { BaseContentHandler };
