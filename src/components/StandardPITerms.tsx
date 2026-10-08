import React from "react";
import { STANDARD_PI_TERMS_BULLETS, STANDARD_PI_TERMS_TITLE } from "../piStandardTerms";

interface StandardPITermsProps {
  variant?: "form" | "pdf";
}

export const StandardPITerms: React.FC<StandardPITermsProps> = ({ variant = "pdf" }) => {
  if (variant === "form") {
    return (
      <div style={{ color: "var(--text-secondary-light)", fontSize: "0.9rem" }}>
        <p style={{ margin: "0 0 8px", fontWeight: 600, color: "var(--text-primary-light, #0f172a)" }}>
          {STANDARD_PI_TERMS_TITLE}
        </p>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          {STANDARD_PI_TERMS_BULLETS.map((point, idx) => (
            <li key={idx} style={{ marginBottom: 6 }}>{point}</li>
          ))}
        </ul>
        <p style={{ margin: "12px 0 0", fontSize: "0.8rem" }}>
          These terms are included on every Proforma Invoice.
        </p>
      </div>
    );
  }

  return (
    <div style={{ border: "1px solid #cbd5e1", padding: "10px", borderRadius: "4px", marginBottom: "20px" }}>
      <h4 style={{ margin: "0 0 8px 0", color: "#0f172a", fontSize: "13px", fontWeight: 700 }}>
        {STANDARD_PI_TERMS_TITLE}
      </h4>
      <ul style={{ margin: 0, paddingLeft: "20px", color: "#334155" }}>
        {STANDARD_PI_TERMS_BULLETS.map((point, idx) => (
          <li key={idx} style={{ marginBottom: "4px" }}>{point}</li>
        ))}
      </ul>
    </div>
  );
};
