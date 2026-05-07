// ============================================================
// プロンプト管理アプリ - GAS側コード（コード.gs）
// ============================================================
// 【設定】スプレッドシートIDをここに入力
const SPREADSHEET_ID = "ここにスプレッドシートIDを入力";
const SHEET_NAME_TEMPLATES = "templates";
const SHEET_NAME_CONFIG    = "config";

// ============================================================
// GETリクエスト（読み取り）
// action=getTemplates → テンプレート一覧を返す
// action=getPassword  → パスワードを返す
// ============================================================
function doGet(e) {
  const action = e.parameter.action;
  try {
    if (action === "getTemplates") {
      return jsonResponse(getTemplates());
    }
    if (action === "getPassword") {
      return jsonResponse(getPassword());
    }
    return jsonResponse({error: "unknown action"});
  } catch(err) {
    return jsonResponse({error: err.message});
  }
}

// ============================================================
// POSTリクエスト（書き込み）
// action=saveTemplates → テンプレート一覧を上書き保存
// action=savePassword  → パスワードを保存
// ============================================================
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;

    if (action === "saveTemplates") {
      saveTemplates(body.templates);
      return jsonResponse({ok: true});
    }
    if (action === "savePassword") {
      savePassword(body.password);
      return jsonResponse({ok: true});
    }
    return jsonResponse({error: "unknown action"});
  } catch(err) {
    return jsonResponse({error: err.message});
  }
}

// ============================================================
// テンプレート取得
// ============================================================
function getTemplates() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME_TEMPLATES);
  if (!sheet) return {templates: []};

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return {templates: []};

  // 1行目はヘッダー（id, category, title, prompt, visible）
  const templates = data.slice(1)
    .filter(row => row[0] && row[2] && row[3])
    .map(row => ({
      id:       String(row[0]).trim(),
      category: String(row[1] || "未分類").trim(),
      title:    String(row[2]).trim(),
      prompt:   String(row[3]).trim(),
      visible:  String(row[4]).trim() === "false" ? false : true
    }));

  return {templates};
}

// ============================================================
// テンプレート保存（上書き）
// ============================================================
function saveTemplates(templates) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME_TEMPLATES);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME_TEMPLATES);
  }

  // シートをクリアして書き直し
  sheet.clearContents();

  const rows = [["id", "category", "title", "prompt", "visible"]];
  templates.forEach(t => {
    rows.push([t.id, t.category, t.title, t.prompt, t.visible === false ? "false" : "true"]);
  });

  sheet.getRange(1, 1, rows.length, 5).setValues(rows);
}

// ============================================================
// パスワード取得
// ============================================================
function getPassword() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME_CONFIG);
  if (!sheet) return {password: ""};

  const data = sheet.getDataRange().getValues();
  const row = data.find(r => String(r[0]).trim() === "admin_password");
  return {password: row ? String(row[1]).trim() : ""};
}

// ============================================================
// パスワード保存
// ============================================================
function savePassword(password) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME_CONFIG);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME_CONFIG);
    sheet.appendRow(["key", "value"]);
  }

  const data = sheet.getDataRange().getValues();
  const rowIdx = data.findIndex(r => String(r[0]).trim() === "admin_password");
  if (rowIdx >= 0) {
    sheet.getRange(rowIdx + 1, 2).setValue(password);
  } else {
    sheet.appendRow(["admin_password", password]);
  }
}

// ============================================================
// レスポンスヘルパー（CORS対応）
// ============================================================
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
