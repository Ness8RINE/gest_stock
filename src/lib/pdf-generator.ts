import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// --- FORMATAGE DES NOMBRES (Espace standard comme séparateur de milliers) ---
const formatNumber = (n: number) => {
  if (n === null || n === undefined) return "0,00";
  // Utilisation d'une regex pour éviter les caractères spéciaux de locale (\u00a0, etc.)
  const parts = n.toFixed(2).split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return parts.join(",");
};

// --- UTILITAIRE DE CONVERSION CHIFFRES EN LETTRES ---
const units = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf"];
const teens = ["dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
const tens = ["", "dix", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante-dix", "quatre-vingt", "quatre-vingt-dix"];

function convertGroup(n: number): string {
  let s = "";
  let hundred = Math.floor(n / 100);
  let rest = n % 100;

  if (hundred > 0) {
    s += (hundred === 1 ? "" : units[hundred] + " ") + "cent ";
  }

  if (rest > 0) {
    if (rest < 10) s += units[rest];
    else if (rest < 20) s += teens[rest - 10];
    else {
      let t = Math.floor(rest / 10);
      let u = rest % 10;
      s += tens[t];
      if (u > 0) s += (t < 8 && u === 1 ? " et " : "-") + units[u];
    }
  }
  return s.trim();
}

export function numberToFrenchWords(n: number): string {
  if (n === 0) return "zéro dinar";
  
  let integerPart = Math.floor(n);
  let decimalPart = Math.round((n - integerPart) * 100);

  let result = "";
  
  if (integerPart >= 1000000) {
    let millions = Math.floor(integerPart / 1000000);
    result += convertGroup(millions) + " million" + (millions > 1 ? "s" : "") + " ";
    integerPart %= 1000000;
  }

  if (integerPart >= 1000) {
    let thousands = Math.floor(integerPart / 1000);
    result += (thousands === 1 ? "" : convertGroup(thousands) + " ") + "mille ";
    integerPart %= 1000;
  }

  if (integerPart > 0) {
    result += convertGroup(integerPart);
  }

  result = result.trim() + " dinar" + (Math.floor(n) > 1 ? "s" : "") + " algérien" + (Math.floor(n) > 1 ? "s" : "");

  if (decimalPart > 0) {
    result += " et " + convertGroup(decimalPart) + " centime" + (decimalPart > 1 ? "s" : "");
  }

  return result.charAt(0).toUpperCase() + result.slice(1);
}

// --- GÉNÉRATEUR DE PDF ---
export const generateProformaPDF = (data: any) => {
  const doc = new jsPDF() as any;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // 1. HEADER (LOGO & SOCIÉTÉ)
  try {
    doc.addImage("/logo.png", "PNG", 15, 10, 40, 25);
  } catch (e) {
    doc.setFontSize(22);
    doc.setTextColor(30, 64, 175);
    doc.text("EMED", 15, 25);
  }

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("SARL EMED SYSTÉME", 70, 15);
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const companyInfo = [
    "Hai Essalem Coop. AEK MOUL EL Maida St Hubert 31000 Oran Algérie",
    "Tél: 06 61 20 55 52 / 06 61 20 55 46 | Fax: 041 24 78 38",
    "Mail: sarlemedsysteme@gmail.com",
    "R.C: 20B0118190-31/00 | M.F. | A.I. | NIS | Agrement.",
    "Cpte. 021 00104 1130065504 86 Société Général LOUBET, Oran"
  ];
  let y = 20;
  companyInfo.forEach(line => {
    doc.text(line, 70, y);
    y += 4;
  });

  // 2. BLOCS CLIENT ET DOCUMENT (ALIGNÉS)
  y = 50;
  
  // CARRE CLIENT (Rounded Corners)
  doc.setLineWidth(0.2);
  doc.setDrawColor(0);
  doc.roundedRect(15, y, 90, 35, 3, 3, 'S'); 
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("CLIENT:", 20, y + 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(data.customerName || "Client de passage", 20, y + 13);
  doc.setFontSize(8);
  doc.text(data.customerAddress || "Adresse non spécifiée", 20, y + 18);
  doc.text("Tél: " + (data.customerPhone || "/"), 20, y + 23);
  doc.text(`RC: ${data.customerRC || "/"} | NIS: ${data.customerNIS || "/"}`, 20, y + 27);
  doc.text(`MF: ${data.customerMF || "/"} | AI: ${data.customerAI || "/"}`, 20, y + 31);

  // BLOC DOCUMENT (Alignement vertical des premières lettres)
  const docX = 130;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Fait à Oran, le " + new Date(data.date).toLocaleDateString(), docX, y + 7);
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(data.type === "PROFORMA" ? "Facture Proforma" : "Bon de Livraison", docX, y + 15);
  
  doc.setFontSize(10);
  doc.text("Numéro: " + (data.reference || "Brouillon"), docX, y + 22);
  doc.text("Mode de paiement: " + (data.paymentMethod || "Non spécifié"), docX, y + 29);

  // 3. TABLE DES PRODUITS (WITH ROUNDED BORDER)
  const tableRows = data.lines.map((line: any, index: number) => {
    const designation = line.product?.designation || line.designation || "Produit sans nom";
    const code = line.product?.reference?.split("-")[0].toUpperCase() || "CODE";

    return [
      index + 1,
      code,
      designation,
      line.quantity,
      formatNumber(line.unitPrice),
      line.taxRate + "%",
      formatNumber((line.quantity * line.unitPrice) * (1 - (line.discount || 0)/100) * (1 + line.taxRate/100))
    ];
  });

  const tableStartY = y + 42;
  const result = autoTable(doc, {
    startY: tableStartY,
    head: [['N°', 'Code', 'Désignation', 'Qté', 'P.U HT', 'TVA', 'Total TTC']],
    body: tableRows,
    theme: 'grid',
    headStyles: { fillStyle: 'fill', fillColor: [30, 64, 175], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 20 },
      2: { cellWidth: 'auto' }, 
      3: { cellWidth: 15, halign: 'center' },
      4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 12, halign: 'center' },
      6: { cellWidth: 35, halign: 'right' }, // Élargi pour éviter overflow
    }
  });

  // Cadre arrondi autour du tableau complet
  const tableFinalY = (doc as any).lastAutoTable.finalY;
  doc.setLineWidth(0.2);
  doc.roundedRect(14, tableStartY - 1, pageWidth - 28, tableFinalY - tableStartY + 2, 2, 2, 'S');

  // 4. RÉCAPITULATIF & MONTANT EN LETTRES (EN BAS DE PAGE)
  const totalsW = 85;
  const totalsH = 35;
  const totalsX = pageWidth - totalsW - 15;
  const totalsY = pageHeight - totalsH - 25; // Toujours en bas de page

  // Si le tableau déborde sur le bloc des totaux, on ajoute une page
  let phraseY = tableFinalY + 15;
  if (phraseY > totalsY - 10) {
    doc.addPage();
    phraseY = 20;
    // (Note: on pourrait aussi déplacer doc.roundedRect des totaux ici si on veut qu'ils soient tjs en bas de la dernière page)
  }

  // Montant en lettres (Gauche - relatif à la fin du tableau)
  doc.setFontSize(9);
  doc.setFont("helvetica", "bolditalic");
  doc.text("Arrêter la présente facture proforma à la somme de :", 15, phraseY);
  doc.setFont("helvetica", "bold");
  const words = numberToFrenchWords(data.netTotal);
  const splitWords = doc.splitTextToSize(words, 100);
  doc.text(splitWords, 15, phraseY + 5);

  // CARRE TOTAUX (Toujours en bas à droite)
  doc.setLineWidth(0.2);
  doc.roundedRect(totalsX, totalsY, totalsW, totalsH, 3, 3, 'S');

  const rowX_label = totalsX + 5;
  const rowX_value = totalsX + totalsW - 5;
  const rowH = 7;
  let currentY = totalsY + 9;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  
  // Ligne TOTAL T.T.C (HT + TVA)
  doc.text("TOTAL T.T.C", rowX_label, currentY);
  doc.text(formatNumber(data.grossTotal + data.taxTotal) + " DA", rowX_value, currentY, { align: "right" });
  
  // Ligne Timbre 
  currentY += rowH;
  doc.text("TIMBRE", rowX_label, currentY);
  doc.text(formatNumber(data.stampTax) + " DA", rowX_value, currentY, { align: "right" });

  // Ligne Net à payer (Gras)
  currentY += rowH + 3;
  doc.line(totalsX + 5, currentY - 5, totalsX + totalsW - 5, currentY - 5);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("NET À PAYER", rowX_label, currentY);
  doc.text(formatNumber(data.netTotal) + " DA", rowX_value, currentY, { align: "right" });

  // 5. FOOTER (PAGINATION)
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Page ${i}/${pageCount}`, pageWidth / 2, pageHeight - 10, { align: "center" });
  }

  doc.save(`Proforma_${data.reference || "Brouillon"}.pdf`);
};
