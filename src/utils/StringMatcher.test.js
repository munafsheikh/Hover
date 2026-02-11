import { StringMatcher } from './StringMatcher';

describe('StringMatcher', () => {
    test('finds PlantUML blocks', () => {
        const source = '@startuml\nAlice -> Bob\n@enduml';
        const matches = StringMatcher.findMatches(source);

        expect(matches).toHaveLength(1);
        expect(matches[0].type).toBe('plantuml-uml');
        expect(matches[0].content).toBe(source);
    });

    test('finds fenced code blocks with language metadata', () => {
        const source = 'Before\n```javascript\nconst value = 1;\n```\nAfter';
        const matches = StringMatcher.findMatches(source);

        expect(matches).toHaveLength(1);
        expect(matches[0]).toMatchObject({
            type: 'code-block',
            language: 'javascript',
            content: '```javascript\nconst value = 1;\n```'
        });
    });

    test('sorts mixed PlantUML and code-block matches by source order', () => {
        const source = [
            '```txt',
            'plain',
            '```',
            '@startuml',
            'Alice -> Bob',
            '@enduml'
        ].join('\n');

        const matches = StringMatcher.findMatches(source);

        expect(matches).toHaveLength(2);
        expect(matches[0].type).toBe('code-block');
        expect(matches[1].type).toBe('plantuml-uml');
        expect(matches[0].startIndex).toBeLessThan(matches[1].startIndex);
    });

    test('ignores unterminated blocks', () => {
        const source = '@startuml\nAlice -> Bob\n```js\nconst x = 1;';
        const matches = StringMatcher.findMatches(source);

        expect(matches).toHaveLength(0);
    });
});
