export interface MatchResult {
    type: string;
    content: string;
    language?: string;
    startIndex: number;
    endIndex: number;
}

export class StringMatcher {
    private static readonly PATTERNS = {
        PLANTUML: {
            START: /@start(uml|ditaa|json|yaml|mindmap)/i,
            END: /@end(uml|ditaa|json|yaml|mindmap)/i
        },
        CODE_BLOCK: {
            START: /```(\w+)?/,
            END: /```/
        }
    };

    static findMatches(source: string): MatchResult[] {
        const results: MatchResult[] = [];
        
        // Find PlantUML blocks
        results.push(...this.findPlantUMLBlocks(source));
        
        // Find Markdown code blocks
        results.push(...this.findCodeBlocks(source));
        
        return results.sort((a, b) => a.startIndex - b.startIndex);
    }

    private static findPlantUMLBlocks(source: string): MatchResult[] {
        const results: MatchResult[] = [];
        let currentIndex = 0;

        while (currentIndex < source.length) {
            const remainingText = source.slice(currentIndex);
            const startMatch = remainingText.match(this.PATTERNS.PLANTUML.START);

            if (!startMatch) break;

            const startIndex = currentIndex + startMatch.index!;
            const type = startMatch[1].toLowerCase();
            
            // Find matching end tag
            const afterStart = source.slice(startIndex + startMatch[0].length);
            const endMatch = afterStart.match(this.PATTERNS.PLANTUML.END);

            if (!endMatch) break;

            const endIndex = startIndex + startMatch[0].length + endMatch.index! + endMatch[0].length;
            const content = source.slice(startIndex, endIndex);

            results.push({
                type: `plantuml-${type}`,
                content,
                startIndex,
                endIndex
            });

            currentIndex = endIndex;
        }

        return results;
    }

    private static findCodeBlocks(source: string): MatchResult[] {
        const results: MatchResult[] = [];
        let currentIndex = 0;

        while (currentIndex < source.length) {
            const remainingText = source.slice(currentIndex);
            const startMatch = remainingText.match(this.PATTERNS.CODE_BLOCK.START);

            if (!startMatch) break;

            const startIndex = currentIndex + startMatch.index!;
            const language = startMatch[1];
            
            // Find matching end marker
            const afterStart = source.slice(startIndex + startMatch[0].length);
            const endMatch = afterStart.match(this.PATTERNS.CODE_BLOCK.END);

            if (!endMatch) break;

            const endIndex = startIndex + startMatch[0].length + endMatch.index! + endMatch[0].length;
            const content = source.slice(startIndex, endIndex);

            results.push({
                type: 'code-block',
                content,
                language,
                startIndex,
                endIndex
            });

            currentIndex = endIndex;
        }

        return results;
    }
} 