import "@testing-library/jest-dom";

// Silences console noise in tests; comment out to debug
const origError = console.error;
console.error = (...args) => {
  const msg = (args && args[0]) || "";
  if (
    typeof msg === "string" &&
    (msg.includes("Warning: ReactDOM.render is no longer supported") ||
      msg.includes("React Router"))
  ) {
    return;
  }
  origError(...args);
};
