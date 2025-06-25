require('dotenv').config();
const fs = require('fs'); // <--- Add this
// ... other imports
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { google } = require('googleapis');
const path = require('path');
const { Readable } = require('stream');

// --- Service Account JSON write (must be before GoogleAuth) ---
if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
  fs.writeFileSync(
    './google-credentials.json',
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  );
  process.env.GOOGLE_APPLICATION_CREDENTIALS = './google-credentials.json';
}


const app = express();
const PORT = process.env.PORT || 3000;

// ----- Google Config -----
const SHEET_ID = process.env.SHEET_ID;
const DRIVE_FOLDER_ID = process.env.DRIVE_FOLDER_ID;

// Authenticate with Google APIs using a Service Account
// Authenticate with Google APIs using a Service Account
const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS, // <--- this is now correct
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
  body.full_name,                                 // Full Name
  body.date_of_birth,                             // Date of Birth
  body.gender,                                    // Gender
  body.country_of_birth,                          // Country of Birth
  body.nationality,                               // Nationality
  body.mother_tongue,                             // Mother Tongue
  body.publish_photos,                            // Publishing Photos (Yes/No)
  body.classApplied,                              // Class Applying For
  body.studentType,                               // Day / Boarding
  body.home_address,                              // Home Address
  body.previous_school,                           // Previous School Name and Address
  body.last_completed_year,                       // Last Completed Year-band/Class
  body.father_name,                               // Father’s Full Name
  body.father_mobile,                             // Father’s Mobile Number
  body.father_email,                              // Father’s Email Address
  body.father_address,                            // Father’s Address (if different)
  body.father_occupation,                         // Father’s Occupation
  body.father_employer,                           // Father’s Employer
  body.mother_name,                               // Mother’s Full Name
  body.mother_mobile,                             // Mother’s Mobile Number
  body.mother_email,                              // Mother’s Email Address
  body.mother_address,                            // Mother’s Address (if different)
  body.mother_occupation,                         // Mother’s Occupation
  body.mother_employer,                           // Mother’s Employer
  body.guardian_name,                             // Guardian Name
  body.guardian_relation,                         // Guardian Relationship
  body.guardian_mobile,                           // Guardian Mobile Number
  body.guardian_email,                            // Guardian Email Address
  body.guardian_occupation,                       // Guardian Occupation
  body.guardian_employer,                         // Guardian Employer
  body.emergency1_name,                           // Emergency Contact 1 Name
  body.emergency1_tel,                            // Emergency Contact 1 Tel
  body.emergency1_relation,                       // Emergency Contact 1 Relationship
  body.emergency2_name,                           // Emergency Contact 2 Name
  body.emergency2_tel,                            // Emergency Contact 2 Tel
  body.emergency2_relation,                       // Emergency Contact 2 Relationship
  body.siblings_at_aps,                           // Siblings at APS (Yes/No)
  body.siblings_details,                          // Siblings Names & Class
  uploads.passport_photo,                         // Passport Photo (URL)
  uploads.report_card,                            // Report Card (URL)
  uploads.birth_cert,                             // Birth Certificate (URL)
  uploads.passport_copy,                          // Passport Copy / National ID / Refugee Copy (URL)
  body.remarks,                                   // Remarks
  body.referred_by,                               // Referred By
  body.admission_date,                            // Date of Admission
  body.yearband_admitted,                         // Yearband Admitted To
  body.allergies,                                 // Allergies/Asthma/Others (Yes/No)
  body.allergy_details,                           // Allergy Details
  body.paracetamol,                               // Paracetamol/Panadol OK (Yes/No)
  body.alt1_name,                                 // Alternate Contact 1 Name
  body.alt1_tel,                                  // Alternate Contact 1 Tel
  body.alt1_relation,                             // Alternate Contact 1 Relationship
  body.alt2_name,                                 // Alternate Contact 2 Name
  body.alt2_tel,                                  // Alternate Contact 2 Tel
  body.alt2_relation,                             // Alternate Contact 2 Relationship
  body.tcAcceptance ? 'Yes' : 'No',               // Agreement to Terms (Yes/No)
  body.signature,                                 // Signature (typed name)
  'Pending',                                      // Pending
  'Processed'                                     // Processed
  // Add '' if you have more columns but not in use (for padding)
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
