const fs = require('fs');
const pdf = require('./node_modules/pdf-parse');

async function readPdfs() {
  const file1 = 'C:/Projects/geststock/public/FICHE DE CALCUL DU COUT DOSSIER 03 EMED SYSTEME.pdf';
  const file2 = 'C:/Projects/geststock/public/INV 25WLQ052 (2).pdf';

  try {
    const data1 = await pdf(fs.readFileSync(file1));
    console.log("=== FICHE DE CALCUL ===");
    console.log(data1.text);

    const data2 = await pdf(fs.readFileSync(file2));
    console.log("=== INV ===");
    console.log(data2.text);
  } catch(e) {
    console.error(e);
  }
}

readPdfs();
