const fs = require('fs');
const files = [
  'views/home.ejs',
  'views/dashboard/index.ejs',
  'views/dashboard/partners.ejs',
  'views/dashboard/partner_detail.ejs',
  'views/dashboard/questions.ejs',
  'views/dashboard/recap.ejs'
];

files.forEach(f => {
  try {
    let d = fs.readFileSync(f, 'utf8');
    
    // Replace all instances of mojibake em-dash with proper em-dash
    d = d.replace(/â€”/g, '—');
    
    fs.writeFileSync(f, d, 'utf8');
    console.log(f + ' fixed');
  } catch (e) {
    console.error('Error with ' + f + ': ' + e.message);
  }
});
