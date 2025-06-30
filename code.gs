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
    // Validate PDF link (Google Drive or GitHub raw)
    if (pdfLink && !(pdfLink.includes('drive.google.com') || pdfLink.includes('raw.githubusercontent.com'))) {
      Logger.log('Invalid PDF link at row ' + (i + 1) + ': ' + pdfLink);
      continue;
    }
    // Validate resource link (Google Drive or GitHub raw)
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
          // Validate PDF link (Google Drive or GitHub raw)
          if (pdfLink && !(pdfLink.includes('drive.google.com') || pdfLink.includes('raw.githubusercontent.com'))) {
            Logger.log('Invalid PDF link for question ' + questionData[j][0] + ': ' + pdfLink);
            return ContentService.createTextOutput(JSON.stringify({ error: "Invalid PDF link for question: " + questionData[j][0] }))
              .setMimeType(ContentService.MimeType.JSON);
          }
          // Validate resource link (Google Drive or GitHub raw)
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