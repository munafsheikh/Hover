module.exports = {
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['./tests/setup.js'],
    moduleFileExtensions: ['js', 'json'],
    transform: {
        '^.+\\.js$': 'babel-jest',
    },
    testMatch: ['**/tests/**/*.test.js'],
    collectCoverage: true,
    collectCoverageFrom: [
        '*.js',
        '!jest.config.js',
        '!webpack.config.js',
        '!**/node_modules/**',
        '!**/dist/**',
        '!**/tests/**',
    ],
}; 