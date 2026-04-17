import { generateLexicalOrder } from '../src/utils/helpers.js';
import { sanitize } from '../src/utils/sanitizer.js';

console.log('Testing Lexical Order:');
console.log('Between null, null:', generateLexicalOrder(null, null)); // m
console.log('Between null, m:', generateLexicalOrder(null, 'm')); // f (index 12-1=11 -> 'l' or similar)
console.log('Between m, null:', generateLexicalOrder('m', null)); // n
console.log('Between m, n:', generateLexicalOrder('m', 'n')); // mm (index n-m=1 -> 'mm')

console.log('\nTesting Sanitization:');
const malicious = '<img src=x onerror=alert(1)><b>Bold</b><script>console.log("bad")</script>';
console.log('Malicious:', malicious);
console.log('Sanitized:', sanitize(malicious));
