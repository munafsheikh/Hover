import { JsonHandler, PlantUMLHandler, SvgHandler } from './index';

describe('content handlers', () => {
    const plantuml = new PlantUMLHandler();
    const json = new JsonHandler();
    const svg = new SvgHandler();

    test('PlantUML detection is stable across repeated calls', () => {
        const src = '@startuml\nA -> B\n@enduml';
        for (let i = 0; i < 4; i++) {
            expect(plantuml.canHandle(src)).toBe(true);
        }
    });

    test('PlantUML extracts every diagram type block', () => {
        const src = [
            'intro',
            '@startuml\nA -> B\n@enduml',
            '@startmindmap\n* root\n@endmindmap',
            '@startgantt\n[Task] lasts 2 days\n@endgantt'
        ].join('\n');
        expect(
            plantuml.toBlocks(src).map((b) => b.code.split('\n')[0])
        ).toEqual(['@startuml', '@startmindmap', '@startgantt']);
    });

    test('JSON is wrapped as @startjson', () => {
        expect(json.canHandle('{"a": 1}')).toBe(true);
        expect(json.canHandle('42')).toBe(false);
        expect(json.canHandle('{oops')).toBe(false);
        expect(json.toBlocks('{"a":1}')[0].code).toBe(
            '@startjson\n{\n  "a": 1\n}\n@endjson'
        );
    });

    test('SVG passes through', () => {
        const src = '<svg xmlns="http://www.w3.org/2000/svg"></svg>';
        expect(svg.canHandle(src)).toBe(true);
        expect(svg.toBlocks(` ${src} `)).toEqual([{ kind: 'svg', code: src }]);
        expect(svg.canHandle('<div></div>')).toBe(false);
    });
});
