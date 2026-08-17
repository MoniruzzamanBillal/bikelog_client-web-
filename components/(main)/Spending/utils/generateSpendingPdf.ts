import { format } from "date-fns";
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import { TSpendingDetails } from "../type/spending.types";

function buildFilename(details: TSpendingDetails): string {
  if (details.period === "month") return `spending-month-${details.targetMonth}.pdf`;
  if (details.period === "year") return `spending-year-${details.targetYear}.pdf`;
  return "spending-lifetime.pdf";
}

// ! jsPDF's built-in fonts (Helvetica/Times/Courier) only cover WinAnsi/Latin-1, so the ৳
// ! glyph used throughout the rest of this app renders as mojibake here. Embedding a
// ! Bengali-script TTF was tried and rejected — it broke jsPDF's font parser badly enough
// ! that it silently dropped even plain Latin text (confirmed via an isolated Node test
// ! outside the browser, unrelated to this app's own code). "Tk" is a PDF-only fallback;
// ! the live UI is untouched and keeps ৳ everywhere else.
const CURRENCY_PREFIX = "Tk";

// ! record.description is server-synthesized (bikelog_server spec 23, e.g. "5L (Full Tank)
// ! @ ৳100/L") and can itself contain a literal ৳ — same font limitation as above, so it's
// ! sanitized here at render time only, never mutating the API response the rest of the app
// ! (e.g. a future on-screen line-item list) might still want the real ৳ from.
const sanitizeForPdf = (text: string): string => text.replace(/৳/g, `${CURRENCY_PREFIX} `);

export function generateSpendingPdf(
  details: TSpendingDetails,
  periodLabel: string,
): void {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text("Spending Report", 14, 18);

  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(periodLabel, 14, 26);
  doc.text(`Generated ${format(new Date(), "d MMM yyyy, h:mm a")}`, 14, 32);

  doc.setFontSize(13);
  doc.setTextColor(0);
  doc.text(
    `Total Spending: ${CURRENCY_PREFIX} ${details.totalSpending.toLocaleString()}`,
    14,
    44,
  );

  let cursorY = 50;

  if (details.categoryBreakdown.length > 0) {
    autoTable(doc, {
      startY: cursorY,
      head: [["Category", `Total (${CURRENCY_PREFIX})`]],
      body: details.categoryBreakdown.map((cat) => [
        sanitizeForPdf(cat.category),
        cat.total.toLocaleString(),
      ]),
    });
    cursorY = (doc as unknown as { lastAutoTable: { finalY: number } })
      .lastAutoTable.finalY + 8;
  }

  if (details.records.length > 0) {
    autoTable(doc, {
      startY: cursorY,
      head: [
        ["Date", "Category", "Description", `Amount (${CURRENCY_PREFIX})`, "Vendor", "Remarks"],
      ],
      body: details.records.map((record) => [
        format(new Date(record.date), "d MMM yyyy"),
        sanitizeForPdf(record.category),
        sanitizeForPdf(record.description),
        record.amount.toLocaleString(),
        record.vendor ? sanitizeForPdf(record.vendor) : "-",
        record.remarks ? sanitizeForPdf(record.remarks) : "-",
      ]),
    });
  } else {
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text("No spending records for this period.", 14, cursorY + 6);
  }

  doc.save(buildFilename(details));
}
