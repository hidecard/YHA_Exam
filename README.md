# Exam System Documentation

## Overview
The Exam System is a web-based application designed to deliver exam questions, associated PDF documents, and resource files to users. The system fetches data from a Google Sheet, validates links, and renders PDFs using `pdf.js`. Questions and PDFs are displayed based on an Exam ID, with navigation for multiple questions. The system uses GitHub raw links for both `PDF_Link` and `Resource_File_Link` to ensure direct file access.

### Features
- **Question Display**: Fetches and displays questions from a Google Sheet based on Exam ID.
- **PDF Rendering**: Renders all pages of a PDF file (`PDF_Link`) using `pdf.js`.
- **Resource Download**: Provides a download link for a resource file (`Resource_File_Link`).
- **Security**: Disables right-click, text selection, and print/screenshot functionalities.
- **Navigation**: Supports navigation between questions using Previous/Next buttons.

## System Components
1. **Google Sheets**:
   - Stores exam questions and metadata.
   - Sheets: `Questions` and `Exams`.
2. **Google Apps Script (`Code.gs`)**:
   - Acts as a backend API to fetch data from Google Sheets.
   - Validates `PDF_Link` and `Resource_File_Link` for Google Drive or GitHub raw links.
3. **Frontend (`index.html`, `app.js`)**:
   - `index.html`: User interface with Bootstrap for styling and `pdf.js` for PDF rendering.
   - `app.js`: Handles API requests, renders questions and PDFs, and manages navigation.
4. **GitHub Repository**:
   - Hosts PDF files (`html_tag_explanation.pdf`, `js coding challenge outline.pdf`) in the `YHA-Center/exam` repository under the `main` branch.
   - Provides raw links for direct file access.

## Setup Instructions
### Prerequisites
- A Google account with access to Google Sheets and Google Apps Script.
- A GitHub account with write access to the `YHA-Center/exam` repository.
- A local server (e.g., VS Code Live Server) to run the frontend.
- Basic knowledge of HTML, JavaScript, and Google Apps Script.

### 1. Google Sheets Setup
1. **Create a Google Sheet** with two sheets: `Questions` and `Exams`.
2. **Questions Sheet**:
   - Structure:
     ```
     ID,Category,Question,Answer,PDF_Link,Resource_File_Link
     Q1,Html,What is an HTML tag?,,https://raw.githubusercontent.com/YHA-Center/exam/main/html_tag_explanation.pdf,https://raw.githubusercontent.com/YHA-Center/exam/main/js%20coding%20challenge%20outline.pdf
     ```
   - Ensure `PDF_Link` and `Resource_File_Link` are GitHub raw links (`raw.githubusercontent.com`).
3. **Exams Sheet**:
   - Structure:
     ```
     Exam_ID,Category,Question_IDs,Start_Time,End_Time
     E1,Html,Q1,2025-06-26 10:00,2025-06-26 12:00
     ```
4. Share the Google Sheet with edit access to the Google account used for Google Apps Script.

### 2. GitHub Setup
1. Navigate to `https://github.com/YHA-Center/exam`.
2. Upload PDF files (`html_tag_explanation.pdf`, `js coding challenge outline.pdf`) to the `main` branch.
3. Get the raw links:
   - `https://raw.githubusercontent.com/YHA-Center/exam/main/html_tag_explanation.pdf`
   - `https://raw.githubusercontent.com/YHA-Center/exam/main/js%20coding%20challenge%20outline.pdf`
4. Test the raw links in a browser to ensure they download the PDFs directly.

### 3. Google Apps Script Setup
1. Open Google Apps Script (script.google.com) and create a new project.
2. Copy and paste the provided `Code.gs`:
   ```javascript
   function doGet(e) {
     Logger.log('Received event: ' + JSON.stringify(e));
     
     if (!e || !e.parameter) {
       Logger.log('Error: No parameters provided');
       return ContentService.createTextOutput(JSON.stringify({ error: "No parameters provided" }))
         .setMimeType(ContentService.MimeType.JSON);
     }
   
     const action = e.parameter.action;
     Logger.log('Action: ' + action);
     const sheet = SpreadsheetApp.getActiveSpreadsheet();
     
     if (action === "getQuestions") {
       return getQuestions(e);
     } else if (action === "getExam") {
       return getExam(e);
     }
     
     return ContentService.createTextOutput(JSON.stringify({ error: "Invalid action" }))
       .setMimeType(ContentService.MimeType.JSON);
   }
   
   function getQuestions(e) {
     const category = e.parameter.category ? e.parameter.category.toLowerCase() : "";
     const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Questions");
     if (!sheet) {
       Logger.log('Error: Questions sheet not found');
       return ContentService.createTextOutput(JSON.stringify({ error: "Questions sheet not found" }))
         .setMimeType(ContentService.MimeType.JSON);
     }
     const data = sheet.getDataRange().getValues();
     let response = [];
     
     for (let i = 1; i < data.length; i++) {
       if (category && data[i][1].toLowerCase() !== category) continue;
       const pdfLink = data[i][4] ? data[i][4].toString().trim() : "";
       const resourceLink = data[i][5] ? data[i][5].toString().trim() : "";
       if (pdfLink && !(pdfLink.includes('drive.google.com') || pdfLink.includes('raw.githubusercontent.com'))) {
         Logger.log('Invalid PDF link at row ' + (i + 1) + ': ' + pdfLink);
         continue;
       }
       if (resourceLink && !(resourceLink.includes('drive.google.com') || resourceLink.includes('raw.githubusercontent.com'))) {
         Logger.log('Invalid resource link at row ' + (i + 1) + ': ' + resourceLink);
         continue;
       }
       response.push({
         id: data[i][0],
         category: data[i][1],
         question: data[i][2],
         pdf_link: pdfLink,
         resource_link: resourceLink
       });
     }
     
     if (response.length === 0) {
       Logger.log('Error: No questions found for category: ' + category);
       return ContentService.createTextOutput(JSON.stringify({ error: "No questions found for category: " + category }))
         .setMimeType(ContentService.MimeType.JSON);
     }
     
     return ContentService.createTextOutput(JSON.stringify(response))
       .setMimeType(ContentService.MimeType.JSON);
   }
   
   function getExam(e) {
     const examId = e.parameter.examId;
     const questionIndex = parseInt(e.parameter.questionIndex) || 0;
     if (!examId) {
       Logger.log('Error: Exam ID is required');
       return ContentService.createTextOutput(JSON.stringify({ error: "Exam ID is required" }))
         .setMimeType(ContentService.MimeType.JSON);
     }
     
     const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Exams");
     if (!sheet) {
       Logger.log('Error: Exams sheet not found');
       return ContentService.createTextOutput(JSON.stringify({ error: "Exams sheet not found" }))
         .setMimeType(ContentService.MimeType.JSON);
     }
     const data = sheet.getDataRange().getValues();
     
     for (let i = 1; i < data.length; i++) {
       if (data[i][0] === examId) {
         const questionIds = data[i][2].split(",");
         if (questionIndex >= questionIds.length) {
           Logger.log('Error: No more questions');
           return ContentService.createTextOutput(JSON.stringify({ error: "No more questions" }))
             .setMimeType(ContentService.MimeType.JSON);
         }
         const questionSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Questions");
         if (!questionSheet) {
           Logger.log('Error: Questions sheet not found');
           return ContentService.createTextOutput(JSON.stringify({ error: "Questions sheet not found" }))
             .setMimeType(ContentService.MimeType.JSON);
         }
         const questionData = questionSheet.getDataRange().getValues();
         for (let j = 1; j < questionData.length; j++) {
           if (questionData[j][0] === questionIds[questionIndex]) {
             const pdfLink = questionData[j][4] ? questionData[j][4].toString().trim() : "";
             const resourceLink = questionData[j][5] ? questionData[j][5].toString().trim() : "";
             if (pdfLink && !(pdfLink.includes('drive.google.com') || pdfLink.includes('raw.githubusercontent.com'))) {
               Logger.log('Invalid PDF link for question ' + questionData[j][0] + ': ' + pdfLink);
               return ContentService.createTextOutput(JSON.stringify({ error: "Invalid PDF link for question: " + questionData[j][0] }))
                 .setMimeType(ContentService.MimeType.JSON);
             }
             if (resourceLink && !(resourceLink.includes('drive.google.com') || resourceLink.includes('raw.githubusercontent.com'))) {
               Logger.log('Invalid resource link for question ' + questionData[j][0] + ': ' + resourceLink);
               return ContentService.createTextOutput(JSON.stringify({ error: "Invalid resource link for question: " + questionData[j][0] }))
                 .setMimeType(ContentService.MimeType.JSON);
             }
             return ContentService.createTextOutput(JSON.stringify({
               id: questionData[j][0],
               question: questionData[j][2],
               pdf_link: pdfLink,
               resource_link: resourceLink,
               questionIndex: questionIndex,
               totalQuestions: questionIds.length
             })).setMimeType(ContentService.MimeType.JSON);
           }
         }
       }
     }
     
     Logger.log('Error: Exam not found');
     return ContentService.createTextOutput(JSON.stringify({ error: "Exam not found" }))
       .setMimeType(ContentService.MimeType.JSON);
   }
   ```
3. Deploy the script as a web app:
   - **Execute as**: Me
   - **Who has access**: Anyone
4. Copy the deployed URL (e.g., `https://script.google.com/macros/s/AKfycbwP2m20Mb3Jkmp351o-l4NV9j7B8bDytq229agCj53j3OZV0jX-ONCkv7ES03zARvtsWg/exec`).

### 4. Frontend Setup
1. Create a project folder with the following files:
   - `index.html`
   - `app.js`
2. **index.html**:
   ```html
   <!DOCTYPE html>
   <html lang="en">
   <head>
     <meta charset="UTF-8">
     <meta name="viewport" content="width=device-width, initial-scale=1.0">
     <title>Exam System</title>
     <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
     <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.9.359/pdf.min.js"></script>
     <style>
       #pdfViewer canvas {
         pointer-events: none; /* Prevent interaction */
       }
       body {
         user-select: none; /* Prevent text selection */
       }
     </style>
   </head>
   <body>
     <div class="container mt-5">
       <h1>Exam System</h1>
       <div class="mb-3">
         <label for="examId" class="form-label">Enter Exam ID</label>
         <input type="text" id="examId" class="form-control" placeholder="E1">
         <button class="btn btn-primary mt-2" onclick="startExam()">Start Exam</button>
       </div>
       <div id="questionContainer" class="mt-4"></div>
       <div id="pdfViewer" class="mt-4"></div>
       <a id="resourceDownload" class="btn btn-primary mt-2" href="#" style="display:none;">Download Resource</a>
       <div class="mt-3">
         <button id="prevBtn" class="btn btn-secondary" onclick="prevQuestion()" style="display:none;">Previous</button>
         <button id="nextBtn" class="btn btn-secondary" onclick="nextQuestion()" style="display:none;">Next</button>
       </div>
     </div>
     <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
     <script src="app.js"></script>
     <script>
       document.addEventListener('contextmenu', e => e.preventDefault());
       document.addEventListener('keydown', e => {
         if (e.key === 'PrintScreen' || (e.ctrlKey && e.key === 'p')) {
           e.preventDefault();
           alert('Screenshots and printing are disabled.');
         }
       });
     </script>
   </body>
   </html>
   ```
3. **app.js**:
   ```javascript
   let currentExamId = '';
   let currentQuestionIndex = 0;
   let totalQuestions = 0;
   const API_URL = 'https://script.google.com/macros/s/AKfycbwP2m20Mb3Jkmp351o-l4NV9j7B8bDytq229agCj53j3OZV0jX-ONCkv7ES03zARvtsWg/exec';
   
   async function startExam() {
     currentExamId = document.getElementById('examId').value;
     if (!currentExamId) {
       alert('Please enter an Exam ID');
       return;
     }
     currentQuestionIndex = 0;
     await loadQuestion();
   }
   
   async function loadQuestion() {
     try {
       const response = await fetch(`${API_URL}?action=getExam&examId=${currentExamId}&questionIndex=${currentQuestionIndex}`);
       const data = await response.json();
       console.log('API Response:', data);
   
       if (data.error) {
         document.getElementById('questionContainer').innerHTML = `<p class="text-danger">${data.error}</p>`;
         return;
       }
   
       totalQuestions = data.totalQuestions;
       document.getElementById('questionContainer').innerHTML = `
         <h3>Question ${currentQuestionIndex + 1}</h3>
         <p>${data.question}</p>
       `;
   
       // Load PDF with pdf.js (all pages)
       if (data.pdf_link && data.pdf_link.includes('raw.githubusercontent.com')) {
         document.getElementById('pdfViewer').innerHTML = '';
         pdfjsLib.getDocument(data.pdf_link).promise.then(pdf => {
           const numPages = pdf.numPages;
           for (let pageNum = 1; pageNum <= numPages; pageNum++) {
             pdf.getPage(pageNum).then(page => {
               const canvas = document.createElement('canvas');
               canvas.style.marginBottom = '20px';
               document.getElementById('pdfViewer').appendChild(canvas);
               const context = canvas.getContext('2d');
               const viewport = page.getViewport({ scale: 1.5 });
               canvas.height = viewport.height;
               canvas.width = viewport.width;
               page.render({ canvasContext: context, viewport: viewport });
             });
           }
         }).catch(error => {
           console.error('PDF Error:', error);
           document.getElementById('pdfViewer').innerHTML = `<p class="text-danger">Error loading PDF: ${error.message}</p>`;
         });
       } else {
         document.getElementById('pdfViewer').innerHTML = `<p class="text-warning">No PDF available or invalid link</p>`;
       }
   
       // Resource download link
       if (data.resource_link && data.resource_link.includes('raw.githubusercontent.com')) {
         const downloadBtn = document.getElementById('resourceDownload');
         downloadBtn.href = data.resource_link;
         downloadBtn.style.display = 'block';
         downloadBtn.innerHTML = 'Download Resource';
       } else {
         document.getElementById('resourceDownload').style.display = 'none';
         document.getElementById('questionContainer').innerHTML += `<p class="text-warning">Invalid or missing resource link</p>`;
       }
   
       // Show/hide navigation buttons
       document.getElementById('prevBtn').style.display = currentQuestionIndex > 0 ? 'inline-block' : 'none';
       document.getElementById('nextBtn').style.display = currentQuestionIndex < totalQuestions - 1 ? 'inline-block' : 'none';
     } catch (error) {
       console.error('Error loading question:', error);
       document.getElementById('questionContainer').innerHTML = `<p class="text-danger">Error loading question: ${error.message}</p>`;
     }
   }
   
   function prevQuestion() {
     if (currentQuestionIndex > 0) {
       currentQuestionIndex--;
       loadQuestion();
     }
   }
   
   function nextQuestion() {
     if (currentQuestionIndex < totalQuestions - 1) {
       currentQuestionIndex++;
       loadQuestion();
     }
   }
   ```
4. Run `index.html` on a local server (e.g., using VS Code Live Server).

## Usage Instructions
1. **Start the Exam**:
   - Open the web application in a browser.
   - Enter an Exam ID (e.g., `E1`) in the input field.
   - Click **Start Exam**.
2. **View Questions and PDFs**:
   - The question (e.g., "What is an HTML tag?") appears in the question container.
   - The associated PDF (`PDF_Link`) is rendered in the PDF viewer, displaying all pages.
   - A download button for the resource file (`Resource_File_Link`) appears if the link is valid.
3. **Navigate Questions**:
   - Use **Previous** and **Next** buttons to move between questions (if multiple questions exist).
4. **Security Features**:
   - Right-clicking is disabled to prevent copying.
   - Text selection is disabled.
   - Screenshots and printing are blocked with an alert message.

## Troubleshooting
### Common Issues
1. **Only Page 1 of PDF Displays**:
   - **Cause**: The previous `app.js` was set to render only page 1.
   - **Solution**: Ensure you’re using the updated `app.js`, which loops through all pages (`for (let pageNum = 1; pageNum <= numPages; pageNum++)`).
2. **"Invalid PDF link" or "Invalid resource link" Error**:
   - **Cause**: Google Sheets contains GitHub blob links (`github.com/.../blob/...`) instead of raw links (`raw.githubusercontent.com/...`).
   - **Solution**:
     - Update Google Sheets with raw links (e.g., `https://raw.githubusercontent.com/YHA-Center/exam/main/html_tag_explanation.pdf`).
     - Verify the files exist in the GitHub repository.
3. **PDF Fails to Load**:
   - **Cause**: Invalid or inaccessible raw link, or CORS issues.
   - **Solution**:
     - Test the raw link in a browser to ensure it downloads the PDF.
     - Check the browser console for errors like `InvalidPDFException`.
4. **"No questions found" or "Exam not found" Error**:
   - **Cause**: Incorrect Exam ID or mismatched data in Google Sheets.
   - **Solution**:
     - Verify the Exam ID (e.g., `E1`) matches the `Exams` sheet.
     - Ensure the `Question_IDs` column references valid IDs from the `Questions` sheet.

### Debugging Steps
1. **Check Google Apps Script Logs**:
   - Open Google Apps Script editor > View > Logs.
   - Look for errors like:
     ```
     Invalid PDF link for question Q1: https://github.com/YHA-Center/exam/blob/main/js%20coding%20challenge%20outline.pdf
     ```
   - Fix by replacing blob links with raw links in Google Sheets.
2. **Check Browser Console**:
   - Open Developer Tools (F12) > Console tab.
   - Look for errors like:
     ```
     PDF Error: InvalidPDFException
     ```
     or
     ```
     Error loading question: Failed to fetch
     ```
   - Ensure the API URL is correct and the Google Apps Script is deployed.
3. **Test API Directly**:
   - Use a browser or Postman to test:
     ```
     https://script.google.com/macros/s/AKfycbwP2m20Mb3Jkmp351o-l4NV9j7B8bDytq229agCj53j3OZV0jX-ONCkv7ES03zARvtsWg/exec?action=getExam&examId=E1&questionIndex=0
     ```
   - Expected response:
     ```json
     {
       "id": "Q1",
       "question": "What is an HTML tag?",
       "pdf_link": "https://raw.githubusercontent.com/YHA-Center/exam/main/html_tag_explanation.pdf",
       "resource_link": "https://raw.githubusercontent.com/YHA-Center/exam/main/js%20coding%20challenge%20outline.pdf",
       "questionIndex": 0,
       "totalQuestions": 1
     }
     ```

## Optional Enhancements
1. **Paginate PDF Pages**:
   - Add Previous/Next buttons to navigate PDF pages one at a time for better performance with large PDFs.
   - Example code (in `app.js`):
     ```javascript
     let currentPage = 1;
     let pdfDoc = null;
     function renderPage(pageNum) {
       pdfDoc.getPage(pageNum).then(page => {
         const canvas = document.createElement('canvas');
         document.getElementById('pdfViewer').innerHTML = '';
         document.getElementById('pdfViewer').appendChild(canvas);
         const context = canvas.getContext('2d');
         const viewport = page.getViewport({ scale: 1.5 });
         canvas.height = viewport.height;
         canvas.width = viewport.width;
         page.render({ canvasContext: context, viewport: viewport });
         document.getElementById('pdfViewer').innerHTML += `
           <div class="mt-2">
             <button id="prevPageBtn" class="btn btn-secondary" onclick="prevPage()">Previous Page</button>
             <button id="nextPageBtn" class="btn btn-secondary" onclick="nextPage()">Next Page</button>
           </div>
         `;
         updatePageButtons();
       });
     }
     function prevPage() {
       if (currentPage > 1) {
         currentPage--;
         renderPage(currentPage);
       }
     }
     function nextPage() {
       if (pdfDoc && currentPage < pdfDoc.numPages) {
         currentPage++;
         renderPage(currentPage);
       }
     }
     function updatePageButtons() {
       document.getElementById('prevPageBtn').disabled = currentPage <= 1;
       document.getElementById('nextPageBtn').disabled = currentPage >= pdfDoc.numPages;
     }
     ```
2. **Render Resource PDF**:
   - Add a `resourceViewer` div to `index.html`:
     ```html
     <div id="resourceViewer" class="mt-4"></div>
     ```
   - Update `app.js` to render all pages of `Resource_File_Link`:
     ```javascript
     if (data.resource_link && data.resource_link.includes('raw.githubusercontent.com')) {
       document.getElementById('resourceViewer').innerHTML = '';
       pdfjsLib.getDocument(data.resource_link).promise.then(pdf => {
         const numPages = pdf.numPages;
         for (let pageNum = 1; pageNum <= numPages; pageNum++) {
           pdf.getPage(pageNum).then(page => {
             const canvas = document.createElement('canvas');
             canvas.style.marginBottom = '20px';
             document.getElementById('resourceViewer').appendChild(canvas);
             const context = canvas.getContext('2d');
             const viewport = page.getViewport({ scale: 1.5 });
             canvas.height = viewport.height;
             canvas.width = viewport.width;
             page.render({ canvasContext: context, viewport: viewport });
           });
         }
       }).catch(error => {
         console.error('Resource PDF Error:', error);
         document.getElementById('resourceViewer').innerHTML = `<p class="text-danger">Error loading resource PDF</p>`;
       });
       const downloadBtn = document.getElementById('resourceDownload');
       downloadBtn.href = data.resource_link;
       downloadBtn.style.display = 'block';
       downloadBtn.innerHTML = 'Download Resource';
     } else {
       document.getElementById('resourceViewer').innerHTML = `<p class="text-warning">Invalid or missing resource link</p>`;
       document.getElementById('resourceDownload').style.display = 'none';
     }
     ```

## System Limitations
- **Performance**: Rendering large PDFs with many pages may slow down the browser. Consider pagination for better performance.
- **Security**: Basic protections (e.g., disabling right-click) are implemented, but advanced users may bypass them. For stronger security, consider server-side PDF restrictions or watermarking.
- **Link Validation**: Only Google Drive and GitHub raw links are supported. Other link types will be rejected.

## Maintenance
- **Update Google Sheets**: Regularly check that `PDF_Link` and `Resource_File_Link` are valid raw links.
- **Monitor GitHub Repository**: Ensure PDF files remain accessible and are not deleted or renamed.
- **Redeploy Google Apps Script**: If the script is updated, redeploy it and update the `API_URL` in `app.js`.

---

This documentation provides a comprehensive guide to setting up, using, and troubleshooting the Exam System. If you need further assistance or additional features, please specify the requirements.