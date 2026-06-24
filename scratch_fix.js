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
    // Replace z-40 in dashboard navbars with style="z-index: 40;"
    d = d.replace(/z-40 h-14 px-4 gap-4/g, 'z-10 h-14 px-4 gap-4" style="z-index: 40;');
    
    // Replace z-40 in home.ejs
    d = d.replace(/border-b z-40"/g, 'border-b z-10" style="z-index: 40;"');
    
    // Fix mojibake rocket
    d = d.replace(/ðŸš€/g, '🚀');
    
    // Additional fix for "dYs?" just in case it's still somewhere
    d = d.replace(/dYs\?/g, '🚀');
    
    fs.writeFileSync(f, d, 'utf8');
    console.log(f + ' fixed');
  } catch (e) {
    console.error('Error with ' + f + ': ' + e.message);
  }
});
