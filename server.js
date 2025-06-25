// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { google } = require('googleapis');
const path = require('path');
const { Readable } = require('stream');

const app = express();
const PORT = process.env.PORT || 3000;

// ----- Google Config -----
const SHEET_ID = process.env.SHEET_ID;
const DRIVE_FOLDER_ID = process.env.DRIVE_FOLDER_ID;

// Authenticate with Google APIs using a Service Account
const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  scopes: [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/spreadsheets'
  ]
});
const drive = google.drive({ version: 'v3', auth });
const sheets = google.sheets({ version: 'v4', auth });

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
  "Top class": "Top class",
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


// ----- Health Check -----
app.get('/ping', (req, res) => {
  res.send('pong');
});

// ----- Admissions Endpoint -----
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
            parents: [DRIVE_FOLDER_ID],
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

    // Auto-fill logic (for 'no', 'none' etc)
    if (body.allergies && ['no', 'none'].includes(body.allergies.toLowerCase())) body.allergy_details = 'No';
    if (body.dietary_requirements && body.dietary_requirements.toLowerCase() === 'no') body.dietary_details = 'No';
    if (body.medication && body.medication.toLowerCase() === 'no') body.medication_details = 'No';
    if (body.siblings_at_aps && body.siblings_at_aps.toLowerCase() === 'no') body.siblings_details = 'No';

    // Update this row to match your sheet columns order:
    const row = [
      body.full_name,
      body.gender,
      body.studentType,
      body.date_of_birth,
      body.country_of_birth,
      body.nationality,
      body.mother_tongue,
      body.meal_preference,
      body.publish_photos,
      body.home_address,
      body.previous_school,
      body.last_completed_year,
      body.father_name,
      body.father_mobile,
      body.father_email,
      body.father_address,
      body.father_occupation,
      body.father_employer,
      body.mother_name,
      body.mother_mobile,
      body.mother_email,
      body.mother_address,
      body.mother_occupation,
      body.mother_employer,
      body.guardian_name,
      body.guardian_relation,
      body.guardian_occupation,
      body.guardian_mobile,
      body.guardian_email,
      body.emergency1_name,
      body.emergency1_tel,
      body.emergency1_relation,
      body.emergency2_name,
      body.emergency2_tel,
      body.emergency2_relation,
      body.siblings_at_aps,
      body.siblings_details,
      uploads.passport_photo,
      uploads.report_card,
      uploads.immunization_card,
      uploads.birth_cert,
      body.allergies,
      body.allergy_details,
      body.medication,
      body.medication_details,
      body.ok_to_give_paracetamol,
      body.immunized_tetanus,
      body.immunized_polio,
      body.immunized_measles,
      body.immunized_tb,
      body.immunized_others,
      body.dietary_requirements,
      body.dietary_details,
      body.alt_contact1_name,
      body.alt_contact1_tel,
      body.alt_contact1_relation,
      body.alt_contact2_name,
      body.alt_contact2_tel,
      body.alt_contact2_relation,
      body.other_conditions_details,
      "Pending",    // Payment Status
      "Processed"   // Processed
    ];

    // Find the correct sheet tab
    const classApplied = body.classApplied;
    const tabName = classToTabName[classApplied];

    if (!tabName) {
      return res.status(400).json({ error: `No sheet tab configured for class "${classApplied}"` });
    }

    // Append to the Google Sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${tabName}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [row] },
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
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
