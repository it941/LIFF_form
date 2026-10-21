const CONFIG = {
  DRIVE_FOLDER_ID: '1PN7hUBYutmZokZPEFQivUtF20RmnlIif',
  MANAGER_KEY: 'MGR-7K2P-9XQ4-WN8H',
  MANAGER_REMOVE_KEY: 'MGR-OFF-5J3X-Q8TN',
  LOG_SHEET: 'Log',
  TZ: 'Asia/Bangkok',
  STATUS_PENDING: 'รออนุมัติ',
  STATUS_APPROVED: 'อนุมัติ',
  STATUS_REJECTED: 'ปฏิเสธ'
};

const FORMS = {
  purchase: {
    code: 'PR',
    sheet: 'จัดซื้อ',
    title: 'จัดซื้อ',
    icon: '🛒',
    desc: 'ขอซื้อสินค้า อุปกรณ์ หรือบริการ',
    color: '#1F7A4D',
    docLabel: 'ใบเสนอราคา / เอกสารแนบ',
    fields: [
      { key: 'requester', label: 'ชื่อผู้ขอ', type: 'text', required: true },
      { key: 'department', label: 'แผนก', type: 'text', required: true },
      { key: 'items', label: 'รายการ / รายละเอียด', type: 'textarea', required: true },
      { key: 'qty', label: 'จำนวน', type: 'number', required: true },
      { key: 'budget', label: 'งบประมาณโดยประมาณ (บาท)', type: 'number', required: false },
      { key: 'reason', label: 'เหตุผล', type: 'textarea', required: true },
      { key: 'needDate', label: 'วันที่ต้องการใช้', type: 'date', required: false }
    ]
  },
  repair: {
    code: 'RP',
    sheet: 'แจ้งซ่อม',
    title: 'แจ้งซ่อม',
    icon: '🔧',
    desc: 'แจ้งซ่อมอุปกรณ์ อาคาร หรือระบบ',
    color: '#B9770E',
    docLabel: 'เอกสารแนบ',
    fields: [
      { key: 'reporter', label: 'ชื่อผู้แจ้ง', type: 'text', required: true },
      { key: 'department', label: 'แผนก', type: 'text', required: true },
      { key: 'location', label: 'สถานที่ / อุปกรณ์', type: 'text', required: true },
      { key: 'symptom', label: 'อาการ', type: 'textarea', required: true },
      { key: 'urgency', label: 'ความเร่งด่วน', type: 'select', options: ['ต่ำ', 'กลาง', 'สูง'], required: true }
    ]
  },
  vehicle: {
    code: 'VH',
    sheet: 'ซ่อมรถ',
    title: 'ซ่อมรถ',
    icon: '🚗',
    desc: 'แจ้งซ่อมรถยนต์ของบริษัท',
    color: '#1F5F9E',
    docLabel: 'เอกสารแนบ',
    fields: [
      { key: 'reporter', label: 'ชื่อผู้แจ้ง', type: 'text', required: true },
      { key: 'plate', label: 'ทะเบียนรถ', type: 'text', required: true },
      { key: 'model', label: 'ยี่ห้อ / รุ่น', type: 'text', required: true },
      { key: 'mileage', label: 'เลขไมล์', type: 'number', required: false },
      { key: 'symptom', label: 'อาการ', type: 'textarea', required: true },
      { key: 'location', label: 'สถานที่ที่รถอยู่', type: 'text', required: true }
    ]
  }
};

const COMMON_HEAD = ['เลขเอกสาร', 'วันที่ส่ง', 'LINE userId', 'ชื่อ LINE', 'อ้างอิงเอกสารเดิม'];
const TAIL_HEAD = ['รูปภาพ', 'เอกสาร', 'โฟลเดอร์', 'สถานะ', 'ผู้ตัดสิน', 'วันที่ตัดสิน', 'เหตุผลปฏิเสธ'];
const LOG_HEAD = ['เวลา', 'เลขเอกสาร', 'ประเภท', 'การกระทำ', 'โดย', 'หมายเหตุ'];

function props() {
  return PropertiesService.getScriptProperties();
}

function ss() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function now() {
  return Utilities.formatDate(new Date(), CONFIG.TZ, 'yyyy-MM-dd HH:mm:ss');
}

function setup() {
  ensureSheets();
  DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID).getName();
  const p = props();
  ['CHANNEL_ACCESS_TOKEN', 'LIFF_ID', 'LOGIN_CHANNEL_ID'].forEach(function (k) {
    if (p.getProperty(k) == null) p.setProperty(k, '');
  });
  Logger.log('setup เสร็จ: สร้างชีตแล้ว เข้าถึง Drive ได้ กรุณาใส่ค่าใน Script Properties: CHANNEL_ACCESS_TOKEN, LIFF_ID, LOGIN_CHANNEL_ID แล้วตั้ง Webhook URL ของ LINE เป็น URL ของ Web app');
}

function ensureSheets() {
  const s = ss();
  Object.keys(FORMS).forEach(function (k) {
    const f = FORMS[k];
    let sh = s.getSheetByName(f.sheet);
    if (!sh) sh = s.insertSheet(f.sheet);
    if (sh.getLastRow() === 0) {
      const head = COMMON_HEAD.concat(f.fields.map(function (x) { return x.label; }), TAIL_HEAD);
      sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold').setBackground('#E8F0FE');
      sh.setFrozenRows(1);
    }
  });
  let lg = s.getSheetByName(CONFIG.LOG_SHEET);
  if (!lg) lg = s.insertSheet(CONFIG.LOG_SHEET);
  if (lg.getLastRow() === 0) {
    lg.getRange(1, 1, 1, LOG_HEAD.length).setValues([LOG_HEAD]).setFontWeight('bold').setBackground('#E8F0FE');
    lg.setFrozenRows(1);
  }
}

function log(docId, type, action, by, note) {
  try {
    ensureSheets();
    ss().getSheetByName(CONFIG.LOG_SHEET).appendRow([now(), docId || '', type || '', action || '', by || '', note || '']);
  } catch (e) {}
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return json({ ok: true, service: 'line-work-request', time: now() });
}

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return json({ ok: false, message: 'bad request' });
  }
  if (body && Array.isArray(body.events)) {
    body.events.forEach(function (ev) {
      try { handleEvent(ev); } catch (err) { log('', '', 'event_error', '', String(err)); }
    });
    return json({ ok: true });
  }
  return json(handleApi(body || {}));
}

function handleApi(b) {
  try {
    switch (b.action) {
      case 'config': return { ok: true, forms: clientForms(), managerSet: !!props().getProperty('MANAGER_USER_ID') };
      case 'whoAmI': return whoAmI(b.idToken);
      case 'registerManager': return registerManager(b.idToken, b.key);
      case 'submitForm': return submitForm(b.idToken, b.payload || {});
      case 'getMyDocs': return getMyDocs(b.idToken);
      case 'getPendingDocs': return getPendingDocs(b.idToken);
      case 'getRecentDocs': return getRecentDocs(b.idToken);
      case 'getDocument': return getDocument(b.idToken, b.docId);
      case 'decide': return decide(b.idToken, b.docId, b.decision, b.reason);
      default: return { ok: false, message: 'unknown action' };
    }
  } catch (err) {
    const m = String(err && err.message || err);
    if (m.indexOf('TOKEN_INVALID') >= 0) return { ok: false, error: 'TOKEN_INVALID', message: 'เซสชันหมดอายุ' };
    log('', '', 'api_error', b.action || '', m);
    return { ok: false, message: m };
  }
}

function clientForms() {
  const out = {};
  Object.keys(FORMS).forEach(function (k) {
    const f = FORMS[k];
    out[k] = { title: f.title, icon: f.icon, desc: f.desc, color: f.color, docLabel: f.docLabel, fields: f.fields };
  });
  return out;
}

function parseQuery(s, o) {
  o = o || {};
  String(s || '').split('&').forEach(function (kv) {
    if (!kv) return;
    const i = kv.indexOf('=');
    const k = i < 0 ? kv : kv.slice(0, i);
    const v = i < 0 ? '' : kv.slice(i + 1);
    o[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, ' '));
  });
  return o;
}

function handleEvent(ev) {
  const userId = ev.source && ev.source.userId;
  if (!userId || ev.source.type !== 'user') return;
  if (ev.type === 'message' && ev.message && ev.message.type === 'text') return handleText(ev, userId);
  if (ev.type === 'postback') return handlePostback(ev, userId);
}

function handleText(ev, userId) {
  const text = String(ev.message.text || '').trim();
  const p = props();
  if (text === CONFIG.MANAGER_KEY) {
    const prof = lineGetProfile(userId);
    const name = prof.displayName || '';
    p.setProperty('MANAGER_USER_ID', userId);
    p.setProperty('MANAGER_NAME', name);
    log('', '', 'set_manager', userId, name);
    return lineReply(ev.replyToken, [{ type: 'text', text: 'ตั้งคุณ (' + name + ') เป็น Manager ผู้อนุมัติของระบบเรียบร้อยแล้ว\nงานที่ส่งเข้ามาจะแจ้งเตือนมาที่แชทนี้' }]);
  }
  if (text === CONFIG.MANAGER_REMOVE_KEY) {
    const oldId = p.getProperty('MANAGER_USER_ID');
    const oldName = p.getProperty('MANAGER_NAME') || '';
    if (!oldId) return lineReply(ev.replyToken, [{ type: 'text', text: 'ตอนนี้ยังไม่มี Manager ในระบบ' }]);
    p.deleteProperty('MANAGER_USER_ID');
    p.deleteProperty('MANAGER_NAME');
    log('', '', 'remove_manager', userId, oldName);
    if (oldId !== userId) linePush(oldId, [{ type: 'text', text: 'คุณถูกถอดออกจากการเป็น Manager ผู้อนุมัติของระบบแล้ว' }]);
    return lineReply(ev.replyToken, [{ type: 'text', text: 'ถอด Manager (' + oldName + ') ออกแล้ว\nตอนนี้ระบบไม่มีผู้อนุมัติ งานใหม่จะยังไม่มีการแจ้งเตือนจนกว่าจะมีคนพิมพ์รหัสตั้ง Manager ใหม่' }]);
  }
  if (text.toLowerCase() === '/myid') {
    return lineReply(ev.replyToken, [{ type: 'text', text: userId }]);
  }
  const cache = CacheService.getScriptCache();
  const pending = cache.get('reject_' + userId);
  if (pending) {
    cache.remove('reject_' + userId);
    if (text === 'ยกเลิก') {
      return lineReply(ev.replyToken, [{ type: 'text', text: 'ยกเลิกการปฏิเสธ ' + pending + ' แล้ว' }]);
    }
    const r = updateStatus(pending, CONFIG.STATUS_REJECTED, { userId: userId, displayName: p.getProperty('MANAGER_NAME') }, text);
    return lineReply(ev.replyToken, [{ type: 'text', text: r.ok ? 'ปฏิเสธ ' + pending + ' แล้ว และแจ้งผู้ส่งเรียบร้อย' : r.message }]);
  }
}

function handlePostback(ev, userId) {
  const data = parseQuery(ev.postback.data);
  const managerId = props().getProperty('MANAGER_USER_ID');
  if (!managerId || userId !== managerId) {
    return lineReply(ev.replyToken, [{ type: 'text', text: 'คุณไม่ใช่ผู้อนุมัติของระบบ' }]);
  }
  const doc = findDoc(data.id);
  if (!doc) return lineReply(ev.replyToken, [{ type: 'text', text: 'ไม่พบเอกสาร ' + data.id }]);
  if (doc.status !== CONFIG.STATUS_PENDING) {
    return lineReply(ev.replyToken, [{ type: 'text', text: 'เอกสาร ' + doc.docId + ' ถูก' + doc.status + 'ไปแล้วเมื่อ ' + doc.decidedAt }]);
  }
  if (data.action === 'approve') {
    const r = updateStatus(doc.docId, CONFIG.STATUS_APPROVED, { userId: userId, displayName: props().getProperty('MANAGER_NAME') }, '');
    return lineReply(ev.replyToken, [{ type: 'text', text: r.ok ? 'อนุมัติ ' + doc.docId + ' แล้ว และแจ้งผู้ส่งเรียบร้อย' : r.message }]);
  }
  if (data.action === 'reject') {
    CacheService.getScriptCache().put('reject_' + userId, doc.docId, 600);
    return lineReply(ev.replyToken, [{ type: 'text', text: 'พิมพ์เหตุผลการปฏิเสธเอกสาร ' + doc.docId + ' ส่งมาได้เลย\n(พิมพ์ "ยกเลิก" ถ้าไม่ต้องการปฏิเสธ)' }]);
  }
}

function verifyUser(idToken) {
  if (!idToken) throw new Error('TOKEN_INVALID');
  const cache = CacheService.getScriptCache();
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, idToken).map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
  const cached = cache.get('tok_' + digest);
  let user;
  if (cached) {
    user = JSON.parse(cached);
  } else {
    const res = UrlFetchApp.fetch('https://api.line.me/oauth2/v2.1/verify', {
      method: 'post',
      payload: { id_token: idToken, client_id: props().getProperty('LOGIN_CHANNEL_ID') },
      muteHttpExceptions: true
    });
    if (res.getResponseCode() >= 300) {
      log('', '', 'token_error', '', res.getContentText());
      throw new Error('TOKEN_INVALID');
    }
    const d = JSON.parse(res.getContentText());
    user = { userId: d.sub, displayName: d.name || '', pictureUrl: d.picture || '' };
    cache.put('tok_' + digest, JSON.stringify(user), 3600);
  }
  user.isManager = user.userId === props().getProperty('MANAGER_USER_ID');
  return user;
}

function whoAmI(idToken) {
  return { ok: true, user: verifyUser(idToken) };
}

function registerManager(idToken, key) {
  const u = verifyUser(idToken);
  if (String(key || '').trim() !== CONFIG.MANAGER_KEY) return { ok: false, message: 'รหัสไม่ถูกต้อง' };
  props().setProperty('MANAGER_USER_ID', u.userId);
  props().setProperty('MANAGER_NAME', u.displayName);
  log('', '', 'set_manager', u.userId, u.displayName);
  linePush(u.userId, [{ type: 'text', text: 'ตั้งคุณ (' + u.displayName + ') เป็น Manager ผู้อนุมัติของระบบเรียบร้อยแล้ว\nงานที่ส่งเข้ามาจะแจ้งเตือนมาที่แชทนี้' }]);
  return { ok: true, name: u.displayName };
}

function submitForm(idToken, payload) {
  const u = verifyUser(idToken);
  const f = FORMS[payload.type];
  if (!f) return { ok: false, message: 'ไม่พบประเภทฟอร์ม' };
  const values = payload.values || {};
  const missing = f.fields.filter(function (x) { return x.required && !String(values[x.key] || '').trim(); });
  if (missing.length) return { ok: false, message: 'กรุณากรอก: ' + missing.map(function (x) { return x.label; }).join(', ') };
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    ensureSheets();
    const sh = ss().getSheetByName(f.sheet);
    const docId = nextDocId(f.code, sh);
    const root = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
    const folder = getOrCreateFolder(getOrCreateFolder(root, f.title), docId);
    const imgLinks = saveFiles(folder, payload.images || [], 'image');
    const docLinks = saveFiles(folder, payload.docs || [], 'file');
    const row = [docId, now(), u.userId, u.displayName, payload.ref || '']
      .concat(f.fields.map(function (x) { return String(values[x.key] || ''); }))
      .concat([imgLinks.join('\n'), docLinks.join('\n'), folder.getUrl(), CONFIG.STATUS_PENDING, '', '', '']);
    const r = sh.getLastRow() + 1;
    sh.getRange(r, 1, 1, row.length).setNumberFormat('@').setValues([row]);
    log(docId, f.title, 'submit', u.displayName, payload.ref ? 'ส่งใหม่จาก ' + payload.ref : '');
    const notified = notifyManager(docId);
    return { ok: true, docId: docId, notified: notified };
  } finally {
    lock.releaseLock();
  }
}

function nextDocId(code, sh) {
  const d = Utilities.formatDate(new Date(), CONFIG.TZ, 'yyyyMMdd');
  const n = sh.getLastRow();
  return code + '-' + d + '-' + ('0000' + n).slice(-4);
}

function getOrCreateFolder(parent, name) {
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

function saveFiles(folder, files, prefix) {
  return files.map(function (fl, i) {
    const name = fl.name || (prefix + '_' + (i + 1));
    const blob = Utilities.newBlob(Utilities.base64Decode(fl.data), fl.mime || 'application/octet-stream', name);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return name.replace(/\|/g, '-') + '|' + file.getId();
  });
}

function formByDocId(docId) {
  const code = String(docId || '').split('-')[0].toUpperCase();
  const key = Object.keys(FORMS).filter(function (k) { return FORMS[k].code === code; })[0];
  return key ? { key: key, form: FORMS[key] } : null;
}

function findDoc(docId) {
  docId = String(docId || '').trim().toUpperCase();
  const fb = formByDocId(docId);
  if (!fb) return null;
  const sh = ss().getSheetByName(fb.form.sheet);
  if (!sh || sh.getLastRow() < 2) return null;
  const vals = sh.getDataRange().getValues();
  for (let r = 1; r < vals.length; r++) {
    if (String(vals[r][0]).toUpperCase() === docId) return rowToDoc(fb, vals[r], r + 1);
  }
  return null;
}

function rowToDoc(fb, row, rowNum) {
  const f = fb.form;
  const base = COMMON_HEAD.length;
  const tail = base + f.fields.length;
  return {
    docId: String(row[0]),
    type: fb.key,
    title: f.title,
    icon: f.icon,
    color: f.color,
    submittedAt: fmt(row[1]),
    userId: String(row[2] || ''),
    displayName: String(row[3] || ''),
    ref: String(row[4] || ''),
    fields: f.fields.map(function (x, i) { return { key: x.key, label: x.label, value: fmt(row[base + i]) }; }),
    images: splitLinks(row[tail]),
    docs: splitLinks(row[tail + 1]),
    folderUrl: String(row[tail + 2] || ''),
    status: String(row[tail + 3] || ''),
    decidedBy: String(row[tail + 4] || ''),
    decidedAt: fmt(row[tail + 5]),
    reason: String(row[tail + 6] || ''),
    rowNum: rowNum
  };
}

function fmt(v) {
  if (v instanceof Date) return Utilities.formatDate(v, CONFIG.TZ, 'yyyy-MM-dd HH:mm:ss');
  return v == null ? '' : String(v);
}

function splitLinks(v) {
  return String(v || '').split('\n').filter(Boolean).map(function (line) {
    const i = line.lastIndexOf('|');
    const name = i < 0 ? line : line.slice(0, i);
    const id = i < 0 ? '' : line.slice(i + 1);
    return {
      name: name,
      id: id,
      url: 'https://drive.google.com/file/d/' + id + '/view',
      thumb: 'https://drive.google.com/thumbnail?id=' + id + '&sz=w1200'
    };
  });
}

function summarize(doc) {
  return {
    docId: doc.docId,
    type: doc.type,
    title: doc.title,
    icon: doc.icon,
    color: doc.color,
    submittedAt: doc.submittedAt,
    displayName: doc.displayName,
    status: doc.status,
    headline: doc.fields.filter(function (x) { return x.value; }).slice(0, 3).map(function (x) { return x.value; }).join(' • ')
  };
}

function listDocs(filterFn, limit) {
  const out = [];
  Object.keys(FORMS).forEach(function (k) {
    const fb = { key: k, form: FORMS[k] };
    const sh = ss().getSheetByName(fb.form.sheet);
    if (!sh || sh.getLastRow() < 2) return;
    const vals = sh.getDataRange().getValues();
    for (let r = 1; r < vals.length; r++) {
      const d = rowToDoc(fb, vals[r], r + 1);
      if (filterFn(d)) out.push(summarize(d));
    }
  });
  out.sort(function (a, b) { return a.submittedAt < b.submittedAt ? 1 : -1; });
  return limit ? out.slice(0, limit) : out;
}

function getMyDocs(idToken) {
  const u = verifyUser(idToken);
  return { ok: true, docs: listDocs(function (d) { return d.userId === u.userId; }) };
}

function getPendingDocs(idToken) {
  const u = verifyUser(idToken);
  if (!u.isManager) return { ok: false, message: 'คุณไม่ใช่ผู้อนุมัติของระบบ' };
  return { ok: true, docs: listDocs(function (d) { return d.status === CONFIG.STATUS_PENDING; }) };
}

function getRecentDocs(idToken) {
  const u = verifyUser(idToken);
  if (!u.isManager) return { ok: false, message: 'คุณไม่ใช่ผู้อนุมัติของระบบ' };
  return { ok: true, docs: listDocs(function () { return true; }, 50) };
}

function getDocument(idToken, docId) {
  const u = verifyUser(idToken);
  const doc = findDoc(docId);
  if (!doc) return { ok: false, message: 'ไม่พบเอกสาร ' + docId };
  if (u.userId !== doc.userId && !u.isManager) return { ok: false, message: 'คุณไม่มีสิทธิ์ดูเอกสารนี้' };
  delete doc.rowNum;
  return { ok: true, doc: doc, isManager: u.isManager };
}

function decide(idToken, docId, action, reason) {
  const u = verifyUser(idToken);
  if (!u.isManager) return { ok: false, message: 'คุณไม่ใช่ผู้อนุมัติของระบบ' };
  if (action === 'approve') return updateStatus(docId, CONFIG.STATUS_APPROVED, u, '');
  if (action === 'reject') {
    if (!String(reason || '').trim()) return { ok: false, message: 'กรุณาระบุเหตุผลการปฏิเสธ' };
    return updateStatus(docId, CONFIG.STATUS_REJECTED, u, String(reason).trim());
  }
  return { ok: false, message: 'คำสั่งไม่ถูกต้อง' };
}

function updateStatus(docId, status, by, reason) {
  const doc = findDoc(docId);
  if (!doc) return { ok: false, message: 'ไม่พบเอกสาร ' + docId };
  if (doc.status !== CONFIG.STATUS_PENDING) return { ok: false, message: 'เอกสาร ' + docId + ' ถูก' + doc.status + 'ไปแล้วเมื่อ ' + doc.decidedAt };
  const f = FORMS[doc.type];
  const sh = ss().getSheetByName(f.sheet);
  const col = COMMON_HEAD.length + f.fields.length + 4;
  const byName = by.displayName || props().getProperty('MANAGER_NAME') || by.userId;
  const at = now();
  sh.getRange(doc.rowNum, col, 1, 4).setNumberFormat('@').setValues([[status, byName, at, reason || '']]);
  log(docId, f.title, status, byName, reason || '');
  doc.status = status;
  doc.decidedBy = byName;
  doc.decidedAt = at;
  doc.reason = reason || '';
  notifySubmitter(doc);
  return { ok: true, status: status };
}

function liffUrl(q) {
  return 'https://liff.line.me/' + props().getProperty('LIFF_ID') + (q ? '?' + q : '');
}

function kv(label, value) {
  return {
    type: 'box',
    layout: 'horizontal',
    spacing: 'sm',
    contents: [
      { type: 'text', text: label, size: 'sm', color: '#888888', flex: 3, wrap: true },
      { type: 'text', text: String(value || '-'), size: 'sm', color: '#222222', flex: 5, wrap: true }
    ]
  };
}

function notifyManager(docId) {
  const mid = props().getProperty('MANAGER_USER_ID');
  if (!mid) {
    log(docId, '', 'no_manager', '', 'ยังไม่ได้ตั้ง Manager');
    return false;
  }
  const doc = findDoc(docId);
  const rows = doc.fields.slice(0, 6).map(function (x) { return kv(x.label, String(x.value || '-').slice(0, 150)); });
  const body = [kv('ผู้ส่ง', doc.displayName), kv('เวลา', doc.submittedAt)];
  if (doc.ref) body.push(kv('ส่งใหม่จาก', doc.ref));
  const msg = {
    type: 'flex',
    altText: 'งานใหม่รออนุมัติ ' + doc.docId + ' (' + doc.title + ')',
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: doc.color,
        paddingAll: '16px',
        contents: [
          { type: 'text', text: doc.icon + ' ' + doc.title + ' • รออนุมัติ', color: '#FFFFFF', weight: 'bold', size: 'md' },
          { type: 'text', text: doc.docId, color: '#FFFFFF', size: 'sm' }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: body.concat(rows, [kv('ไฟล์แนบ', doc.images.length + ' รูป, ' + doc.docs.length + ' เอกสาร')])
      },
      footer: {
        type: 'box',
        layout: 'horizontal',
        spacing: 'sm',
        contents: [
          { type: 'button', style: 'secondary', height: 'sm', action: { type: 'uri', label: 'ดู', uri: liffUrl('view=' + doc.docId) } },
          { type: 'button', style: 'primary', color: '#1F7A4D', height: 'sm', action: { type: 'postback', label: 'อนุมัติ', data: 'action=approve&id=' + doc.docId, displayText: 'อนุมัติ ' + doc.docId } },
          { type: 'button', style: 'primary', color: '#C0392B', height: 'sm', action: { type: 'postback', label: 'ปฏิเสธ', data: 'action=reject&id=' + doc.docId, displayText: 'ปฏิเสธ ' + doc.docId } }
        ]
      }
    }
  };
  const res = linePush(mid, [msg]);
  return res.getResponseCode() < 300;
}

function notifySubmitter(doc) {
  if (!doc.userId) return;
  const ok = doc.status === CONFIG.STATUS_APPROVED;
  const body = [kv('เลขเอกสาร', doc.docId), kv('ประเภท', doc.title), kv('ผู้ตัดสิน', doc.decidedBy), kv('เวลา', doc.decidedAt)];
  if (!ok) body.push(kv('เหตุผล', doc.reason || '-'));
  const footer = [{ type: 'button', style: 'secondary', height: 'sm', action: { type: 'uri', label: 'ดูรายละเอียด', uri: liffUrl('view=' + doc.docId) } }];
  if (!ok) footer.push({ type: 'button', style: 'primary', color: doc.color, height: 'sm', action: { type: 'uri', label: 'แก้ไขแล้วส่งใหม่', uri: liffUrl('resubmit=' + doc.docId) } });
  linePush(doc.userId, [{
    type: 'flex',
    altText: (ok ? 'สำเร็จ: ' : 'ไม่สำเร็จ: ') + doc.docId + ' ' + doc.status,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: ok ? '#1F7A4D' : '#C0392B',
        paddingAll: '16px',
        contents: [
          { type: 'text', text: ok ? '✅ งานของคุณได้รับการอนุมัติ' : '❌ งานของคุณถูกปฏิเสธ', color: '#FFFFFF', weight: 'bold', size: 'md', wrap: true },
          { type: 'text', text: ok ? 'สำเร็จ' : 'ไม่สำเร็จ กรุณาแก้ไขแล้วส่งใหม่', color: '#FFFFFF', size: 'sm', wrap: true }
        ]
      },
      body: { type: 'box', layout: 'vertical', spacing: 'md', contents: body },
      footer: { type: 'box', layout: 'vertical', spacing: 'sm', contents: footer }
    }
  }]);
}

function lineApi(path, payload) {
  const token = props().getProperty('CHANNEL_ACCESS_TOKEN');
  const res = UrlFetchApp.fetch('https://api.line.me/v2/bot/' + path, {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + token },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  if (res.getResponseCode() >= 300) log('', '', 'line_error', path, res.getContentText());
  return res;
}

function linePush(to, messages) {
  return lineApi('message/push', { to: to, messages: messages });
}

function lineReply(replyToken, messages) {
  return lineApi('message/reply', { replyToken: replyToken, messages: messages });
}

function lineGetProfile(userId) {
  try {
    const res = UrlFetchApp.fetch('https://api.line.me/v2/bot/profile/' + userId, {
      headers: { Authorization: 'Bearer ' + props().getProperty('CHANNEL_ACCESS_TOKEN') },
      muteHttpExceptions: true
    });
    return JSON.parse(res.getContentText());
  } catch (e) {
    return {};
  }
}
