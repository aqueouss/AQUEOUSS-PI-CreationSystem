import React, { useCallback, useEffect } from "react";
import { Button, Space, App } from "antd";
import { DownloadOutlined, CloseOutlined } from "@ant-design/icons";
import html2pdf from "html2pdf.js";
import { PIPreviewData, PIPreviewTotals } from "../types";
import { savePI, triggerBlobDownload } from "../piStorage";
import { applyRoundOff, formatINR, formatINRWhole } from "../formatCurrency";

interface PIPreviewProps {
  data: PIPreviewData;
  onClose: () => void;
  readOnly?: boolean;
}

const PDF_OPTIONS = {
  margin: [10, 10, 10, 10] as number[],
  image: { type: "jpeg", quality: 0.98 },
  html2canvas: {
    scale: 2,
    useCORS: true,
    letterRendering: true,
    width: 794
  },
  jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
};

export async function generatePdfBlob(element: HTMLElement, piNo: string): Promise<Blob> {
  return html2pdf()
    .from(element)
    .set({
      ...PDF_OPTIONS,
      filename: `PI_${piNo.replace(/\//g, "-")}.pdf`
    })
    .outputPdf("blob");
}

// Indian Number to Words converter
function numberToWords(num: number): string {
  const a = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function numToWordsUnderThousand(n: number): string {
    if (n === 0) return "";
    let str = "";
    if (n >= 100) {
      str += a[Math.floor(n / 100)] + " Hundred ";
      n %= 100;
    }
    if (n > 0) {
      if (str !== "") str += "and ";
      if (n < 20) {
        str += a[n];
      } else {
        str += b[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + a[n % 10] : "");
      }
    }
    return str.trim();
  }

  if (num === 0) return "Zero Rupees Only";
  
  let rupees = Math.floor(num);
  let paise = Math.round((num - rupees) * 100);
  
  let words = "";
  
  if (rupees >= 10000000) {
    words += numToWordsUnderThousand(Math.floor(rupees / 10000000)) + " Crore ";
    rupees %= 10000000;
  }
  if (rupees >= 100000) {
    words += numToWordsUnderThousand(Math.floor(rupees / 100000)) + " Lakh ";
    rupees %= 100000;
  }
  if (rupees >= 1000) {
    words += numToWordsUnderThousand(Math.floor(rupees / 1000)) + " Thousand ";
    rupees %= 1000;
  }
  if (rupees > 0) {
    words += numToWordsUnderThousand(rupees);
  }
  
  words = words.trim() + " Rupees";
  
  if (paise > 0) {
    words += " and " + numToWordsUnderThousand(paise) + " Paise";
  }
  
  return words + " Only";
}

function parseBulletPoints(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim().replace(/^[-•*]\s*/, ""))
    .filter(Boolean);
}

function resolveTotals(totals: PIPreviewTotals): PIPreviewTotals {
  if (totals.grandBeforeRoundOff !== undefined) {
    return totals;
  }
  const raw = totals.grand;
  const rounded = applyRoundOff(raw);
  return { ...totals, ...rounded };
}

function RoundOffRows({ totals }: { totals: PIPreviewTotals }) {
  if (Math.abs(totals.roundOff) < 0.01) return null;
  return (
    <tr>
      <td style={{ padding: "5px 8px", border: "1px solid #cbd5e1", color: "#475569" }}>Round Off</td>
      <td style={{ padding: "5px 8px", border: "1px solid #cbd5e1", textAlign: "right" }}>
        {totals.roundOff >= 0 ? "+" : ""}₹{formatINR(totals.roundOff)}
      </td>
    </tr>
  );
}

function GrandTotalRow({ totals }: { totals: PIPreviewTotals }) {
  return (
    <tr style={{ backgroundColor: "#f8fafc" }}>
      <td style={{ padding: "6px 8px", border: "1px solid #cbd5e1", fontWeight: "bold" }}>Grand Total</td>
      <td style={{ padding: "6px 8px", border: "1px solid #cbd5e1", textAlign: "right", fontWeight: "bold", color: "#0284c7" }}>
        ₹{formatINRWhole(totals.grand)}
      </td>
    </tr>
  );
}

export const PIPreview: React.FC<PIPreviewProps> = ({ data, onClose, readOnly = false }) => {
  const { message } = App.useApp();
  const piNo = data.piNumber || "AQ/2026-27/DRAFT";
  const piDate = data.date || new Date().toISOString().split("T")[0];
  const dispatchDate = data.dispatchDate || "-";
  const piSharedBy = data.piSharedBy || "-";
  const totals = resolveTotals(data.totals);

  const handleDownload = useCallback(async () => {
    const element = document.getElementById("aqueouss-pi-document");
    if (!element) {
      message.error("Invoice element not found!");
      return;
    }

    try {
      message.loading({ content: "Generating PDF file...", key: "pdf-gen" });

      const blob = await generatePdfBlob(element, piNo);
      triggerBlobDownload(blob, `PI_${piNo.replace(/\//g, "-")}.pdf`);

      if (data.piNumber && !readOnly) {
        await savePI({
          piNumber: data.piNumber,
          savedAt: new Date().toISOString(),
          customerName: data.customerName,
          date: piDate,
          grandTotal: totals.grand,
          invoiceData: { ...data, totals },
          pdfBlob: blob
        });
      }

      message.success({ content: "Invoice downloaded successfully!", key: "pdf-gen" });
    } catch (err) {
      console.error(err);
      message.error({ content: "Could not generate PDF. Please use browser print (Ctrl+P)", key: "pdf-gen" });
    }
  }, [message, piNo, data, piDate, readOnly]);

  useEffect(() => {
    if (!data.piNumber || readOnly) return;

    let cancelled = false;
    let attempts = 0;

    const tryDownload = () => {
      if (cancelled) return;
      const element = document.getElementById("aqueouss-pi-document");
      if (element) {
        handleDownload();
      } else if (attempts < 20) {
        attempts += 1;
        setTimeout(tryDownload, 200);
      }
    };

    const timer = setTimeout(tryDownload, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [data.piNumber, handleDownload, readOnly]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
        <h3 style={{ fontFamily: "var(--font-brand)", fontSize: "1.4rem", margin: 0 }}>
          {data.piNumber ? "Generated Invoice" : "Invoice Preview"}
        </h3>
        <Space>
          <Button type="primary" icon={<DownloadOutlined />} onClick={handleDownload} className="btn-primary-grad">
            Download PDF
          </Button>
          <Button icon={<CloseOutlined />} onClick={onClose}>
            Close
          </Button>
        </Space>
      </div>

      <div style={{ maxHeight: "70vh", overflowY: "auto", border: "1px solid var(--border-light)", padding: 8, background: "#f1f5f9" }}>
        {/* Printable Area */}
        <div 
          id="aqueouss-pi-document"
          style={{
            background: "#ffffff",
            color: "#000000",
            padding: "40px 30px",
            fontFamily: "Arial, sans-serif",
            fontSize: "12px",
            lineHeight: "1.5",
            width: "794px",
            boxSizing: "border-box",
            minHeight: "297mm",
            margin: "0 auto",
            boxShadow: "0 0 10px rgba(0,0,0,0.1)"
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #0284c7", paddingBottom: "15px", marginBottom: "20px" }}>
            <div>
              <h1 style={{ margin: 0, fontSize: "28px", color: "#0284c7", fontFamily: "var(--font-brand)", fontWeight: 800, letterSpacing: "1px" }}>
                AQUEOUSS
              </h1>
              <p style={{ margin: "4px 0 0 0", color: "#475569" }}>
                WH-29, Mayapuri Industrial Area, Phase-1 NEW DELHI-110018
              </p>
              <p style={{ margin: "2px 0 0 0", color: "#475569" }}>
                Email: info@aqueouss.in | Web: www.aqueouss.in
              </p>
              <p style={{ margin: "2px 0 0 0", color: "#475569" }}>
                GSTIN: 07ABGFA2761H1ZK | Phone: +91 97114 00656
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <h2 style={{ margin: 0, fontSize: "18px", color: "#0f172a", fontWeight: 700 }}>PROFORMA INVOICE</h2>
              <table style={{ marginTop: "10px", borderCollapse: "collapse", float: "right" }}>
                <tbody>
                  <tr>
                    <td style={{ padding: "3px 8px", fontWeight: "bold", border: "1px solid #cbd5e1" }}>PI Number</td>
                    <td style={{ padding: "3px 8px", border: "1px solid #cbd5e1" }}>{piNo}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "3px 8px", fontWeight: "bold", border: "1px solid #cbd5e1" }}>Date</td>
                    <td style={{ padding: "3px 8px", border: "1px solid #cbd5e1" }}>{piDate}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "3px 8px", fontWeight: "bold", border: "1px solid #cbd5e1" }}>Dispatch Date</td>
                    <td style={{ padding: "3px 8px", border: "1px solid #cbd5e1" }}>{dispatchDate}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "3px 8px", fontWeight: "bold", border: "1px solid #cbd5e1" }}>PI Shared By</td>
                    <td style={{ padding: "3px 8px", border: "1px solid #cbd5e1" }}>{piSharedBy}</td>
                  </tr>
                  {data.piMode === "igcr" && (
                    <tr>
                      <td style={{ padding: "3px 8px", fontWeight: "bold", border: "1px solid #cbd5e1" }}>Type</td>
                      <td style={{ padding: "3px 8px", border: "1px solid #cbd5e1" }}>IGCR (No GST)</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Company Details */}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
            <div style={{ width: "48%", border: "1px solid #cbd5e1", borderRadius: "4px", padding: "10px" }}>
              <h4 style={{ margin: "0 0 6px 0", color: "#0f172a", borderBottom: "1px solid #e2e8f0", paddingBottom: "4px" }}>Supplier Details</h4>
              <strong>AQUEOUSS</strong><br />
              <strong>GSTIN: 07ABGFA2761H1ZK</strong><br />
              State: Delhi (07)<br />
              Contact: +91-97114 00656
            </div>
            
            <div style={{ width: "48%", border: "1px solid #cbd5e1", borderRadius: "4px", padding: "10px" }}>
              <h4 style={{ margin: "0 0 6px 0", color: "#0f172a", borderBottom: "1px solid #e2e8f0", paddingBottom: "4px" }}>Customer Details</h4>
              <strong>{data.customerName}</strong><br />
              <div style={{ whiteSpace: "pre-line", margin: "4px 0" }}>{data.address}</div>
              Mobile: {data.mobile}<br />
              {data.gstin && <>GSTIN: {data.gstin}<br /></>}
              State: {data.state}
            </div>
          </div>

          {/* Products Table */}
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8fafc" }}>
                <th style={{ border: "1px solid #cbd5e1", padding: "8px 5px", textAlign: "center", width: "40px" }}>S.No</th>
                <th style={{ border: "1px solid #cbd5e1", padding: "8px 10px", textAlign: "left" }}>Product Name</th>
                <th style={{ border: "1px solid #cbd5e1", padding: "8px 8px", textAlign: "center", width: "80px" }}>HSN Code</th>
                <th style={{ border: "1px solid #cbd5e1", padding: "8px 8px", textAlign: "right", width: "60px" }}>Qty</th>
                <th style={{ border: "1px solid #cbd5e1", padding: "8px 8px", textAlign: "center", width: "50px" }}>Unit</th>
                <th style={{ border: "1px solid #cbd5e1", padding: "8px 8px", textAlign: "right", width: "90px" }}>Rate</th>
                <th style={{ border: "1px solid #cbd5e1", padding: "8px 8px", textAlign: "right", width: "100px" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.products.map((p, idx) => {
                const amount = (p.quantity || 0) * (p.rate || 0);
                return (
                  <tr key={idx}>
                    <td style={{ border: "1px solid #cbd5e1", padding: "8px 5px", textAlign: "center" }}>{idx + 1}</td>
                    <td style={{ border: "1px solid #cbd5e1", padding: "8px 10px" }}>{p.productName}</td>
                    <td style={{ border: "1px solid #cbd5e1", padding: "8px 8px", textAlign: "center" }}>{p.hsnCode}</td>
                    <td style={{ border: "1px solid #cbd5e1", padding: "8px 8px", textAlign: "right" }}>{p.quantity}</td>
                    <td style={{ border: "1px solid #cbd5e1", padding: "8px 8px", textAlign: "center" }}>{p.unit}</td>
                    <td style={{ border: "1px solid #cbd5e1", padding: "8px 8px", textAlign: "right" }}>₹{formatINR(p.rate)}</td>
                    <td style={{ border: "1px solid #cbd5e1", padding: "8px 8px", textAlign: "right" }}>₹{formatINR(amount)}</td>
                  </tr>
                );
              })}
              {/* Additional Charges Rows */}
              {data.additionalCharges && data.additionalCharges.map((c, idx) => (
                <tr key={`charge-${idx}`}>
                  <td style={{ border: "1px solid #cbd5e1", padding: "8px 5px", textAlign: "center" }}>{data.products.length + idx + 1}</td>
                  <td style={{ border: "1px solid #cbd5e1", padding: "8px 10px" }} colSpan={5}>
                    <strong>{c.desc}</strong>
                  </td>
                  <td style={{ border: "1px solid #cbd5e1", padding: "8px 8px", textAlign: "right" }}>
                    ₹{formatINR(c.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Tax Summary Layout */}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
            {/* Left Bank Details */}
            <div style={{ width: "48%", border: "1px solid #cbd5e1", borderRadius: "4px", padding: "10px", alignSelf: "flex-start" }}>
              <h4 style={{ margin: "0 0 6px 0", color: "#0f172a", borderBottom: "1px solid #e2e8f0", paddingBottom: "4px" }}>Bank Details</h4>
              <strong>Bank Name:</strong> ICICI BANK LTD.<br />
              <strong>Account No:</strong> 707405000027<br />
              <strong>IFSC Code:</strong> ICIC0007074<br />
              <strong>Branch:</strong> MAYAPURI PHASE-1, New Delhi
            </div>

            {/* Right Totals */}
            <div style={{ width: "48%" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {data.piMode === "igcr" ? (
                    <>
                      <tr>
                        <td style={{ padding: "5px 8px", border: "1px solid #cbd5e1", fontWeight: "bold" }}>Product Total</td>
                        <td style={{ padding: "5px 8px", border: "1px solid #cbd5e1", textAlign: "right" }}>
                          ₹{formatINR(totals.subtotal)}
                        </td>
                      </tr>
                      <RoundOffRows totals={totals} />
                      <GrandTotalRow totals={totals} />
                    </>
                  ) : (
                    <>
                      <tr>
                        <td style={{ padding: "5px 8px", border: "1px solid #cbd5e1", fontWeight: "bold" }}>Taxable Amount</td>
                        <td style={{ padding: "5px 8px", border: "1px solid #cbd5e1", textAlign: "right" }}>
                          ₹{formatINR(totals.taxable)}
                        </td>
                      </tr>
                      {data.isDelhiNcr ? (
                        <>
                          <tr>
                            <td style={{ padding: "5px 8px", border: "1px solid #cbd5e1", color: "#475569" }}>CGST (9%)</td>
                            <td style={{ padding: "5px 8px", border: "1px solid #cbd5e1", textAlign: "right" }}>
                              ₹{formatINR(totals.cgst)}
                            </td>
                          </tr>
                          <tr>
                            <td style={{ padding: "5px 8px", border: "1px solid #cbd5e1", color: "#475569" }}>SGST (9%)</td>
                            <td style={{ padding: "5px 8px", border: "1px solid #cbd5e1", textAlign: "right" }}>
                              ₹{formatINR(totals.sgst)}
                            </td>
                          </tr>
                        </>
                      ) : (
                        <tr>
                          <td style={{ padding: "5px 8px", border: "1px solid #cbd5e1", color: "#475569" }}>IGST (18%)</td>
                          <td style={{ padding: "5px 8px", border: "1px solid #cbd5e1", textAlign: "right" }}>
                            ₹{formatINR(totals.igst)}
                          </td>
                        </tr>
                      )}
                      <RoundOffRows totals={totals} />
                      <GrandTotalRow totals={totals} />
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Amount In Words */}
          <div style={{ border: "1px solid #cbd5e1", padding: "10px", borderRadius: "4px", marginBottom: "20px" }}>
            <strong>Amount in Words: </strong> {numberToWords(totals.grand)}
          </div>

          {/* Optional Notes / Terms */}
          {data.invoiceNotes?.enabled && data.invoiceNotes.description && (
            <div style={{ border: "1px solid #cbd5e1", padding: "10px", borderRadius: "4px", marginBottom: "30px" }}>
              <h4 style={{ margin: "0 0 8px 0", color: "#0f172a", fontSize: "13px", fontWeight: 700 }}>
                {data.invoiceNotes.title}
              </h4>
              <ul style={{ margin: 0, paddingLeft: "20px", color: "#334155" }}>
                {parseBulletPoints(data.invoiceNotes.description).map((point, idx) => (
                  <li key={idx} style={{ marginBottom: "4px" }}>{point}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Footer signatures */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "40px", paddingTop: "20px" }}>
            <div style={{ width: "45%" }}>
              <p style={{ margin: "0 0 50px 0", color: "#64748b" }}>Customer Signature & Stamp</p>
              <div style={{ borderTop: "1px dashed #cbd5e1" }}></div>
            </div>
            <div style={{ width: "45%", textAlign: "right" }}>
              <p style={{ margin: "0 0 5px 0", fontWeight: "bold" }}>For AQUEOUSS</p>
              <p style={{ margin: "0 0 45px 0", color: "#64748b", fontSize: "10px" }}>Authorized Signatory</p>
              <div style={{ borderTop: "1px dashed #cbd5e1" }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
