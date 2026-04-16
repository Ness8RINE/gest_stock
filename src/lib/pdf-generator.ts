import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// --- FORMATAGE DES NOMBRES ---
const formatNumber = (n: number) => {
  if (n === null || n === undefined) return "0,00";
  const parts = n.toFixed(2).split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return parts.join(",");
};

// --- CONVERSION CHIFFRES EN LETTRES ---
const units = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf"];
const teens = ["dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
const tens = ["", "dix", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante-dix", "quatre-vingt", "quatre-vingt-dix"];

function convertGroup(n: number): string {
  let s = "";
  let hundred = Math.floor(n / 100);
  let rest = n % 100;
  if (hundred > 0) s += (hundred === 1 ? "" : units[hundred] + " ") + "cent ";
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
  if (integerPart > 0) result += convertGroup(integerPart);
  result = result.trim() + " dinar" + (Math.floor(n) > 1 ? "s" : "") + " algérien" + (Math.floor(n) > 1 ? "s" : "");
  if (decimalPart > 0) result += " et " + convertGroup(decimalPart) + " centime" + (decimalPart > 1 ? "s" : "");
  return result.charAt(0).toUpperCase() + result.slice(1);
}

// --- GÉNÉRATEUR DE PDF ---
export const generateProformaPDF = (data: any, action: 'save' | 'open' = 'save') => {
  const doc = new jsPDF() as any;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const drawHeader = (doc: any) => {
    try {
      doc.addImage("/logo.png", "PNG", 15, 10, 40, 25);
    } catch (e) {
      doc.setFontSize(22);
      doc.setTextColor(30, 64, 175);
      doc.text("EMED", 15, 25);
    }
    doc.setTextColor(0);
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
    let yHead = 20;
    companyInfo.forEach(line => {
      doc.text(line, 70, yHead);
      yHead += 4;
    });
  };

  const drawInfoBlocks = (doc: any, y: number) => {
    const purchaseTypes = ['RECEIPT', 'PURCHASE_ORDER', 'PURCHASE_RETURN'];
    const isPurchase = purchaseTypes.includes(data.type);
    const partnerLabel = isPurchase ? "FOURNISSEUR:" : "CLIENT:";
    
    doc.setLineWidth(0.2);
    doc.setDrawColor(0);
    doc.roundedRect(15, y, 90, 35, 3, 3, 'S');
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(partnerLabel, 20, y + 7);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    
    // Mapping Données Client ou Fournisseur
    const partner = isPurchase ? data.supplier : (data.customer || { name: data.customerName });
    const pName = partner?.name || "Non spécifié";
    doc.text(pName, 20, y + 13);
    doc.setFontSize(8);
    doc.text(partner?.address || "Adresse non spécifiée", 20, y + 18);
    doc.text("Tél: " + (partner?.phone || "/"), 20, y + 23);
    doc.text(`RC: ${partner?.rc || "/"} | NIS: ${partner?.nis || "/"}`, 20, y + 27);
    doc.text(`MF: ${partner?.mf || "/"} | AI: ${partner?.ai || "/"}`, 20, y + 31);

    // BLOC DOCUMENT
    const docX = 130;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    let dateStr = "/";
    if (data.date) {
      const d = new Date(data.date);
      if (!isNaN(d.getTime())) dateStr = d.toLocaleDateString("fr-FR");
    }
    doc.text("Fait à Oran, le " + dateStr, docX, y + 7);

    // Titre Document (Plus grand selon demande)
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    const titles: Record<string, string> = {
      "PROFORMA": "Facture Proforma",
      "BL": "Bon de Livraison",
      "BV": "Bon de Vente",
      "INVOICE": "Facture",
      "RECEIPT": "Bon de Réception",
      "EXCHANGE": "Bon d'Échange",
      "DELIVERY": "Bon d'Enlèvement"
    };
    const tit = titles[data.type] || "Document";
    doc.text(tit, docX, y + 16);

    // Numéro et Mode (Plus petits et non gras)
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Numéro: " + (data.reference || "Brouillon"), docX, y + 24);
    // Mode de paiement en minuscule
    const pm = (data.paymentMethod || "Non spécifié").toLowerCase();
    doc.text("Mode de paiement: " + pm, docX, y + 30);
  };

  const rawLines = data.lines || [];
  
  // Regroupement par produit (pour le PDF seulement) pour éviter les doublons si sortie multi-dépots
  const groupedProducts: any[] = [];
  rawLines.forEach((line: any) => {
    // Dans un échange, on sépare les entrées des sorties dans le regroupement
    const existing = groupedProducts.find(p => 
      p.productId === line.productId && 
      p.unitPrice === line.unitPrice &&
      p.lineType === line.lineType
    );
    
    // Pour un échange, les articles rendus (IN) sont traités avec une quantité négative pour le calcul
    const effectiveQty = (data.type === 'EXCHANGE' && line.lineType === 'IN') ? -line.quantity : line.quantity;

    if (existing) {
      existing.quantity += effectiveQty;
    } else {
      groupedProducts.push({ ...line, quantity: effectiveQty });
    }
  });

  const products = groupedProducts;
  const chunkSize = 20; // Maximum 20 produits par page
  const totalPages = Math.ceil(products.length / chunkSize) || 1;

  for (let p = 0; p < totalPages; p++) {
    if (p > 0) doc.addPage();
    drawHeader(doc);
    drawInfoBlocks(doc, 50);

    const startIdx = p * chunkSize;
    const endIdx = startIdx + chunkSize;
    const currentLines = products.slice(startIdx, endIdx);

    const tableRows = currentLines.map((line: any, idx: number) => {
      let designation = line.product?.designation || line.designation || "Produit sans nom";
      if (data.type === 'EXCHANGE' && line.lineType) {
        designation = `[${line.lineType === 'IN' ? 'RENDU' : 'PRIS'}] ${designation}`;
      }
      const code = line.product?.reference || "CODE";
      return [
        startIdx + idx + 1,
        code,
        designation,
        line.quantity,
        formatNumber(line.unitPrice),
        line.taxRate + "%",
        formatNumber((line.quantity * line.unitPrice) * (1 - (line.discount || 0) / 100) * (1 + line.taxRate / 100))
      ];
    });

    const tableStartY = 95;
    autoTable(doc, {
      startY: tableStartY,
      head: [['N°', 'Code', 'Désignation', 'Qté', 'P.U HT', 'TVA', 'Total TTC']],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [30, 64, 175], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 20 },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 15, halign: 'center' },
        4: { cellWidth: 25, halign: 'right' },
        5: { cellWidth: 12, halign: 'center' },
        6: { cellWidth: 35, halign: 'right' },
      }
    });

    // Encadrement du tableau courant
    const finalY = (doc as any).lastAutoTable.finalY;
    doc.setLineWidth(0.1);
    doc.roundedRect(14, tableStartY - 1, pageWidth - 28, finalY - tableStartY + 2, 1, 1, 'S');

    // Pagination au pied de chaque page
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Page ${p + 1}/${totalPages}`, pageWidth / 2, pageHeight - 10, { align: "center" });
    doc.setTextColor(0);
  }

  // --- DERNIÈRE PAGE : TOTAUX TOUT EN BAS ---
  doc.setPage(totalPages);
  const totalsW = 75;
  const totalsH = 42;
  const totalsX = pageWidth - totalsW - 15;
  const totalsY = pageHeight - totalsH - 20; // Toujours en bas

  // Phrase "Arrêter la présente..."
    doc.setFontSize(9);
    doc.setFont("helvetica", "bolditalic");
    const netTotalY = totalsY + totalsH - 8;
    
    // Libellé dynamique pour la phrase d'arrêt
    const phraseMapping: Record<string, string> = {
      "PROFORMA": "la présente facture proforma",
      "INVOICE": "la présente facture",
      "BL": "le présent bon de livraison",
      "BV": "le présent bon de vente",
      "RECEIPT": "le présent bon de réception",
      "EXCHANGE": "le présent bon d'échange",
      "DELIVERY": "le présent bon d'enlèvement"
    };
    const currentDocPhrase = phraseMapping[data.type] || "le présent document";

    doc.text(`Arrêter ${currentDocPhrase} à la somme de :`, 15, netTotalY - 10);
  doc.setFont("helvetica", "bold");
  const words = numberToFrenchWords(data.netTotal);
  const splitWords = doc.splitTextToSize(words, totalsX - 25);
  doc.text(splitWords, 15, netTotalY - 5);

  // Bloc Totaux
  doc.setLineWidth(0.2);
  doc.roundedRect(totalsX, totalsY, totalsW, totalsH, 2, 2, 'S');
  const rowX_label = totalsX + 4;
  const rowX_value = totalsX + totalsW - 4;
  const rowH = 6;
  let currentY = totalsY + 8;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("TOTAL H.T", rowX_label, currentY);
  doc.text(formatNumber(data.grossTotal) + " DA", rowX_value, currentY, { align: "right" });
  currentY += rowH;
  doc.text("TVA TOTALE", rowX_label, currentY);
  doc.text(formatNumber(data.taxTotal) + " DA", rowX_value, currentY, { align: "right" });
  currentY += rowH;
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL T.T.C", rowX_label, currentY);
  doc.text(formatNumber(data.grossTotal + data.taxTotal) + " DA", rowX_value, currentY, { align: "right" });
  currentY += rowH;
  doc.setFont("helvetica", "normal");
  doc.text("TIMBRE", rowX_label, currentY);
  doc.text(formatNumber(data.stampTax) + " DA", rowX_value, currentY, { align: "right" });
  currentY += rowH + 4;
  doc.line(totalsX + 4, currentY - 5, totalsX + totalsW - 4, currentY - 5);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("NET À PAYER", rowX_label, currentY);
  doc.text(formatNumber(data.netTotal) + " DA", rowX_value, currentY, { align: "right" });

  if (action === 'save') {
    const fileName = `${data.type}_${data.reference || "Brouillon"}.pdf`;
    doc.save(fileName);
  } else {
    window.open(doc.output('bloburl'), '_blank');
  }
};
