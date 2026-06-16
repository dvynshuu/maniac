// ---- Formula 2.0 Lexer, Parser & Evaluator ----

class Tokenizer {
  constructor(input) {
    this.input = input || '';
    this.pos = 0;
  }

  skipWhitespace() {
    while (this.pos < this.input.length && /\s/.test(this.input[this.pos])) {
      this.pos++;
    }
  }

  isDigit(char) {
    return char >= '0' && char <= '9';
  }

  isAlpha(char) {
    return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || char === '_';
  }

  isAlphaNumeric(char) {
    return this.isAlpha(char) || this.isDigit(char);
  }

  nextToken() {
    this.skipWhitespace();
    if (this.pos >= this.input.length) return { type: 'EOF' };

    const char = this.input[this.pos];

    // Numbers
    if (this.isDigit(char)) {
      let val = '';
      while (this.pos < this.input.length && (this.isDigit(this.input[this.pos]) || this.input[this.pos] === '.')) {
        val += this.input[this.pos++];
      }
      return { type: 'NUMBER', value: parseFloat(val) };
    }

    // Strings
    if (char === '"' || char === "'") {
      const quote = char;
      this.pos++; // skip opening quote
      let val = '';
      while (this.pos < this.input.length && this.input[this.pos] !== quote) {
        if (this.input[this.pos] === '\\') {
          this.pos++; // skip escape char
        }
        val += this.input[this.pos++];
      }
      if (this.pos < this.input.length) this.pos++; // skip closing quote
      return { type: 'STRING', value: val };
    }

    // Identifiers (functions, booleans)
    if (this.isAlpha(char)) {
      let val = '';
      while (this.pos < this.input.length && this.isAlphaNumeric(this.input[this.pos])) {
        val += this.input[this.pos++];
      }
      if (val === 'true') return { type: 'BOOLEAN', value: true };
      if (val === 'false') return { type: 'BOOLEAN', value: false };
      return { type: 'IDENTIFIER', value: val };
    }

    // Two-character operators
    const twoChars = this.input.substring(this.pos, this.pos + 2);
    if (['==', '!=', '>=', '<=', '&&', '||'].includes(twoChars)) {
      this.pos += 2;
      return { type: 'OPERATOR', value: twoChars };
    }

    // Single-character operators/syntax
    if ('+-*/%(),><!'.includes(char)) {
      this.pos++;
      return { type: 'OPERATOR', value: char };
    }

    throw new Error(`Unexpected character: ${char}`);
  }
}

class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
  }

  peek() {
    return this.tokens[this.pos] || { type: 'EOF' };
  }

  consume() {
    return this.tokens[this.pos++];
  }

  parseExpression(precedence = 0) {
    let left = this.parsePrimary();

    while (true) {
      const token = this.peek();
      if (token.type !== 'OPERATOR' && token.type !== 'EOF') break;

      const op = token.value;
      const opPrec = this.getPrecedence(op);
      if (opPrec < precedence) break;

      this.consume(); // consume operator
      const right = this.parseExpression(opPrec + 1);
      left = { type: 'BINARY', operator: op, left, right };
    }

    return left;
  }

  parsePrimary() {
    const token = this.peek();

    if (token.type === 'NUMBER' || token.type === 'STRING' || token.type === 'BOOLEAN') {
      return { type: 'LITERAL', value: this.consume().value };
    }

    if (token.type === 'OPERATOR') {
      if (token.value === '(') {
        this.consume(); // '('
        const expr = this.parseExpression();
        const next = this.consume();
        if (next.value !== ')') throw new Error("Expected ')'");
        return expr;
      }
      if (token.value === '-' || token.value === '!') {
        const op = this.consume().value;
        const operand = this.parseExpression(7); // unary precedence
        return { type: 'UNARY', operator: op, operand };
      }
    }

    if (token.type === 'IDENTIFIER') {
      const name = this.consume().value;
      // Check for function call
      if (this.peek().value === '(') {
        this.consume(); // '('
        const args = [];
        if (this.peek().value !== ')') {
          while (true) {
            args.push(this.parseExpression());
            if (this.peek().value === ',') {
              this.consume(); // ','
            } else {
              break;
            }
          }
        }
        const next = this.consume();
        if (next.value !== ')') throw new Error(`Expected ')' after function ${name}`);
        return { type: 'CALL', name, arguments: args };
      }
      throw new Error(`Unexpected identifier: ${name}`);
    }

    throw new Error(`Unexpected token: ${JSON.stringify(token)}`);
  }

  getPrecedence(op) {
    switch (op) {
      case '||': return 1;
      case '&&': return 2;
      case '==': case '!=': return 3;
      case '<': case '<=': case '>': case '>=': return 4;
      case '+': case '-': return 5;
      case '*': case '/': case '%': return 6;
      default: return -1;
    }
  }
}

function evaluateNode(node, context) {
  switch (node.type) {
    case 'LITERAL':
      return node.value;

    case 'UNARY': {
      const val = evaluateNode(node.operand, context);
      if (node.operator === '-') return -Number(val);
      if (node.operator === '!') return !val;
      return val;
    }

    case 'BINARY': {
      const left = evaluateNode(node.left, context);
      const right = evaluateNode(node.right, context);
      switch (node.operator) {
        case '+':
          if (typeof left === 'string' || typeof right === 'string') {
            return String(left) + String(right);
          }
          return Number(left) + Number(right);
        case '-': return Number(left) - Number(right);
        case '*': return Number(left) * Number(right);
        case '/': return Number(left) / Number(right);
        case '%': return Number(left) % Number(right);
        case '==': return left === right;
        case '!=': return left !== right;
        case '<': return left < right;
        case '<=': return left <= right;
        case '>': return left > right;
        case '>=': return left >= right;
        case '&&': return !!(left && right);
        case '||': return !!(left || right);
        default: throw new Error(`Unknown operator: ${node.operator}`);
      }
    }

    case 'CALL': {
      const args = node.arguments.map(arg => evaluateNode(arg, context));
      const fnName = node.name.toLowerCase();

      switch (fnName) {
        case 'prop': {
          const propName = args[0];
          if (!propName) return '';
          const prop = context.schema.find(p => p.name.toLowerCase() === String(propName).toLowerCase());
          if (!prop) return '';

          // Cycle detection
          if (context.visited.has(prop.id)) {
            return '#CYCLE!';
          }

          context.visited.add(prop.id);
          let val = '';
          if (context.resolvePropertyValue) {
            val = context.resolvePropertyValue(context.row, prop, context.schema, context.visited);
          } else {
            val = context.rowValues[prop.id] ?? '';
          }
          context.visited.delete(prop.id);
          return val ?? '';
        }

        case 'concat':
          return args.map(String).join('');

        case 'add':
          return Number(args[0] || 0) + Number(args[1] || 0);

        case 'subtract':
          return Number(args[0] || 0) - Number(args[1] || 0);

        case 'multiply':
          return Number(args[0] || 0) * Number(args[1] || 0);

        case 'divide':
          return Number(args[1] || 0) !== 0 ? Number(args[0] || 0) / Number(args[1]) : 0;

        case 'if':
          return args[0] ? args[1] : args[2];

        case 'and':
          return args.reduce((a, b) => !!(a && b), true);

        case 'or':
          return args.reduce((a, b) => !!(a || b), false);

        case 'not':
          return !args[0];

        case 'lower':
          return String(args[0] || '').toLowerCase();

        case 'upper':
          return String(args[0] || '').toUpperCase();

        case 'length':
          return String(args[0] || '').length;

        case 'contains':
          return String(args[0] || '').toLowerCase().includes(String(args[1] || '').toLowerCase());

        case 'dateadd': {
          const dateStr = args[0];
          const amount = Number(args[1] || 0);
          const unit = String(args[2] || 'days').toLowerCase();
          if (!dateStr) return '';
          const d = new Date(dateStr);
          if (isNaN(d.getTime())) return '';

          if (unit.startsWith('day')) d.setDate(d.getDate() + amount);
          else if (unit.startsWith('hour')) d.setHours(d.getHours() + amount);
          else if (unit.startsWith('minute')) d.setMinutes(d.getMinutes() + amount);
          else if (unit.startsWith('month')) d.setMonth(d.getMonth() + amount);
          else if (unit.startsWith('year')) d.setFullYear(d.getFullYear() + amount);

          return d.toISOString();
        }

        default:
          throw new Error(`Unknown function: ${node.name}`);
      }
    }

    default:
      throw new Error(`Unknown node type: ${node.type}`);
  }
}

export function evaluateFormula(formulaStr, row, schema, rowValues, resolvePropertyValue, visited = new Set()) {
  if (!formulaStr) return '';
  try {
    const tokenizer = new Tokenizer(formulaStr);
    const tokens = [];
    let tok;
    while ((tok = tokenizer.nextToken()).type !== 'EOF') {
      tokens.push(tok);
    }

    const parser = new Parser(tokens);
    const ast = parser.parseExpression();

    const context = {
      row,
      schema,
      rowValues,
      resolvePropertyValue,
      visited
    };

    const val = evaluateNode(ast, context);
    if (typeof val === 'number') {
      if (isNaN(val)) return 0;
      if (!isFinite(val)) return 0;
      // Round to 4 decimal places max to avoid JS floating point issues
      return Math.round(val * 10000) / 10000;
    }
    return val;
  } catch (err) {
    return `#ERROR: ${err.message}`;
  }
}
