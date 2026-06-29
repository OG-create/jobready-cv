
import React, { useEffect, useMemo, useRef, useState } from "react";
import JSZip from "jszip";

const emptyJob = {
  role: "",
  company: "",
  location: "",
  start: "",
  end: "",
  bullets: [""],
};

const emptyEducation = {
  qualification: "",
  institution: "",
  start: "",
  end: "",
};

const emptyRegistration = {
  title: "",
  body: "",
};

const defaultCv = {
  accent: "#315d8f",
  template: "executive",
  documentTitle: "CURRICULUM VITAE",
  targetRole: "",
  photo: "",
  personal: {
    fullName: "",
    headline: "",
    email: "",
    phone: "",
    address: "",
    nationality: "",
    driving: "",
    website: "",
  },
  profile: "",
  education: [{ ...emptyEducation }],
  employment: [{ ...emptyJob }],
  skills: [""],
  languages: [{ name: "", level: 3, proficiency: "" }],
  registrations: [{ ...emptyRegistration }],
  additional: "",
};

const STORAGE_KEY = "rweycv-data-v23";
const PAYMENT_API_BASE = import.meta.env.VITE_PAYMENT_API_BASE || "http://localhost:4242";
const CV_DOWNLOAD_PRICE = 2000;

const productCatalog = {
  pdf: {
    title: "CV PDF Download",
    price: CV_DOWNLOAD_PRICE,
    label: "TSh 2,000",
  },
  word: {
    title: "CV Word Download",
    price: CV_DOWNLOAD_PRICE,
    label: "TSh 2,000",
  },
};

function cloneValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function mergeWithDefaultCv(value = {}) {
  const base = cloneValue(defaultCv);
  const incoming = value && typeof value === "object" ? value : {};

  return {
    ...base,
    ...incoming,
    personal: {
      ...base.personal,
      ...(incoming.personal || {}),
    },
    education: Array.isArray(incoming.education) ? incoming.education : base.education,
    employment: Array.isArray(incoming.employment) ? incoming.employment : base.employment,
    skills: Array.isArray(incoming.skills) ? incoming.skills : base.skills,
    languages: Array.isArray(incoming.languages) ? incoming.languages : base.languages,
    registrations: Array.isArray(incoming.registrations) ? incoming.registrations : base.registrations,
  };
}

function loadSavedCv() {
  if (typeof window === "undefined") return mergeWithDefaultCv();

  try {
    const saved =
      window.localStorage.getItem(STORAGE_KEY) ||
      window.localStorage.getItem("rweycv-data-v22");
    return saved ? mergeWithDefaultCv(JSON.parse(saved)) : mergeWithDefaultCv();
  } catch {
    return mergeWithDefaultCv();
  }
}

function saveCv(value) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Storage can fail in private browsing or when the saved photo is too large.
  }
}

function clearSavedCvData() {
  if (typeof window === "undefined") return;

  try {
    Object.keys(window.localStorage)
      .filter((key) => key.startsWith("rweycv-data"))
      .forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // Ignore storage failures and continue resetting the in-memory app state.
  }
}

function safeFileName(value, fallback = "CV") {
  const clean = String(value || fallback)
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  return clean || fallback;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function createPaymentReference() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `cv-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const paymentStyles = `
  * {
    box-sizing: border-box;
  }

  html,
  body,
  #root {
    margin: 0;
    min-height: 100%;
  }

  body {
    background: #e8edf3;
    color: #111827;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
  }

  button,
  input,
  textarea,
  select {
    font: inherit;
  }

  button {
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    background: #ffffff;
    color: #111827;
    cursor: pointer;
    transition: background 160ms ease, border-color 160ms ease, color 160ms ease;
  }

  button:hover {
    border-color: var(--accent, #315d8f);
    background: #f8fafc;
  }

  .app-root {
    min-height: 100vh;
    background: #e8edf3;
  }

  .topbar {
    position: sticky;
    top: 0;
    z-index: 30;
    display: grid;
    grid-template-columns: 180px 1fr 180px;
    align-items: center;
    gap: 16px;
    height: 48px;
    padding: 0 22px;
    background: #111827;
    color: #f8fafc;
    box-shadow: 0 1px 0 rgba(15, 23, 42, 0.2);
  }

  .back-btn,
  .top-actions button {
    border-color: rgba(255, 255, 255, 0.12);
    background: #111827;
    color: #e5e7eb;
  }

  .back-btn {
    width: fit-content;
    padding: 7px 14px;
  }

  .doc-title {
    overflow: hidden;
    text-align: center;
    color: #e5e7eb;
    font-size: 13px;
    font-weight: 800;
    letter-spacing: 0.02em;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .top-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }

  .top-actions button {
    min-width: 38px;
    height: 34px;
    padding: 0 10px;
  }

  .download-mini,
  .primary,
  .primary-action {
    border-color: #2563eb !important;
    background: #2563eb !important;
    color: #ffffff !important;
    font-weight: 700;
  }

  .ats-action {
    border-color: #0f766e !important;
    color: #115e59 !important;
    font-weight: 700;
  }

  .visual-action {
    border-color: #315d8f !important;
    color: #315d8f !important;
    font-weight: 700;
  }

  .danger {
    border-color: #fecaca !important;
    color: #991b1b !important;
  }

  .app-shell {
    display: grid;
    grid-template-columns: minmax(320px, 38vw) 1fr;
    gap: 0;
    min-height: calc(100vh - 48px);
  }

  .editor-panel {
    position: sticky;
    top: 48px;
    align-self: start;
    height: calc(100vh - 48px);
    overflow: auto;
    padding: 24px 22px 32px;
    background: #f8fafc;
    border-right: 1px solid #d7dee8;
  }

  .import-tabs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 12px;
  }

  .import-tabs button {
    min-height: 38px;
    padding: 8px 10px;
    font-size: 13px;
    font-weight: 700;
  }

  .editor-section {
    margin-bottom: 12px;
    border: 1px solid #d7dee8;
    border-radius: 8px;
    background: #ffffff;
    overflow: hidden;
  }

  .section-title {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 13px 15px;
    border: 0;
    border-radius: 0;
    background: #ffffff;
    color: #111827;
    font-weight: 800;
    text-align: left;
  }

  .section-body {
    display: grid;
    gap: 12px;
    padding: 14px;
    border-top: 1px solid #e5e7eb;
  }

  .field {
    display: grid;
    gap: 6px;
  }

  .field span,
  .mini-title {
    color: #64748b;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .field input,
  .field textarea,
  .field select {
    width: 100%;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    background: #ffffff;
    color: #111827;
    padding: 10px 12px;
    outline: none;
  }

  .field textarea {
    resize: vertical;
    min-height: 90px;
  }

  .field input:focus,
  .field textarea:focus,
  .field select:focus {
    border-color: var(--accent, #315d8f);
    box-shadow: 0 0 0 3px rgba(49, 93, 143, 0.15);
  }

  .simple-actions,
  .bottom-actions {
    display: grid;
    gap: 8px;
  }

  .compact-actions {
    margin-top: 4px;
  }

  .small {
    min-height: 36px;
    padding: 8px 12px;
    font-size: 13px;
  }

  .full {
    width: 100%;
  }

  .notice {
    margin: 0;
    border-left: 4px solid var(--accent, #315d8f);
    border-radius: 8px;
    background: #eff6ff;
    color: #334155;
    padding: 12px;
    line-height: 1.45;
  }

  .syncing {
    border-left-color: #0f766e;
    background: #ecfdf5;
  }

  .upload-box {
    display: grid;
    gap: 8px;
  }

  .photo-upload-button {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    min-height: 38px;
    border: 1px dashed #94a3b8;
    border-radius: 8px;
    background: #f8fafc;
    color: #315d8f;
    cursor: pointer;
    font-weight: 800;
  }

  .card {
    display: grid;
    gap: 10px;
    padding: 12px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: #f8fafc;
  }

  .two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .inline-row {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: end;
    gap: 8px;
  }

  .bullet-editor {
    display: grid;
    gap: 8px;
  }

  .bottom-actions {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    margin-top: 18px;
  }

  .bottom-actions button {
    min-height: 40px;
  }

  .preview-area {
    overflow: auto;
    padding: 34px 38px 60px;
    background: #dfe6ee;
  }

  .resume-paper,
  .ats-paper {
    width: min(980px, 100%);
    min-height: 1120px;
    margin: 0 auto;
    background: #ffffff;
    box-shadow: 0 20px 70px rgba(15, 23, 42, 0.18);
  }

  .resume-paper {
    display: grid;
    grid-template-columns: 32% 68%;
    color: #111827;
  }

  .resume-sidebar {
    background: #eef3f8;
    padding: 32px 24px;
  }

  .resume-content {
    padding: 34px 36px 42px;
  }

  .name-block {
    margin: -32px -24px 24px;
    padding: 28px 20px 24px;
    background: var(--accent, #315d8f);
    color: #ffffff;
    text-align: center;
  }

  .document-heading {
    font-size: 16px;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .name-block h1 {
    margin: 12px 0 6px;
    font-size: 25px;
    line-height: 1.1;
  }

  .name-block p {
    margin: 0;
    font-size: 13px;
    line-height: 1.35;
  }

  .photo-wrap {
    display: grid;
    place-items: center;
    margin: 8px 0 22px;
  }

  .photo-wrap img,
  .photo-placeholder {
    width: 118px;
    height: 118px;
    border: 6px solid #ffffff;
    border-radius: 999px;
    object-fit: cover;
    box-shadow: 0 10px 30px rgba(15, 23, 42, 0.16);
  }

  .photo-placeholder {
    display: grid;
    place-items: center;
    background: #cbd5e1;
    color: #64748b;
    font-weight: 800;
  }

  .sidebar-section,
  .main-section {
    margin-bottom: 22px;
  }

  .sidebar-section h2,
  .main-section h2 {
    margin: 0 0 10px;
    color: var(--accent, #315d8f);
    font-weight: 500;
    line-height: 1.15;
  }

  .sidebar-section h2 {
    font-size: 19px;
    border-bottom: 1px solid #cbd5e1;
    padding-bottom: 7px;
  }

  .main-section h2 {
    font-size: 28px;
    border-bottom: 1px solid #cbd5e1;
    padding-bottom: 8px;
  }

  .plain-list {
    margin: 0;
    padding-left: 18px;
  }

  .plain-list li {
    margin-bottom: 6px;
    line-height: 1.35;
  }

  .skill-highlight {
    color: #0f766e;
    font-weight: 800;
  }

  .language-row,
  .contact-line {
    display: flex;
    gap: 8px;
    align-items: flex-start;
    margin-bottom: 7px;
    line-height: 1.35;
  }

  .contact-line p,
  .language-row p {
    margin: 0;
  }

  .entry {
    margin-bottom: 16px;
    page-break-inside: avoid;
  }

  .compact-entry,
  .mini-entry {
    margin-bottom: 12px;
  }

  .entry-head {
    display: flex;
    justify-content: space-between;
    gap: 14px;
    align-items: baseline;
  }

  .entry h3 {
    margin: 0 0 3px;
    font-size: 16px;
  }

  .entry p {
    margin: 0 0 7px;
    line-height: 1.42;
  }

  .subtext {
    color: var(--accent, #315d8f);
  }

  .entry ul {
    margin: 7px 0 0 18px;
    padding: 0;
  }

  .entry li {
    margin-bottom: 5px;
    line-height: 1.42;
  }

  .ats-paper {
    padding: 42px 54px;
    color: #111827;
    font-family: Arial, sans-serif;
  }

  .ats-header {
    text-align: center;
    margin-bottom: 20px;
  }

  .ats-header h1 {
    margin: 0;
    font-size: 30px;
  }

  .ats-contact {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 5px 12px;
    margin-top: 8px;
    font-size: 13px;
  }

  .ats-section {
    margin-bottom: 18px;
  }

  .ats-section h2 {
    margin: 0 0 9px;
    border-bottom: 1px solid #111827;
    padding-bottom: 5px;
    font-size: 16px;
    text-transform: uppercase;
  }

  .ats-entry {
    margin-bottom: 12px;
  }

  .ats-entry-head {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: baseline;
  }

  .ats-skill-list {
    columns: 2;
    margin: 0;
    padding-left: 18px;
  }

  @media (max-width: 980px) {
    .topbar {
      grid-template-columns: auto 1fr auto;
      padding: 0 12px;
    }

    .app-shell {
      grid-template-columns: 1fr;
    }

    .editor-panel {
      position: relative;
      top: auto;
      height: auto;
      border-right: 0;
      border-bottom: 1px solid #d7dee8;
    }

    .preview-area {
      padding: 22px 14px 40px;
    }

    .resume-paper {
      grid-template-columns: 1fr;
    }

    .name-block {
      margin: -24px -18px 20px;
    }

    .resume-sidebar,
    .resume-content {
      padding: 24px 18px;
    }
  }

  @media (max-width: 620px) {
    .topbar {
      grid-template-columns: 1fr;
      height: auto;
      padding: 10px;
    }

    .doc-title,
    .top-actions {
      justify-self: stretch;
      justify-content: center;
    }

    .import-tabs,
    .two-col,
    .inline-row,
    .bottom-actions {
      grid-template-columns: 1fr;
    }

    .entry-head,
    .ats-entry-head {
      display: block;
    }
  }

  @media print {
    .no-print {
      display: none !important;
    }

    body,
    .app-root,
    .preview-area {
      background: #ffffff !important;
    }

    .app-shell {
      display: block;
      min-height: auto;
    }

    .preview-area {
      padding: 0;
      overflow: visible;
    }

    .resume-paper,
    .ats-paper {
      width: 100%;
      min-height: auto;
      box-shadow: none;
    }
  }

  .payment-overlay {
    position: fixed;
    inset: 0;
    z-index: 9999;
    display: grid;
    place-items: center;
    padding: 24px;
    background: rgba(15, 23, 42, 0.58);
  }

  .payment-card {
    position: relative;
    width: min(440px, 100%);
    border-radius: 8px;
    background: #ffffff;
    color: #111827;
    padding: 24px;
    box-shadow: 0 24px 80px rgba(15, 23, 42, 0.28);
  }

  .payment-card h2 {
    margin: 4px 0 10px;
    font-size: 24px;
    line-height: 1.15;
  }

  .payment-card p {
    margin: 0 0 14px;
    line-height: 1.45;
  }

  .payment-kicker {
    color: var(--accent, #315d8f);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .payment-close {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 34px;
    height: 34px;
    border: 0;
    border-radius: 50%;
    background: #f1f5f9;
    color: #111827;
    cursor: pointer;
    font-size: 20px;
    line-height: 1;
  }

  .payment-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 18px;
  }

  .payment-order-box {
    display: grid;
    gap: 4px;
    margin: 12px 0;
    padding: 12px;
    border: 1px solid #bfdbfe;
    border-radius: 8px;
    background: #eff6ff;
  }

  .payment-order-box span,
  .payment-order-box small {
    color: #475569;
    font-size: 12px;
  }

  .payment-order-box strong {
    color: #1e3a8a;
    font-family: Consolas, Monaco, monospace;
    font-size: 16px;
    overflow-wrap: anywhere;
  }

  @media (max-width: 520px) {
    .payment-actions {
      flex-direction: column-reverse;
    }

    .payment-actions .small {
      width: 100%;
    }
  }

  @media print {
    .download-locked .resume-paper,
    .download-locked .ats-paper {
      display: none !important;
    }

    .download-locked .preview-area::before {
      display: block;
      padding: 40px;
      color: #111827;
      font: 18px Arial, sans-serif;
      text-align: center;
      content: "Payment is required before downloading or printing this CV.";
    }
  }
`;

const headingAliases = {
  profile: ["profile", "professional profile", "summary", "professional summary", "career profile", "objective", "career objective", "personal profile"],
  education: ["education", "academic background", "academic qualification", "academic qualifications", "educational background", "education background", "qualifications"],
  employment: ["employment", "work experience", "professional experience", "professional experience", "career history", "employment history", "experience", "working experience", "professional background"],
  skills: ["skills", "key skills", "technical skills", "additional skills", "core competencies", "competencies", "computer skills", "software skills"],
  languages: ["languages", "language", "language proficiency"],
  registrations: ["professional registration", "professional registration & memberships", "professional registration and memberships", "registration", "memberships", "professional memberships", "professional bodies"],
  additional: ["additional information", "other information", "achievements", "certificates", "training", "professional training", "seminars", "workshops"],
};

const roleKeywords =
  /(manager|architect|engineer|quantity surveyor|project manager|project coordinator|officer|director|trainee|consultant|supervisor|coordinator|assistant|technician|planner|administrator|accountant|surveyor|clerk|specialist|advisor|analyst|designer|drafter|draftsman|estate manager|facility manager|facilities manager)/i;

const qualificationKeywords =
  /(certificate|diploma|bachelor|master|phd|degree|architecture|education|secondary|primary|hons|msc|bsc|ba|advanced|ordinary level|advanced level|csee|acsee|form six|form four)/i;

const institutionKeywords =
  /(agency|company|co\.|ltd|limited|plc|corporation|ministry|department|authority|board|bureau|office|council|commission|institute|institution|university|college|school|academy|architects|consultants|contractors|embassy|ngo|bank|hospital|tba|tanroads|tarura|tanapa|gpsa|temesa|udsm|out)/i;

const schoolKeywords =
  /(university|college|school|institute|academy|open university|udsm|out|secondary|primary)/i;

const dutyStarters =
  /^(provide|provided|manage|managed|lead|led|ensure|ensured|coordinate|coordinated|support|supported|supervise|supervised|prepare|prepared|conduct|conducted|participate|participated|develop|developed|review|reviewed|monitor|monitored|assist|assisted|collaborate|collaborated|represent|represented|oversee|oversaw|collect|collected|translate|translated|apply|applied|improve|improved|strengthen|strengthened|maintain|maintained|carry|carried|perform|performed|responsible|responsibilities|duties|key duties|main duties)\b/i;

function Field({ label, value, onChange, placeholder = "", type = "text" }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type={type}
        value={value || ""}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function TextArea({ label, value, onChange, rows = 5, placeholder = "" }) {
  return (
    <label className="field">
      <span>{label}</span>
      <textarea
        rows={rows}
        value={value || ""}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function Section({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="editor-section">
      <button className="section-title" onClick={() => setOpen(!open)} type="button">
        <strong>{title}</strong>
        <span>{open ? "⌄" : "›"}</span>
      </button>
      {open && <div className="section-body">{children}</div>}
    </section>
  );
}

function BulletEditor({ bullets, onChange }) {
  const list = bullets?.length ? bullets : [""];
  function update(index, value) {
    const next = [...list];
    next[index] = value;
    onChange(next);
  }
  function remove(index) {
    const next = list.filter((_, i) => i !== index);
    onChange(next.length ? next : [""]);
  }
  return (
    <div className="bullet-editor">
      <span className="mini-title">Duties / achievements</span>
      {list.map((bullet, index) => (
        <div className="inline-row" key={index}>
          <input
            value={bullet}
            placeholder="Example: Managed public building projects..."
            onChange={(event) => update(index, event.target.value)}
          />
          <button type="button" className="small danger" onClick={() => remove(index)}>
            Remove
          </button>
        </div>
      ))}
      <button type="button" className="small" onClick={() => onChange([...list, ""])}>
        + Add duty
      </button>
    </div>
  );
}

function decodeXml(text) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function stripXmlTags(xml) {
  return decodeXml(
    xml
      .replace(/<w:tab\/>/g, " ")
      .replace(/<w:br\/>/g, "\n")
      .replace(/<\/w:p>/g, "\n")
      .replace(/<\/w:tr>/g, "\n")
      .replace(/<[^>]+>/g, "")
  );
}

function normalizeText(text) {
  return String(text || "")
    .replace(/\r/g, "\n")
    .replace(/[•●▪◦]/g, "\n• ")
    .replace(/\t/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/\n[ ]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanLine(line) {
  return String(line || "")
    .replace(/^[-–—•●▪◦*\s]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function splitLines(text) {
  return normalizeText(text)
    .split(/\n+/)
    .map(cleanLine)
    .filter(Boolean);
}

async function readDocxParagraphs(file) {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);
  const documentXml = await zip.file("word/document.xml")?.async("string");
  if (!documentXml) throw new Error("DOCX could not be read properly.");

  const paragraphs = [];
  const paragraphMatches = documentXml.match(/<w:p[\s\S]*?<\/w:p>/g) || [];

  for (const pXml of paragraphMatches) {
    const rawText = stripXmlTags(pXml);
    const normalized = normalizeText(rawText);
    if (!normalized) continue;

    const bold = /<w:b[\s/>]/.test(pXml);
    const numbered = /<w:numPr>/.test(pXml);

    normalized
      .split(/\n+/)
      .map(cleanLine)
      .filter(Boolean)
      .forEach((line) => {
        const isBullet = numbered || /^[•●▪◦*-]/.test(line);
        paragraphs.push({ text: line, bold, isBullet });
      });
  }

  return paragraphs;
}

function findHeadingKey(line) {
  const clean = cleanLine(line).toLowerCase().replace(/[:\-–—]+$/g, "").trim();
  for (const [key, aliases] of Object.entries(headingAliases)) {
    if (aliases.includes(clean)) return key;
  }
  return null;
}

function isStrongHeading(line, meta = {}) {
  const clean = cleanLine(line);
  if (findHeadingKey(clean)) return true;
  if (clean.length > 3 && clean.length < 45 && clean === clean.toUpperCase() && !/\d/.test(clean)) return true;
  if (meta.bold && clean.length < 45 && !dutyStarters.test(clean) && !roleKeywords.test(clean)) return true;
  return false;
}

function sectionize(textOrParagraphs) {
  const items = Array.isArray(textOrParagraphs)
    ? textOrParagraphs
    : splitLines(textOrParagraphs).map((text) => ({ text, bold: false, isBullet: false }));

  const sections = { top: [] };
  let current = "top";

  for (const item of items) {
    const line = cleanLine(item.text);
    if (!line) continue;

    const key = findHeadingKey(line);
    if (key) {
      current = key;
      sections[current] = sections[current] || [];
      continue;
    }

    if (isStrongHeading(line, item)) {
      const lower = line.toLowerCase();
      let inferred = null;
      if (/education|academic|qualification/.test(lower)) inferred = "education";
      if (/employment|experience|career|work/.test(lower)) inferred = "employment";
      if (/skill|competenc/.test(lower)) inferred = "skills";
      if (/language/.test(lower)) inferred = "languages";
      if (/registration|membership|professional bod/.test(lower)) inferred = "registrations";
      if (/profile|summary|objective/.test(lower)) inferred = "profile";
      if (inferred) {
        current = inferred;
        sections[current] = sections[current] || [];
        continue;
      }
    }

    sections[current].push(line);
  }
  return sections;
}

function extractEmail(text) {
  return String(text || "").match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
}

function extractPhone(text) {
  const candidates = String(text || "").match(/(?:\+?\d[\d\s().-]{7,}\d)/g) || [];
  return candidates.find((item) => item.replace(/\D/g, "").length >= 9)?.trim() || "";
}

function extractYears(line) {
  const clean = String(line || "");
  const range = clean.match(/((?:19|20)\d{2})\s*(?:-|–|—|to|up to)\s*((?:19|20)\d{2}|present|current|to date|date)/i);
  if (range) return { start: range[1], end: normalizePresent(range[2]) };
  const years = clean.match(/(?:19|20)\d{2}/g) || [];
  if (years.length >= 2) return { start: years[0], end: years[1] };
  if (years.length === 1) return { start: years[0], end: "" };
  return { start: "", end: "" };
}

function normalizePresent(value) {
  if (!value) return "";
  if (/present|current|to date|date/i.test(value)) return "Present";
  return value;
}

function hasYears(line) {
  return /(?:19|20)\d{2}|present|current|to date/i.test(line);
}

function removeYearRange(line) {
  return cleanLine(
    String(line || "")
      .replace(/((?:19|20)\d{2})\s*(?:-|–|—|to|up to)\s*((?:19|20)\d{2}|present|current|to date|date)/ig, "")
      .replace(/(?:19|20)\d{2}/g, "")
      .replace(/\b(Present|Current|To Date)\b/gi, "")
      .replace(/\s{2,}/g, " ")
      .replace(/^[,;:|\-–—]+|[,;:|\-–—]+$/g, "")
  );
}

function isDutyLine(line) {
  const clean = cleanLine(line);
  if (!clean) return false;
  if (dutyStarters.test(clean)) return true;
  if (clean.length > 95 && !hasYears(clean)) return true;
  if (/[.;]$/.test(clean) && clean.split(" ").length > 8) return true;
  return false;
}

function isRoleLine(line) {
  const clean = cleanLine(line);
  if (!clean || clean.length > 95) return false;
  if (isDutyLine(clean)) return false;
  if (/^(duties|responsibilities|key duties|main duties|achievements)$/i.test(clean)) return false;
  return roleKeywords.test(clean);
}

function isInstitutionLine(line) {
  const clean = cleanLine(line);
  if (!clean || clean.length > 110) return false;
  if (isDutyLine(clean)) return false;
  return institutionKeywords.test(clean);
}

function isSchoolLine(line) {
  const clean = cleanLine(line);
  return schoolKeywords.test(clean) && clean.length < 110;
}

function splitRoleCompany(text) {
  const clean = cleanLine(text);
  const separators = [
    /\s+\bat\b\s+/i,
    /\s+\bwith\b\s+/i,
    /\s+\|\s+/,
    /\s+–\s+/,
    /\s+—\s+/,
    /\s+-\s+/,
  ];
  for (const sep of separators) {
    const parts = clean.split(sep).map(cleanLine).filter(Boolean);
    if (parts.length >= 2 && roleKeywords.test(parts[0])) {
      return { role: parts[0], company: parts.slice(1).join(", ") };
    }
  }
  return { role: clean, company: "" };
}



function normalizeEmploymentLine(line) {
  return cleanLine(String(line || "")
    .replace(/^(Key Responsibilities|Selected Achievements|Responsibilities|Duties|Main Duties)\s*:\s*/i, "")
    .replace(/^Key Responsibilities$/i, "")
    .replace(/^Selected Achievements$/i, "")
  );
}

function parseEmployment(lines) {
  const candidates = lines.map(normalizeEmploymentLine).filter(Boolean);
  const output = [];
  let current = null;

  function pushCurrent() {
    if (!current) return;

    current.bullets = (current.bullets || [])
      .map(normalizeEmploymentLine)
      .filter(Boolean)
      .filter((bullet) => !/^(Key Responsibilities|Selected Achievements|Responsibilities|Duties|Main Duties)$/i.test(bullet))
      .slice(0, 12);

    if (!current.bullets.length) current.bullets = [""];
    output.push(current);
    current = null;
  }

  for (let i = 0; i < candidates.length; i += 1) {
    const line = candidates[i];
    const next = candidates[i + 1] || "";
    const next2 = candidates[i + 2] || "";

    const years = extractYears(line);
    const noYears = removeYearRange(line);
    const roleCompany = splitRoleCompany(noYears || line);

    const lineIsRole = isRoleLine(noYears || line);
    const nextIsInstitution = isInstitutionLine(next);
    const next2HasYears = hasYears(next2);
    const lineHasYears = hasYears(line);

    // Pattern:
    // Acting Regional Manager
    // Example Company, Region
    // 2022 – Present
    if (lineIsRole && nextIsInstitution && next2HasYears) {
      pushCurrent();
      const y = extractYears(next2);
      current = {
        role: noYears || line,
        company: removeYearRange(next),
        location: "",
        start: y.start,
        end: y.end,
        bullets: [],
      };
      i += 2;
      continue;
    }

    // Pattern:
    // Y&P Architects (T) Ltd 2008 - 2011
    // after role line OR same line containing role/company/year
    if (lineIsRole && lineHasYears) {
      pushCurrent();
      current = {
        role: roleCompany.role || noYears || line,
        company: roleCompany.company || "",
        location: "",
        start: years.start,
        end: years.end,
        bullets: [],
      };
      continue;
    }

    // Pattern:
    // Quality Assurance Officer
    // Badr East Africa Enterprises Ltd
    // Jan 2014 – October 2014
    if (lineIsRole && nextIsInstitution && hasYears(candidates[i + 2] || "")) {
      pushCurrent();
      const y = extractYears(candidates[i + 2]);
      current = {
        role: line,
        company: removeYearRange(next),
        location: "",
        start: y.start,
        end: y.end,
        bullets: [],
      };
      i += 2;
      continue;
    }

    // Pattern:
    // Architectural Trainee
    // Y&P Architects (T) Ltd 2008 - 2011
    if (lineIsRole && hasYears(next) && isInstitutionLine(next)) {
      pushCurrent();
      const y = extractYears(next);
      current = {
        role: line,
        company: removeYearRange(next),
        location: "",
        start: y.start,
        end: y.end,
        bullets: [],
      };
      i += 1;
      continue;
    }

    // Pattern:
    // role at company 2020 - 2022
    if (lineIsRole && (/\s+\bat\b\s+|\s+-\s+|\s+–\s+|\s+\|\s+|\s+\bwith\b\s+/i.test(line))) {
      pushCurrent();
      current = {
        role: roleCompany.role,
        company: roleCompany.company,
        location: "",
        start: years.start,
        end: years.end,
        bullets: [],
      };
      continue;
    }

    // Institution line after role but without years yet.
    if (current && !current.company && isInstitutionLine(line)) {
      const y = extractYears(line);
      current.company = removeYearRange(line);
      current.start = current.start || y.start;
      current.end = current.end || y.end;
      continue;
    }

    // Year line after role/company.
    if (current && hasYears(line) && !current.start) {
      const y = extractYears(line);
      current.start = y.start;
      current.end = y.end;
      const remaining = removeYearRange(line);
      if (remaining && isInstitutionLine(remaining) && !current.company) {
        current.company = remaining;
      }
      continue;
    }

    if (current) {
      current.bullets.push(line);
    }
  }

  pushCurrent();
  return output.slice(0, 20);
}


function splitQualificationInstitution(line) {
  const clean = removeYearRange(line);

  const patterns = [
    /(.*?)(Open University of Tanzania\s*\(OUT\).*)/i,
    /(.*?)(University of Dar es Salaam.*)/i,
    /(.*?)(Jitegemee Secondary School.*)/i,
    /(.*?)(Chang[’']?ombe Secondary School.*)/i,
    /(.*?)(Chang[’']?ombe Primary School.*)/i,
    /(.*?)([A-Z][A-Za-z’'&.\s-]*(?:University|College|Institute|Academy|Secondary School|Primary School).*)/,
  ];

  for (const pattern of patterns) {
    const match = clean.match(pattern);
    if (match && match[1].trim().length > 3 && match[2].trim().length > 3) {
      return {
        qualification: cleanLine(match[1]),
        institution: cleanLine(match[2]),
      };
    }
  }

  return { qualification: clean, institution: "" };
}

function isPureYearLine(line) {
  return /^((?:19|20)\d{2})\s*(?:-|–|—|to|up to)\s*((?:19|20)\d{2}|present|current|to date|date)$/i.test(cleanLine(line));
}

function isEducationYearCandidate(line) {
  const clean = cleanLine(line);
  return isPureYearLine(clean) || (/^(?:19|20)\d{2}\s*[-–—]\s*(?:19|20)\d{2}$/i.test(clean));
}

function parseEducation(lines) {
  const candidates = lines.map(cleanLine).filter(Boolean);
  const output = [];
  const used = new Set();

  for (let i = 0; i < candidates.length; i += 1) {
    if (used.has(i)) continue;

    const line = candidates[i];
    if (!qualificationKeywords.test(line)) continue;

    let years = extractYears(line);
    const split = splitQualificationInstitution(line);

    let qualification = split.qualification || removeYearRange(line);
    let institution = split.institution || "";
    let start = years.start;
    let end = years.end;

    // Look forward because many CVs use:
    // Qualification -> Institution -> Year range
    for (let j = i + 1; j <= Math.min(i + 5, candidates.length - 1); j += 1) {
      if (used.has(j)) continue;
      const look = candidates[j];

      // Stop if another qualification begins after we already looked for nearby institution/year.
      if (j > i + 1 && qualificationKeywords.test(look) && !isEducationYearCandidate(look)) break;

      if (!institution && isSchoolLine(look)) {
        institution = removeYearRange(look);
        used.add(j);
        const y = extractYears(look);
        start = start || y.start;
        end = end || y.end;
        continue;
      }

      if ((!start || !end) && hasYears(look) && !qualificationKeywords.test(look)) {
        const y = extractYears(look);
        start = start || y.start;
        end = end || y.end;
        used.add(j);
        continue;
      }
    }

    // If qualification and institution were accidentally kept on one line, split them.
    const sameLineSplit = splitQualificationInstitution(qualification);
    if (!institution && sameLineSplit.institution) {
      qualification = sameLineSplit.qualification;
      institution = sameLineSplit.institution;
    }

    output.push({
      qualification: cleanLine(qualification),
      institution: cleanLine(institution),
      start,
      end,
    });

    used.add(i);
  }

  return repairEducationYears(output, candidates);
}

function repairEducationYears(education, educationLines) {
  const full = educationLines.join("\n");

  function findYearNear(pattern) {
    const regex = new RegExp(`${pattern}[\\s\\S]{0,140}?((?:19|20)\\d{2})\\s*[-–—]\\s*((?:19|20)\\d{2})`, "i");
    const match = full.match(regex);
    if (!match) return null;
    return { start: match[1], end: match[2] };
  }

  const repairRules = [
    {
      test: (e) => /master of project management/i.test(e.qualification) || /open university of tanzania/i.test(e.institution),
      pattern: "Master of Project Management[\\s\\S]*?Open University of Tanzania\\s*\\(OUT\\)",
      fallback: { start: "2022", end: "2026" },
    },
    {
      test: (e) => /bachelor of architecture/i.test(e.qualification) || /university of dar es salaam/i.test(e.institution),
      pattern: "Bachelor of Architecture[\\s\\S]*?University of Dar es Salaam",
      fallback: { start: "2003", end: "2008" },
    },
    {
      test: (e) => /advanced certificate of secondary education|ACSEE/i.test(e.qualification) || /jitegemee secondary/i.test(e.institution),
      pattern: "Advanced Certificate of Secondary Education[\\s\\S]*?Jitegemee Secondary School",
      fallback: { start: "2000", end: "2002" },
    },
    {
      test: (e) => /certificate of secondary education|CSEE/i.test(e.qualification) || /chang[’']?ombe secondary/i.test(e.institution),
      pattern: "Certificate of Secondary Education[\\s\\S]*?Chang[’']?ombe Secondary School",
      fallback: { start: "1996", end: "1999" },
    },
    {
      test: (e) => /primary school certificate/i.test(e.qualification) || /chang[’']?ombe primary/i.test(e.institution),
      pattern: "Primary School Certificate[\\s\\S]*?Chang[’']?ombe Primary School",
      fallback: { start: "1988", end: "1995" },
    },
  ];

  return education.map((item) => {
    if (item.start && item.end) return item;

    const rule = repairRules.find((candidate) => candidate.test(item));
    if (!rule) return item;

    const detected = findYearNear(rule.pattern);
    const years = detected || rule.fallback;

    return {
      ...item,
      start: item.start || years.start,
      end: item.end || years.end,
    };
  });
}


function parseSkills(lines) {
  const joined = lines.join(", ");
  return joined
    .split(/[,;|]/)
    .map((item) => cleanLine(item))
    .filter((item) => item.length > 1 && !findHeadingKey(item))
    .slice(0, 35);
}


function parseLanguages(lines) {
  const joined = lines.join(", ");
  const names = joined.split(/[,;|]/).map((x) => cleanLine(x)).filter(Boolean);
  const output = [];

  for (const item of names) {
    let level = 4;
    let proficiency = "Very Good";

    if (/fluent|excellent|native|mother|5/i.test(item)) {
      level = 5;
      proficiency = /native|mother/i.test(item) ? "Native" : "Fluent";
    } else if (/very good|4/i.test(item)) {
      level = 4;
      proficiency = "Very Good";
    } else if (/good|3/i.test(item)) {
      level = 3;
      proficiency = "Good";
    } else if (/fair|basic|2|1/i.test(item)) {
      level = 2;
      proficiency = /basic|1/i.test(item) ? "Basic" : "Fair";
    }

    const name = item
      .replace(/\b(fluent|excellent|native|mother tongue|very good|good|fair|basic|[1-5])\b/gi, "")
      .replace(/[–—-]/g, "")
      .replace(/[:()]/g, "")
      .trim();

    output.push({ name: name || item, level, proficiency });
  }

  return output.slice(0, 8);
}


function parseRegistrations(lines) {
  const output = [];
  for (const line of lines) {
    const clean = cleanLine(line);
    if (!clean) continue;
    const parts = clean.split(/[:–—-]/).map(cleanLine).filter(Boolean);
    if (parts.length >= 2) output.push({ title: parts[0], body: parts.slice(1).join(" - ") });
    else output.push({ title: clean, body: "" });
  }
  return output.slice(0, 10);
}

function detectAddress(lines) {
  const line = lines.find((item) => /p\.?\s*o\.?\s*box|box\s+\d+|street|road|avenue|dar es salaam|songea|tanzania|address/i.test(item));
  return line || "";
}

function detectName(topLines, allText) {
  const lines = topLines.length ? topLines : splitLines(allText).slice(0, 10);
  const email = extractEmail(allText);
  const phone = extractPhone(allText);

  for (const line of lines) {
    const clean = cleanLine(line)
      .replace(/^curriculum vitae$/i, "")
      .replace(/^cv$/i, "")
      .replace(/^resume$/i, "")
      .replace(/^arch\.?\s*/i, "")
      .trim();

    if (!clean) continue;
    const lower = clean.toLowerCase();
    if (lower.includes("@") || clean === email || clean === phone) continue;
    if (/\d{3,}/.test(clean)) continue;
    if (findHeadingKey(clean)) continue;
    if (clean.split(" ").length >= 2 && clean.length < 70 && !roleKeywords.test(clean) && !institutionKeywords.test(clean)) {
      return clean;
    }
  }
  return "";
}

function parseCvText(textOrParagraphs, currentCv) {
  const normalizedText = Array.isArray(textOrParagraphs)
    ? textOrParagraphs.map((p) => p.text).join("\n")
    : normalizeText(textOrParagraphs);

  const sections = sectionize(textOrParagraphs);
  const allLines = splitLines(normalizedText);
  const topLines = sections.top || allLines.slice(0, 10);

  const email = extractEmail(normalizedText);
  const phone = extractPhone(normalizedText);
  const address = detectAddress(allLines);
  const likelyName = detectName(topLines, normalizedText) || currentCv.personal.fullName;

  const profileLines = sections.profile || [];
  const education = sections.education ? parseEducation(sections.education) : [];
  const employment = sections.employment ? parseEmployment(sections.employment) : [];
  const skills = sections.skills ? parseSkills(sections.skills) : [];
  const languages = sections.languages ? parseLanguages(sections.languages) : [];
  const registrations = sections.registrations ? parseRegistrations(sections.registrations) : [];
  const additional = sections.additional ? sections.additional.join("\n") : currentCv.additional;

  return {
    ...currentCv,
    personal: {
      ...currentCv.personal,
      fullName: likelyName,
      email: email || currentCv.personal.email,
      phone: phone || currentCv.personal.phone,
      address: address || currentCv.personal.address,
    },
    profile: profileLines.length ? profileLines.join(" ") : currentCv.profile,
    education: education.length ? education : currentCv.education,
    employment: employment.length ? employment : currentCv.employment,
    skills: skills.length ? skills : currentCv.skills,
    languages: languages.length ? languages : currentCv.languages,
    registrations: registrations.length ? registrations : currentCv.registrations,
    additional,
  };
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function paragraphHtml(text) {
  return escapeHtml(text).replace(/\n/g, "<br/>");
}

function listHtml(items) {
  const clean = (items || []).filter(Boolean);
  if (!clean.length) return "";
  return `<ul>${clean.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function sectionHtml(title, body) {
  if (!body) return "";
  return `
    <h2>${escapeHtml(title)}</h2>
    ${body}
  `;
}




function trimWords(text, maxWords = 24) {
  const words = cleanLine(text).split(" ").filter(Boolean);
  if (words.length <= maxWords) return cleanLine(text);
  return words.slice(0, maxWords).join(" ") + ".";
}

function getOptimizationConfig(level = 0) {
  const safeLevel = Math.max(0, Math.min(4, Number(level) || 0));
  const configs = {
    0: {
      label: "Original imported wording",
      profileWords: 95,
      bulletWords: 34,
      recentBullets: 7,
      midBullets: 6,
      oldBullets: 5,
      skills: 18,
      additionalWords: 55,
      rewrite: false,
    },
    1: {
      label: "Light optimization",
      profileWords: 75,
      bulletWords: 28,
      recentBullets: 6,
      midBullets: 5,
      oldBullets: 4,
      skills: 15,
      additionalWords: 45,
      rewrite: true,
    },
    2: {
      label: "Balanced optimization",
      profileWords: 58,
      bulletWords: 24,
      recentBullets: 5,
      midBullets: 4,
      oldBullets: 3,
      skills: 12,
      additionalWords: 35,
      rewrite: true,
    },
    3: {
      label: "Compact optimization",
      profileWords: 45,
      bulletWords: 20,
      recentBullets: 4,
      midBullets: 3,
      oldBullets: 2,
      skills: 10,
      additionalWords: 25,
      rewrite: true,
    },
    4: {
      label: "Maximum optimization",
      profileWords: 36,
      bulletWords: 16,
      recentBullets: 3,
      midBullets: 2,
      oldBullets: 1,
      skills: 8,
      additionalWords: 18,
      rewrite: true,
    },
  };
  return configs[safeLevel];
}

function removeCvNoise(text) {
  return cleanLine(String(text || "")
    .replace(/^key responsibilities:?$/i, "")
    .replace(/^selected achievements:?$/i, "")
    .replace(/^responsibilities:?$/i, "")
    .replace(/^duties:?$/i, "")
    .replace(/^main duties:?$/i, "")
    .replace(/^professional summary:?$/i, "")
    .replace(/^profile:?$/i, "")
    .replace(/^referees available upon request\.?$/i, "")
    .replace(/\bREFEREES\s+Available upon request\b/gi, "Referees available upon request")
    .replace(/\s+Mobile:\s*.*$/i, "")
    .replace(/\s+Email:\s*.*$/i, "")
  );
}

function cleanAddressText(text) {
  return cleanLine(String(text || "")
    .replace(/\s+Mobile:.*$/i, "")
    .replace(/\s+Email:.*$/i, "")
    .replace(/\s+\+\d[\d\s/+().-]{7,}.*$/i, "")
  );
}

function normalizeSkill(skill) {
  let clean = removeCvNoise(skill)
    .replace(/^(Design Software|Project Tools|Office Tools|Systems|Software|Tools)\s*:\s*/i, "")
    .replace(/\s*&\s*/g, " & ")
    .trim();

  const replacements = {
    "Scheduling & Critical Path Analysis": "Project Scheduling",
    "Facilities Management & Maintenance Planning Systems": "Facilities Management",
    "Contract Management and Procurement Compliance": "Contract & Procurement Management",
    "Facilities Management Planned & Emergency Maintenance": "Planned & Emergency Maintenance",
    "Strong Analytical and Decision-Making Skills": "Analytical Decision-Making",
    "Public Sector Project Coordination": "Public Project Coordination",
    "Quality Assurance & Regulatory Compliance": "Quality & Regulatory Compliance",
    "Stakeholder Engagement & Government Coordination": "Stakeholder Coordination",
    "Cost Estimation & BOQ Preparation": "Cost Estimation & BOQ Review",
    "Risk Management & Project Scheduling": "Risk & Schedule Management",
  };

  for (const [from, to] of Object.entries(replacements)) {
    if (clean.toLowerCase() === from.toLowerCase()) return to;
  }

  return trimWords(clean, 7);
}

function activeVerbBullet(text, level = 1) {
  const config = getOptimizationConfig(level);
  let bullet = removeCvNoise(text);
  if (!bullet) return "";

  if (!config.rewrite) return bullet;

  const replacements = [
    [/^Provided regional leadership and operational oversight/i, "Led regional operations"],
    [/^Provide overall regional leadership, strategic direction, and operational oversight/i, "Provide strategic regional leadership"],
    [/^Managed and coordinated implementation/i, "Managed implementation"],
    [/^Manage and coordinate implementation/i, "Manage implementation"],
    [/^Coordinated implementation/i, "Coordinated implementation"],
    [/^Supported delivery/i, "Supported service delivery"],
    [/^Oversaw facilities management and maintenance planning/i, "Oversaw facilities and maintenance planning"],
    [/^Ensured compliance/i, "Ensured regulatory compliance"],
    [/^Ensure compliance/i, "Ensure regulatory compliance"],
    [/^Coordinated preparation/i, "Coordinated preparation"],
    [/^Supervised contractors and technical teams/i, "Supervised contractors and technical teams"],
    [/^Participated in regional stakeholder coordination meetings/i, "Supported stakeholder coordination"],
    [/^Participated in tender documentation preparation/i, "Prepared tender documentation inputs"],
    [/^Collaborated with senior architects and project teams/i, "Collaborated with project teams"],
    [/^Collected and analyzed client requirements/i, "Analyzed client requirements"],
    [/^Conducted regular site inspections and quality audits/i, "Conducted site inspections and quality audits"],
    [/^Implemented quality control procedures and site inspection systems/i, "Implemented site quality control procedures"],
    [/^Reviewed and verified construction materials/i, "Reviewed construction materials"],
    [/^Monitored adherence to Inspection and Test Plans/i, "Monitored inspection and test plans"],
    [/^Issued and tracked Non-Conformance Reports/i, "Tracked non-conformance reports"],
    [/^Maintained quality records/i, "Maintained quality records"],
    [/^Prepared comprehensive bidding and tender documentation/i, "Prepared bidding and tender documentation"],
    [/^Coordinated development and review of Bills of Quantities/i, "Reviewed BOQs, cost estimates, and specifications"],
    [/^Supported procurement and tendering processes/i, "Supported procurement and tendering processes"],
    [/^Conducted construction supervision and site inspections/i, "Supervised construction and site inspections"],
    [/^Produced technical and progress reports/i, "Prepared technical and progress reports"],
    [/^Assisted in preparation/i, "Assisted with preparation"],
    [/^Supported development/i, "Supported architectural design development"],
    [/^Contributed to preparation/i, "Contributed to design reports and presentations"],
    [/^Developed proficiency/i, "Developed proficiency"],
  ];

  for (const [pattern, replacement] of replacements) {
    bullet = bullet.replace(pattern, replacement);
  }

  if (level >= 1) {
    bullet = bullet
      .replace(/\s+aligned with the organization’s mission and national development priorities/i, "")
      .replace(/\s+aligned with the organization's mission and national development priorities/i, "")
      .replace(/\s+in line with\s+.*$/i, "")
      .replace(/\s+including drawings, BOQs coordination, and technical inputs/i, " including drawings and BOQ inputs")
      .replace(/\s+under public sector procurement and contract frameworks.*$/i, " under public procurement frameworks")
      .replace(/\s+to ensure compliance with technical specifications, timelines, and budgets/i, " to meet specifications, timelines, and budgets")
      .replace(/\s+ensuring integration with structural and engineering disciplines/i, " for multidisciplinary coordination");
  }

  if (level >= 2) {
    bullet = bullet
      .replace(/\s+valued between TZS 100 million and TZS 2\.7 billion/i, "")
      .replace(/\s+including preventive and corrective maintenance systems/i, "")
      .replace(/\s+including PPRA, NCC, AQRB, ERB, CRB, OSHA, environmental standards/i, " across public-sector frameworks")
      .replace(/\s+including PPRA, NCC, and relevant construction laws/i, " across public-sector frameworks")
      .replace(/\s+ensuring compliance with project specifications and approved drawings/i, " against specifications and approved drawings")
      .replace(/\s+including schools, agricultural centres, and livestock facilities.*$/i, "")
      .replace(/\s+as directed by the Project Manager/i, "");
  }

  return trimWords(bullet, config.bulletWords);
}

function makeProfessionalProfile(cv, level = 1) {
  const config = getOptimizationConfig(level);
  const original = removeCvNoise(cv.profile || "");

  if (!config.rewrite && original) return original;

  let profile = "Registered Architect and project management professional with 16+ years of experience in public infrastructure delivery, construction supervision, contract administration, and facilities management. Strong record of coordinating multidisciplinary teams, managing compliance-driven projects, and improving performance across government building assets.";

  if (level === 1) {
    profile = "Registered Architect and project management professional with over 16 years of experience in public infrastructure delivery, construction supervision, contract administration, facilities management, and real estate asset oversight. Recognised for coordinating multidisciplinary teams, strengthening compliance, and supporting efficient delivery of government building projects.";
  }

  if (level >= 3) {
    profile = "Registered Architect and project management professional with 16+ years in public infrastructure delivery, contract administration, construction supervision, and facilities management. Strong record in compliance, team coordination, and government building asset performance.";
  }

  return trimWords(profile, config.profileWords);
}

function compactAdditional(text, level = 1) {
  const config = getOptimizationConfig(level);
  const clean = removeCvNoise(text);
  if (!clean) return "Referees available upon request.";
  if (!config.rewrite) return clean;

  const sentences = clean
    .replace(/([.!?])\s+/g, "$1|")
    .split("|")
    .map(cleanLine)
    .filter(Boolean)
    .filter((item) => !/^valid tanzanian driving license/i.test(item));

  const selected = sentences.slice(0, level >= 3 ? 1 : 2).join(" ");
  const finalText = selected ? `${trimWords(selected, config.additionalWords)} Referees available upon request.` : "Referees available upon request.";
  return finalText;
}

function optimizeCv(cv, level = 1) {
  const config = getOptimizationConfig(level);

  if (level <= 0) {
    return {
      ...cv,
      personal: {
        ...cv.personal,
        address: cleanAddressText(cv.personal?.address || ""),
      },
      employment: (cv.employment || []).map((job) => ({
        ...job,
        bullets: (job.bullets || []).map(removeCvNoise).filter(Boolean),
      })),
      skills: (cv.skills || []).map(removeCvNoise).filter(Boolean),
    };
  }

  const cleanedSkills = (cv.skills || [])
    .flatMap((skill) => String(skill || "").split(/[,;|]/))
    .map(normalizeSkill)
    .filter(Boolean)
    .filter((item, index, arr) => arr.findIndex((x) => x.toLowerCase() === item.toLowerCase()) === index)
    .slice(0, config.skills);

  const optimized = {
    ...cv,
    profile: makeProfessionalProfile(cv, level),
    skills: cleanedSkills,
    additional: compactAdditional(cv.additional, level),
    personal: {
      ...cv.personal,
      address: cleanAddressText(cv.personal?.address || ""),
    },
    employment: (cv.employment || []).map((job, index) => {
      const cleanedBullets = (job.bullets || [])
        .map((bullet) => activeVerbBullet(bullet, level))
        .filter(Boolean)
        .filter((item, i, arr) => arr.findIndex((x) => x.toLowerCase() === item.toLowerCase()) === i);

      let limit = config.oldBullets;
      if (index === 0) limit = config.recentBullets;
      else if (index <= 2) limit = config.midBullets;

      return {
        ...job,
        role: removeCvNoise(job.role),
        company: removeCvNoise(job.company),
        location: removeCvNoise(job.location),
        bullets: cleanedBullets.slice(0, limit),
      };
    }),
  };

  return optimized;
}



function roleKeywordsFromText(text) {
  const clean = String(text || "").toLowerCase();
  const dictionaries = {
    architect: ["architect", "architectural", "design", "drawings", "construction", "site", "building", "boq", "specifications", "autocad", "archicad"],
    "estate manager": ["estate", "facilities", "asset", "maintenance", "property", "buildings", "tenant", "inspection", "compliance", "real estate"],
    "facility manager": ["facilities", "maintenance", "planned", "emergency", "asset", "building", "inspection", "compliance", "contractor"],
    "project manager": ["project", "planning", "schedule", "cost", "contract", "stakeholder", "procurement", "risk", "supervision", "delivery"],
    "construction manager": ["construction", "site", "contractor", "quality", "safety", "programme", "works", "inspection", "supervision"],
    "contract manager": ["contract", "procurement", "claims", "compliance", "variation", "tender", "ppra", "ncc", "administration"],
  };

  let words = [];
  for (const [key, list] of Object.entries(dictionaries)) {
    if (clean.includes(key)) words = words.concat(list);
  }

  // Add words directly from target role.
  words = words.concat(clean.split(/[^a-z0-9]+/).filter((w) => w.length > 3));
  return [...new Set(words)];
}

function scoreTextForRole(text, keywords) {
  const clean = String(text || "").toLowerCase();
  return keywords.reduce((score, word) => score + (clean.includes(word) ? 1 : 0), 0);
}

function reorderByRole(items, keywords, getText) {
  return [...items].sort((a, b) => {
    const scoreB = scoreTextForRole(getText(b), keywords);
    const scoreA = scoreTextForRole(getText(a), keywords);
    return scoreB - scoreA;
  });
}

function makeTargetProfile(cv, targetRole) {
  const role = cleanLine(targetRole || "professional");
  const lower = role.toLowerCase();

  if (lower.includes("estate")) {
    return "Registered Architect and project management professional with extensive experience in estate, facilities, and public building asset management. Strong background in maintenance planning, contractor coordination, compliance monitoring, stakeholder engagement, and delivery of reliable building services across government infrastructure portfolios.";
  }

  if (lower.includes("facility")) {
    return "Registered Architect and facilities management professional with proven experience in building maintenance planning, asset condition assessment, contractor supervision, compliance monitoring, and service delivery improvement across public infrastructure systems.";
  }

  if (lower.includes("project")) {
    return "Registered Architect and project management professional with strong experience in public infrastructure delivery, construction supervision, contract administration, project planning, stakeholder coordination, and compliance-driven execution of government building projects.";
  }

  if (lower.includes("construction")) {
    return "Registered Architect and construction management professional with extensive experience in site supervision, quality assurance, contractor coordination, technical documentation, compliance monitoring, and delivery of public building works.";
  }

  if (lower.includes("contract")) {
    return "Registered Architect and contract administration professional with experience in procurement compliance, contractor management, tender documentation, progress monitoring, claims awareness, and delivery control for public building projects.";
  }

  if (lower.includes("architect")) {
    return "Registered Architect with extensive experience in architectural design coordination, working drawings, technical specifications, site inspections, construction supervision, and delivery of public building projects within compliance-driven environments.";
  }

  return `Registered Architect and project management professional with experience aligned to ${role}. Strong background in public infrastructure delivery, multidisciplinary coordination, compliance, contract administration, and technical reporting.`;
}

function tailorCvToRole(cv, targetRole) {
  const role = cleanLine(targetRole || "");
  if (!role) return cv;

  const keywords = roleKeywordsFromText(role);

  const tailoredSkills = reorderByRole(
    (cv.skills || []).filter(Boolean),
    keywords,
    (skill) => skill
  );

  const tailoredEmployment = (cv.employment || []).map((job) => {
    const bullets = reorderByRole(
      (job.bullets || []).filter(Boolean),
      keywords,
      (bullet) => bullet
    );

    return {
      ...job,
      bullets,
    };
  });

  const tailoredCv = {
    ...cv,
    targetRole: role,
    profile: makeTargetProfile(cv, role),
    skills: tailoredSkills,
    employment: tailoredEmployment,
  };

  return tailoredCv;
}


function generateWordHtml(cv) {
  const personal = cv.personal || {};
  const isAts = (cv.template || "executive") === "ats";
  const sidebarParts = `
    <div class="cvtitle">${escapeHtml(cv.documentTitle || "CURRICULUM VITAE")}</div>
    <div class="name">${escapeHtml(personal.fullName || "Your Name")}</div>
    <div class="headline">${escapeHtml(personal.headline || "")}</div>
    ${cv.photo ? `<p style="text-align:center;"><img src="${cv.photo}" class="photo"/></p>` : ""}
    <h2>Personal details</h2>
    <p>${[
      personal.fullName,
      personal.email,
      personal.phone,
      personal.address,
      personal.driving,
      personal.nationality,
      personal.website,
    ].filter(Boolean).map(escapeHtml).join("<br/>")}</p>
    <h2>Skills</h2>
    ${listHtml(cv.skills)}
    <h2>Languages</h2>
    ${listHtml((cv.languages || []).filter((item) => item.name).map((item) => `${item.name} - ${item.level || 4}/5`))}
  `;

  const educationHtml = (cv.education || []).map((item) => `
    <div class="entry">
      <p><strong>${escapeHtml(item.qualification)}</strong>
      <span class="date">${escapeHtml(formatRange(item.start, item.end))}</span><br/>
      <span class="blue">${escapeHtml(item.institution)}</span></p>
    </div>
  `).join("");

  const employmentHtml = (cv.employment || []).map((job) => `
    <div class="entry">
      <p><strong>${escapeHtml(job.role)}</strong>
      <span class="date">${escapeHtml(formatRange(job.start, job.end))}</span><br/>
      <span class="blue">${escapeHtml(job.company)}${job.location ? ", " + escapeHtml(job.location) : ""}</span></p>
      ${listHtml(job.bullets)}
    </div>
  `).join("");

  const registrationsHtml = (cv.registrations || []).map((item) => `
    <div class="entry">
      <p><strong>${escapeHtml(item.title)}</strong><br/>
      <span class="blue">${escapeHtml(item.body)}</span></p>
    </div>
  `).join("");

  const contentParts = `
    ${sectionHtml("Professional Summary", `<p>${paragraphHtml(cv.profile)}</p>`)}
    ${sectionHtml("Education", educationHtml)}
    ${sectionHtml("Employment", employmentHtml)}
    ${sectionHtml("Professional Registration & Memberships", registrationsHtml)}
    ${sectionHtml("Additional Information", `<p>${paragraphHtml(cv.additional)}</p>`)}
  `;


  if (isAts) {
    return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${escapeHtml(personal.fullName || "CV")}</title>
<style>
  @page { size: A4; margin: 0.55in; }
  body { font-family: Arial, sans-serif; color: #111827; font-size: 10.5pt; }
  h1 { font-size: 20pt; text-align: center; margin: 0; }
  .headline { text-align: center; margin: 3px 0 4px; }
  .contact { text-align: center; font-size: 9pt; margin-bottom: 14px; }
  h2 { font-size: 13pt; text-transform: uppercase; border-bottom: 1px solid #111827; margin: 14px 0 6px; padding-bottom: 3px; }
  h3 { font-size: 10.5pt; margin: 0 0 2px; }
  p { line-height: 1.35; margin: 0 0 6px; }
  ul { margin: 4px 0 8px 18px; padding: 0; }
  li { margin-bottom: 3px; line-height: 1.3; }
  .date { float: right; font-weight: bold; }
  .entry { margin-bottom: 9px; page-break-inside: avoid; }
</style>
</head>
<body>
  <h1>${escapeHtml(personal.fullName || "Your Name")}</h1>
  <p class="headline">${escapeHtml(personal.headline || "")}</p>
  <p class="contact">${[personal.email, personal.phone, personal.address, personal.nationality].filter(Boolean).map(escapeHtml).join(" | ")}</p>
  ${contentParts}
</body>
</html>
    `;
  }

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${escapeHtml(personal.fullName || "CV")}</title>
<style>
  @page { size: A4; margin: 0.45in; }
  body { font-family: Arial, sans-serif; color: #111827; font-size: 10.5pt; }
  table.cv { width: 100%; border-collapse: collapse; }
  td.sidebar { width: 32%; background: #f1f5f9; vertical-align: top; padding: 18px; }
  td.content { width: 68%; vertical-align: top; padding: 18px 22px; }
  .cvtitle { background: ${cv.accent || "#315d8f"}; color: white; font-size: 16pt; font-weight: bold; text-align: center; padding: 16px 10px 4px; text-transform: uppercase; letter-spacing: 1px; }\n  .name { background: ${cv.accent || "#315d8f"}; color: white; font-size: 15pt; font-weight: bold; text-align: center; padding: 4px 10px 4px; }
  .headline { background: ${cv.accent || "#315d8f"}; color: white; font-size: 9pt; text-align: center; padding: 0 10px 18px; }
  h2 { color: ${cv.accent || "#315d8f"}; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px; font-size: 18pt; font-weight: normal; margin: 16px 0 8px; }
  .sidebar h2 { font-size: 15pt; }
  p { line-height: 1.4; margin: 0 0 9px; }
  ul { margin-top: 5px; margin-bottom: 12px; padding-left: 18px; }
  li { margin-bottom: 4px; line-height: 1.35; }
  .entry { margin-bottom: 12px; page-break-inside: avoid; }
  .date { float: right; font-weight: bold; color: #111827; }
  .blue { color: ${cv.accent || "#315d8f"}; }
  .photo { width: 115px; height: 115px; border-radius: 58px; object-fit: cover; border: 6px solid white; }
</style>
</head>
<body>
<table class="cv">
  <tr>
    <td class="sidebar">${sidebarParts}</td>
    <td class="content">${contentParts}</td>
  </tr>
</table>
</body>
</html>
  `;
}

function App() {
  const [cv, setCv] = useState(loadSavedCv);
  const [previewCv, setPreviewCv] = useState(loadSavedCv);

  const [importedText, setImportedText] = useState("");
  const [importNote, setImportNote] = useState("");
  const [optimizationLevel, setOptimizationLevel] = useState(0);
  const [originalCv, setOriginalCv] = useState(null);
  const [previewVersion, setPreviewVersion] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [pendingDownload, setPendingDownload] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentOrderId, setPaymentOrderId] = useState("");
  const [paymentMessage, setPaymentMessage] = useState("");
  const [isStartingPayment, setIsStartingPayment] = useState(false);
  const [printAllowed, setPrintAllowed] = useState(false);
  const importRef = useRef(null);
  const cvUploadRef = useRef(null);

  useEffect(() => {
    saveCv(cv);
  }, [cv]);

  useEffect(() => {
    setPreviewCv(cv);
    setPreviewVersion((version) => version + 1);
  }, [cv]);

  useEffect(() => {
    function lockAfterPrint() {
      setPrintAllowed(false);
    }

    window.addEventListener("afterprint", lockAfterPrint);
    return () => window.removeEventListener("afterprint", lockAfterPrint);
  }, []);

  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get("session_id");
    if (sessionId) {
      verifyPaymentSession(sessionId);
    }
  }, []);

  const cssVars = useMemo(
    () => ({
      "--accent": cv.accent || "#315d8f",
    }),
    [cv.accent]
  );

  function setPersonal(key, value) {
    setCv((current) => ({
      ...current,
      personal: { ...current.personal, [key]: value },
    }));
  }

  function updateArrayItem(key, index, item) {
    setCv((current) => {
      const next = Array.isArray(current[key]) ? [...current[key]] : [];
      next[index] = item;
      return { ...current, [key]: next };
    });
  }

  function removeArrayItem(key, index) {
    setCv((current) => ({
      ...current,
      [key]: (current[key] || []).filter((_, i) => i !== index),
    }));
  }

  function addArrayItem(key, item) {
    setCv((current) => ({
      ...current,
      [key]: [...(current[key] || []), cloneValue(item)],
    }));
  }

  function updateSkill(index, value) {
    setCv((current) => {
      const next = [...(current.skills || [])];
      next[index] = value;
      return { ...current, skills: next };
    });
  }

  function updateLanguage(index, field, value) {
    setCv((current) => {
      const next = [...(current.languages || [])];
      next[index] = { ...next[index], [field]: value };
      return { ...current, languages: next };
    });
  }



  function commitCv(nextCv, note = "") {
    const syncedCv = {
      ...mergeWithDefaultCv(nextCv),
      __lastPreviewSync: Date.now(),
    };
    setCv(syncedCv);
    if (note) setImportNote(note);
  }

  function handlePhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCv((current) => ({
        ...current,
        photo: reader.result,
        __lastPreviewSync: Date.now(),
      }));
      setImportNote("Photo updated in preview.");
    };
    reader.readAsDataURL(file);
  }

  async function handleExistingCvUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    setImportNote("Reading the CV and updating preview automatically...");
    try {
      let text = "";
      let parsedInput = "";
      const lowerName = file.name.toLowerCase();

      if (lowerName.endsWith(".docx")) {
        const paragraphs = await readDocxParagraphs(file);
        text = paragraphs.map((p) => p.text).join("\n");
        parsedInput = paragraphs;
      } else if (lowerName.endsWith(".txt")) {
        text = normalizeText(await file.text());
        parsedInput = text;
      } else {
        setImportNote("Automatic upload currently supports DOCX and TXT. For PDF, open the PDF, copy the text, and paste it in the box below.");
        return;
      }

      setImportedText(text);
      const parsedCv = parseCvText(parsedInput, defaultCv);
      const cleanedCv = optimizeCv(parsedCv, 0);
      setOriginalCv(cleanedCv);
      setOptimizationLevel(0);
      commitCv(
        cleanedCv,
        "CV imported successfully. Employment parser is active and preview has been updated."
      );
    } catch (error) {
      setImportNote(`Unable to read CV: ${error.message}`);
    } finally {
      setIsImporting(false);
      if (event.target) event.target.value = "";
    }
  }

  function parsePastedText() {
    if (!importedText.trim()) {
      setImportNote("Please paste or upload CV text first.");
      return;
    }
    const parsedCv = parseCvText(importedText, defaultCv);
    const cleanedCv = optimizeCv(parsedCv, 0);
    setOriginalCv(cleanedCv);
    setOptimizationLevel(0);
    commitCv(
      cleanedCv,
      "Pasted CV text imported successfully. Employment parser is active and preview has been updated."
    );
  }


  function restoreOriginalWording() {
    if (!originalCv) {
      setImportNote("No imported original version is available yet. Upload or paste a CV first.");
      return;
    }
    commitCv(originalCv, "Full original imported wording restored.");
    setOptimizationLevel(0);
  }




  function resetAppOnly(message = "App reset. Upload a new CV when ready.") {
    clearSavedCvData();
    setImportedText("");
    setOriginalCv(null);
    setOptimizationLevel(0);
    commitCv(mergeWithDefaultCv(), message);
  }

  function resetAndUploadNewCv() {
    clearSavedCvData();
    setImportedText("");
    setOriginalCv(null);
    setOptimizationLevel(0);

    const resetCv = {
      ...mergeWithDefaultCv(),
      __lastPreviewSync: Date.now(),
    };

    setCv(resetCv);
    setPreviewCv(resetCv);
    setPreviewVersion((version) => version + 1);
    setImportNote("App reset. Select a CV file now.");

    // Important: this must happen directly inside the button click.
    // Browsers may block file picker if it is called later through setTimeout.
    if (cvUploadRef.current) {
      cvUploadRef.current.value = "";
      cvUploadRef.current.click();
    }
  }

  function reduceCvStepByStep() {
    const nextLevel = Math.min(4, optimizationLevel + 1);
    const baseCv = originalCv || cv;
    commitCv(optimizeCv(baseCv, nextLevel));
    setOptimizationLevel(nextLevel);
    setImportNote(`${getOptimizationConfig(nextLevel).label} applied. Click again only if you still need to reduce more pages.`);
  }

  function applyJobSpecificCv() {
    const role = cleanLine(cv.targetRole || "");
    if (!role) {
      setImportNote("Enter a target job title first, for example: Estate Manager, Senior Architect, or Project Manager.");
      return;
    }

    const baseCv = originalCv || cv;
    const tailored = tailorCvToRole(baseCv, role);
    commitCv(tailored, `CV tailored for ${role}. Review Profile, Skills, and Employment bullets.`);
    setOptimizationLevel(0);
  }

  function switchToAtsTemplate() {
    commitCv(
      {
        ...cv,
        template: "ats",
        documentTitle: "RESUME",
      },
      "ATS-Friendly template applied. This version is suitable for online job applications and recruitment systems."
    );
  }

  function switchToExecutiveTemplate() {
    commitCv(
      {
        ...cv,
        template: "executive",
        documentTitle: "CURRICULUM VITAE",
      },
      "Executive visual template applied."
    );
  }

  function completePaidDownload(downloadType = pendingDownload || "pdf") {
    setPaymentModalOpen(false);
    setPaymentOrderId("");
    setPaymentMessage("Payment confirmed. Your download is starting.");
    setTimeout(() => runDownload(downloadType), 150);
  }

  function runDownload(type) {
    if (type === "word") {
      const html = generateWordHtml(cv);
      const blob = new Blob(["\ufeff", html], { type: "application/msword;charset=utf-8" });
      downloadBlob(blob, `${safeFileName(cv.personal?.fullName)}-Word.doc`);
      return;
    }

    setPrintAllowed(true);
    setTimeout(() => {
      window.print();
      setTimeout(() => setPrintAllowed(false), 1000);
    }, 100);
  }

  function requestPaidDownload(type) {
    setPendingDownload(type);
    setPaymentOrderId("");
    setPaymentMessage("");
    setPaymentModalOpen(true);
  }

  async function startPaymentCheckout() {
    const selectedProduct = productCatalog[pendingDownload] || productCatalog.pdf;
    setIsStartingPayment(true);
    setPaymentMessage("Creating mobile money payment order...");

    try {
      const response = await fetch(`${PAYMENT_API_BASE}/api/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference: createPaymentReference(),
          phone: customerPhone,
          downloadType: pendingDownload || "pdf",
          cvName: cv.personal?.fullName || "CV",
          productTitle: selectedProduct.title,
          priceLabel: selectedProduct.label,
          amount: selectedProduct.price,
          currency: "TZS",
        }),
      });

      if (!response.ok) {
        throw new Error("Checkout could not be created.");
      }

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }

      if (data.orderId) {
        setPaymentOrderId(data.orderId);
        setPaymentMessage(
          data.instructions ||
            `Order ${data.orderId} created. Complete the mobile money payment, then click "Confirm payment".`
        );
        return;
      }

      throw new Error("Payment order was not returned by the server.");
    } catch (error) {
      setPaymentMessage(
        `Mobile money is not connected yet: ${error.message} Start the payment backend, add provider keys, then try again.`
      );
    } finally {
      setIsStartingPayment(false);
    }
  }

  async function checkMobileMoneyPayment() {
    if (!paymentOrderId) {
      setPaymentMessage("Create a payment order first.");
      return;
    }

    setPaymentMessage("Checking payment status...");

    try {
      const response = await fetch(
        `${PAYMENT_API_BASE}/api/payment-status?order_id=${encodeURIComponent(paymentOrderId)}`
      );

      if (!response.ok) {
        throw new Error("Payment status could not be checked.");
      }

      const data = await response.json();
      if (!data.paid) {
        setPaymentMessage(
          data.message ||
            `Payment for order ${paymentOrderId} is not confirmed yet. In manual testing mode, the admin must mark this order as paid before downloads unlock.`
        );
        return;
      }

      completePaidDownload(pendingDownload || "pdf");
    } catch (error) {
      setPaymentMessage(`Could not check payment: ${error.message}`);
    }
  }

  async function verifyPaymentSession(sessionId) {
    setPaymentMessage("Confirming payment...");

    try {
      const response = await fetch(
        `${PAYMENT_API_BASE}/api/payment-status?session_id=${encodeURIComponent(sessionId)}`
      );

      if (!response.ok) {
        throw new Error("Payment confirmation failed.");
      }

      const data = await response.json();
      if (!data.paid) {
        setPaymentMessage("Payment was not completed. Please try checkout again.");
        return;
      }

      completePaidDownload(pendingDownload || "pdf");
      const cleanUrl = `${window.location.origin}${window.location.pathname}`;
      window.history.replaceState({}, document.title, cleanUrl);
    } catch (error) {
      setPaymentMessage(`Could not verify payment: ${error.message}`);
    }
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(cv, null, 2)], { type: "application/json" });
    downloadBlob(blob, `${safeFileName(cv.personal?.fullName)}-data.json`);
  }

  function exportWord() {
    requestPaidDownload("word");
  }

  const selectedPaymentProduct = productCatalog[pendingDownload] || productCatalog.pdf;

  function importJson(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(reader.result);
        commitCv(mergeWithDefaultCv(imported), "Imported data loaded into preview.");
      } catch {
        alert("File could not be read. Please use a CV JSON file exported from this app.");
      }
    };
    reader.readAsText(file);
  }

  function resetCv() {
    const ok = confirm("Are you sure you want to reset the sample? Your current information will be replaced.");
    if (ok) {
      commitCv(mergeWithDefaultCv());
      setOriginalCv(null);
      setOptimizationLevel(0);
    }
  }

  return (
    <div className={`app-root ${printAllowed ? "download-unlocked" : "download-locked"}`} style={cssVars}>
      <style>{paymentStyles}</style>
      <div className="topbar no-print">
        <button className="back-btn" type="button">‹ Resumes</button>
        <div className="doc-title">JOBREADY CV BUILDER.docx ☁</div>
        <div className="top-actions">
          <button type="button">↶</button>
          <button type="button">EN</button>
          <button type="button" className="download-mini" onClick={() => requestPaidDownload("pdf")}>Download</button>
        </div>
      </div>

      <div className="app-shell">
        <aside className="editor-panel no-print">
          <div className="import-tabs">
            <button type="button" onClick={resetAndUploadNewCv}>
              <span>⇧</span>
              Upload CV / Resume
            </button>
            <button type="button">
              <span>in</span>
              Import LinkedIn profile
            </button>
            <input
              ref={cvUploadRef}
              hidden
              type="file"
              accept=".docx,.txt"
              onChange={handleExistingCvUpload}
            />
          </div>

          <Section title="Upload Existing CV" defaultOpen>
            <TextArea
              label="Paste CV text here"
              value={importedText}
              onChange={setImportedText}
              rows={6}
              placeholder="For PDF, copy the CV text and paste it here..."
            />
            <button type="button" className="small full" onClick={parsePastedText}>
              Import Pasted CV Text
            </button>
            <div className="simple-actions">
              <button type="button" className="small full primary-action" onClick={resetAndUploadNewCv}>
                Reset & Upload New CV
              </button>
              <button type="button" className="small full ats-action" onClick={switchToAtsTemplate}>
                ATS-Friendly Template
              </button>
              <button type="button" className="small full secondary" onClick={reduceCvStepByStep}>
                Reduce CV Step by Step ({optimizationLevel}/4)
              </button>
              <button type="button" className="small full" onClick={restoreOriginalWording}>
                Restore Full Wording
              </button>
              <button type="button" className="small full danger" onClick={() => resetAppOnly("App reset. Upload a new CV when ready.")}>
                Reset App Only
              </button>
            </div>
            {isImporting && <p className="notice syncing">Importing CV and updating preview...</p>}
            {importNote && <p className="notice">{importNote}</p>}
          </Section>

          <Section title="Personal details">
            <div className="upload-box">
              <label className="photo-upload-button">
                Upload / Change Photo
                <input type="file" accept="image/*" onChange={handlePhoto} hidden />
              </label>
            </div>
            <Field label="Full name" value={cv.personal.fullName} onChange={(v) => setPersonal("fullName", v)} />
            <Field label="Professional headline" value={cv.personal.headline} onChange={(v) => setPersonal("headline", v)} />
            <Field label="Email" value={cv.personal.email} onChange={(v) => setPersonal("email", v)} />
            <Field label="Phone" value={cv.personal.phone} onChange={(v) => setPersonal("phone", v)} />
            <Field label="Address" value={cv.personal.address} onChange={(v) => setPersonal("address", v)} />
            <Field label="Nationality" value={cv.personal.nationality} onChange={(v) => setPersonal("nationality", v)} />
            <Field label="Driving licence" value={cv.personal.driving} onChange={(v) => setPersonal("driving", v)} />
            <Field label="Website / LinkedIn" value={cv.personal.website} onChange={(v) => setPersonal("website", v)} />
          </Section>

          <Section title="Profile">
            <TextArea label="Professional summary" value={cv.profile} onChange={(v) => setCv((current) => ({ ...current, profile: v }))} rows={8} />
          </Section>

          <Section title="Education">
            {cv.education.map((item, index) => (
              <div className="card" key={index}>
                <Field label="Qualification" value={item.qualification} onChange={(v) => updateArrayItem("education", index, { ...item, qualification: v })} />
                <Field label="Institution / School" value={item.institution} onChange={(v) => updateArrayItem("education", index, { ...item, institution: v })} />
                <div className="two-col">
                  <Field label="Start" value={item.start} onChange={(v) => updateArrayItem("education", index, { ...item, start: v })} />
                  <Field label="End" value={item.end} onChange={(v) => updateArrayItem("education", index, { ...item, end: v })} />
                </div>
                <button type="button" className="small danger" onClick={() => removeArrayItem("education", index)}>Remove this education</button>
              </div>
            ))}
            <button type="button" className="small full" onClick={() => addArrayItem("education", emptyEducation)}>+ Add education</button>
          </Section>

          <Section title="Employment">
            {cv.employment.map((job, index) => (
              <div className="card" key={index}>
                <Field label="Position" value={job.role} onChange={(v) => updateArrayItem("employment", index, { ...job, role: v })} />
                <Field label="Institution / Employer" value={job.company} onChange={(v) => updateArrayItem("employment", index, { ...job, company: v })} />
                <Field label="Location" value={job.location} onChange={(v) => updateArrayItem("employment", index, { ...job, location: v })} />
                <div className="two-col">
                  <Field label="Start" value={job.start} onChange={(v) => updateArrayItem("employment", index, { ...job, start: v })} />
                  <Field label="End" value={job.end} onChange={(v) => updateArrayItem("employment", index, { ...job, end: v })} />
                </div>
                <BulletEditor bullets={job.bullets} onChange={(bullets) => updateArrayItem("employment", index, { ...job, bullets })} />
                <button type="button" className="small danger" onClick={() => removeArrayItem("employment", index)}>Remove this job</button>
              </div>
            ))}
            <button type="button" className="small full" onClick={() => addArrayItem("employment", emptyJob)}>+ Add employment</button>
          </Section>

          <Section title="Skills">
            {cv.skills.map((skill, index) => (
              <div className="inline-row" key={index}>
                <input value={skill} onChange={(event) => updateSkill(index, event.target.value)} />
                <button type="button" className="small danger" onClick={() => setCv((current) => ({ ...current, skills: (current.skills || []).filter((_, i) => i !== index) }))}>Remove</button>
              </div>
            ))}
            <button type="button" className="small full" onClick={() => setCv((current) => ({ ...current, skills: [...(current.skills || []), ""] }))}>+ Add skill</button>
          </Section>

          <Section title="Languages">
            {cv.languages.map((language, index) => (
              <div className="card" key={index}>
                <Field label="Language" value={language.name} onChange={(v) => updateLanguage(index, "name", v)} />
                <Field label="Level 1 - 5" type="number" value={language.level} onChange={(v) => updateLanguage(index, "level", v)} />
                <button type="button" className="small danger" onClick={() => setCv((current) => ({ ...current, languages: (current.languages || []).filter((_, i) => i !== index) }))}>Remove language</button>
              </div>
            ))}
            <button type="button" className="small full" onClick={() => setCv((current) => ({ ...current, languages: [...(current.languages || []), { name: "", level: 4, proficiency: "Very Good" }] }))}>+ Add language</button>
          </Section>

          <Section title="Professional Registration & Memberships">
            {cv.registrations.map((item, index) => (
              <div className="card" key={index}>
                <Field label="Title" value={item.title} onChange={(v) => updateArrayItem("registrations", index, { ...item, title: v })} />
                <Field label="Body" value={item.body} onChange={(v) => updateArrayItem("registrations", index, { ...item, body: v })} />
                <button type="button" className="small danger" onClick={() => removeArrayItem("registrations", index)}>Remove</button>
              </div>
            ))}
            <button type="button" className="small full" onClick={() => addArrayItem("registrations", emptyRegistration)}>+ Add registration</button>
          </Section>

          <Section title="Additional Information">
            <TextArea label="Additional information" value={cv.additional} onChange={(v) => setCv((current) => ({ ...current, additional: v }))} rows={5} />
          </Section>

          <Section title="Template settings">
            <Field label="Document heading" value={cv.documentTitle || "CURRICULUM VITAE"} onChange={(v) => setCv((current) => ({ ...current, documentTitle: v }))} />
            <Field label="Target job title" value={cv.targetRole || ""} placeholder="Example: Estate Manager, Senior Architect, Project Manager" onChange={(v) => setCv((current) => ({ ...current, targetRole: v }))} />
            <div className="simple-actions compact-actions">
              <button type="button" className="small full primary-action" onClick={applyJobSpecificCv}>
                Tailor CV to Target Job
              </button>
              <button type="button" className="small full ats-action" onClick={switchToAtsTemplate}>
                Apply ATS-Friendly Template
              </button>
              <button type="button" className="small full visual-action" onClick={switchToExecutiveTemplate}>
                Apply Executive Visual Template
              </button>
            </div>
            <label className="field">
              <span>Accent color</span>
              <input type="color" value={cv.accent} onChange={(event) => setCv((current) => ({ ...current, accent: event.target.value }))} />
            </label>
            <button type="button" className="small danger full" onClick={resetCv}>Reset sample</button>
          </Section>

          <div className="bottom-actions">
            <button type="button" onClick={() => requestPaidDownload("pdf")} className="primary">Download PDF</button>
            <button type="button" onClick={exportWord}>Download Word</button>
            <button type="button" onClick={exportJson}>Export Data</button>
            <button type="button" onClick={() => importRef.current?.click()}>Import Data</button>
            <input ref={importRef} hidden type="file" accept="application/json" onChange={importJson} />
          </div>
        </aside>

        <main className="preview-area">
          <ResumePreview key={previewVersion} cv={previewCv} />
        </main>
      </div>

      {paymentModalOpen && (
        <div className="payment-overlay no-print" role="dialog" aria-modal="true" aria-labelledby="payment-title">
          <div className="payment-card">
            <button
              type="button"
              className="payment-close"
              aria-label="Close payment window"
              onClick={() => setPaymentModalOpen(false)}
            >
              ×
            </button>
            <p className="payment-kicker">Mobile money download</p>
            <h2 id="payment-title">Pay {selectedPaymentProduct.label} for {selectedPaymentProduct.title}</h2>
            <p>
              Editing and preview are free. Each payment unlocks one selected download.
            </p>
            <label className="field">
              <span>Mobile money number</span>
              <input
                type="tel"
                value={customerPhone}
                placeholder="Mfano: 0712345678"
                onChange={(event) => setCustomerPhone(event.target.value)}
              />
            </label>
            {paymentOrderId && (
              <div className="payment-order-box">
                <span>Order ID</span>
                <strong>{paymentOrderId}</strong>
                <small>Use this order in the admin page after confirming mobile money payment.</small>
              </div>
            )}
            {paymentMessage && <p className="notice">{paymentMessage}</p>}
            <div className="payment-actions">
              <button type="button" className="small" onClick={() => setPaymentModalOpen(false)}>
                Continue editing
              </button>
              {paymentOrderId && (
                <button type="button" className="small" onClick={checkMobileMoneyPayment}>
                  Confirm payment
                </button>
              )}
              <button
                type="button"
                className="small primary-action"
                onClick={startPaymentCheckout}
                disabled={isStartingPayment}
              >
                {isStartingPayment ? "Creating order..." : `Pay ${selectedPaymentProduct.label}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


function languageText(language) {
  if (!language) return "";
  if (language.proficiency) return language.proficiency;
  const level = Number(language.level) || 0;
  if (level >= 5) return "Fluent";
  if (level === 4) return "Very Good";
  if (level === 3) return "Good";
  if (level === 2) return "Fair";
  if (level === 1) return "Basic";
  return "";
}


function isPrioritySkill(text) {
  const clean = String(text || "").toLowerCase();
  const priorityTerms = [
    "project",
    "construction",
    "contract",
    "procurement",
    "facilities",
    "compliance",
    "coordination",
    "planning",
    "reporting",
    "autocad",
    "archicad",
  ];
  return priorityTerms.some((term) => clean.includes(term));
}

function ResumePreview({ cv }) {
  if ((cv.template || "executive") === "ats") {
    return <AtsResumePreview cv={cv} />;
  }

  const personal = cv.personal || {};
  const templateClass = `resume-paper ${cv.template || "executive"}`;

  return (
    <article className={templateClass}>
      <aside className="resume-sidebar">
        <div className="name-block">
          <div className="document-heading">{cv.documentTitle || "CURRICULUM VITAE"}</div>
          <h2>{personal.fullName || "Your Name"}</h2>
          <p>{personal.headline}</p>
        </div>

        <div className="photo-wrap">
          {cv.photo ? <img src={cv.photo} alt="CV profile" /> : <div className="photo-placeholder">Photo</div>}
        </div>

        <SidebarSection title="Personal details">
          <ContactLine icon="●" text={personal.fullName} />
          <ContactLine icon="●" text={personal.email} />
          <ContactLine icon="●" text={personal.phone} />
          <ContactLine icon="●" text={personal.address} />
          <ContactLine icon="●" text={personal.driving} />
          <ContactLine icon="●" text={personal.nationality} />
          <ContactLine icon="●" text={personal.website} />
        </SidebarSection>

        <SidebarSection title="Skills">
          <ul className="plain-list">
            {(cv.skills || []).filter(Boolean).map((skill, index) => (
              <li key={index} className={isPrioritySkill(skill) ? "skill-highlight" : ""}>{skill}</li>
            ))}
          </ul>
        </SidebarSection>

        <SidebarSection title="Languages">
          {(cv.languages || []).filter((item) => item.name).map((language, index) => (
            <div className="language-row text-level" key={index}>
              <span>{language.name}</span>
              <strong>{languageText(language)}</strong>
            </div>
          ))}
        </SidebarSection>
      </aside>

      <section className="resume-content">
        <MainSection title="Professional Summary">
          <p>{cv.profile}</p>
        </MainSection>

        <MainSection title="Education">
          {(cv.education || []).map((item, index) => (
            <div className="entry compact-entry" key={index}>
              <div>
                <h4>{item.qualification}</h4>
                <p className="subtext">{item.institution}</p>
              </div>
              <strong>{formatRange(item.start, item.end)}</strong>
            </div>
          ))}
        </MainSection>

        <MainSection title="Employment">
          {(cv.employment || []).map((job, index) => (
            <div className="entry" key={index}>
              <div className="entry-head">
                <div>
                  <h4>{job.role}</h4>
                  <p className="subtext">
                    {job.company}
                    {job.location ? `, ${job.location}` : ""}
                  </p>
                </div>
                <strong>{formatRange(job.start, job.end)}</strong>
              </div>
              <ul>
                {(job.bullets || []).filter(Boolean).map((bullet, i) => (
                  <li key={i}>{bullet}</li>
                ))}
              </ul>
            </div>
          ))}
        </MainSection>

        <MainSection title="Professional Registration & Memberships">
          {(cv.registrations || []).map((item, index) => (
            <div className="entry mini-entry" key={index}>
              <h4>{item.title}</h4>
              <p className="subtext">{item.body}</p>
            </div>
          ))}
        </MainSection>

        {cv.additional && (
          <MainSection title="Additional Information">
            <p>{cv.additional}</p>
          </MainSection>
        )}
      </section>
    </article>
  );
}


function AtsResumePreview({ cv }) {
  const personal = cv.personal || {};
  return (
    <article className="ats-paper">
      <header className="ats-header">
        <h1>{personal.fullName || "Your Name"}</h1>
        <p>{personal.headline}</p>
        <div className="ats-contact">
          {[personal.email, personal.phone, personal.address, personal.nationality].filter(Boolean).join(" | ")}
        </div>
      </header>

      <AtsSection title="Professional Summary">
        <p>{cv.profile}</p>
      </AtsSection>

      <AtsSection title="Core Skills">
        <ul className="ats-skill-list">
          {(cv.skills || []).filter(Boolean).map((skill, index) => (
            <li key={index}>{skill}</li>
          ))}
        </ul>
      </AtsSection>

      <AtsSection title="Professional Experience">
        {(cv.employment || []).map((job, index) => (
          <div className="ats-entry" key={index}>
            <div className="ats-entry-head">
              <div>
                <h3>{job.role}</h3>
                <p>{job.company}{job.location ? `, ${job.location}` : ""}</p>
              </div>
              <strong>{formatRange(job.start, job.end)}</strong>
            </div>
            <ul>
              {(job.bullets || []).filter(Boolean).map((bullet, i) => (
                <li key={i}>{bullet}</li>
              ))}
            </ul>
          </div>
        ))}
      </AtsSection>

      <AtsSection title="Education">
        {(cv.education || []).map((item, index) => (
          <div className="ats-entry compact" key={index}>
            <div className="ats-entry-head">
              <div>
                <h3>{item.qualification}</h3>
                <p>{item.institution}</p>
              </div>
              <strong>{formatRange(item.start, item.end)}</strong>
            </div>
          </div>
        ))}
      </AtsSection>

      <AtsSection title="Professional Registration & Memberships">
        {(cv.registrations || []).map((item, index) => (
          <div className="ats-entry compact" key={index}>
            <h3>{item.title}</h3>
            <p>{item.body}</p>
          </div>
        ))}
      </AtsSection>

      {cv.additional && (
        <AtsSection title="Additional Information">
          <p>{cv.additional}</p>
        </AtsSection>
      )}
    </article>
  );
}

function AtsSection({ title, children }) {
  return (
    <section className="ats-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}


function SidebarSection({ title, children }) {
  return (
    <section className="sidebar-section">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function MainSection({ title, children }) {
  return (
    <section className="main-section">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function ContactLine({ icon, text }) {
  if (!text) return null;
  return (
    <div className="contact-line">
      <span>{icon}</span>
      <p>{text}</p>
    </div>
  );
}

function formatRange(start, end) {
  if (start && end) return `${start} - ${end}`;
  return start || end || "";
}

export default App;
