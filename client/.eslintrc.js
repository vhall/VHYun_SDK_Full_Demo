module.exports = {
  root: true,
  env: {
    node: true,
  },
  extends: ["plugin:vue/essential", "eslint:recommended"],
  parserOptions: {
    parser: "babel-eslint"
  },
  rules: {
    "no-unused-vars": process.env.NODE_ENV === "production" ? "warn" : "off",
    "no-console": process.env.NODE_ENV === "production" ? "warn" : "off",
    "no-debugger": process.env.NODE_ENV === "production" ? "warn" : "off",
    "no-undef": process.env.NODE_ENV === "production" ? "warn" : "off",
    "semi": [0, false]
  }
};
