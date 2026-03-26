(() => {
  const display = document.getElementById("calc-display");
  const expressionEl = document.getElementById("calc-expression");

  let current = "0"; // current input as string
  let previous = null; // previous numeric value
  let pendingOp = null; // one of "+", "-", "*", "/"
  let memory = 0;
  let justEvaluated = false;
  let enteringSecondOperand = false; // next digit replaces current input

  const clampDisplay = (s) => {
    if (s === "Error") return "Error";
    if (s.length <= 18) return s;
    // Keep end of long decimals (most useful) while staying readable.
    return `${s.slice(0, 10)}…${s.slice(-6)}`;
  };

  const formatNumber = (n) => {
    if (!Number.isFinite(n)) return "Error";
    // Reduce floating-point noise.
    const rounded = Math.round((n + Number.EPSILON) * 1e12) / 1e12;
    const asInt = Math.abs(rounded) >= 1e12 ? rounded.toExponential(6) : String(rounded);
    // Remove trailing zeros for decimal string output.
    if (!asInt.includes("e") && asInt.includes(".")) {
      return asInt.replace(/\.?0+$/, "");
    }
    return asInt;
  };

  const setDisplay = (s) => {
    current = s;
    display.value = clampDisplay(s);
  };

  const getCurrentNumber = () => Number(current);

  const updateExpression = () => {
    if (pendingOp && previous !== null) {
      expressionEl.textContent = `${formatNumber(previous)} ${opToSymbol(pendingOp)}`;
      return;
    }
    expressionEl.textContent = "";
  };

  const opToSymbol = (op) => {
    switch (op) {
      case "+":
        return "+";
      case "-":
        return "−";
      case "*":
        return "×";
      case "/":
        return "÷";
      default:
        return op;
    }
  };

  const clearAll = () => {
    current = "0";
    previous = null;
    pendingOp = null;
    justEvaluated = false;
    enteringSecondOperand = false;
    expressionEl.textContent = "";
    setDisplay(current);
  };

  const backspace = () => {
    if (justEvaluated) {
      justEvaluated = false;
      setDisplay("0");
      return;
    }
    if (current.length <= 1) {
      setDisplay("0");
      return;
    }
    const next = current.slice(0, -1);
    setDisplay(next === "-" ? "0" : next);
  };

  const appendDigit = (d) => {
    if (current === "Error") {
      clearAll();
      setDisplay(d);
      return;
    }
    if (enteringSecondOperand) {
      enteringSecondOperand = false;
      setDisplay(d);
      return;
    }
    if (justEvaluated && pendingOp === null) {
      justEvaluated = false;
      previous = null;
    }

    if (current === "0") {
      setDisplay(d);
      return;
    }

    setDisplay(current + d);
  };

  const appendDecimal = () => {
    if (current === "Error") {
      clearAll();
      setDisplay("0.");
      return;
    }
    if (enteringSecondOperand) {
      enteringSecondOperand = false;
      setDisplay("0.");
      return;
    }
    if (justEvaluated && pendingOp === null) {
      justEvaluated = false;
      previous = null;
      setDisplay("0.");
      return;
    }

    if (!current.includes(".")) {
      setDisplay(current + ".");
    }
  };

  const setOperator = (op) => {
    if (current === "Error") clearAll();
    const inputNumber = getCurrentNumber();

    let computedChain = false;

    // If there's an existing pending op and user didn't just press equals,
    // compute first to support chaining: 2 + 3 + 4.
    if (pendingOp && previous !== null && !justEvaluated && !enteringSecondOperand) {
      const result = compute(previous, inputNumber, pendingOp);
      const formatted = formatNumber(result);
      if (formatted === "Error") {
        setDisplay("Error");
        previous = null;
        pendingOp = null;
        enteringSecondOperand = false;
        justEvaluated = false;
        expressionEl.textContent = "";
        return;
      }
      previous = result;
      setDisplay(formatted);
      computedChain = true;
    } else if (!pendingOp) {
      previous = inputNumber;
    } else if (justEvaluated) {
      previous = inputNumber;
    }

    pendingOp = op;
    justEvaluated = false;
    enteringSecondOperand = true;
    if (!computedChain) setDisplay("0");
    updateExpression();
  };

  const compute = (a, b, op) => {
    switch (op) {
      case "+":
        return a + b;
      case "-":
        return a - b;
      case "*":
        return a * b;
      case "/":
        if (b === 0) return Number.NaN;
        return a / b;
      default:
        return Number.NaN;
    }
  };

  const equals = () => {
    if (!pendingOp || previous === null) return;

    const b = getCurrentNumber();
    const result = compute(previous, b, pendingOp);
    const formatted = formatNumber(result);

    setDisplay(formatted);
    pendingOp = null;
    previous = null;
    justEvaluated = formatted !== "Error";
    expressionEl.textContent = "";
  };

  const toggleSign = () => {
    if (current === "Error") return;
    if (justEvaluated && pendingOp === null) justEvaluated = false;
    if (current === "0") return;
    if (current.startsWith("-")) {
      setDisplay(current.slice(1));
    } else {
      setDisplay("-" + current);
    }
  };

  const sqrt = () => {
    if (current === "Error") return;
    const x = getCurrentNumber();
    if (x < 0) return setDisplay("Error");
    setDisplay(formatNumber(Math.sqrt(x)));
    justEvaluated = false;
  };

  const square = () => {
    if (current === "Error") return;
    const x = getCurrentNumber();
    setDisplay(formatNumber(x * x));
    justEvaluated = false;
  };

  const reciprocal = () => {
    if (current === "Error") return;
    const x = getCurrentNumber();
    if (x === 0) return setDisplay("Error");
    setDisplay(formatNumber(1 / x));
    justEvaluated = false;
  };

  const percent = () => {
    if (current === "Error") return;
    const x = getCurrentNumber();
    if (pendingOp && previous !== null) {
      // Standard calculator behavior:
      // - For + / - : 50 + 10% => 50 + (50 * 0.10)
      // - For * / : 200 * 10% => 200 * (10 / 100)
      const fraction = x / 100;
      if (pendingOp === "+" || pendingOp === "-") {
        setDisplay(formatNumber(previous * fraction));
      } else {
        setDisplay(formatNumber(fraction));
      }
      return;
    }
    setDisplay(formatNumber(x / 100));
  };

  const memClear = () => {
    memory = 0;
  };
  const memRecall = () => {
    setDisplay(formatNumber(memory));
    justEvaluated = false;
  };
  const memAdd = () => {
    memory = memory + getCurrentNumber();
  };
  const memSubtract = () => {
    memory = memory - getCurrentNumber();
  };

  const handleAction = (action, value) => {
    if (action === "digit") return appendDigit(value);
    if (action === "decimal") return appendDecimal();
    if (action === "operator") return setOperator(value);
    if (action === "equals") return equals();
    if (action === "clear") return clearAll();
    if (action === "backspace") return backspace();
    if (action === "sign") return toggleSign();
    if (action === "sqrt") return sqrt();
    if (action === "square") return square();
    if (action === "percent") return percent();
    if (action === "reciprocal") return reciprocal();
    if (action === "mem-clear") return memClear();
    if (action === "mem-recall") return memRecall();
    if (action === "mem-add") return memAdd();
    if (action === "mem-subtract") return memSubtract();
  };

  document.querySelectorAll(".keys .btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.getAttribute("data-action");
      const value = btn.getAttribute("data-value");
      handleAction(action, value);
    });
  });

  // Keyboard support for usability.
  document.addEventListener("keydown", (e) => {
    const k = e.key;

    if (k >= "0" && k <= "9") {
      e.preventDefault();
      return appendDigit(k);
    }

    if (k === "." || k === ",") {
      e.preventDefault();
      return appendDecimal();
    }

    if (k === "+" || k === "-" || k === "*" || k === "/") {
      e.preventDefault();
      return setOperator(k);
    }

    if (k === "Enter" || k === "=") {
      e.preventDefault();
      return equals();
    }

    if (k === "Escape") {
      e.preventDefault();
      return clearAll();
    }

    if (k === "Backspace") {
      e.preventDefault();
      return backspace();
    }

    if (k === "%") {
      e.preventDefault();
      return percent();
    }
  });

  // Initialize display cleanly.
  setDisplay("0");
  updateExpression();
})();

