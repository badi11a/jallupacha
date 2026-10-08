module.exports = {
  rootDir: ".",
  testRegex: "src/.*\\.spec\\.ts$",
  transform: {
    "^.+\\.(t|j)s$": ["ts-jest", { tsconfig: "tsconfig.json" }]
  },
  testEnvironment: "node",
  setupFiles: ["<rootDir>/test/setup-env.ts"],
  collectCoverageFrom: ["src/**/*.ts", "!src/main.ts", "!src/database/**"],
  coverageDirectory: "../coverage/backend"
};
