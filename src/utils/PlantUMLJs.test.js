import { parseSvgResult, svgToDataUrl } from './PlantUMLJs';

describe('PlantUMLJs', () => {
    test('passes through SVG markup', () => {
        expect(parseSvgResult('  <svg></svg>\n')).toEqual({
            svg: '<svg></svg>'
        });
    });

    test('reports parsing errors with line number', () => {
        const result = parseSvgResult(
            '{"status":"Parsing error","line":3,"error":"Syntax Error?"}'
        );
        expect(result.error).toBe('Parsing error (line 3): Syntax Error?');
    });

    test('reports crashes with exception detail', () => {
        const result = parseSvgResult(
            '{"status":"General failure","exception":"NPE"}'
        );
        expect(result.error).toBe('General failure: NPE');
    });

    test('handles empty and non-JSON results', () => {
        expect(parseSvgResult(undefined).error).toMatch(/Empty result/);
        expect(parseSvgResult('boom').error).toBe('boom');
    });

    test('encodes non-ASCII SVG as base64 data URL', () => {
        const url = svgToDataUrl('<svg>é</svg>');
        expect(url.startsWith('data:image/svg+xml;base64,')).toBe(true);
        const decoded = Buffer.from(url.split(',')[1], 'base64').toString(
            'utf8'
        );
        expect(decoded).toBe('<svg>é</svg>');
    });
});
