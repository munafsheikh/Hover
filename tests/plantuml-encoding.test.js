/**
 * PlantUML Encoding Tests
 * This file contains tests for the PlantUML encoding algorithm.
 * 
 * How to use:
 * 1. Run this test script with: npx jest tests/plantuml-encoding.test.js --verbose
 * 2. Check the encoded URLs generated
 * 3. Try them with PlantUML to see if they render correctly
 */

// Import the TextEncoder and CompressionStream polyfills
const { TextEncoder } = require('util');
global.TextEncoder = TextEncoder;

// Mock the CompressionStream API since Node.js doesn't have it natively
class MockCompressionStream {
    constructor(format) {
        this.format = format;
        this.chunks = [];
        this.readable = {
            getReader: () => ({
                read: async () => {
                    if (this.chunks.length === 0) {
                        return { done: true };
                    }
                    return { value: this.chunks.shift(), done: false };
                }
            })
        };
        this.writable = {
            getWriter: () => ({
                write: (chunk) => {
                    // In a real implementation, this would compress the data
                    // For testing, we'll simulate compression
                    this.chunks.push(new Uint8Array([0x78, 0x9c])); // DEFLATE header
                    this.chunks.push(chunk);
                    this.chunks.push(new Uint8Array([0, 0, 0xff, 0xff])); // DEFLATE footer
                },
                close: () => { }
            })
        };
    }
}

global.CompressionStream = MockCompressionStream;

// Import the actual encoding function from content.js
// Note: For testing purposes, we're redefining it here
async function encodePlantUML(text) {
    console.log('PlantUML Encoding - Input text:', text);

    // Convert string to uint8array
    const textEncoder = new TextEncoder();
    const uint8Array = textEncoder.encode(text);

    try {
        // Compress using CompressionStream (DEFLATE)
        const cs = new CompressionStream('deflate');
        const writer = cs.writable.getWriter();
        writer.write(uint8Array);
        writer.close();

        // Read compressed data
        const reader = cs.readable.getReader();
        let chunks = [];
        let totalLength = 0;

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            chunks.push(value);
            totalLength += value.length;
        }

        // Combine chunks
        const result = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
            result.set(chunk, offset);
            offset += chunk.length;
        }

        // Convert to base64
        const base64 = Buffer.from(result).toString('base64');

        // Make URL-safe
        const urlSafe = base64
            .replace(/\+/g, '-')
            .replace(/\//g, '_');

        return urlSafe;
    } catch (error) {
        console.error('PlantUML Encoding - Error during encoding:', error);
        throw error;
    }
}

// Test cases
const TEST_CASES = [
    {
        name: 'Simple Sequence Diagram',
        code: `@startuml
Alice -> Bob: Authentication Request
Bob --> Alice: Authentication Response
@enduml`
    },
    {
        name: 'Your Example Diagram',
        code: `@startuml
!pragma teoz true
skinparam responseMessageBelowArrow true
'autoactivate on
'skinparam handwritten true
autonumber
header api
footer Page %page% of %lastpage%
title Title

actor Test as t
queue RabbitMQ as r
activate r

t <--\\ r: Post message to queue

box #lightgreen
participant "API1" as a
activate a
end box

participant "API2" as a2

activate a2
{start} r-->a: async doSomething
a-->a:validations
'return

a-->a:retrieve somethingelse
'return
 
a--> a2: post Something
a2 --> a: documentId

'database "DB" as db
'a2 <-> db
'a -> r

note right of t
Basic flow of api interactions
end note
{end} a-> r: somethingR
deactivate a
{start} <-> {end} : 3ms
t <--/ r: expect(sms).toMatchSnapshot()
'== separator ==
@enduml`
    },
    {
        name: 'Class Diagram',
        code: `@startuml
class Animal {
  +name: String
  +age: int
  +makeSound(): void
}

class Dog extends Animal {
  +breed: String
  +fetch(): void
}

class Cat extends Animal {
  +color: String
  +scratch(): void
}
@enduml`
    }
];

// Alternative implementation: direct URL encoding
function directEncoding(text) {
    return encodeURIComponent(text);
}

// Helper to generate the PlantUML URLs
function generatePlantUMLUrls(encodedText, useDirect = false) {
    if (useDirect) {
        return `http://www.plantuml.com/plantuml/png/~h${encodedText}`;
    } else {
        return {
            standard: `http://www.plantuml.com/plantuml/png/${encodedText}`,
            huffman: `http://www.plantuml.com/plantuml/png/~1${encodedText}`,
            svg: `http://www.plantuml.com/plantuml/svg/${encodedText}`,
            txt: `http://www.plantuml.com/plantuml/txt/${encodedText}`
        };
    }
}

// Test the encoding function with each test case
describe('PlantUML Encoding', () => {
    TEST_CASES.forEach((testCase) => {
        it(`should encode ${testCase.name}`, async () => {
            const encoded = await encodePlantUML(testCase.code);
            console.log(`\n==== TEST CASE: ${testCase.name} ====`);
            console.log('Original code:\n', testCase.code);
            console.log('Encoded text:', encoded);

            const urls = generatePlantUMLUrls(encoded);
            console.log('Standard URL:', urls.standard);
            console.log('HUFFMAN URL:', urls.huffman);
            console.log('SVG URL:', urls.svg);
            console.log('TXT URL:', urls.txt);

            // Also try direct encoding for comparison
            const directEncodedText = directEncoding(testCase.code);
            const directUrl = generatePlantUMLUrls(directEncodedText, true);
            console.log('Direct URL encoding:', directUrl);

            // We don't really have a way to validate this in a unit test,
            // but we'll track the output for manual testing
            expect(encoded).toBeTruthy();
            expect(encoded.length).toBeGreaterThan(0);
        });
    });

    // Test with the known working example
    it('should provide validation details for known working example', () => {
        // Known working URL example that you provided
        const workingUrl = 'http://www.plantuml.com/plantuml/png/PLB1Rjim3BtpAxWCWTj3DYox6StG1hlq421hUzo5jfbOc2rg59rqA_hla-mj7j2BG8hlFL9Fl8r6QaFVmRkWTEm9ZUKtcWuCyOVpWPHwL8v1VEGTnqX7td8dvpjLEK_0WWOJgisTo1Z5Gp5JM_BDMPqP-mcSiNxeArPecHfMfE3W868ft2TrN8PqBb4EkEmesfY1EUiOd_89a7g9uXD7Gufey7FWWV61gihPxbk-KxZCem26DwlLTzGIzv8u_VGCDC6H2L39CxxltB6rep9x2AJcQXV86oxkzlUV5bcKPb42zWqc6hp1hYVi6cPqIbv6erzHLwilL2R4BrzZ8u_IixNE7u76meawrv0vyH4APHlKmzzIojJnYJ7-ut0N-OB24PPQbHZo8_zJNkDOALE_UkZPstq3KAGsL55aN7pTZYCt5HG9UvEmOuWfK00lsSJiJVuIWor5L-CXhK3EAJXqtbYfdgRElcGAlAJe5IcBbFFC3z3mxCl5bjnq8fJukO_JZttCJ7uENDjLxEFr1vCTMTq-UWgn5RkwXcApmSXvrKmKDnkuJI9fdVy0';

        // Extract the encoded part
        const match = workingUrl.match(/\/png\/(.+)$/);
        const encodedPart = match ? match[1] : '';

        console.log('\n==== KNOWN WORKING EXAMPLE ====');
        console.log('Working URL:', workingUrl);
        console.log('Encoded part:', encodedPart);
        console.log('Encoded length:', encodedPart.length);

        // This is just informational for debugging
        expect(encodedPart).toBeTruthy();
    });
}); 