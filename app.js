// ── Supabase backend — no localStorage ───────────────────────────
const officialContact  = "+355 69 475 0454";
const officialLocation = "Librazhd, Jakup Bicaku";

const testCatalog = [
  { name: "Hemoglobina", aliases: ["hemoglobin", "hgb"], unit: "g/dL", range: "12.0 - 16.0" },
  { name: "Trombocitet", aliases: ["platelets", "plt"], unit: "10^9/L", range: "150 - 400" },
  { name: "Eritrocitet", aliases: ["rbc"], unit: "10^12/L", range: "4.20 - 5.80" },
  { name: "Leukocitet", aliases: ["wbc"], unit: "10^9/L", range: "4.0 - 10.0" },
  { name: "Glukoza", aliases: ["glucose"], unit: "mg/dL", range: "70 - 100" },
  { name: "Kolesteroli total", aliases: ["cholesterol"], unit: "mg/dL", range: "< 200" },
  { name: "Trigliceridet", aliases: ["triglycerides"], unit: "mg/dL", range: "< 150" },
  { name: "HDL Kolesteroli", aliases: ["hdl"], unit: "mg/dL", range: "> 40" },
  { name: "LDL Kolesteroli", aliases: ["ldl"], unit: "mg/dL", range: "< 130" },
  { name: "Urea", aliases: [], unit: "mg/dL", range: "15 - 45" },
  { name: "Kreatinina", aliases: ["creatinine"], unit: "mg/dL", range: "0.6 - 1.3" },
  { name: "AST", aliases: ["got"], unit: "U/L", range: "< 40" },
  { name: "ALT", aliases: ["gpt"], unit: "U/L", range: "< 41" },
  { name: "CRP", aliases: [], unit: "mg/L", range: "< 5" },
  { name: "TSH", aliases: [], unit: "mIU/L", range: "0.4 - 4.0" },
  { name: "Ferritina", aliases: ["ferritin"], unit: "ng/mL", range: "30 - 400" },
];

// ── In-memory state — populated from Supabase on boot ─────────
let db = {
  records:  [],
  users:    [],
  settings: { labName: "Sena Lab", address: "", phone: "" },
};
let currentUser        = null;
let activeId           = null;
let draftTests         = [];
let patientResultRecord = null;

const elements = {
  metricPatients: document.querySelector("#metricPatients"),
  metricTests: document.querySelector("#metricTests"),
  loginNav: document.querySelector("#loginNav"),
  userMenu: document.querySelector("#userMenu"),
  userMenuButton: document.querySelector("#userMenuButton"),
  userDropdown: document.querySelector("#userDropdown"),
  userAvatar: document.querySelector("#userAvatar"),
  userName: document.querySelector("#userName"),
  logoutButton: document.querySelector("#logoutButton"),
  loginForm: document.querySelector("#loginForm"),
  loginEmail: document.querySelector("#loginEmail"),
  loginPassword: document.querySelector("#loginPassword"),
  loginMessage: document.querySelector("#loginMessage"),
  lookupForm: document.querySelector("#lookupForm"),
  lookupCode: document.querySelector("#lookupCode"),
  lookupMessage: document.querySelector("#lookupMessage"),
  patientResult: document.querySelector("#patientResult"),
  patientReportPreview: document.querySelector("#patientReportPreview"),
  savePatientPdf: document.querySelector("#savePatientPdf"),
  printPatientReport: document.querySelector("#printPatientReport"),
  patientForm: document.querySelector("#patientForm"),
  activeCode: document.querySelector("#activeCode"),
  patientName: document.querySelector("#patientName"),
  patientDob: document.querySelector("#patientDob"),
  patientPhone: document.querySelector("#patientPhone"),
  patientDoctor: document.querySelector("#patientDoctor"),
  sampleDate: document.querySelector("#sampleDate"),
  reportStatus: document.querySelector("#reportStatus"),
  testName: document.querySelector("#testName"),
  testValue: document.querySelector("#testValue"),
  testUnit: document.querySelector("#testUnit"),
  testRange: document.querySelector("#testRange"),
  testCatalog: document.querySelector("#testCatalog"),
  addTest: document.querySelector("#addTest"),
  testsBody: document.querySelector("#testsBody"),
  reportNotes: document.querySelector("#reportNotes"),
  newRecord: document.querySelector("#newRecord"),
  seedData: document.querySelector("#seedData"),
  recordList: document.querySelector("#recordList"),
  viewAllRecords: document.querySelector("#viewAllRecords"),
  allRecordsBody: document.querySelector("#allRecordsBody"),
  reportPreview: document.querySelector("#reportPreview"),
  savePdf: document.querySelector("#savePdf"),
  printReport: document.querySelector("#printReport"),
  personList: document.querySelector("#personList"),
  settingLabName: document.querySelector("#settingLabName"),
  settingAddress: document.querySelector("#settingAddress"),
  settingPhone: document.querySelector("#settingPhone"),
  saveSettings: document.querySelector("#saveSettings"),
  settingsMessage: document.querySelector("#settingsMessage"),
  userForm: document.querySelector("#userForm"),
  userFormTitle: document.querySelector("#userFormTitle"),
  editingUserLabel: document.querySelector("#editingUserLabel"),
  editingUserId: document.querySelector("#editingUserId"),
  userFirstName: document.querySelector("#userFirstName"),
  userLastName: document.querySelector("#userLastName"),
  userEmail: document.querySelector("#userEmail"),
  userPassword: document.querySelector("#userPassword"),
  userRole: document.querySelector("#userRole"),
  userMessage: document.querySelector("#userMessage"),
  cancelUserEdit: document.querySelector("#cancelUserEdit"),
  showAddUser: document.querySelector("#showAddUser"),
};

// ── localStorage fully removed — Supabase handles all persistence ─

function generateSecureCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789#@$%!*?";
  const randomValues = new Uint32Array(24);
  crypto.getRandomValues(randomValues);
  return `SEN-${Array.from(randomValues, (value) => alphabet[value % alphabet.length]).join("")}`;
}

function createId() {
  let code = generateSecureCode();
  while (db.records.some((record) => record.id === code)) {
    code = generateSecureCode();
  }
  return code;
}


function formatDate(date) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function reportFileName(record) {
  const cleanName = String(record?.name || "Patient")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join("");
  return `${cleanName || "Patient"}_Results`;
}

function resultUrl(record) {
  const baseUrl = `${location.origin}${location.pathname}`;
  return `${baseUrl}?result=${encodeURIComponent(record.id)}#results`;
}

function qrImageUrl(record) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&data=${encodeURIComponent(resultUrl(record))}`;
}

function isAdmin() {
  return currentUser?.role === "admin";
}

function userDisplayName(user) {
  return `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.name;
}

function routeFromHash() {
  const hash = window.location.hash.replace("#", "") || "home";
  if (["login", "workspace", "records", "personnel", "settings"].includes(hash)) return hash;
  return "public";
}

function showRoute() {
  let route = routeFromHash();
  if (["workspace", "records"].includes(route) && !currentUser) route = "login";
  if (["personnel", "settings"].includes(route) && !isAdmin()) route = currentUser ? "workspace" : "login";

  document.querySelectorAll(".route-public").forEach((section) => {
    section.classList.toggle("route-hidden", route !== "public");
  });

  document.querySelectorAll(".route-view").forEach((section) => {
    section.classList.toggle("route-hidden", section.id !== route);
  });

  if (window.location.hash.replace("#", "") !== route && route !== "public") {
    history.replaceState(null, "", `#${route}`);
  }
}

function updateAuthView() {
  document.querySelectorAll("[data-guest-only]").forEach((node) => {
    node.classList.toggle("is-hidden", Boolean(currentUser));
  });

  document.querySelectorAll("[data-auth-only]").forEach((node) => {
    node.classList.toggle("is-hidden", !currentUser);
  });

  document.querySelectorAll("[data-admin-only]").forEach((node) => {
    node.classList.toggle("is-hidden", !isAdmin());
  });

  elements.userMenu.classList.toggle("is-hidden", !currentUser);

  if (currentUser) {
    elements.userAvatar.textContent = currentUser.avatar || currentUser.name.slice(0, 1);
    elements.userName.textContent = userDisplayName(currentUser);
  }
  showRoute();
}

function currentDraftRecord() {
  return {
    id: activeId || "Unsaved",
    name: elements.patientName.value,
    dob: elements.patientDob.value,
    phone: elements.patientPhone.value,
    doctor: elements.patientDoctor.value,
    sampleDate: elements.sampleDate.value,
    status: elements.reportStatus.value,
    notes: elements.reportNotes.value,
    tests: draftTests,
  };
}

function fillForm(record) {
  activeId = record?.id || null;
  draftTests = record?.tests ? [...record.tests] : [];
  elements.activeCode.textContent = activeId || "New record";
  elements.patientName.value = record?.name || "";
  elements.patientDob.value = record?.dob || "";
  elements.patientPhone.value = record?.phone || "";
  elements.patientDoctor.value = record?.doctor || "";
  elements.sampleDate.value = record?.sampleDate || new Date().toISOString().slice(0, 10);
  elements.reportStatus.value = record?.status || "Draft";
  elements.reportNotes.value = record?.notes || "";
  renderTests();
  renderRecords();
  renderPreview(currentDraftRecord(), elements.reportPreview);
}

function renderMetrics() {
  elements.metricPatients.textContent = db.records.length;
  elements.metricTests.textContent = db.records.reduce((sum, record) => sum + record.tests.length, 0);
}

function updateLookupHint() {
  // Do NOT expose real patient codes in placeholder or hint text.
  elements.lookupCode.placeholder = "SEN-…";
}

async function openPatientResultByCode(code) {
  const normalizedCode = String(code || "").trim();
  if (!normalizedCode) return;

  elements.lookupMessage.textContent = "Looking up your results…";
  elements.patientResult.classList.add("is-hidden");

  try {
    const record = await DB.lookupPublishedRecord(normalizedCode);

    if (!record) {
      elements.lookupMessage.textContent = "No published report was found with that code.";
      return;
    }

    elements.lookupCode.value   = record.id;
    elements.lookupMessage.textContent = `Report found for ${record.name}.`;
    patientResultRecord = record;
    renderPreview(record, elements.patientReportPreview);
    elements.patientResult.classList.remove("is-hidden");
    showRoute();
    window.setTimeout(() => {
      elements.patientResult.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  } catch (err) {
    elements.lookupMessage.textContent = "Could not connect. Please try again.";
    console.error("Lookup error:", err);
  }
}

function renderCatalog() {
  elements.testCatalog.innerHTML = testCatalog
    .map((test) => `<option value="${escapeHtml(test.name)}">${escapeHtml(test.unit)} - ${escapeHtml(test.range)}</option>`)
    .join("");
}

function findCatalogTest(input) {
  const value = input.trim().toLowerCase();
  return testCatalog.find((test) => {
    const names = [test.name, ...test.aliases].map((item) => item.toLowerCase());
    return names.includes(value);
  });
}

function applyCatalogDefaults() {
  const match = findCatalogTest(elements.testName.value);
  if (!match) return;
  if (!elements.testUnit.value || elements.testUnit.dataset.autofilled === "true") {
    elements.testUnit.value = match.unit;
    elements.testUnit.dataset.autofilled = "true";
  }
  if (!elements.testRange.value || elements.testRange.dataset.autofilled === "true") {
    elements.testRange.value = match.range;
    elements.testRange.dataset.autofilled = "true";
  }
}

function renderRecords() {
  if (!db.records.length) {
    elements.recordList.innerHTML = `<div class="empty-state">No records yet.</div>`;
    elements.viewAllRecords.classList.add("is-hidden");
    return;
  }

  const previewRecords = db.records.slice(0, 5);
  elements.recordList.innerHTML = previewRecords
    .map(
      (record) => `
        <button class="record-card ${record.id === activeId ? "active" : ""}" data-id="${record.id}" type="button">
          <strong>${escapeHtml(record.name)}</strong>
          <span>${escapeHtml(record.id)} - ${escapeHtml(record.status)}</span>
          <span>${formatDate(record.sampleDate)} - ${record.tests.length} tests</span>
        </button>
      `,
    )
    .join("");
  elements.viewAllRecords.classList.toggle("is-hidden", db.records.length <= 5);
  elements.viewAllRecords.textContent = `View all ${db.records.length} records`;
  renderAllRecords();
}

function renderAllRecords() {
  if (!db.records.length) {
    elements.allRecordsBody.innerHTML = `<tr><td colspan="6">No records yet.</td></tr>`;
    return;
  }

  elements.allRecordsBody.innerHTML = db.records
    .map(
      (record) => `
        <tr>
          <td><strong>${escapeHtml(record.name)}</strong></td>
          <td>${escapeHtml(record.id)}</td>
          <td>${formatDate(record.sampleDate)}</td>
          <td><span class="status-pill">${escapeHtml(record.status)}</span></td>
          <td>${record.tests.length}</td>
          <td>
            <div class="action-group">
              <button class="mini-button edit" data-edit-record="${record.id}" type="button">Edit</button>
              <button class="mini-button delete" data-delete-record="${record.id}" type="button">Delete</button>
            </div>
          </td>
        </tr>
      `,
    )
    .join("");
}

function renderTests() {
  if (!draftTests.length) {
    elements.testsBody.innerHTML = `
      <tr>
        <td colspan="5">No test results added yet.</td>
      </tr>
    `;
    return;
  }

  elements.testsBody.innerHTML = draftTests
    .map(
      (test, index) => `
        <tr>
          <td>${escapeHtml(test.name)}</td>
          <td>${escapeHtml(test.value)}</td>
          <td>${escapeHtml(test.unit)}</td>
          <td>${escapeHtml(test.range)}</td>
          <td><button class="danger-button" data-remove="${index}" type="button">Remove</button></td>
        </tr>
      `,
    )
    .join("");
}

function renderPreview(record, target) {
  if (!record.name && !record.tests.length) {
    target.innerHTML = `<div class="empty-state">Start a patient record to see the report preview.</div>`;
    return;
  }

  const testRows = record.tests.length
    ? record.tests
        .map(
          (test) => `
            <tr>
              <td>${escapeHtml(test.name)}</td>
              <td><strong>${escapeHtml(test.value)}</strong></td>
              <td>${escapeHtml(test.unit)}</td>
              <td>${escapeHtml(test.range)}</td>
            </tr>
          `,
        )
        .join("")
    : `<tr><td colspan="4">No results recorded.</td></tr>`;

  target.innerHTML = `
    <div class="report-header">
      <div class="report-brand">
        <img class="report-logo-image" src="assets/sena-lab-logo.png" alt="Sena Lab logo" />
        <div class="report-logo">${escapeHtml(db.settings.labName)}</div>
        <p>Clinical Laboratory - ${escapeHtml(db.settings.address)}</p>
        <p>${escapeHtml(officialContact)}</p>
      </div>
      <div>
        <span class="status-pill">${escapeHtml(record.status || "Draft")}</span>
        <p><strong>Code:</strong> ${escapeHtml(record.id)}</p>
      </div>
    </div>

    <div class="report-meta">
      <div><small>Patient</small>${escapeHtml(record.name || "-")}</div>
      <div><small>Date of birth</small>${formatDate(record.dob)}</div>
      <div><small>Sample date</small>${formatDate(record.sampleDate)}</div>
      <div><small>Phone</small>${escapeHtml(record.phone || "-")}</div>
      <div><small>Doctor</small>${escapeHtml(record.doctor || "-")}</div>
      <div><small>Report date</small>${formatDate(new Date().toISOString().slice(0, 10))}</div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Analysis</th>
          <th>Result</th>
          <th>Unit</th>
          <th>Reference range</th>
        </tr>
      </thead>
      <tbody>${testRows}</tbody>
    </table>

    <p><strong>Notes:</strong> ${escapeHtml(record.notes || "No notes added.")}</p>
    <p class="form-note">This digital preview is a prototype and should be validated before medical use.</p>
    <p class="form-note">Contact: ${escapeHtml(officialContact)} - Location: ${escapeHtml(officialLocation)}</p>
  `;
}

async function reportPrintDocument(record) {
  const tests = record.tests.length ? record.tests : [{ name: "No results recorded.", value: "", unit: "", range: "" }];
  const qrData = await generateQrDataUrl(resultUrl(record)).catch(() => qrImageUrl(record));
  const rows = tests
    .map(
      (test) => `
        <tr>
          <td>${escapeHtml(test.name)}</td>
          <td><strong>${escapeHtml(test.value || "-")}</strong></td>
          <td>${escapeHtml(test.unit || "-")}</td>
          <td>${escapeHtml(test.range || "-")}</td>
        </tr>
      `,
    )
    .join("");

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(reportFileName(record))}</title>
        <base href="${escapeHtml(location.href.split("#")[0])}" />
        <style>
          @page { margin: 12mm; }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            color: #142033;
            background: #fff;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 12px;
          }
          .official-report {
            min-height: 273mm;
            position: relative;
            padding-bottom: 28mm;
          }
          .report-top {
            display: grid;
            grid-template-columns: 1fr auto;
            gap: 20px;
            align-items: start;
            border-bottom: 2px solid #1c5d77;
            padding-bottom: 8px;
          }
          .brand-line {
            display: flex;
            align-items: center;
            gap: 14px;
          }
          .brand-line img {
            width: 155px;
            height: 76px;
            object-fit: contain;
            object-position: left center;
          }
          .brand-copy strong {
            display: block;
            color: #046572;
            font-size: 28px;
            line-height: 1;
          }
          .brand-copy span {
            color: #647286;
            font-size: 11px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }
          .qr-block {
            text-align: right;
            font-size: 10px;
            color: #405064;
          }
          .qr-block img {
            width: 78px;
            height: 78px;
            display: block;
            margin-left: auto;
            border: 1px solid #dce3ec;
          }
          .patient-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 8px 18px;
            margin: 12px 0;
          }
          .patient-grid div {
            min-height: 28px;
          }
          .label {
            display: block;
            font-size: 9px;
            font-weight: 700;
            color: #26384f;
            text-transform: uppercase;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #26384f;
            margin-top: 10px;
            font-size: 11px;
          }
          th {
            background: #eef4f7;
            border: 1px solid #26384f;
            padding: 6px;
            text-align: left;
            font-size: 10px;
          }
          td {
            border-bottom: 1px solid #dce3ec;
            padding: 5px 6px;
          }
          tbody tr:nth-child(even) td {
            background: #fafcfd;
          }
          .note {
            margin-top: 12px;
            font-size: 10px;
            font-style: italic;
          }
          .verification {
            display: grid;
            grid-template-columns: 1fr 80px 1fr;
            gap: 32px;
            align-items: center;
            margin-top: 38px;
            text-align: center;
            font-size: 10px;
            font-weight: 700;
          }
          .stamp {
            display: grid;
            width: 76px;
            height: 76px;
            place-items: center;
            color: #046572;
            border: 2px solid #0798a8;
            border-radius: 50%;
            font-size: 12px;
          }
          .footer {
            position: absolute;
            right: 0;
            bottom: 0;
            left: 0;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            border-top: 2px solid #1c5d77;
            padding-top: 8px;
            color: #405064;
            font-size: 10px;
          }
        </style>
      </head>
      <body>
        <article class="official-report">
          <header class="report-top">
            <div class="brand-line">
              <img src="assets/sena-lab-logo.png" alt="Sena Lab logo" />
              <div class="brand-copy">
                <strong>Sena Lab</strong>
                <span>Laborator mjekesor</span>
              </div>
            </div>
            <div class="qr-block">
              <img src="${escapeHtml(qrData)}" alt="Result QR code" />
              <div>Scan QR for digital result</div>
            </div>
          </header>

          <section class="patient-grid">
            <div><span class="label">Patient / Pacienti</span>${escapeHtml(record.name || "-")}</div>
            <div><span class="label">Accepted / Pranuar</span>${formatDate(record.sampleDate)}</div>
            <div><span class="label">Status</span>${escapeHtml(record.status || "Draft")}</div>
            <div><span class="label">Reference / Kodi</span>${escapeHtml(record.id || "-")}</div>
            <div><span class="label">Approved / Aprovuar</span>${formatDate(new Date().toISOString().slice(0, 10))}</div>
            <div><span class="label">Doctor</span>${escapeHtml(record.doctor || "-")}</div>
            <div><span class="label">Date of birth</span>${formatDate(record.dob)}</div>
            <div><span class="label">Phone</span>${escapeHtml(record.phone || "-")}</div>
            <div><span class="label">Report code</span>${escapeHtml(record.id || "-")}</div>
          </section>

          <table>
            <thead>
              <tr>
                <th>Test name<br />Emri i testit</th>
                <th>Result<br />Rezultati</th>
                <th>Unit<br />Njesia</th>
                <th>Reference<br />Vlerat normale</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>

          <p class="note">Shenim: Vlerat normale afishohen ne baze te moshes dhe gjinise se pacientit.</p>
          <p><strong>Notes:</strong> ${escapeHtml(record.notes || "No notes added.")}</p>

          <section class="verification">
            <div>Verified electronically<br />Sena Lab</div>
            <div class="stamp">SENA<br />LAB</div>
            <div>Verified electronically<br />Sena Lab</div>
          </section>

          <footer class="footer">
            <div>Contact: ${escapeHtml(officialContact)}</div>
            <div>Location: ${escapeHtml(officialLocation)}</div>
          </footer>
        </article>
      </body>
    </html>
  `;
}

function imageToDataUrl(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    image.onerror = reject;
    image.src = src;
  });
}

function generateQrDataUrl(text) {
  if (window.QRCode?.toDataURL) {
    return window.QRCode.toDataURL(text, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 180,
    });
  }

  return new Promise((resolve, reject) => {
    if (!window.QRCode) {
      reject(new Error("QR library is not available"));
      return;
    }

    const holder = document.createElement("div");
    holder.style.position = "fixed";
    holder.style.left = "-9999px";
    document.body.appendChild(holder);
    new window.QRCode(holder, {
      text,
      width: 180,
      height: 180,
      correctLevel: window.QRCode.CorrectLevel.M,
    });

    window.setTimeout(() => {
      const canvas = holder.querySelector("canvas");
      const image = holder.querySelector("img");
      const dataUrl = canvas?.toDataURL("image/png") || image?.src;
      holder.remove();
      if (dataUrl) {
        resolve(dataUrl);
      } else {
        reject(new Error("QR code could not be generated"));
      }
    }, 50);
  });
}

async function createOfficialPdfBlob(record) {
  if (!window.jspdf?.jsPDF || !window.QRCode) {
    return null;
  }

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const logoData = await imageToDataUrl("assets/sena-lab-logo.png").catch(() => null);
  const qrData = await generateQrDataUrl(resultUrl(record)).catch(() => null);

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 10;
  const tests = record.tests.length ? record.tests : [{ name: "No results recorded.", value: "", unit: "", range: "" }];
  let y = 15;

  function footer() {
    pdf.setDrawColor(7, 152, 168);
    pdf.line(margin, pageHeight - 13, pageWidth - margin, pageHeight - 13);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(55, 70, 90);
    pdf.text(`Contact: ${officialContact}`, margin, pageHeight - 7);
    pdf.text(`Location: ${officialLocation}`, 78, pageHeight - 7);
    pdf.text("Scan the QR code to open the digital result.", 142, pageHeight - 7);
  }

  function header() {
    y = 12;
    if (logoData) {
      pdf.addImage(logoData, "PNG", margin, y, 58, 30);
    } else {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(24);
      pdf.setTextColor(7, 101, 114);
      pdf.text("Sena Lab", margin, y + 18);
      pdf.setFontSize(8);
      pdf.text("LABORATOR MJEKESOR", margin, y + 25);
    }
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(7, 101, 114);
    pdf.text((record.status || "Draft").toUpperCase(), 112, y + 8);
    pdf.setFontSize(9);
    pdf.setTextColor(20, 32, 51);
    pdf.text(`Accepted: ${formatDate(record.sampleDate)}`, 112, y + 16);
    pdf.text(`Approved: ${formatDate(new Date().toISOString().slice(0, 10))}`, 112, y + 23);
    if (qrData) {
      pdf.addImage(qrData, "PNG", 174, y + 1, 24, 24);
    } else {
      pdf.rect(174, y + 1, 24, 24);
      pdf.setFontSize(6);
      pdf.text("QR", 186, y + 12, { align: "center" });
      pdf.text(record.id || "-", 186, y + 17, { align: "center", maxWidth: 20 });
    }
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.text("Scan for digital result", 171, y + 29);
    y = 48;
    pdf.setDrawColor(20, 32, 51);
    pdf.line(margin, y, pageWidth - margin, y);
  }

  function patientInfo() {
    y += 7;
    pdf.setTextColor(20, 32, 51);
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "bold");
    pdf.text("Patient / Pacienti:", margin, y);
    pdf.text("Code / Kodi:", margin, y + 6);
    pdf.text("Date of birth:", 82, y);
    pdf.text("Doctor:", 82, y + 6);
    pdf.text("Sample date:", 145, y);
    pdf.text("Report date:", 145, y + 6);
    pdf.setFont("helvetica", "normal");
    pdf.text(record.name || "-", 38, y);
    pdf.text(record.id || "-", 38, y + 6, { maxWidth: 42 });
    pdf.text(formatDate(record.dob), 105, y);
    pdf.text(record.doctor || "-", 105, y + 6);
    pdf.text(formatDate(record.sampleDate), 168, y);
    pdf.text(formatDate(new Date().toISOString().slice(0, 10)), 168, y + 6);
    y += 15;
  }

  function tableHeader() {
    pdf.setDrawColor(20, 32, 51);
    pdf.setFillColor(242, 247, 250);
    pdf.rect(margin, y, pageWidth - margin * 2, 12, "FD");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.text("Test name", margin + 2, y + 5);
    pdf.text("Result", 78, y + 5);
    pdf.text("Unit", 112, y + 5);
    pdf.text("Reference", 145, y + 5);
    pdf.text("Emri i testit", margin + 2, y + 10);
    pdf.text("Rezultati", 78, y + 10);
    pdf.text("Njesia", 112, y + 10);
    pdf.text("Vlerat normale", 145, y + 10);
    y += 12;
  }

  function newPage() {
    footer();
    pdf.addPage();
    header();
    patientInfo();
    tableHeader();
  }

  header();
  patientInfo();
  tableHeader();

  pdf.setFontSize(9);
  tests.forEach((test, index) => {
    if (y > 252) newPage();
    if (index % 2 === 0) {
      pdf.setFillColor(250, 252, 253);
      pdf.rect(margin, y, pageWidth - margin * 2, 8, "F");
    }
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(20, 32, 51);
    pdf.text(String(test.name || "-"), margin + 2, y + 5, { maxWidth: 62 });
    pdf.setFont("helvetica", "bold");
    pdf.text(String(test.value || "-"), 78, y + 5, { maxWidth: 28 });
    pdf.setFont("helvetica", "normal");
    pdf.text(String(test.unit || "-"), 112, y + 5, { maxWidth: 28 });
    pdf.text(String(test.range || "-"), 145, y + 5, { maxWidth: 48 });
    y += 8;
  });

  y += 8;
  if (y > 246) newPage();
  pdf.setFont("helvetica", "italic");
  pdf.setFontSize(8);
  pdf.text("Shenim: Vlerat normale afishohen ne baze te moshes dhe gjinise se pacientit.", margin, y);
  y += 10;
  pdf.setFont("helvetica", "normal");
  pdf.text(`Notes: ${record.notes || "No notes added."}`, margin, y, { maxWidth: pageWidth - margin * 2 });

  y = Math.max(y + 24, 240);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.text("Verified electronically", 38, y, { align: "center" });
  pdf.text("Verified electronically", 172, y, { align: "center" });
  pdf.setFont("helvetica", "normal");
  pdf.text("Sena Lab", 38, y + 6, { align: "center" });
  pdf.text("Sena Lab", 172, y + 6, { align: "center" });
  pdf.setDrawColor(7, 152, 168);
  pdf.circle(105, y + 5, 10);
  pdf.setFont("helvetica", "bold");
  pdf.text("SENA", 105, y + 4, { align: "center" });
  pdf.text("LAB", 105, y + 8, { align: "center" });

  footer();
  return pdf.output("blob");
}

async function openReportForPrint(record) {
  if (!record?.name && !record?.tests?.length) return;
  const popup = window.open("", reportFileName(record), "width=900,height=1100");
  if (!popup) {
    window.print();
    return;
  }

  popup.document.open();
  popup.document.write(await reportPrintDocument(record));
  popup.document.close();
  popup.focus();
  popup.setTimeout(() => popup.print(), 700);
}

function pdfText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function drawText(x, y, size, text, bold = false) {
  return `BT /${bold ? "F2" : "F1"} ${size} Tf ${x} ${y} Td (${pdfText(text)}) Tj ET\n`;
}

function drawLine(x1, y1, x2, y2) {
  return `${x1} ${y1} m ${x2} ${y2} l S\n`;
}

function drawRect(x, y, width, height) {
  return `${x} ${y} ${width} ${height} re S\n`;
}

function buildPdfPages(record) {
  const pages = [];
  const tests = record.tests.length ? record.tests : [{ name: "No results recorded.", value: "", unit: "", range: "" }];
  let index = 0;

  while (index < tests.length) {
    let y = 800;
    let stream = "";
    stream += "0.02 0.4 0.45 RG\n";
    stream += drawText(44, y, 26, db.settings.labName, true);
    stream += drawText(44, y - 34, 12, `Clinical Laboratory - ${db.settings.address}`);
    stream += drawText(44, y - 56, 12, db.settings.phone);
    stream += drawText(380, y, 10, record.status || "Draft", true);
    stream += drawText(380, y - 32, 12, `Code: ${record.id}`, true);
    stream += drawLine(44, y - 84, 552, y - 84);

    y -= 125;
    stream += drawText(44, y, 9, "PATIENT", true);
    stream += drawText(220, y, 9, "DATE OF BIRTH", true);
    stream += drawText(395, y, 9, "SAMPLE DATE", true);
    stream += drawText(44, y - 18, 11, record.name || "-");
    stream += drawText(220, y - 18, 11, formatDate(record.dob));
    stream += drawText(395, y - 18, 11, formatDate(record.sampleDate));

    y -= 62;
    stream += drawText(44, y, 9, "PHONE", true);
    stream += drawText(220, y, 9, "DOCTOR", true);
    stream += drawText(395, y, 9, "REPORT DATE", true);
    stream += drawText(44, y - 18, 11, record.phone || "-");
    stream += drawText(220, y - 18, 11, record.doctor || "-");
    stream += drawText(395, y - 18, 11, formatDate(new Date().toISOString().slice(0, 10)));

    y -= 62;
    stream += drawText(44, y, 9, "ANALYSIS", true);
    stream += drawText(205, y, 9, "RESULT", true);
    stream += drawText(300, y, 9, "UNIT", true);
    stream += drawText(395, y, 9, "REFERENCE RANGE", true);
    stream += drawLine(44, y - 12, 552, y - 12);
    y -= 34;

    while (index < tests.length && y > 140) {
      const test = tests[index];
      stream += drawText(44, y, 11, test.name);
      stream += drawText(205, y, 11, test.value, true);
      stream += drawText(300, y, 11, test.unit);
      stream += drawText(395, y, 11, test.range);
      y -= 28;
      index += 1;
    }

    stream += drawLine(44, 122, 552, 122);
    stream += drawText(44, 96, 11, `Notes: ${record.notes || "No notes added."}`, true);
    stream += drawText(44, 70, 9, "This digital preview is a prototype and should be validated before medical use.");
    stream += drawText(500, 38, 9, `Page ${pages.length + 1}`);
    pages.push(stream);
  }

  return pages;
}

function createPdfBlob(record) {
  const pages = buildPdfPages(record);
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pages.map((_, index) => `${5 + index * 2} 0 R`).join(" ")}] /Count ${pages.length} >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
  ];

  pages.forEach((stream, index) => {
    const contentObjectNumber = 6 + index * 2;
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}endstream`);
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`);
  });

  const orderedObjects = [objects[0], objects[1], objects[2], objects[3]];
  pages.forEach((_, index) => {
    orderedObjects.push(objects[4 + index * 2 + 1]);
    orderedObjects.push(objects[4 + index * 2]);
  });

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  orderedObjects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${orderedObjects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${orderedObjects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}

async function saveReportAsPdf(record) {
  if (!record?.name && !record?.tests?.length) return;
  try {
    const blob = await createOfficialPdfBlob(record);
    if (!blob) {
      openReportForPrint(record);
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${reportFileName(record)}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    console.error("PDF download failed", error);
    alert("The direct PDF download failed. I opened the printable report instead. Choose Save as PDF in the print dialog.");
    openReportForPrint(record);
  }
}

async function saveActiveRecord() {
  const id     = activeId || createId();
  const record = { ...currentDraftRecord(), id };

  const btn = elements.patientForm.querySelector("[type='submit']");
  if (btn) { btn.disabled = true; btn.textContent = "Saving…"; }

  try {
    await DB.upsertRecord(record);
    const idx = db.records.findIndex((r) => r.id === id);
    if (idx >= 0) db.records[idx] = record; else db.records.unshift(record);
    activeId = id;
    elements.activeCode.textContent = id;
    renderAll(record);
  } catch (err) {
    alert("Could not save record: " + err.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "Save report"; }
  }
}

function renderPersonnel() {
  if (!db.users.length) {
    elements.personList.innerHTML = `<tr><td colspan="4" style="color:var(--t3);font-size:13px;padding:20px">
      No staff profiles yet. Invite someone using the button above.</td></tr>`;
    return;
  }
  elements.personList.innerHTML = db.users
    .map(
      (user) => `
        <tr>
          <td><strong>${escapeHtml(userDisplayName(user))}</strong></td>
          <td>${user.id === currentUser?.id ? escapeHtml(currentUser.email) : "—"}</td>
          <td><span class="role-pill">${escapeHtml(user.role)}</span></td>
          <td>
            <div class="action-group">
              <button class="mini-button edit" data-edit-user="${user.id}" type="button">Role</button>
              ${user.id !== currentUser?.id
                ? `<button class="mini-button delete" data-delete-user="${user.id}" type="button">Remove</button>`
                : ""}
            </div>
          </td>
        </tr>
      `,
    )
    .join("");
}

function renderSettings() {
  elements.settingLabName.value = db.settings.labName;
  elements.settingAddress.value = db.settings.address;
  elements.settingPhone.value = db.settings.phone;
}

function renderAll(record = currentDraftRecord()) {
  renderMetrics();
  renderRecords();
  renderTests();
  renderPreview(record, elements.reportPreview);
  renderAllRecords();
  renderPersonnel();
  renderSettings();
  updateLookupHint();
  updateAuthView();
}

function resetUserForm() {
  elements.userForm.classList.add("is-hidden");
  elements.editingUserId.value = "";
  elements.userFormTitle.textContent = "Invite staff";
  elements.editingUserLabel.textContent = "New personnel";
  elements.userFirstName.value = "";
  elements.userLastName.value  = "";
  elements.userEmail.value     = "";
  if (elements.userPassword) { elements.userPassword.value = ""; elements.userPassword.required = false; }
  elements.userRole.value = "laburant";
  elements.userMessage.textContent = "An invite email will be sent to set their password.";
}

// ── Login throttle: 5 failed attempts → 30-second lockout ────────
const loginAttemptKey = "senaLab.loginAttempts";
const LOGIN_MAX        = 5;
const LOGIN_LOCKOUT_MS = 30_000;

function getLoginAttempts() {
  try { return JSON.parse(sessionStorage.getItem(loginAttemptKey)) || { count: 0, lockedUntil: 0 }; }
  catch { return { count: 0, lockedUntil: 0 }; }
}
function setLoginAttempts(data) {
  sessionStorage.setItem(loginAttemptKey, JSON.stringify(data));
}
function resetLoginAttempts() {
  sessionStorage.removeItem(loginAttemptKey);
}

elements.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  // Throttle check
  const attempts = getLoginAttempts();
  if (Date.now() < attempts.lockedUntil) {
    const remaining = Math.ceil((attempts.lockedUntil - Date.now()) / 1000);
    elements.loginMessage.textContent = `Too many attempts. Try again in ${remaining}s.`;
    return;
  }

  const btn = elements.loginForm.querySelector(".btn-primary");
  if (btn) { btn.classList.add("loading"); btn.disabled = true; }

  try {
    const email    = elements.loginEmail.value.trim().toLowerCase();
    const password = elements.loginPassword.value;

    const user = await DB.signIn(email, password);
    resetLoginAttempts();
    currentUser = user;

    // Load all data now that we're authenticated
    const [records, staff, settings] = await Promise.all([
      DB.getRecords(),
      DB.getStaffProfiles(),
      DB.getSettings(),
    ]);
    db.records  = records;
    db.users    = staff;
    db.settings = settings;

    elements.loginMessage.textContent = `Welcome back, ${userDisplayName(user)}.`;
    elements.loginPassword.value = "";
    fillForm(db.records[0] || null);
    renderAll();
    window.location.hash = "workspace";
  } catch (err) {
    const newCount = (attempts.count || 0) + 1;
    const locked   = newCount >= LOGIN_MAX;
    setLoginAttempts({
      count:       locked ? 0 : newCount,
      lockedUntil: locked ? Date.now() + LOGIN_LOCKOUT_MS : 0,
    });
    elements.loginMessage.textContent = locked
      ? `Too many failed attempts. Wait ${LOGIN_LOCKOUT_MS / 1000}s.`
      : `Incorrect credentials. ${LOGIN_MAX - newCount} attempt${LOGIN_MAX - newCount === 1 ? "" : "s"} remaining.`;
  } finally {
    if (btn) { btn.classList.remove("loading"); btn.disabled = false; }
  }
});

elements.userMenuButton.addEventListener("click", () => {
  elements.userDropdown.classList.toggle("open");
  elements.userMenuButton.setAttribute("aria-expanded", elements.userDropdown.classList.contains("open"));
});

elements.userDropdown.addEventListener("click", (event) => {
  const route = event.target.dataset.menuRoute;
  if (route && isAdmin()) {
    window.location.hash = route;
  }
  elements.userDropdown.classList.remove("open");
});

elements.logoutButton.addEventListener("click", async () => {
  try { await DB.signOut(); } catch (_) {}
  currentUser = null;
  db.records  = [];
  db.users    = [];
  fillForm(null);
  updateAuthView();
  window.location.hash = "home";
});

elements.lookupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await openPatientResultByCode(elements.lookupCode.value);
});

elements.testName.addEventListener("input", applyCatalogDefaults);
elements.testName.addEventListener("change", applyCatalogDefaults);
elements.testUnit.addEventListener("input", () => {
  elements.testUnit.dataset.autofilled = "false";
});
elements.testRange.addEventListener("input", () => {
  elements.testRange.dataset.autofilled = "false";
});

elements.addTest.addEventListener("click", () => {
  applyCatalogDefaults();
  const test = {
    name: elements.testName.value.trim(),
    value: elements.testValue.value.trim(),
    unit: elements.testUnit.value.trim(),
    range: elements.testRange.value.trim(),
  };

  if (!test.name || !test.value) {
    elements.testName.focus();
    return;
  }

  draftTests.push(test);
  elements.testName.value = "";
  elements.testValue.value = "";
  elements.testUnit.value = "";
  elements.testRange.value = "";
  elements.testUnit.dataset.autofilled = "false";
  elements.testRange.dataset.autofilled = "false";
  renderTests();
  renderPreview(currentDraftRecord(), elements.reportPreview);
});

[elements.testName, elements.testValue, elements.testUnit, elements.testRange].forEach((input) => {
  input.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    elements.addTest.click();
  });
});

elements.testsBody.addEventListener("click", (event) => {
  const removeIndex = event.target.dataset.remove;
  if (removeIndex === undefined) return;
  draftTests.splice(Number(removeIndex), 1);
  renderTests();
  renderPreview(currentDraftRecord(), elements.reportPreview);
});

elements.patientForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentUser) return;
  await saveActiveRecord();
});

elements.patientForm.addEventListener("input", () => {
  renderPreview(currentDraftRecord(), elements.reportPreview);
});

elements.recordList.addEventListener("click", (event) => {
  const card = event.target.closest("[data-id]");
  if (!card) return;
  const record = db.records.find((item) => item.id === card.dataset.id);
  if (record) fillForm(record);
});

elements.allRecordsBody.addEventListener("click", async (event) => {
  const editId = event.target.dataset.editRecord;
  const deleteId = event.target.dataset.deleteRecord;

  if (editId) {
    const record = db.records.find((item) => item.id === editId);
    if (!record) return;
    fillForm(record);
    window.location.hash = "workspace";
  }

  if (deleteId) {
    if (!confirm("Delete this record? This cannot be undone.")) return;
    try {
      await DB.deleteRecord(deleteId);
      db.records = db.records.filter((item) => item.id !== deleteId);
      if (activeId === deleteId) fillForm(db.records[0] || null);
      renderAll();
    } catch (err) {
      alert("Could not delete record: " + err.message);
    }
  }
});

elements.newRecord.addEventListener("click", () => fillForm(null));

// Seed button reloads records from Supabase
elements.seedData.addEventListener("click", async () => {
  try {
    db.records = await DB.getRecords();
    fillForm(db.records[0] || null);
    renderAll();
  } catch (err) {
    alert("Could not refresh records: " + err.message);
  }
});

elements.saveSettings.addEventListener("click", async () => {
  const btn = document.getElementById("saveSettings");
  if (btn) { btn.disabled = true; btn.textContent = "Saving…"; }
  try {
    const s = {
      labName: elements.settingLabName.value.trim() || "Sena Lab",
      address: elements.settingAddress.value.trim() || "",
      phone:   elements.settingPhone.value.trim()   || "",
    };
    await DB.saveSettings(s);
    db.settings = s;
    elements.settingsMessage.textContent = "Settings saved.";
    renderPreview(currentDraftRecord(), elements.reportPreview);
  } catch (err) {
    elements.settingsMessage.textContent = "Error: " + err.message;
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "Save settings"; }
  }
});

// ── Change password (in settings page) ───────────────────────────
const changePwForm = document.getElementById("changePwForm");
if (changePwForm) {
  changePwForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const newPw  = document.getElementById("newPassword").value;
    const newPw2 = document.getElementById("newPassword2").value;
    const msg    = document.getElementById("changePwMessage");
    if (newPw !== newPw2) { msg.textContent = "Passwords do not match."; return; }
    if (newPw.length < 8)  { msg.textContent = "Password must be at least 8 characters."; return; }
    try {
      await DB.changePassword(newPw);
      msg.textContent = "Password changed successfully.";
      changePwForm.reset();
    } catch (err) {
      msg.textContent = "Error: " + err.message;
    }
  });
}

elements.personList.addEventListener("click", async (event) => {
  const editId   = event.target.dataset.editUser;
  const deleteId = event.target.dataset.deleteUser;

  if (editId) {
    const user = db.users.find((item) => item.id === editId);
    if (!user) return;
    elements.userForm.classList.remove("is-hidden");
    elements.editingUserId.value = user.id;
    elements.userFormTitle.textContent = "Edit role";
    elements.editingUserLabel.textContent = userDisplayName(user);
    elements.userFirstName.value = user.firstName || "";
    elements.userLastName.value  = user.lastName  || "";
    elements.userEmail.value     = "";           // not editable here
    if (elements.userPassword) elements.userPassword.value = "";
    elements.userRole.value = user.role;
    elements.userMessage.textContent = "Change this staff member's role.";
  }

  if (deleteId) {
    if (currentUser?.id === deleteId) {
      elements.userMessage.textContent = "You cannot remove yourself.";
      return;
    }
    if (!confirm("Remove this staff member? Their account will be permanently deleted.")) return;
    try {
      await DB.deleteStaff(deleteId);
      db.users = db.users.filter((u) => u.id !== deleteId);
      renderPersonnel();
      resetUserForm();
    } catch (err) {
      elements.userMessage.textContent = "Error: " + err.message;
    }
  }
});

elements.userForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const editingId  = elements.editingUserId.value;
  const firstName  = elements.userFirstName.value.trim();
  const lastName   = elements.userLastName.value.trim();
  const email      = elements.userEmail.value.trim();
  const role       = elements.userRole.value;

  // ── Editing existing user: update role only ─────────────────
  if (editingId) {
    try {
      await DB.updateStaffRole(editingId, role);
      const u = db.users.find((x) => x.id === editingId);
      if (u) { u.role = role; }
      if (currentUser?.id === editingId) currentUser.role = role;
      renderPersonnel();
      updateAuthView();
      resetUserForm();
      elements.userMessage.textContent = "Role updated.";
    } catch (err) {
      elements.userMessage.textContent = "Error: " + err.message;
    }
    return;
  }

  // ── New user: invite via Netlify Function ───────────────────
  if (!email) { elements.userMessage.textContent = "Email is required."; return; }
  const btn = elements.userForm.querySelector("[type='submit']");
  if (btn) { btn.disabled = true; btn.textContent = "Inviting…"; }
  try {
    await DB.inviteStaff({ email, firstName, lastName, role });
    // Refresh staff list
    db.users = await DB.getStaffProfiles();
    renderPersonnel();
    resetUserForm();
    elements.userMessage.textContent = `Invite sent to ${email}. They'll receive an email to set their password.`;
  } catch (err) {
    elements.userMessage.textContent = "Error: " + err.message;
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "Save user"; }
  }
});

elements.cancelUserEdit.addEventListener("click", resetUserForm);
elements.showAddUser.addEventListener("click", () => {
  resetUserForm();
  elements.userForm.classList.remove("is-hidden");
  elements.userFirstName.focus();
});

elements.printReport.addEventListener("click", () => openReportForPrint(currentDraftRecord()));
elements.savePdf.addEventListener("click", () => saveReportAsPdf(currentDraftRecord()));
elements.printPatientReport.addEventListener("click", () => openReportForPrint(patientResultRecord));
elements.savePatientPdf.addEventListener("click", () => saveReportAsPdf(patientResultRecord));
window.addEventListener("hashchange", showRoute);

/* ================================================================
   BOOT — async startup sequence
   ================================================================ */
async function bootApp() {
  renderCatalog();
  resetUserForm();

  // 1. Restore session (checks Supabase JWT)
  try {
    currentUser = await DB.getSession();
  } catch (_) {
    currentUser = null;
  }

  // 2. If logged in, load all records + staff
  if (currentUser) {
    try {
      const [records, staff, settings] = await Promise.all([
        DB.getRecords(),
        DB.getStaffProfiles(),
        DB.getSettings(),
      ]);
      db.records  = records;
      db.users    = staff;
      db.settings = settings;
    } catch (err) {
      console.error("Failed to load data:", err);
    }
  } else {
    // Load settings for the report header (visible publicly)
    try {
      db.settings = await DB.getSettings();
    } catch (_) {}
  }

  // 3. Update hero metrics (public — uses the SECURITY DEFINER function)
  DB.getPublicMetrics()
    .then(({ patientCount, testCount }) => {
      if (elements.metricPatients) elements.metricPatients.textContent = patientCount;
      if (elements.metricTests)    elements.metricTests.textContent    = testCount;
    })
    .catch(() => {});

  // 4. Render initial UI
  fillForm(db.records[0] || null);
  renderAll();

  // 5. Handle direct result URL (?result=CODE)
  const initialCode = new URLSearchParams(location.search).get("result");
  if (initialCode) await openPatientResultByCode(initialCode);
}

bootApp();
