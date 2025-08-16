import { StringMatcher } from './StringMatcher';

describe('StringMatcher', () => {
    test('finds PlantUML blocks', () => {
        const source = '@startuml\nAlice -> Bob\n@enduml';
        const matches = StringMatcher.findMatches(source);
        expect(matches).toHaveLength(1);
        expect(matches[0].type).toBe('plantuml-uml');
        expect(matches[0].content).toBe(source);
    });
});
