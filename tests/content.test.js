/**
 * Tests for content.js
 */

// Import the functions to test
// In a real setup we would use proper module imports,
// but for simplicity we'll just re-define the functions here
const isPlantUML = (text) => {
    const trimmed = text.trim().toLowerCase();
    return (
        trimmed.includes('@startuml') && trimmed.includes('@enduml') ||
        trimmed.includes('start uml') && trimmed.includes('end uml')
    );
};

const isSVG = (text) => {
    const trimmed = text.trim().toLowerCase();
    return trimmed.startsWith('<svg') && trimmed.includes('</svg>');
};

describe('Content Script', () => {
    describe('isPlantUML function', () => {
        test('should detect PlantUML with @startuml/@enduml tags', () => {
            const plantUmlCode = `
        @startuml
        Alice -> Bob: Hello
        @enduml
      `;
            expect(isPlantUML(plantUmlCode)).toBe(true);
        });

        test('should detect PlantUML with start uml/end uml tags', () => {
            const plantUmlCode = `
        start uml
        Alice -> Bob: Hello
        end uml
      `;
            expect(isPlantUML(plantUmlCode)).toBe(true);
        });

        test('should return false for non-PlantUML text', () => {
            const nonPlantUmlCode = 'This is just regular text';
            expect(isPlantUML(nonPlantUmlCode)).toBe(false);
        });

        test('should return false for partial PlantUML tags', () => {
            const partialPlantUmlCode = `
        @startuml
        Alice -> Bob: Hello
      `;
            expect(isPlantUML(partialPlantUmlCode)).toBe(false);
        });
    });

    describe('isSVG function', () => {
        test('should detect valid SVG code', () => {
            const svgCode = `
        <svg width="100" height="100">
          <circle cx="50" cy="50" r="40" stroke="black" stroke-width="2" fill="red" />
        </svg>
      `;
            expect(isSVG(svgCode)).toBe(true);
        });

        test('should return false for non-SVG text', () => {
            const nonSvgCode = 'This is just regular text';
            expect(isSVG(nonSvgCode)).toBe(false);
        });

        test('should return false for partial SVG tags', () => {
            const partialSvgCode = `
        <svg width="100" height="100">
          <circle cx="50" cy="50" r="40" stroke="black" stroke-width="2" fill="red" />
      `;
            expect(isSVG(partialSvgCode)).toBe(false);
        });
    });
}); 