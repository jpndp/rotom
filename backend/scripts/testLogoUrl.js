const Club = require('../models/Club'); // adjust path

const cases = [
  ['https://example.com/logo.png', true],
  ['', true],
  ['http://example.com/logo.png', false],
  ['javascript:alert(1)', false],
  ['data:image/png;base64,AAAA', false],
  ['https://', false],
  ['https://exa mple.com/x.png', false],
];

(async () => {
  for (const [url, shouldPass] of cases) {
    let passed = true;
    try {
      await new Club({ name: 'T', category: 'x', logoUrl: url }).validate();
    } catch (err) {
      passed = !err.errors?.logoUrl;
    }
    console.log(passed === shouldPass ? 'PASS' : 'FAIL', JSON.stringify(url));
  }
})();