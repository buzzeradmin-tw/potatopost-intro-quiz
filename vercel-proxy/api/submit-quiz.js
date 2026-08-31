// PotatoPost 任務問卷送出中介。
// 前端打這支 API，這支再拿著存在環境變數裡的 Apps Script 網址 + secret 轉發出去，
// 瀏覽器端從頭到尾看不到 script.google.com 的真正網址跟 secret。
//
// 需要的環境變數（用 `vercel env add` 設定）：
//   APPS_SCRIPT_URL  - apps-script.gs 部署後的 /exec 網址
//   APP_SECRET       - 要跟 apps-script.gs 裡的 APP_SECRET 一致
//
// 跟 apps-script.gs 重複做一次欄位驗證，是刻意的雙重把關：
// 就算之後 Apps Script 那層被繞過或改壞了，這層還是會擋。

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

const ALLOWED_ORIGIN_HINT = 'buzzeradmin-tw.github.io';

function isValidAnswer(value, options, multiple) {
  if (multiple) {
    return Array.isArray(value) && value.length > 0 && value.every((v) => options.includes(v));
  }
  return typeof value === 'string' && value !== '' && options.includes(value);
}

export default async function handler(req, res) {
  // 跟問卷頁不同網域，瀏覽器會先送 CORS 預檢（OPTIONS），這裡沒回應的話正式的 POST 根本送不出去。
  // 不用限制單一 origin：這支本來就是公開端點（本來的 Apps Script 也是），
  // 真正的把關是下面的 origin/欄位/secret 檢查，不是靠 CORS。
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false });
    return;
  }

  // 有帶 origin/referer 才檢查，很多 App 內嵌 WebView 不會帶這個 header，寬鬆一點避免誤擋正常用戶
  const origin = req.headers.origin || req.headers.referer || '';
  if (origin && !origin.includes(ALLOWED_ORIGIN_HINT)) {
    res.status(200).json({ ok: false });
    return;
  }

  let body;
  try {
    body = typeof req.body === 'object' && req.body !== null ? req.body : JSON.parse(req.body || '{}');
  } catch (e) {
    res.status(400).json({ ok: false });
    return;
  }

  const { uid, q1, q2, q3 } = body;

  if (
    !uid ||
    !isValidAnswer(q1, VALID_OPTIONS.q1, true) ||
    !isValidAnswer(q2, VALID_OPTIONS.q2, false) ||
    !isValidAnswer(q3, VALID_OPTIONS.q3, false)
  ) {
    res.status(200).json({ ok: false });
    return;
  }

  const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
  const APP_SECRET = process.env.APP_SECRET;

  if (!APPS_SCRIPT_URL || !APP_SECRET) {
    res.status(500).json({ ok: false, reason: 'server-not-configured' });
    return;
  }

  try {
    const upstream = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ secret: APP_SECRET, uid, q1, q2, q3 })
    });
    const text = await upstream.text();
    res.status(200).send(text);
  } catch (e) {
    res.status(200).json({ ok: false });
  }
}
