# ระบบส่งงานผ่าน LINE — LIFF บน Vercel + Google Apps Script + Google Sheet

ฟอร์ม 3 ประเภท: **จัดซื้อ / แจ้งซ่อม / ซ่อมรถ** → บันทึกลง Google Sheet + ไฟล์เข้า Google Drive → แจ้ง Manager ทาง LINE ปุ่ม ดู / อนุมัติ / ปฏิเสธ กดจบในแชท → แจ้งผลกลับผู้ส่ง → ถูกปฏิเสธกดแก้ไขแล้วส่งใหม่ได้

```
line-work-request/
├── public/
│   └── index.html   หน้า LIFF (โฮสต์บน Vercel)
├── api/
│   └── config.js    serverless function ส่งค่า LIFF_ID / API_URL จาก Environment Variables ให้หน้าเว็บ
├── gas/
│   └── Code.gs      Apps Script: API + webhook + push LINE (วางใน Apps Script ที่ผูกกับ Sheet)
├── vercel.json
├── .env.example
└── README.md
```

**ทำไมแยก 2 ส่วน**: หน้าเว็บอยู่ Vercel จึงเปิดได้ทั้งมือถือและคอม (GAS โฮสต์หน้า LIFF ได้แค่ในแอปมือถือ) ส่วน Sheet/Drive/LINE ทำบน GAS ฟรี ไม่ต้องมี service account

---

## รหัสในแชท

| พิมพ์ส่งหาบอท | ผล |
|---|---|
| `MGR-7K2P-9XQ4-WN8H` | ตั้งตัวเองเป็น Manager (คนล่าสุดแทนคนเดิม) หรือใส่ที่เมนู "ตั้งค่าผู้อนุมัติ" ในหน้าเว็บ |
| `MGR-OFF-5J3X-Q8TN` | ถอด Manager คนปัจจุบันออก |
| `/myid` | บอทตอบ userId ของคุณ |
| (ตอบเหตุผลหลังกดปฏิเสธ) | บันทึกเหตุผลและแจ้งผู้ส่ง / พิมพ์ `ยกเลิก` เพื่อยกเลิก |

เปลี่ยนรหัสได้ที่ `MANAGER_KEY` / `MANAGER_REMOVE_KEY` ใน `gas/Code.gs`

---

## ขั้นตอนติดตั้ง (ทำตามลำดับ)

### 1. Apps Script (ผูกกับ Google Sheet)
1. เปิด Google Sheet → **ส่วนขยาย → Apps Script** → วางโค้ด `gas/Code.gs` แทนของเดิม (ไม่ต้องมีไฟล์ HTML ใน GAS)
2. โฟลเดอร์ Drive `1PN7hUBYutmZokZPEFQivUtF20RmnlIif` ต้องเป็นของบัญชีที่รัน script หรือมีสิทธิ์แก้ไข (เปลี่ยนที่ `DRIVE_FOLDER_ID`)
3. เลือกฟังก์ชัน **`setup`** → **Run** → อนุญาตสิทธิ์ → ระบบสร้างชีต `จัดซื้อ`, `แจ้งซ่อม`, `ซ่อมรถ`, `Log`
4. **Deploy → New deployment** → **Web app** → Execute as **Me** → Who has access **Anyone** → copy **Web app URL** (ลงท้าย `/exec`) — นี่คือ `API_URL` และ Webhook URL

### 2. LINE Developers (1 Provider, 2 channel)
**Messaging API channel** (OA)
- แท็บ Messaging API → *Channel access token (long-lived)* → **Issue** → เก็บไว้
- **Webhook URL** = Web app URL จากข้อ 1.4 → **Use webhook** = ON (Verify ขึ้น 302 ไม่เป็นไร ทดสอบด้วย `/myid`)
- OA Manager → Response settings → **Auto-reply** = OFF, **Webhooks** = ON

**LINE Login channel** (สร้างใหม่ใน Provider เดียวกัน)
- Create channel → **LINE Login** → App type **Web app**
- แท็บ Basic settings → เก็บ **Channel ID** (ตัวเลข), ตั้ง *Linked OA* = OA ข้างบน
- แท็บ LIFF → **Add** → Size **Full**, Endpoint URL ใส่ `https://example.com` ชั่วคราว, Scopes **profile + openid**, Add friend option **On (aggressive)** → ได้ **LIFF ID**
- กดสถานะ **Developing → Published**

### 3. Script Properties ใน Apps Script (เฟือง → Script Properties)
| Property | ค่า |
|---|---|
| `CHANNEL_ACCESS_TOKEN` | token จาก Messaging API channel |
| `LIFF_ID` | LIFF ID จาก LINE Login channel (ใช้สร้างลิงก์ในปุ่ม LINE) |
| `LOGIN_CHANNEL_ID` | Channel ID ของ LINE Login channel (ใช้ตรวจสอบตัวตน) |

### 4. GitHub + Vercel
1. Push ขึ้น GitHub
   ```bash
   git init
   git add .
   git commit -m "init"
   git branch -M main
   git remote add origin https://github.com/<user>/line-work-request.git
   git push -u origin main
   ```
2. [vercel.com](https://vercel.com) → **Add New → Project** → Import repo นี้ → Framework **Other** (ไม่ต้องตั้ง Build/Output)
3. ก่อนกด Deploy เปิด **Environment Variables** ใส่ 2 ตัว (หรือตั้งทีหลังที่ Settings → Environment Variables แล้ว **Redeploy**)
   | Name | Value |
   |---|---|
   | `LIFF_ID` | LIFF ID จาก LINE Login channel |
   | `API_URL` | Web app URL ของ GAS (ลงท้าย `/exec`) |
4. **Deploy** → ได้ URL เช่น `https://line-work-request.vercel.app` (เปิด `/api/config` ต้องเห็นค่า 2 ตัวนี้)
5. กลับไป LINE Login channel → LIFF → แก้ **Endpoint URL** = URL ของ Vercel

### 5. Rich Menu (OA Manager)
- ปุ่ม "ส่งงาน" → Action **Link** → `https://liff.line.me/<LIFF_ID>`
- เพิ่มได้: "งานของฉัน" = `https://liff.line.me/<LIFF_ID>?page=mine`, "รออนุมัติ" = `...?page=pending`

### 6. เริ่มใช้
- Manager พิมพ์ `MGR-7K2P-9XQ4-WN8H` ส่งหาบอท
- พนักงานกด Rich Menu → ส่งงาน

> แก้ `gas/Code.gs` → วางใน Apps Script → **Deploy → Manage deployments → ✏️ → New version** (URL เดิม)
> แก้ `public/*` หรือ `api/*` → push ขึ้น GitHub → Vercel deploy ให้อัตโนมัติ
> เปลี่ยนค่า Environment Variables → ต้องกด **Redeploy** ใน Vercel

---

## การทำงาน

| ขั้นตอน | ทำอย่างไร |
|---|---|
| ระบุตัว | LIFF ให้ userId + ชื่อ หน้าเว็บส่ง ID token ไปให้ GAS ตรวจกับ LINE ทุกครั้ง (ปลอมไม่ได้) |
| ส่งงาน | เลือกฟอร์ม → กรอก + รูป (ย่ออัตโนมัติ) + ไฟล์ → เลขเอกสาร `PR-/RP-/VH-yyyymmdd-0001` |
| แจ้ง Manager | push Flex ปุ่ม **ดู** (เปิด LIFF) / **อนุมัติ** / **ปฏิเสธ** (กดจบในแชท) — 1 ข้อความ/งาน |
| ปฏิเสธ | บอทถามเหตุผล → พิมพ์ตอบ (หรือ `ยกเลิก`) |
| อนุมัติจากหน้าเว็บ | เมนู "รายการรออนุมัติ" ใช้บนคอมได้ด้วย |
| แจ้งผู้ส่ง | push Flex ผล + เหตุผล + ปุ่ม "แก้ไขแล้วส่งใหม่" — 1 ข้อความ/งาน |
| งานของฉัน | ดูสถานะงานที่ตัวเองส่ง (Manager เห็นทั้งหมด) |

**โควต้าข้อความ**: ไม่มี Broadcast งาน 1 ใบใช้ push 2 ข้อความ ส่วน reply ไม่นับ

**ชีตแต่ละประเภท**
`เลขเอกสาร | วันที่ส่ง | LINE userId | ชื่อ LINE | อ้างอิงเอกสารเดิม | ...ฟิลด์ของฟอร์ม... | รูปภาพ | เอกสาร | โฟลเดอร์ | สถานะ | ผู้ตัดสิน | วันที่ตัดสิน | เหตุผลปฏิเสธ`

**Google Drive**: `โฟลเดอร์หลัก / ประเภทฟอร์ม / เลขเอกสาร / ไฟล์…` ไฟล์ตั้งเป็น "ทุกคนที่มีลิงก์ดูได้"

---

## API (GAS รับ POST เป็น JSON)

ทุก request: `{ action, idToken, ...params }` → ตอบ `{ ok, ... }` ถ้า token หมดอายุตอบ `{ ok:false, error:'TOKEN_INVALID' }`

| action | params | ใช้โดย |
|---|---|---|
| `config` | – | โหลดนิยามฟอร์ม |
| `whoAmI` | – | ตรวจตัวตน |
| `submitForm` | `payload` | ส่งงาน |
| `getMyDocs` / `getPendingDocs` / `getRecentDocs` | – | รายการ |
| `getDocument` | `docId` | รายละเอียด |
| `decide` | `docId`, `decision` (`approve`/`reject`), `reason` | Manager ตัดสิน |
| `registerManager` | `key` | ตั้ง Manager |

Body ที่มี `events` ถือเป็น webhook จาก LINE

---

## ปรับแต่ง
- **ฟิลด์**: แก้ `FORMS` ใน `gas/Code.gs` ที่เดียว หน้าเว็บดึงไปใช้เอง (type: `text`, `number`, `date`, `textarea`, `select` + `options`)
- **ขนาดรูป**: `max = 1280`, คุณภาพ `0.82` ใน `compressImage`
- **จำนวนไฟล์**: `MAX_IMAGES`, `MAX_DOCS`, `MAX_DOC_MB` ใน `public/index.html`

## แก้ปัญหา
| อาการ | สาเหตุ |
|---|---|
| "ยังไม่ได้ตั้ง Environment Variables" | ยังไม่ใส่ `LIFF_ID` / `API_URL` ใน Vercel หรือใส่แล้วยังไม่ Redeploy (เช็กที่ `<url>/api/config`) |
| "เริ่มระบบไม่สำเร็จ: API 4xx/5xx" | `API_URL` ผิด หรือ GAS deploy ไม่ใช่ Anyone |
| เด้งเข้าสู่ระบบซ้ำๆ | `LOGIN_CHANNEL_ID` ไม่ตรง channel ที่สร้าง LIFF → ดู Log แถว `token_error` |
| โหลดวน / LIFF init ล้มเหลว | LIFF ID ผิด, Endpoint URL ไม่ตรง Vercel, channel ยัง Developing |
| พิมพ์ key แล้วบอทเงียบ | token ผิด, Use webhook ปิด, Auto-reply เปิด → ดู Log |
| ไม่ได้รับข้อความ | ไม่ได้เพิ่มเพื่อน OA หรือ 2 channel คนละ Provider → Log แถว `line_error` |
| รูปไม่ขึ้น | บัญชี Google ที่รัน script ถูกบล็อกแชร์ลิงก์สาธารณะ |
