/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "jsdom",
  roots: ["<rootDir>/src"],
  setupFilesAfterEnv: ["<rootDir>/src/test/setupTests.ts"],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: { jsx: "react-jsx", esModuleInterop: true, isolatedModules: true } }],
  },
  moduleNameMapper: {
    "\\.(css)$": "identity-obj-proxy",
    // appEnv.ts reads import.meta.env, which Jest (CommonJS) can't parse. Must come before the "@/" alias.
    "/appEnv$": "<rootDir>/src/test/appEnvMock.ts",
    "^@/(.*)$": "<rootDir>/src/$1",
  },
};
