import { evaluateFormula } from '../../core/formulaEngine.js';

// Setup mock schema and rowValues
const schema = [
  { id: 'num_1', name: 'Number Column', type: 'number' },
  { id: 'price_1', name: 'Price', type: 'number' },
  { id: 'qty_1', name: 'Quantity', type: 'number' },
  { id: 'first_1', name: 'First Name', type: 'text' },
  { id: 'last_1', name: 'Last Name', type: 'text' },
  { id: 'status_1', name: 'Status', type: 'text' },
  { id: 'checked_1', name: 'Checked', type: 'checkbox' },
  { id: 'date_1', name: 'Date', type: 'date' }
];

const rowValues = {
  num_1: 42,
  price_1: 19.99,
  qty_1: 3,
  first_1: 'John',
  last_1: 'Doe',
  status_1: 'Done',
  checked_1: true,
  date_1: '2026-06-16T12:00:00.000Z'
};

const row = {
  id: 'row_1',
  values: rowValues
};

// Mock resolvePropertyValue helper
function mockResolvePropertyValue(row, prop, schema) {
  return row.values[prop.id];
}

const tests = [
  {
    expr: '2 + 3 * 4',
    expected: 14
  },
  {
    expr: '(2 + 3) * 4',
    expected: 20
  },
  {
    expr: 'prop("Price") * prop("Quantity")',
    expected: 59.97
  },
  {
    expr: 'concat(prop("First Name"), " ", prop("Last Name"))',
    expected: 'John Doe'
  },
  {
    expr: 'if(prop("Status") == "Done", "✅ Completed", "⏳ In Progress")',
    expected: '✅ Completed'
  },
  {
    expr: 'if(prop("Status") == "Pending", "✅ Completed", "⏳ In Progress")',
    expected: '⏳ In Progress'
  },
  {
    expr: 'prop("Checked") && (prop("Number Column") > 40)',
    expected: true
  },
  {
    expr: 'prop("Checked") && (prop("Number Column") < 40)',
    expected: false
  },
  {
    expr: 'lower(prop("First Name"))',
    expected: 'john'
  },
  {
    expr: 'upper(prop("Last Name"))',
    expected: 'DOE'
  },
  {
    expr: 'contains(prop("First Name"), "oh")',
    expected: true
  },
  {
    expr: 'contains(prop("First Name"), "ax")',
    expected: false
  },
  {
    expr: 'length(prop("First Name"))',
    expected: 4
  },
  {
    expr: 'dateAdd("2026-06-16T12:00:00.000Z", 5, "days")',
    expected: '2026-06-21T12:00:00.000Z'
  }
];

let passed = 0;
console.log('Running Formula Engine Tests...');
tests.forEach((t, i) => {
  const result = evaluateFormula(t.expr, row, schema, rowValues, mockResolvePropertyValue);
  if (result === t.expected) {
    console.log(`Test ${i + 1} Passed: "${t.expr}" => ${JSON.stringify(result)}`);
    passed++;
  } else {
    console.error(`Test ${i + 1} FAILED!`);
    console.error(`  Expr: "${t.expr}"`);
    console.error(`  Expected: ${JSON.stringify(t.expected)}`);
    console.error(`  Got:      ${JSON.stringify(result)}`);
  }
});

console.log(`\nTests completed: ${passed}/${tests.length} passed.`);
if (passed === tests.length) {
  console.log('ALL TESTS PASSED!');
} else {
  process.exit(1);
}
