require('dotenv').config();
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { Readable } = require('stream');
const nodemailer = require('nodemailer');

const { google } = require('googleapis');
const { GoogleAuth } = require('google-auth-library');

// Parse credentials from env (fix \n in private_key)
let credentials;
try {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON environment variable not set!');
  }
  console.log('[INFO] Parsing Google credentials from environment variable...');
  credentials = JSON.parse(
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON.replace(/\\n/g, '\n')
  );
  console.log('[SUCCESS] Google credentials parsed successfully.');
} catch (err) {
  console.error('[ERROR] Failed to parse Google service account JSON:');
  console.error(err.message);
  process.exit(1);
}

let auth, drive, sheets;
try {
  auth = new GoogleAuth({
    credentials,
    scopes: [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/spreadsheets'
    ]
  });
  drive = google.drive({ version: 'v3', auth });
  sheets = google.sheets({ version: 'v4', auth });
  console.log('[SUCCESS] GoogleAuth and API clients initialized.');
} catch (err) {
  console.error('[ERROR] Failed to initialize GoogleAuth/API clients:');
  console.error(err.message);
  process.exit(1);
}

// Test Google Sheets/Drive connection
(async () => {
  try {
    await drive.files.list({ pageSize: 1 });
    console.log('[SUCCESS] Google Drive API call succeeded.');
  } catch (err) {
    console.error('[ERROR] Google API call failed (invalid credentials?):');
    console.error(err.response ? err.response.data : err.message);
    process.exit(1);
  }
})();

// ...the rest of your server code, Express, routes, etc...



const puppeteer = require('puppeteer');

// Utility: Generates a simple filled PDF using Puppeteer
async function generateAdmissionPDF(formData, passportPhotoUrl) {
  const html = `
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>African Pearl International School — Admission Form</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { background: #fff; color: #000; font-family: 'Times New Roman', serif; padding: 20px; }
          .form-container { max-width: 900px; margin: auto; border: 2px solid #000; padding: 0; }
          .header-table, .form-table { table-layout: fixed; width: 100%; border-collapse: collapse; }
          .header-table td { border: none; vertical-align: top; padding: 8px; }
          .header-logo { width: 20%; text-align: center; }
          .header-logo img { max-height: 90px; }
          .header-info { width: 60%; text-align: center; font-size: 14px; line-height: 1.2; }
          .header-photo { width: 20%; text-align: center; font-size: 12px; padding-top: 8px; }
          .photo-box {
            width: 110px; height: 130px; margin: 0 auto 8px;
            border: 2px dashed #000; display: flex; align-items: center; justify-content: center;
            background: #fff;
          }
          .photo-box img { max-width: 100%; max-height: 100%; }
          .form-table th, .form-table td {
            border: 1px solid #000; padding: 6px; vertical-align: top; font-size: 13px;
          }
          .required::after { content: " *"; color: red; }
          .section-header {
            background: #f0f0f0; text-align: center; font-weight: bold; font-size: 14px;
          }
          .submit-row td { text-align: center; padding: 16px; }
        </style>
      </head>
      <body>
        <div class="form-container">
          <table class="header-table">
            <tr>
              <td class="header-logo">
               <img src="https://i.imgur.com/Yi9mtxS.png" style="max-height:100px;">
 
              </td>
              <td class="header-info">
                <div style="font-size:16px;font-weight:bold;">The African Pearl International School Ltd</div>
                <div>(Nursery / Primary / Secondary Day & Boarding)</div>
                <div>(Behind Shell Kabalagala, Kampala – Tel: 0709786333)</div>
                <div style="margin-top:8px;font-size:15px;font-weight:bold;">ADMISSION FORM</div>
                <div style="font-size:12px;margin-top:4px;">
                  To be signed and returned before your child starts with the school.<br>
                  All information will be treated confidentially.
                </div>
              </td>
              <td class="header-photo">
                <div class="photo-box">
                 
                </div>
                <div class="note">Passport-size photograph (PNG only)</div>
              </td>
            </tr>
          </table>

          <table class="form-table">
            <tr>
              <td colspan="2"><b>Full Name (As per passport/birth certificate):</b> ${formData.full_name || ''}</td>
              <td><b>Date of Birth (DD/MM/YYYY):</b> ${formData.date_of_birth || ''}</td>
              <td><b>Gender:</b> ${formData.gender || ''}</td>
            </tr>
            <tr>
              <td><b>Country of Birth:</b> ${formData.country_of_birth || ''}</td>
              <td><b>Nationality:</b> ${formData.nationality || ''}</td>
              <td><b>Mother Tongue:</b> ${formData.mother_tongue || ''}</td>
              <td><b>Publishing Photos (social media/marketing):</b> ${formData.publish_photos || ''}</td>
            </tr>
            <tr>
              <td colspan="2"><b>Class Applying For:</b> ${formData.classApplied || ''}</td>
              <td colspan="2"><b>Day / Boarding:</b> ${formData.studentType || ''}</td>
            </tr>
            <tr>
              <td colspan="4"><b>Home Address:</b> ${formData.home_address || ''}</td>
            </tr>
            <tr>
              <td colspan="2"><b>Previous school name and address:</b> ${formData.previous_school || ''}</td>
              <td colspan="2"><b>Last completed Year-band/Class:</b> ${formData.last_completed_year || ''}</td>
            </tr>
            <tr><td colspan="4" class="section-header">Parent Details</td></tr>
            <tr>
              <td><b>Father’s Full Name:</b> ${formData.father_name || ''}</td>
              <td><b>Mobile Number:</b> ${formData.father_mobile || ''}</td>
              <td colspan="2"><b>Email address:</b> ${formData.father_email || ''}</td>
            </tr>
            <tr>
              <td colspan="4"><b>Address of father, if different:</b> ${formData.father_address || ''}</td>
            </tr>
            <tr>
              <td><b>Occupation:</b> ${formData.father_occupation || ''}</td>
              <td><b>Employer:</b> ${formData.father_employer || ''}</td>
              <td colspan="2"></td>
            </tr>
            <tr>
              <td><b>Mother’s Full Name:</b> ${formData.mother_name || ''}</td>
              <td><b>Mobile Number:</b> ${formData.mother_mobile || ''}</td>
              <td colspan="2"><b>Email address:</b> ${formData.mother_email || ''}</td>
            </tr>
            <tr>
              <td colspan="4"><b>Address of mother, if different:</b> ${formData.mother_address || ''}</td>
            </tr>
            <tr>
              <td><b>Occupation:</b> ${formData.mother_occupation || ''}</td>
              <td><b>Employer:</b> ${formData.mother_employer || ''}</td>
              <td colspan="2"></td>
            </tr>
            <tr><td colspan="4" class="section-header">Guardian (if applicable)</td></tr>
            <tr>
              <td><b>Name:</b> ${formData.guardian_name || ''}</td>
              <td><b>Relationship:</b> ${formData.guardian_relation || ''}</td>
              <td><b>Mobile Number:</b> ${formData.guardian_mobile || ''}</td>
              <td><b>Email address:</b> ${formData.guardian_email || ''}</td>
            </tr>
            <tr>
              <td colspan="4"><b>Occupation:</b> ${formData.guardian_occupation || ''}</td>
            </tr>
            <tr><td colspan="4" class="section-header">Emergency Contacts</td></tr>
            <tr>
              <td><b>#1 Name:</b> ${formData.emergency1_name || ''}</td>
              <td><b>Tel:</b> ${formData.emergency1_tel || ''}</td>
              <td colspan="2"><b>Relationship:</b> ${formData.emergency1_relation || ''}</td>
            </tr>
            <tr>
              <td><b>#2 Name:</b> ${formData.emergency2_name || ''}</td>
              <td><b>Tel:</b> ${formData.emergency2_tel || ''}</td>
              <td colspan="2"><b>Relationship:</b> ${formData.emergency2_relation || ''}</td>
            </tr>
            <tr><td colspan="4" class="section-header">Siblings at APS</td></tr>
            <tr>
              <td><b>Any siblings at APS?:</b> ${formData.siblings_at_aps || ''}</td>
              <td colspan="3"><b>Names & Class:</b> ${formData.siblings_details || ''}</td>
            </tr>
            <tr><td colspan="4" class="section-header">File Attachments (Google Drive Links)</td></tr>
            <tr>
              <td colspan="1"><b>Passport photo:</b><br>${formData.passport_photo ? `<a href="${formData.passport_photo}">View</a>` : 'N/A'}</td>
              <td colspan="1"><b>Report card:</b><br>${formData.report_card ? `<a href="${formData.report_card}">View</a>` : 'N/A'}</td>
              <td colspan="1"><b>Birth Certificate:</b><br>${formData.birth_cert ? `<a href="${formData.birth_cert}">View</a>` : 'N/A'}</td>
              <td colspan="1"><b>Passport copy / National ID / Refugee copy:</b><br>${formData.passport_copy ? `<a href="${formData.passport_copy}">View</a>` : 'N/A'}</td>
            </tr>
            <tr>
              <td colspan="2"><b>Remarks:</b> ${formData.remarks || ''}</td>
              <td><b>Referred by:</b> ${formData.referred_by || ''}</td>
              <td><b>Date of Admission:</b> ${formData.admission_date || ''}<br><b>Yearband Admitted to:</b> ${formData.yearband_admitted || ''}</td>
            </tr>
            <tr><td colspan="4" class="section-header">Medical Information (confidential)</td></tr>
            <tr>
              <td colspan="2"><b>Allergies/asthma/others?:</b> ${formData.allergies || ''}</td>
              <td colspan="2"><b>If yes, details:</b> ${formData.allergy_details || ''}</td>
            </tr>
            <tr>
              <td colspan="2"><b>Paracetamol/Panadol ok?:</b> ${formData.paracetamol || ''}</td>
              <td colspan="2"></td>
            </tr>
            <tr>
              <td colspan="4"><b>If unwell and parents unavailable, please provide two additional contacts:</b></td>
            </tr>
            <tr>
              <td><b>Name:</b> ${formData.alt1_name || ''}</td>
              <td><b>Tel:</b> ${formData.alt1_tel || ''}</td>
              <td><b>Relationship:</b> ${formData.alt1_relation || ''}</td>
              <td></td>
            </tr>
            <tr>
              <td><b>Name:</b> ${formData.alt2_name || ''}</td>
              <td><b>Tel:</b> ${formData.alt2_tel || ''}</td>
              <td><b>Relationship:</b> ${formData.alt2_relation || ''}</td>
              <td></td>
            </tr>
            <tr>
              <td colspan="4">
                <b>Signature:</b> ${formData.signature || ''}<br>
                <b>Terms Accepted:</b> ${formData.tcAcceptance ? 'Yes' : 'No'}
              </td>
            </tr>
          </table>
        </div>
      </body>
    </html>
  `;

  // Puppeteer section
  const browser = await require('puppeteer').launch({ headless: "new" });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
  await browser.close();
  return pdfBuffer;
}

const app = express();
const PORT = process.env.PORT || 3000;

// ----- Google Config -----const SHEET_ID_ADMISSIONS = process.env.SHEET_ID_ADMISSIONS;
const SHEET_ID_CLASS_LISTS = process.env.SHEET_ID_CLASS_LISTS;
const SHEET_ID_ADMISSIONS = process.env.SHEET_ID_ADMISSIONS;
const PDF_FOLDER_ID = process.env.PDF_FOLDER_ID;
const UPLOADS_FOLDER_ID = process.env.UPLOADS_FOLDER_ID;

// ----- Middlewares -----
app.use(cors());
app.use(express.urlencoded({ extended: true })); // For parsing form data
app.use(express.json());                         // For parsing JSON
app.use(express.static(path.join(__dirname, 'public')));

// Multer: In-memory file storage
const upload = multer({ storage: multer.memoryStorage() });
const cpUpload = upload.fields([
  { name: 'passport_size_photo', maxCount: 1 }, // for the one at the top
  { name: 'passport_photo', maxCount: 1 },      // in the table
  { name: 'report_card', maxCount: 1 },
  { name: 'birth_cert', maxCount: 1 },
  { name: 'passport_copy', maxCount: 1 }
]);

// ----- Mapping Classes to Sheet Tabs -----
const classToTabName = {
  "Baby class": "Baby class",
  "Middle class": "Middle class",
  "Top Class": "Top Class",
  "Grade 1": "Grade 1",
  "Grade 2": "Grade 2",
  "Grade 3": "Grade 3",
  "Grade 4": "Grade 4",
  "Grade 5": "Grade 5",
  "Grade 6": "Grade 6",
  "Year 7": "Year 7",
  "Year 8": "Year 8",
  "Year 9": "Year 9",
  "Year 10": "Year 10",
  "Year 11": "Year 11",
  "Year 12": "Year 12",
  "Year 13": "Year 13"
  // Add more if you add tabs!
};
const classToFolderId = {
  "Baby class": process.env.FOLDER_BABY_CLASS,
  "Middle class": process.env.FOLDER_MIDDLE_CLASS,
  "Top Class": process.env.FOLDER_TOP_CLASS,
  "Grade 1": process.env.FOLDER_GRADE_1,
  "Grade 2": process.env.FOLDER_GRADE_2,
  "Grade 3": process.env.FOLDER_GRADE_3,
  "Grade 4": process.env.FOLDER_GRADE_4,
  "Grade 5": process.env.FOLDER_GRADE_5,
  "Grade 6": process.env.FOLDER_GRADE_6,
  "Year 7": process.env.FOLDER_YEAR_7,
  "Year 8": process.env.FOLDER_YEAR_8,
  "Year 9": process.env.FOLDER_YEAR_9,
  "Year 10": process.env.FOLDER_YEAR_10,
  "Year 11": process.env.FOLDER_YEAR_11,
  "Year 12": process.env.FOLDER_YEAR_12,
  "Year 13": process.env.FOLDER_YEAR_13
};
const allClassListTabs = [
  "Baby class list",
  "Middle class list",
  "Top class list",
  "Grade 1 list",
  "Grade 2 list",
  "Grade 3 list",
  "Grade 4 list",
  "Grade 5 list",
  "Grade 6 list",
  "Year 7 list",
  "Year 8 list",
  "Year 9 list",
  "Year 10 list",
  "Year 11 list",
  "Year 12 list",
  "Year 13 list"
];

// === MASTER LIST MERGE FUNCTION ===
async function addToMasterList(sheets, SHEET_ID_CLASS_LISTS, classApplied, studentName) {
  const masterColumns = [
    "BABY CLASS", "MIDDLE CLASS", "TOP CLASS", "GRADE 1", "GRADE 2",
    "GRADE 3", "GRADE 4", "GRADE 5", "GRADE 6", "YEAR 7",
    "YEAR 8", "YEAR 9", "YEAR 10", "YEAR 11", "YEAR 12", "YEAR 13"
  ];

  // Normalize function: converts e.g. 'Grade 3' -> 'GRADE 3'
  function normalizeClass(val) {
    return (val || "").replace(/\s+/g, " ").trim().toUpperCase();
  }

  // Debug logs, optional but helpful!
  console.log("classApplied RAW:", classApplied);
  console.log("classApplied normalized:", normalizeClass(classApplied));
  console.log("masterColumns:", masterColumns);

  const colIndex = masterColumns.findIndex(
    col => col === normalizeClass(classApplied)
  );

  if (colIndex === -1) throw new Error("Class column not found in master list!");

  // ---- FIX: Actually fetch the data from Google Sheets first! ----
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID_CLASS_LISTS,
    range: 'MASTER LIST!A1:P1000'  // Adjust if you ever add columns
  });

  const values = res.data.values || [];
  // Header is row 0; data starts at row 1

  // Find next empty row in the correct column (start from row 2: index 1)
  let nextRow = 1;
  while (
    values[nextRow] &&
    values[nextRow][colIndex] &&
    values[nextRow][colIndex].trim() !== ""
  ) {
    nextRow++;
  }

  // Calculate the correct column letter (A, B, C, etc.)
  const colLetter = String.fromCharCode("A".charCodeAt(0) + colIndex);
  const range = `MASTER LIST!${colLetter}${nextRow + 1}`; // e.g., C5

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID_CLASS_LISTS,
    range: range,
    valueInputOption: 'RAW',
    requestBody: {
      values: [[studentName]]
    }
  });
}




// === END MASTER LIST MERGE FUNCTION ===


// ----- Health Check -----
app.get('/ping', (req, res) => {
  res.send('pong');
});

// ----- /admissions Route -----
app.post('/admissions', cpUpload, async (req, res) => {
  try {
    // Upload files to Google Drive and get shareable links
    const uploads = {};
    for (const field of ['passport_photo', 'report_card', 'passport_copy', 'birth_cert']) {
      if (req.files[field]) {
        const file = req.files[field][0];
        const driveRes = await drive.files.create({
          requestBody: {
            name: file.originalname,
            mimeType: file.mimetype,
            parents: [UPLOADS_FOLDER_ID],
          },
          media: {
            mimeType: file.mimetype,
            body: Readable.from(file.buffer),
          },
        });
        await drive.permissions.create({
          fileId: driveRes.data.id,
          requestBody: { role: 'reader', type: 'anyone' },
        });
        uploads[field] = `https://drive.google.com/uc?id=${driveRes.data.id}`;
      } else {
        uploads[field] = '';
      }
    }

    // Build the row to insert into Google Sheets
    const body = req.body;

    let pdfBuffer = await generateAdmissionPDF(body, uploads.passport_photo);

    // Auto-fill logic (for 'no', 'none' etc)
    if (body.allergies && ['no', 'none'].includes((body.allergies + '').toLowerCase())) body.allergy_details = 'No';
    if (body.medication && (body.medication + '').toLowerCase() === 'no') body.medication_details = 'No';
    if (body.siblings_at_aps && (body.siblings_at_aps + '').toLowerCase() === 'no') body.siblings_details = 'No';

    // Update this row to match your sheet columns order:
    const row = [
      body.full_name, body.date_of_birth, body.gender, body.country_of_birth,
      body.nationality, body.mother_tongue, body.publish_photos, body.classApplied,
      body.studentType, body.home_address, body.previous_school, body.last_completed_year,
      body.father_name, body.father_mobile, body.father_email, body.father_address,
      body.father_occupation, body.father_employer, body.mother_name, body.mother_mobile,
      body.mother_email, body.mother_address, body.mother_occupation, body.mother_employer,
      body.guardian_name, body.guardian_relation, body.guardian_mobile, body.guardian_email,
      body.guardian_occupation, body.guardian_employer, body.emergency1_name, body.emergency1_tel,
      body.emergency1_relation, body.emergency2_name, body.emergency2_tel, body.emergency2_relation,
      body.siblings_at_aps, body.siblings_details, uploads.passport_photo, uploads.report_card,
      uploads.birth_cert, uploads.passport_copy, body.remarks, body.referred_by, body.admission_date,
      body.yearband_admitted, body.allergies, body.allergy_details, body.paracetamol, body.alt1_name,
      body.alt1_tel, body.alt1_relation, body.alt2_name, body.alt2_tel, body.alt2_relation,
      body.tcAcceptance ? 'Yes' : 'No', body.signature, 'Pending', 'Processed'
    ];

    // Find the correct sheet tab
    const classApplied = body.classApplied;
    const tabName = classToTabName[classApplied];

    if (!tabName) {
      return res.status(400).json({ error: `No sheet tab configured for class "${classApplied}"` });
    }

   await sheets.spreadsheets.values.append({
  spreadsheetId: SHEET_ID_ADMISSIONS,
  range: `${tabName}!A1`,
  valueInputOption: 'RAW',
  requestBody: { values: [row] },
});


    // === PDF Generation and Google Drive Upload ===
    // --- CONVERT to Buffer if needed ---
    if (!(pdfBuffer instanceof Buffer)) {
      pdfBuffer = Buffer.from(pdfBuffer);
    }
    const pdfStream = Readable.from(pdfBuffer);

    const pdfDriveRes = await drive.files.create({
      requestBody: {
        name: `${body.full_name}_admission.pdf`,
        mimeType: 'application/pdf',
        parents: [PDF_FOLDER_ID]
      },

      media: {
        mimeType: 'application/pdf',
        body: pdfStream,
      },
    });

    const classFolderId = classToFolderId[body.classApplied];

if (classFolderId) {
  await drive.files.copy({
    fileId: pdfDriveRes.data.id,
    requestBody: {
      parents: [classFolderId],
      name: `${body.full_name}_admission.pdf` // optional rename
    }
  });
}


    await drive.permissions.create({
      fileId: pdfDriveRes.data.id,
      requestBody: { role: 'reader', type: 'anyone' },
    });
    const pdfUrl = `https://drive.google.com/uc?id=${pdfDriveRes.data.id}`;

    // 3. Add the PDF link to your PDF Links tab
   await sheets.spreadsheets.values.append({
  spreadsheetId: SHEET_ID_ADMISSIONS,
  range: `PDF Links!A1`,
  valueInputOption: 'RAW',
  requestBody: { values: [[body.full_name, body.classApplied, pdfUrl]] },
});


    // NO EMAIL SENDING HERE!
// Add student to CLASS LISTS sheet
const classListTabName = {
  "Baby class": "Baby class list",
  "Middle class": "Middle class list",
  "Top Class": "Top class list",
  "Grade 1": "Grade 1 list",
  "Grade 2": "Grade 2 list",
  "Grade 3": "Grade 3 list",
  "Grade 4": "Grade 4 list",
  "Grade 5": "Grade 5 list",
  "Grade 6": "Grade 6 list",
  "Year 7": "Year 7 list",
  "Year 8": "Year 8 list",
  "Year 9": "Year 9 list",
  "Year 10": "Year 10 list",
  "Year 11": "Year 11 list",
  "Year 12": "Year 12 list",
  "Year 13": "Year 13 list"
};
const listTab = classListTabName[body.classApplied];
if (listTab) {
  // Get existing rows for Serial Number
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID_CLASS_LISTS,
    range: `${listTab}!A:A`,
  });
  const serialNumber = (existing.data.values ? existing.data.values.length : 1);

  // Prepare row for class list (add "" for unused columns as needed)
  const classListRow = [
    body.full_name || "",       // Student Name
    body.gender || "",          // SEX
    body.nationality || "",     // NATIONALITY
    body.studentType || "",     // DAY/BOARDING
    "", "", "", "", "", ""      // Padding for the other columns
  ];

  // Append row to the class list
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID_CLASS_LISTS,
    range: `${listTab}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: [classListRow] },
  });
  await addToMasterList(
  sheets,
  SHEET_ID_CLASS_LISTS,
  body.classApplied,
  body.full_name || ""
);
}

    // Respond to client
    res.json({ success: true, pdfUrl });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


// ====== /sendEmail Route Handler (OUTSIDE /admissions, just once!) ======
app.post('/sendEmail', async (req, res) => {
  try {
    const { email } = req.body; // get data from frontend

    if (!email) throw new Error("No email provided");

    // Build email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "African Pearl School Payment Details",
      text: `
Dear Parent/Guardian,

Thank you for your application. Please find attached the school Terms & Conditions.

Payment Details:
- Pay via SchoolPay code X or Equity Bank UGX 01103555107104.
- Fees are non-refundable; late fees incur 5% per week.
- After payment, print & sign your form and submit with your receipt.

If you have any questions, reply to this email.

Regards,
African Pearl International School
      `,
      attachments: [
        {
          filename: "African_Pearl_Terms_and_Conditions.pdf",
          path: TERMS_PATH, // <<--- attach from file, not buffer
          contentType: "application/pdf"
        }
      ]
    };

    await transporter.sendMail(mailOptions);

    res.json({ success: true, msg: 'Payment instructions sent!' });
  } catch (err) {
    console.error("Email sending error:", err);
    res.status(500).json({ error: "Failed to send email." });
  }
});

app.get('/terms-pdf', (req, res) => {
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': 'attachment; filename="African_Pearl_Terms_and_Conditions.pdf"'
  });
  fs.createReadStream(TERMS_PATH).pipe(res);
});


// ----- SPA Fallback Handler -----
// For any GET not matched above, serve index.html. For other methods, 404.
app.use((req, res) => {
  if (req.method === 'GET') {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } else {
    res.status(404).end();
  }
});

// ----- Start the Server -----
app.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});
