export type DocumentPageKey = 'quotation' | 'billingNote' | 'invoice' | 'receipt';

export type VatMode = 'include' | 'none';

export interface DocumentPageMeta {
  key: DocumentPageKey;
  index: number;
  thaiTitle: string;
  englishTitle: string;
  shortLabel: string;
  badgeColor: string;
  accentHex: string;
  docNumberField: 'quotationNo' | 'billingNoteNo' | 'invoiceNo' | 'receiptNo';
  dateLabel: string;
  dueDateLabel: string;
  footerLeftTitle: string;
  footerRightTitle: string;
}

export const DOCUMENT_PAGES: DocumentPageMeta[] = [
  {
    key: 'quotation',
    index: 1,
    thaiTitle: 'ใบเสนอราคา',
    englishTitle: 'QUOTATION',
    shortLabel: '1. ใบเสนอราคา',
    badgeColor: 'text-blue-700',
    accentHex: '#1d4ed8',
    docNumberField: 'quotationNo',
    dateLabel: 'วันที่เสนอราคา / Date',
    dueDateLabel: 'ยืนราคาถึงวันที่ / Valid Until',
    footerLeftTitle: 'ผู้สั่งซื้อ / อนุมัติใบเสนอราคา (Customer Approval)',
    footerRightTitle: 'ผู้อนุมัติ (Authorized Signature)',
  },
  {
    key: 'billingNote',
    index: 2,
    thaiTitle: 'ใบวางบิล',
    englishTitle: 'BILLING NOTE',
    shortLabel: '2. ใบวางบิล',
    badgeColor: 'text-indigo-700',
    accentHex: '#4338ca',
    docNumberField: 'billingNoteNo',
    dateLabel: 'วันที่วางบิล / Billing Date',
    dueDateLabel: 'นัดชำระวันที่ / Payment Due',
    footerLeftTitle: 'ผู้รับวางบิล (Received By)',
    footerRightTitle: 'ผู้มีอำนาจลงนาม (Authorized Signature)',
  },
  {
    key: 'invoice',
    index: 3,
    thaiTitle: 'ใบแจ้งหนี้',
    englishTitle: 'INVOICE',
    shortLabel: '3. ใบแจ้งหนี้',
    badgeColor: 'text-amber-700',
    accentHex: '#b45309',
    docNumberField: 'invoiceNo',
    dateLabel: 'วันที่ใบแจ้งหนี้ / Invoice Date',
    dueDateLabel: 'ครบกำหนดชำระ / Due Date',
    footerLeftTitle: 'ผู้รับใบแจ้งหนี้ (Received By)',
    footerRightTitle: 'ผู้มีอำนาจลงนาม (Authorized Signature)',
  },
  {
    key: 'receipt',
    index: 4,
    thaiTitle: 'ใบเสร็จรับเงิน',
    englishTitle: 'OFFICIAL RECEIPT',
    shortLabel: '4. ใบเสร็จรับเงิน',
    badgeColor: 'text-emerald-700',
    accentHex: '#047857',
    docNumberField: 'receiptNo',
    dateLabel: 'วันที่ออกใบเสร็จ / Receipt Date',
    dueDateLabel: 'วันที่รับชำระเงิน / Paid Date',
    footerLeftTitle: 'ผู้จ่ายเงิน (Payer)',
    footerRightTitle: 'ผู้รับเงิน / ผู้มีอำนาจลงนาม (Authorized Signature)',
  },
];

// Blueprint validation constants synced verbatim with firebase-blueprint.json & firestore.rules
export const BLUEPRINT_CONSTRAINTS = {
  ID_REGEX: /^[a-zA-Z0-9_\-]+$/,
  ID_MAX_LEN: 128,
  CUSTOMER: {
    codeMax: 50,
    nameMax: 200,
    taxIdMax: 30,
    branchMax: 80,
    addressMax: 500,
    contactPersonMax: 150,
    phoneMax: 50,
    emailMax: 150,
    notesMax: 500,
  },
  DOC_SET: {
    projectTitleMax: 250,
    referenceNoMax: 80,
    docNoMax: 50,
    dateMax: 30,
    customerIdMax: 128,
    nameMax: 200,
    taxIdMax: 30,
    branchMax: 80,
    addressMax: 500,
    contactMax: 150,
    phoneMax: 50,
    emailMax: 150,
    bankInfoMax: 400,
    signerMax: 150,
    logoDataUrlMax: 350000,
    signatureDataUrlMax: 350000,
    whtTypeMax: 150,
    paymentMethodMax: 100,
    notesMax: 1000,
  },
  DOC_ITEM: {
    descriptionMax: 500,
    subDescriptionMax: 500,
    unitMax: 50,
  },
} as const;

export interface CustomerRecord {
  id: string;
  ownerId: string;
  code: string;
  name: string;
  taxId: string;
  branch: string;
  address: string;
  contactPerson: string;
  phone: string;
  email: string;
  notes: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface WorkLineItem {
  id: string;
  sortOrder: number;
  description: string;
  subDescription: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

export interface DocumentSetRecord {
  id: string;
  ownerId: string;
  projectTitle: string;
  referenceNo: string;
  quotationNo: string;
  billingNoteNo: string;
  invoiceNo: string;
  receiptNo: string;
  issueDate: string;
  dueDate: string;
  customerId: string;
  customerName: string;
  customerTaxId: string;
  customerBranch: string;
  customerAddress: string;
  customerContact: string;
  customerPhone: string;
  customerEmail: string;
  sellerName: string;
  sellerTaxId: string;
  sellerBranch: string;
  sellerAddress: string;
  sellerPhone: string;
  sellerEmail: string;
  sellerBankInfo: string;
  sellerSignerName: string;
  sellerLogoDataUrl?: string;
  sellerSignatureDataUrl?: string;
  discountAmount: number;
  vatMode: VatMode;
  vatRate: number;
  whtEnabled: boolean;
  whtRate: number;
  whtType: string;
  paymentMethod: string;
  paymentDate: string;
  notes: string;
  items: WorkLineItem[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface FinancialSummary {
  rawSubtotal: number;
  grandTotal: number;
  whtAmount: number;
  netPayable: number;
  grandTotalThaiText: string;
  netPayableThaiText: string;
}

export function clampString(val: string | undefined | null, maxLen: number, fallback = ''): string {
  const cleaned = (val ?? '').trim();
  if (!cleaned && fallback) return fallback.slice(0, maxLen);
  return cleaned.slice(0, maxLen);
}

export function clampNumber(val: number | undefined | null, min: number, max: number, fallback = 0): number {
  const num = Number(val);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

export function sanitizeId(rawId: string): string {
  const cleaned = rawId.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, BLUEPRINT_CONSTRAINTS.ID_MAX_LEN);
  return cleaned || `id_${Date.now()}`;
}

/**
 * Formats an ISO date string (YYYY-MM-DD) into Day/Month/Year (DD/MM/YYYY) format.
 */
export function formatDateDMY(dateStr: string | undefined | null): string {
  if (!dateStr) return '-';
  const trimmed = dateStr.trim();
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${day}/${month}/${year}`;
  }
  const slashMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (slashMatch) {
    return trimmed;
  }
  return trimmed;
}

/**
 * Automatically generates running document numbers (QT, BN, INV, RC) based on YYYYMM of issueDate
 * and the highest existing running number for that month.
 */
export function generateRunningDocumentNumbers(
  issueDate: string,
  existingSets: { quotationNo?: string }[],
  minSeq = 1
): {
  quotationNo: string;
  billingNoteNo: string;
  invoiceNo: string;
  receiptNo: string;
  nextSequence: number;
} {
  const cleanDate =
    issueDate && /^\d{4}-\d{2}/.test(issueDate)
      ? issueDate
      : new Date().toISOString().slice(0, 10);
  const ym = cleanDate.slice(0, 7).replace('-', '');

  let maxFound = 0;
  for (const s of existingSets) {
    const qNo = s.quotationNo || '';
    const match = qNo.match(new RegExp(`^QT-${ym}-(\\d+)$`));
    if (match) {
      const num = parseInt(match[1], 10);
      if (Number.isFinite(num) && num > maxFound) {
        maxFound = num;
      }
    }
  }

  const nextSequence = Math.max(minSeq, maxFound + 1);
  const seqStr = String(nextSequence).padStart(3, '0');

  return {
    quotationNo: `QT-${ym}-${seqStr}`,
    billingNoteNo: `BN-${ym}-${seqStr}`,
    invoiceNo: `INV-${ym}-${seqStr}`,
    receiptNo: `RC-${ym}-${seqStr}`,
    nextSequence,
  };
}

/**
 * Syncs BN, INV, and RC numbers when QT number is updated or auto-run.
 */
export function syncCompanionDocNumbersFromQuotation(quotationNo: string): {
  billingNoteNo: string;
  invoiceNo: string;
  receiptNo: string;
} {
  const suffix = quotationNo.replace(/^QT[-_]?/i, '');
  if (!suffix) {
    return {
      billingNoteNo: 'BN-001',
      invoiceNo: 'INV-001',
      receiptNo: 'RC-001',
    };
  }
  return {
    billingNoteNo: `BN-${suffix}`,
    invoiceNo: `INV-${suffix}`,
    receiptNo: `RC-${suffix}`,
  };
}

export function calculateFinancialSummary(
  items: WorkLineItem[],
  whtEnabled: boolean,
  whtRateInput: number
): FinancialSummary {
  const rawSubtotal = items.reduce((sum, item) => {
    const qty = Number.isFinite(item.quantity) ? Math.max(0, item.quantity) : 0;
    const price = Number.isFinite(item.unitPrice) ? Math.max(0, item.unitPrice) : 0;
    return sum + qty * price;
  }, 0);

  const whtRate = Math.max(0, Math.min(100, Number(whtRateInput) || 0));
  const grandTotal = rawSubtotal;
  const whtAmount = whtEnabled ? grandTotal * (whtRate / 100) : 0;
  const netPayable = Math.max(0, grandTotal - whtAmount);

  return {
    rawSubtotal,
    grandTotal,
    whtAmount,
    netPayable,
    grandTotalThaiText: toThaiBahtText(grandTotal),
    netPayableThaiText: toThaiBahtText(netPayable),
  };
}

export function formatCurrency(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return safe.toLocaleString('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const THAI_NUMBERS = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
const THAI_POSITIONS = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

function convertIntegerToThaiWords(numStr: string): string {
  const clean = numStr.replace(/^0+/, '');
  if (!clean) return '';

  if (clean.length > 6) {
    const millionsPart = clean.slice(0, clean.length - 6);
    const remainderPart = clean.slice(clean.length - 6);
    return `${convertIntegerToThaiWords(millionsPart)}ล้าน${convertIntegerToThaiWords(remainderPart)}`;
  }

  let result = '';
  const len = clean.length;
  for (let i = 0; i < len; i++) {
    const digit = parseInt(clean[i], 10);
    const pos = len - i - 1;
    if (digit === 0) continue;

    if (pos === 1 && digit === 1) {
      result += 'สิบ';
    } else if (pos === 1 && digit === 2) {
      result += 'ยี่สิบ';
    } else if (pos === 0 && digit === 1 && len > 1) {
      const hasHigherNonZero = clean.slice(0, len - 1).split('').some((d) => d !== '0');
      result += hasHigherNonZero ? 'เอ็ด' : 'หนึ่ง';
    } else {
      result += THAI_NUMBERS[digit] + THAI_POSITIONS[pos];
    }
  }
  return result;
}

export function toThaiBahtText(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) {
    return 'ศูนย์บาทถ้วน';
  }
  const fixed = Math.abs(amount).toFixed(2);
  const [intPart, decPart] = fixed.split('.');
  const bahtWords = convertIntegerToThaiWords(intPart);
  const satangVal = parseInt(decPart, 10);

  if (satangVal === 0) {
    return `${bahtWords || 'ศูนย์'}บาทถ้วน`;
  }
  const satangWords = convertIntegerToThaiWords(decPart);
  if (!bahtWords) {
    return `${satangWords}สตางค์`;
  }
  return `${bahtWords}บาท${satangWords}สตางค์`;
}

export const PRESET_WHT_OPTIONS = [
  { rate: 1, label: '1%', desc: 'ค่าขนส่ง' },
  { rate: 2, label: '2%', desc: 'ค่าโฆษณา' },
  { rate: 3, label: '3%', desc: 'ค่าบริการ / จ้างทำของ' },
  { rate: 5, label: '5%', desc: 'ค่าเช่า / นักแสดงสาธารณะ' },
];

export const DEFAULT_CUSTOMERS: CustomerRecord[] = [
  {
    id: 'cus_siam_horizon',
    ownerId: 'local',
    code: 'CUS-001',
    name: 'บริษัท สยาม ฮอไรซอน ดีเวลลอปเม้นท์ จำกัด (มหาชน)',
    taxId: '0107564000891',
    branch: 'สำนักงานใหญ่',
    address: '999 อาคารเพลินจิตทาวเวอร์ ชั้น 24 ถนนเพลินจิต แขวงลุมพินี เขตปทุมวัน กรุงเทพมหานคร 10330',
    contactPerson: 'คุณพิมพ์ชนก วรโชติ (ฝ่ายจัดซื้อ)',
    phone: '02-650-8800 ต่อ 412',
    email: 'procurement@siamhorizon.co.th',
    notes: 'เครดิตเทอม 30 วัน วางบิลทุกวันที่ 5 และ 20 ของเดือน',
  },
  {
    id: 'cus_aurora_retail',
    ownerId: 'local',
    code: 'CUS-002',
    name: 'บริษัท ออโรร่า รีเทล กรุ๊ป จำกัด',
    taxId: '0105562084115',
    branch: 'สำนักงานใหญ่',
    address: '88/14 ถนนสุขุมวิท 63 (เอกมัย) แขวงคลองตันเหนือ เขตวัฒนา กรุงเทพมหานคร 10110',
    contactPerson: 'คุณธนภัทร อัศวเมธี (Project Director)',
    phone: '089-442-9100',
    email: 'thanapat@auroraretail.co.th',
    notes: 'หักภาษี ณ ที่จ่าย 3% ทุกยอดบริการ ส่งใบวางบิลทางอีเมลก่อนนัดจ่าย 7 วัน',
  },
  {
    id: 'cus_lanna_craft',
    ownerId: 'local',
    code: 'CUS-003',
    name: 'บริษัท ล้านนา คราฟต์ โฮสพิทาลิตี้ จำกัด',
    taxId: '0505561003924',
    branch: 'สาขาที่ 00001 (นิมมานเหมินท์)',
    address: '124 ถนนนิมมานเหมินท์ ซอย 9 ตำบลสุเทพ อำเภอเมืองเชียงใหม่ จังหวัดเชียงใหม่ 50200',
    contactPerson: 'คุณกัญญาณัฐ วงศ์สวัสดิ์',
    phone: '053-218-990',
    email: 'accounting@lannacraft.com',
    notes: 'โอนชำระผ่านธนาคารกสิกรไทย',
  },
];

export const DEFAULT_DOCUMENT_SET: DocumentSetRecord = {
  id: 'docset_default_2026',
  ownerId: 'local',
  projectTitle: 'ออกแบบและพัฒนาระบบ Web Application & ERP Portal สำหรับองค์กร',
  referenceNo: 'PO-2026-0884',
  quotationNo: 'QT-202611-001',
  billingNoteNo: 'BN-202611-001',
  invoiceNo: 'INV-202611-001',
  receiptNo: 'RC-202611-001',
  issueDate: '2026-11-03',
  dueDate: '2026-12-03',
  customerId: 'cus_siam_horizon',
  customerName: 'บริษัท สยาม ฮอไรซอน ดีเวลลอปเม้นท์ จำกัด (มหาชน)',
  customerTaxId: '0107564000891',
  customerBranch: 'สำนักงานใหญ่',
  customerAddress: '999 อาคารเพลินจิตทาวเวอร์ ชั้น 24 ถนนเพลินจิต แขวงลุมพินี เขตปทุมวัน กรุงเทพมหานคร 10330',
  customerContact: 'คุณพิมพ์ชนก วรโชติ (ฝ่ายจัดซื้อ)',
  customerPhone: '02-650-8800 ต่อ 412',
  customerEmail: 'procurement@siamhorizon.co.th',
  sellerName: 'บริษัท เน็กซ์เวฟ ดิจิทัล โซลูชั่น จำกัด',
  sellerTaxId: '0105565099214',
  sellerBranch: 'สำนักงานใหญ่',
  sellerAddress: '455 อาคารสาทรสแควร์ ชั้น 18 ถนนสาทรเหนือ แขวงสีลม เขตบางรัก กรุงเทพมหานคร 10500',
  sellerPhone: '02-118-9450',
  sellerEmail: 'billing@nexwavedigital.co.th',
  sellerBankInfo: 'ธนาคารกสิกรไทย (KBANK) สาขาสาทร · เลขที่บัญชี 084-2-99145-8 · ชื่อบัญชี บจก. เน็กซ์เวฟ ดิจิทัล โซลูชั่น',
  sellerSignerName: 'นายปรมัตถ์ ชัยวัฒน์ (กรรมการผู้จัดการ)',
  sellerLogoDataUrl: '',
  sellerSignatureDataUrl: '',
  discountAmount: 0,
  vatMode: 'none',
  vatRate: 0,
  whtEnabled: true,
  whtRate: 3,
  whtType: 'ค่าบริการวิชาชีพ / จ้างทำของ',
  paymentMethod: 'โอนเงินเข้าบัญชีธนาคารกสิกรไทย (KBANK)',
  paymentDate: '2026-11-03',
  notes: '1. กำหนดยืนราคา 30 วัน นับจากวันที่ออกใบเสนอราคา\n2. กรุณาหักภาษี ณ ที่จ่าย ในนาม บริษัท เน็กซ์เวฟ ดิจิทัล โซลูชั่น จำกัด เลขประจำตัวผู้เสียภาษี 0105565099214\n3. ส่งมอบงานพร้อมคู่มือการใช้งานและรับประกันดูแลระบบฟรี 90 วัน',
  items: [
    {
      id: 'item_1',
      sortOrder: 1,
      description: 'ออกแบบ UX/UI Design System และ Interactive Prototype ทั้งระบบ',
      subDescription: '- ครอบคลุมหน้าจอ Desktop และ Mobile Responsive จำนวน 24 หน้าจอ\n- ส่งมอบไฟล์ Figma พร้อม Design Tokens',
      quantity: 1,
      unit: 'งาน',
      unitPrice: 45000,
    },
    {
      id: 'item_2',
      sortOrder: 2,
      description: 'พัฒนาระบบจัดการฐานข้อมูลลูกค้าและออกเอกสารบัญชีอัตโนมัติ (Frontend & Backend)',
      subDescription: '- รองรับการซิงค์ข้อมูลใบเสนอราคา ใบวางบิล ใบแจ้งหนี้ ใบเสร็จรับเงิน\n- ระบบคำนวณภาษีหัก ณ ที่จ่ายอัตโนมัติ',
      quantity: 1,
      unit: 'ระบบ',
      unitPrice: 85000,
    },
    {
      id: 'item_3',
      sortOrder: 3,
      description: 'บริการติดตั้งระบบ Cloud Server, SSL Security และอบรมทีมงานผู้ใช้งาน',
      subDescription: '- อบรมการใช้งานผ่านระบบออนไลน์ 2 รอบ\n- เอกสารคู่มือภาษาไทยฉบับสมบูรณ์',
      quantity: 2,
      unit: 'รอบ',
      unitPrice: 7500,
    },
  ],
};
