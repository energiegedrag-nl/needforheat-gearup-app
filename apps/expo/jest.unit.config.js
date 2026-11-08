// Plain unit tests that need no React Native environment (e.g. src/lib/heatSignature).
module.exports = {
  rootDir: ".",
  testEnvironment: "node",
  testMatch: ["<rootDir>/src/lib/**/*.test.tsx"],
  transform: {
    "^.+\.tsx?$": [
      "ts-jest",
      {
        diagnostics: false,
        tsconfig: { jsx: "react", esModuleInterop: true, resolveJsonModule: true, module: "commonjs", target: "es2020" },
      },
    ],
  },
};
