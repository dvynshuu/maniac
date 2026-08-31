import Prism from 'prismjs';

if (typeof window !== 'undefined') {
  window.Prism = Prism;
}
if (typeof globalThis !== 'undefined') {
  globalThis.Prism = Prism;
}

export default Prism;
