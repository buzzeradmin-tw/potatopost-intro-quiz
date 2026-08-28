/**
 * PotatoPost 任務問卷收件端。
 * 部署方式見 交接筆記.md「資料收集」那段。
 *
 * 三層驗證：
 * 1. APP_SECRET 要跟前端 potatopost-intro-quiz.html 的 APP_SECRET 一致，不符合直接丟棄
 * 2. q1/q2/q3 必須是題目原本的選項內容（q1 可複選，前端直接送陣列，不要送合併字串——
 *    選項文字本身可能包含「、」，合併後無法安全切回去），uid 不能是空的
 * 3. 同一個 uid 在 SUBMIT_COOLDOWN_SECONDS 秒內重複送出，只收第一筆
 */
const APP_SECRET = '71410aed4be032bf480513ced8ed5f16';
const SUBMIT_COOLDOWN_SECONDS = 30;

const VALID_OPTIONS = {
  q1: [
    '更快完成社群貼文或行銷文案',
    '產出可直接使用的圖片或設計素材',
    '規劃影片腳本、分鏡或短影音',
    '維持一致的品牌風格與內容計畫',
    '還不確定，想先體驗看看'
  ],
  q2: [
    '個人創作者／自媒體經營者',
    '自由工作者／專業工作者',
    '創業者／企業經營者',
    '行銷、品牌或團隊成員',
    '學生／教師',
    '其他'
  ],
  q3: [
    '17 歲以下',
    '18–24 歲',
    '25–34 歲',
    '35–44 歲',
    '45–54 歲',
    '55 歲以上',
    '不方便回答'
  ]
};

function doPost(e) {
  const data = JSON.parse(e.postData.contents);

  if (!isValid(data)) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const cache = CacheService.getScriptCache();
  const cacheKey = 'submitted_' + data.uid;
  if (cache.get(cacheKey)) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, reason: 'duplicate' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  cache.put(cacheKey, '1', SUBMIT_COOLDOWN_SECONDS);

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  sheet.appendRow([
    new Date(),
    data.uid,
    formatForSheet(data.q1),
    formatForSheet(data.q2),
    formatForSheet(data.q3)
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function isValid(data) {
  if (!data || data.secret !== APP_SECRET) return false;
  if (!data.uid) return false;
  if (!isValidAnswer(data.q1, VALID_OPTIONS.q1, true)) return false;
  if (!isValidAnswer(data.q2, VALID_OPTIONS.q2, false)) return false;
  if (!isValidAnswer(data.q3, VALID_OPTIONS.q3, false)) return false;
  return true;
}

function isValidAnswer(value, options, multiple) {
  if (multiple) {
    if (!Array.isArray(value) || value.length === 0) return false;
    return value.every(function (v) { return options.indexOf(v) !== -1; });
  }
  return typeof value === 'string' && value !== '' && options.indexOf(value) !== -1;
}

function formatForSheet(value) {
  return Array.isArray(value) ? value.join('、') : value;
}
