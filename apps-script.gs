/**
 * PotatoPost 任務問卷收件端。
 * 部署方式見 repo README 或跟 Claude 對話紀錄裡的部署步驟。
 */
function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = JSON.parse(e.postData.contents);

  sheet.appendRow([
    new Date(),
    data.uid || '',
    data.q1 || '',
    data.q2 || '',
    data.q3 || ''
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
