/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import {
  Download,
  Printer,
  Plus,
  Trash2,
  CheckSquare,
  Square,
  Save,
  UserPlus,
  Layers,
  FileText,
  LogIn,
  LogOut,
  Check,
  AlertCircle,
  FilePlus2,
  RefreshCw,
} from 'lucide-react';
import { auth, googleProvider } from './firebase';
import {
  calculateFinancialSummary,
  CustomerRecord,
  DEFAULT_CUSTOMERS,
  DEFAULT_DOCUMENT_SET,
  DOCUMENT_PAGES,
  DocumentPageKey,
  DocumentSetRecord,
  formatCurrency,
  generateRunningDocumentNumbers,
  PRESET_WHT_OPTIONS,
  sanitizeId,
  syncCompanionDocNumbersFromQuotation,
  WorkLineItem,
} from './types/billing';
import {
  deleteCustomerFromFirestore,
  deleteDocumentSetFromFirestore,
  fetchDocumentItems,
  saveCustomerToFirestore,
  saveDocumentSetToFirestore,
  subscribeUserCustomers,
  subscribeUserDocumentSets,
} from './services/firestoreService';
import { A4DocumentSheet } from './components/A4DocumentSheet';
import { CustomerDatabaseView } from './components/CustomerDatabaseView';
import { SavedDocumentSetsView } from './components/SavedDocumentSetsView';
import { SellerProfileView } from './components/SellerProfileView';
import { DateInputDMY } from './components/DateInputDMY';
import { exportSelectedPagesToPdf } from './utils/pdfExport';

type ActiveWorkspaceTab = 'editor' | 'customers' | 'archive' | 'seller';
type PreviewLayoutMode = 'single' | 'all4';

const LOCAL_STORAGE_DOC_KEY = 'syncdoc_active_docset_v1';
const LOCAL_STORAGE_CUSTOMERS_KEY = 'syncdoc_local_customers_v1';
const LOCAL_STORAGE_ARCHIVE_KEY = 'syncdoc_local_archive_v1';
const LOCAL_STORAGE_SEQ_KEY = 'syncdoc_running_seq_v1';

export default function App() {
  // Navigation state
  const [activeNavTab, setActiveNavTab] = useState<ActiveWorkspaceTab>('editor');
  const [activeDocPage, setActiveDocPage] = useState<DocumentPageKey>('quotation');
  const [previewLayout, setPreviewLayout] = useState<PreviewLayoutMode>('single');

  // Checkboxes for selective PDF download (default all 4 checked)
  const [selectedPdfPages, setSelectedPdfPages] = useState<DocumentPageKey[]>([
    'quotation',
    'billingNote',
    'invoice',
    'receipt',
  ]);

  // Auth & Cloud state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [cloudCustomerIds, setCloudCustomerIds] = useState<Set<string>>(new Set());
  const [cloudDocSetIds, setCloudDocSetIds] = useState<Set<string>>(new Set());

  // Active Document Set (synced across all 4 pages)
  const [docSet, setDocSet] = useState<DocumentSetRecord>(() => {
    const savedLogo = localStorage.getItem('syncdoc_seller_logo_v1') || '';
    const savedSignature = localStorage.getItem('syncdoc_seller_signature_v1') || '';

    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_DOC_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.items)) {
          return {
            ...parsed,
            discountAmount: 0,
            vatMode: 'none',
            vatRate: 0,
            sellerLogoDataUrl: parsed.sellerLogoDataUrl || savedLogo,
            sellerSignatureDataUrl: parsed.sellerSignatureDataUrl || savedSignature,
          };
        }
      }
    } catch {
      // Fallback to default
    }
    return {
      ...DEFAULT_DOCUMENT_SET,
      sellerLogoDataUrl: savedLogo,
      sellerSignatureDataUrl: savedSignature,
    };
  });

  // Customer Database state
  const [customers, setCustomers] = useState<CustomerRecord[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_CUSTOMERS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Fallback
    }
    return DEFAULT_CUSTOMERS;
  });

  // Saved Document Sets Archive
  const [savedDocSets, setSavedDocSets] = useState<Omit<DocumentSetRecord, 'items'>[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_ARCHIVE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Fallback
    }
    const { items: _items, ...meta } = DEFAULT_DOCUMENT_SET;
    return [meta];
  });

  // Local map of items for local archive sets
  const [localItemsMap, setLocalItemsMap] = useState<Record<string, WorkLineItem[]>>(() => ({
    [DEFAULT_DOCUMENT_SET.id]: DEFAULT_DOCUMENT_SET.items,
  }));

  // Status & PDF export progress
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportStatusText, setExportStatusText] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [isSavingDoc, setIsSavingDoc] = useState(false);

  // Offscreen full-scale A4 sheet refs for high-res PDF generation
  const pdfSheetRefs = useRef<Record<DocumentPageKey, HTMLDivElement | null>>({
    quotation: null,
    billingNote: null,
    invoice: null,
    receipt: null,
  });

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 3800);
  };

  // Persist active docSet locally on change
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_DOC_KEY, JSON.stringify(docSet));
    } catch {
      // Ignore storage quota errors
    }
  }, [docSet]);

  // Persist local customers when not authenticated
  useEffect(() => {
    if (!currentUser) {
      try {
        localStorage.setItem(LOCAL_STORAGE_CUSTOMERS_KEY, JSON.stringify(customers));
      } catch {
        // Ignore
      }
    }
  }, [customers, currentUser]);

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // Firestore real-time listeners when authenticated
  useEffect(() => {
    if (!authReady || !currentUser) {
      setCloudCustomerIds(new Set());
      setCloudDocSetIds(new Set());
      return;
    }

    const unsubCustomers = subscribeUserCustomers(currentUser.uid, (cloudCustomers) => {
      setCloudCustomerIds(new Set(cloudCustomers.map((c) => sanitizeId(c.id))));
      if (cloudCustomers.length > 0) {
        setCustomers(cloudCustomers);
      }
    });

    const unsubDocSets = subscribeUserDocumentSets(currentUser.uid, (cloudDocSets) => {
      setCloudDocSetIds(new Set(cloudDocSets.map((d) => sanitizeId(d.id))));
      if (cloudDocSets.length > 0) {
        setSavedDocSets(cloudDocSets);
      }
    });

    return () => {
      unsubCustomers();
      unsubDocSets();
    };
  }, [authReady, currentUser]);

  // Real-time financial & withholding tax calculation
  const financialSummary = useMemo(
    () =>
      calculateFinancialSummary(
        docSet.items,
        docSet.whtEnabled,
        docSet.whtRate
      ),
    [docSet.items, docSet.whtEnabled, docSet.whtRate]
  );

  // Handlers for updating synced DocumentSet fields
  const updateDocFields = (fields: Partial<DocumentSetRecord>) => {
    setDocSet((prev) => ({
      ...prev,
      ...fields,
    }));
  };

  // Auto-run next sequential Quotation Number & companion numbers
  const handleAutoRunQuotationNumber = (targetIssueDate?: string) => {
    const dateToUse = targetIssueDate || docSet.issueDate;
    const storedSeq = parseInt(localStorage.getItem(LOCAL_STORAGE_SEQ_KEY) || '1', 10) || 1;
    const nextSeqCandidate = storedSeq + 1;

    const generated = generateRunningDocumentNumbers(
      dateToUse,
      [...savedDocSets, { quotationNo: docSet.quotationNo }],
      nextSeqCandidate
    );

    try {
      localStorage.setItem(LOCAL_STORAGE_SEQ_KEY, String(generated.nextSequence));
    } catch {
      // Ignore
    }

    updateDocFields({
      issueDate: dateToUse,
      quotationNo: generated.quotationNo,
      billingNoteNo: generated.billingNoteNo,
      invoiceNo: generated.invoiceNo,
      receiptNo: generated.receiptNo,
    });
    showToast(`รันเลขที่ใบเสนอราคาอัตโนมัติ: ${generated.quotationNo}`);
  };

  // Line Item handlers
  const handleAddItem = () => {
    const nextOrder = docSet.items.length + 1;
    const newItem: WorkLineItem = {
      id: sanitizeId(`item_${Date.now()}_${nextOrder}`),
      sortOrder: nextOrder,
      description: 'รายการงาน / บริการใหม่',
      subDescription: '',
      quantity: 1,
      unit: 'งาน',
      unitPrice: 10000,
    };
    updateDocFields({
      items: [...docSet.items, newItem],
    });
  };

  const handleUpdateItem = (id: string, patch: Partial<WorkLineItem>) => {
    updateDocFields({
      items: docSet.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    });
  };

  const handleRemoveItem = (id: string) => {
    updateDocFields({
      items: docSet.items
        .filter((item) => item.id !== id)
        .map((item, idx) => ({ ...item, sortOrder: idx + 1 })),
    });
  };

  // Select customer from database and sync into active document set
  const handleApplyCustomerToDoc = (customer: CustomerRecord) => {
    updateDocFields({
      customerId: customer.id,
      customerName: customer.name,
      customerTaxId: customer.taxId,
      customerBranch: customer.branch,
      customerAddress: customer.address,
      customerContact: customer.contactPerson,
      customerPhone: customer.phone,
      customerEmail: customer.email,
    });
    setActiveNavTab('editor');
    showToast(`ซิงค์ข้อมูลลูกค้า "${customer.name}" ไปยังเอกสารทั้ง 4 หน้าแล้ว`);
  };

  // Quick-save current customer fields in the editor into the Customer Database
  const handleQuickSaveCurrentCustomerToDb = async () => {
    if (!docSet.customerName.trim()) {
      showToast('กรุณาระบุชื่อลูกค้าก่อนบันทึกเข้าฐานข้อมูล', 'error');
      return;
    }
    const existingCus = customers.find(
      (c) => c.id === docSet.customerId || c.name.trim() === docSet.customerName.trim()
    );
    const nextCode = existingCus
      ? existingCus.code
      : `CUS-${String(customers.length + 1).padStart(3, '0')}`;
    const customerRecord: CustomerRecord = {
      id: existingCus ? existingCus.id : sanitizeId(`cus_${Date.now()}`),
      ownerId: currentUser ? currentUser.uid : 'local',
      code: nextCode,
      name: docSet.customerName.trim(),
      taxId: docSet.customerTaxId.trim(),
      branch: docSet.customerBranch.trim() || 'สำนักงานใหญ่',
      address: docSet.customerAddress.trim(),
      contactPerson: docSet.customerContact.trim(),
      phone: docSet.customerPhone.trim(),
      email: docSet.customerEmail.trim(),
      notes: '',
    };

    await handleSaveCustomer(customerRecord, Boolean(existingCus));
    updateDocFields({ customerId: customerRecord.id });
    showToast(`บันทึก "${customerRecord.name}" ลงฐานข้อมูลลูกค้าเรียบร้อยแล้ว`);
  };

  // Save Customer (Local + Cloud Firestore if logged in)
  const handleSaveCustomer = async (customer: CustomerRecord, _isExistingLocal: boolean) => {
    setCustomers((prev) => {
      const exists = prev.some((c) => c.id === customer.id);
      if (exists) {
        return prev.map((c) => (c.id === customer.id ? customer : c));
      }
      return [...prev, customer];
    });

    if (currentUser) {
      const existsInCloud = cloudCustomerIds.has(sanitizeId(customer.id));
      await saveCustomerToFirestore(currentUser.uid, customer, existsInCloud);
    }
  };

  const handleDeleteCustomer = async (customerId: string) => {
    setCustomers((prev) => prev.filter((c) => c.id !== customerId));
    if (docSet.customerId === customerId) {
      updateDocFields({ customerId: '' });
    }
    if (currentUser && cloudCustomerIds.has(sanitizeId(customerId))) {
      await deleteCustomerFromFirestore(customerId);
    }
  };

  // Save current 4-page Document Set (Local + Cloud Firestore if logged in)
  const handleSaveCurrentDocumentSet = async () => {
    setIsSavingDoc(true);
    try {
      const { items, ...meta } = docSet;

      setSavedDocSets((prev) => {
        const exists = prev.some((d) => d.id === docSet.id);
        const nextList = exists
          ? prev.map((d) => (d.id === docSet.id ? meta : d))
          : [meta, ...prev];
        try {
          localStorage.setItem(LOCAL_STORAGE_ARCHIVE_KEY, JSON.stringify(nextList));
        } catch {
          // Ignore
        }
        return nextList;
      });

      setLocalItemsMap((prev) => ({
        ...prev,
        [docSet.id]: items,
      }));

      if (currentUser) {
        const existsInCloud = cloudDocSetIds.has(sanitizeId(docSet.id));
        await saveDocumentSetToFirestore(
          currentUser.uid,
          docSet,
          existsInCloud,
          cloudCustomerIds
        );
        showToast('บันทึกชุดเอกสารทั้ง 4 หน้าขึ้น Cloud Firestore เรียบร้อยแล้ว');
      } else {
        showToast('บันทึกชุดเอกสารทั้ง 4 หน้าลงในคลังเรียบร้อยแล้ว');
      }
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึกชุดเอกสาร',
        'error'
      );
    } finally {
      setIsSavingDoc(false);
    }
  };

  const handleLoadDocumentSet = async (docSetId: string) => {
    const foundMeta = savedDocSets.find((d) => d.id === docSetId);
    if (!foundMeta) return;

    let loadedItems = localItemsMap[docSetId] || [];
    if (currentUser) {
      try {
        loadedItems = await fetchDocumentItems(currentUser.uid, docSetId);
      } catch {
        // Fallback to local items
      }
    }

    const savedLogo = localStorage.getItem('syncdoc_seller_logo_v1') || '';
    const savedSignature = localStorage.getItem('syncdoc_seller_signature_v1') || '';

    setDocSet({
      ...foundMeta,
      discountAmount: 0,
      vatMode: 'none',
      vatRate: 0,
      sellerLogoDataUrl: foundMeta.sellerLogoDataUrl || docSet.sellerLogoDataUrl || savedLogo,
      sellerSignatureDataUrl:
        foundMeta.sellerSignatureDataUrl || docSet.sellerSignatureDataUrl || savedSignature,
      items: loadedItems.length > 0 ? loadedItems : DEFAULT_DOCUMENT_SET.items,
    });
    setActiveNavTab('editor');
    showToast(`โหลดชุดเอกสาร "${foundMeta.projectTitle}" เรียบร้อยแล้ว`);
  };

  const handleCreateNewDocumentSet = () => {
    const today = new Date().toISOString().slice(0, 10);
    const storedSeq = parseInt(localStorage.getItem(LOCAL_STORAGE_SEQ_KEY) || '1', 10) || 1;
    const generated = generateRunningDocumentNumbers(
      today,
      [...savedDocSets, { quotationNo: docSet.quotationNo }],
      storedSeq + 1
    );

    try {
      localStorage.setItem(LOCAL_STORAGE_SEQ_KEY, String(generated.nextSequence));
    } catch {
      // Ignore
    }

    const ym = today.slice(0, 7).replace('-', '');
    const seqStr = String(generated.nextSequence).padStart(3, '0');

    let defaultSeller = {
      sellerName: docSet.sellerName,
      sellerTaxId: docSet.sellerTaxId,
      sellerBranch: docSet.sellerBranch,
      sellerAddress: docSet.sellerAddress,
      sellerPhone: docSet.sellerPhone,
      sellerEmail: docSet.sellerEmail,
      sellerBankInfo: docSet.sellerBankInfo,
      sellerSignerName: docSet.sellerSignerName,
      sellerLogoDataUrl:
        docSet.sellerLogoDataUrl || localStorage.getItem('syncdoc_seller_logo_v1') || '',
      sellerSignatureDataUrl:
        docSet.sellerSignatureDataUrl ||
        localStorage.getItem('syncdoc_seller_signature_v1') ||
        '',
    };

    try {
      const savedSeller = localStorage.getItem('syncdoc_default_seller');
      if (savedSeller) {
        const parsedSeller = JSON.parse(savedSeller);
        defaultSeller = {
          ...defaultSeller,
          ...parsedSeller,
          sellerLogoDataUrl:
            parsedSeller.sellerLogoDataUrl || defaultSeller.sellerLogoDataUrl,
          sellerSignatureDataUrl:
            parsedSeller.sellerSignatureDataUrl || defaultSeller.sellerSignatureDataUrl,
        };
      }
    } catch {
      // Ignore
    }

    const freshSet: DocumentSetRecord = {
      ...DEFAULT_DOCUMENT_SET,
      ...defaultSeller,
      id: sanitizeId(`docset_${Date.now()}`),
      ownerId: currentUser ? currentUser.uid : 'local',
      projectTitle: 'โครงการบริการใหม่ (ระบุชื่องาน)',
      referenceNo: `PO-${ym}-${seqStr}`,
      quotationNo: generated.quotationNo,
      billingNoteNo: generated.billingNoteNo,
      invoiceNo: generated.invoiceNo,
      receiptNo: generated.receiptNo,
      issueDate: today,
      dueDate: today,
      paymentDate: today,
      discountAmount: 0,
      vatMode: 'none',
      vatRate: 0,
      items: [
        {
          id: sanitizeId(`item_${Date.now()}_1`),
          sortOrder: 1,
          description: 'ค่าบริการออกแบบและพัฒนาระบบ',
          subDescription: '- รายละเอียดขอบเขตงานตามตกลง',
          quantity: 1,
          unit: 'งาน',
          unitPrice: 25000,
        },
      ],
    };

    setDocSet(freshSet);
    setActiveNavTab('editor');
    showToast(`สร้างชุดเอกสารใหม่พร้อมรันเลข ${generated.quotationNo} อัตโนมัติแล้ว`);
  };

  const handleDuplicateCurrentDocSet = () => {
    const today = new Date().toISOString().slice(0, 10);
    const storedSeq = parseInt(localStorage.getItem(LOCAL_STORAGE_SEQ_KEY) || '1', 10) || 1;
    const generated = generateRunningDocumentNumbers(
      today,
      [...savedDocSets, { quotationNo: docSet.quotationNo }],
      storedSeq + 1
    );

    try {
      localStorage.setItem(LOCAL_STORAGE_SEQ_KEY, String(generated.nextSequence));
    } catch {
      // Ignore
    }

    const clonedSet: DocumentSetRecord = {
      ...docSet,
      id: sanitizeId(`docset_${Date.now()}`),
      projectTitle: `${docSet.projectTitle} (สำเนา)`,
      quotationNo: generated.quotationNo,
      billingNoteNo: generated.billingNoteNo,
      invoiceNo: generated.invoiceNo,
      receiptNo: generated.receiptNo,
      items: docSet.items.map((item, idx) => ({
        ...item,
        id: sanitizeId(`item_${Date.now()}_${idx + 1}`),
      })),
    };
    setDocSet(clonedSet);
    setActiveNavTab('editor');
    showToast(`คัดลอกชุดเอกสารพร้อมรันเลข ${generated.quotationNo} เรียบร้อยแล้ว`);
  };

  const handleDeleteDocumentSet = async (docSetId: string) => {
    setSavedDocSets((prev) => {
      const next = prev.filter((d) => d.id !== docSetId);
      try {
        localStorage.setItem(LOCAL_STORAGE_ARCHIVE_KEY, JSON.stringify(next));
      } catch {
        // Ignore
      }
      return next;
    });

    if (currentUser && cloudDocSetIds.has(sanitizeId(docSetId))) {
      await deleteDocumentSetFromFirestore(currentUser.uid, docSetId);
    }
    showToast('ลบชุดเอกสารออกจากคลังแล้ว');
  };

  // Toggle individual page checkbox for PDF export
  const togglePdfPageSelection = (pageKey: DocumentPageKey) => {
    setSelectedPdfPages((prev) =>
      prev.includes(pageKey) ? prev.filter((k) => k !== pageKey) : [...prev, pageKey]
    );
  };

  const toggleSelectAllPdfPages = () => {
    if (selectedPdfPages.length === DOCUMENT_PAGES.length) {
      setSelectedPdfPages(['quotation']);
    } else {
      setSelectedPdfPages(DOCUMENT_PAGES.map((p) => p.key));
    }
  };

  // Download selected pages as a single PDF file
  const handleDownloadSelectedPdf = async (overrideKeys?: DocumentPageKey[]) => {
    const keysToExport = overrideKeys || selectedPdfPages;
    if (keysToExport.length === 0) {
      showToast('กรุณาติ๊กเลือกอย่างน้อย 1 หน้าเอกสารเพื่อดาวน์โหลด PDF', 'error');
      return;
    }

    setIsExportingPdf(true);
    setExportStatusText('กำลังเตรียมหน้าเอกสาร A4...');
    try {
      await exportSelectedPagesToPdf(
        keysToExport,
        pdfSheetRefs.current,
        docSet,
        (stepText) => setExportStatusText(stepText)
      );
      showToast(`ดาวน์โหลดไฟล์ PDF (${keysToExport.length} หน้า) เรียบร้อยแล้ว`);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการสร้างไฟล์ PDF',
        'error'
      );
    } finally {
      setIsExportingPdf(false);
      setExportStatusText(null);
    }
  };

  // Google Sign-In / Sign-Out
  const handleGoogleSignIn = async () => {
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      if (cred.user) {
        showToast(`เข้าสู่ระบบสำเร็จ (${cred.user.email})`);
      }
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'ยกเลิกการเข้าสู่ระบบด้วย Google',
        'error'
      );
    }
  };

  const handleGoogleSignOut = async () => {
    await signOut(auth);
    showToast('ออกจากระบบเรียบร้อยแล้ว');
  };

  const activePageMeta =
    DOCUMENT_PAGES.find((p) => p.key === activeDocPage) || DOCUMENT_PAGES[0];

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-900">
      {/* Top Bar Contract: Strictly 3 zones separated by gap-8 */}
      <header className="no-print sticky top-0 z-30 flex items-center justify-between gap-8 px-6 py-3.5 bg-white border-b border-slate-200">
        {/* Zone 1: Single text element Brand Wordmark */}
        <a
          href="#editor"
          onClick={(e) => {
            e.preventDefault();
            setActiveNavTab('editor');
          }}
          className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
        >
          SyncDoc Billing Suite
        </a>

        {/* Zone 2: 4 concise single-line navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <a
            href="#editor"
            onClick={(e) => {
              e.preventDefault();
              setActiveNavTab('editor');
            }}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeNavTab === 'editor'
                ? 'border-blue-700 text-slate-900 font-semibold'
                : 'border-transparent hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            เอกสาร 4 หน้า
          </a>
          <a
            href="#customers"
            onClick={(e) => {
              e.preventDefault();
              setActiveNavTab('customers');
            }}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeNavTab === 'customers'
                ? 'border-blue-700 text-slate-900 font-semibold'
                : 'border-transparent hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            ฐานข้อมูลลูกค้า
          </a>
          <a
            href="#archive"
            onClick={(e) => {
              e.preventDefault();
              setActiveNavTab('archive');
            }}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeNavTab === 'archive'
                ? 'border-blue-700 text-slate-900 font-semibold'
                : 'border-transparent hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            คลังเอกสาร
          </a>
          <a
            href="#seller"
            onClick={(e) => {
              e.preventDefault();
              setActiveNavTab('seller');
            }}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeNavTab === 'seller'
                ? 'border-blue-700 text-slate-900 font-semibold'
                : 'border-transparent hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            ข้อมูลผู้ขาย
          </a>
        </nav>

        {/* Zone 3: 1 Primary Action Button */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            disabled={isExportingPdf}
            onClick={() => handleDownloadSelectedPdf()}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>
              {isExportingPdf
                ? exportStatusText || 'กำลังสร้างไฟล์ PDF...'
                : `ดาวน์โหลด PDF ที่เลือก (${selectedPdfPages.length} หน้า)`}
            </span>
          </button>
        </div>
      </header>

      {/* Secondary Workspace Bar: Mobile Nav + Selective PDF Checkboxes + Cloud Sync */}
      <div className="no-print bg-slate-50 border-b border-slate-200 px-6 py-2.5">
        <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Mobile Navigation Links */}
          <div className="flex md:hidden items-center gap-2 overflow-x-auto pb-1">
            {(
              [
                { id: 'editor', label: 'เอกสาร 4 หน้า' },
                { id: 'customers', label: 'ฐานข้อมูลลูกค้า' },
                { id: 'archive', label: 'คลังเอกสาร' },
                { id: 'seller', label: 'ข้อมูลผู้ขาย' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveNavTab(tab.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap shrink-0 cursor-pointer ${
                  activeNavTab === tab.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-700 border border-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Selective Page Export Checkboxes */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-slate-700 mr-1 whitespace-nowrap shrink-0">
              ติ๊กเลือกหน้าดาวน์โหลด PDF:
            </span>

            {DOCUMENT_PAGES.map((page) => {
              const checked = selectedPdfPages.includes(page.key);
              return (
                <button
                  key={page.key}
                  type="button"
                  onClick={() => togglePdfPageSelection(page.key)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    checked
                      ? 'bg-white border-blue-600 text-blue-900 shadow-2xs'
                      : 'bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {checked ? (
                    <CheckSquare className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  )}
                  <span>{page.shortLabel}</span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={toggleSelectAllPdfPages}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 underline underline-offset-2 whitespace-nowrap shrink-0 cursor-pointer"
            >
              {selectedPdfPages.length === 4 ? 'เลือกเฉพาะหน้าแรก' : 'เลือกทั้ง 4 หน้า'}
            </button>
          </div>

          {/* Workspace Action Utilities: Save, New, Print, Cloud Auth */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCreateNewDocumentSet}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FilePlus2 className="w-3.5 h-3.5" />
              <span>สร้างชุดใหม่ (รันเลข)</span>
            </button>

            <button
              type="button"
              disabled={isSavingDoc}
              onClick={handleSaveCurrentDocumentSet}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-md hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 text-blue-700" />
              <span>{isSavingDoc ? 'กำลังบันทึก...' : 'บันทึกชุดเอกสาร'}</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              title="สั่งพิมพ์หรือบันทึกเป็น PDF ผ่านระบบพิมพ์ของเบราว์เซอร์"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>พิมพ์หน้าที่เลือก</span>
            </button>

            {currentUser ? (
              <div className="inline-flex items-center gap-2 pl-2 border-l border-slate-300 text-xs text-slate-600">
                <span className="truncate max-w-[140px]" title={currentUser.email || ''}>
                  {currentUser.email}
                </span>
                <button
                  type="button"
                  onClick={handleGoogleSignOut}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-100 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <LogOut className="w-3 h-3" />
                  <span>ออก</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5 text-blue-700" />
                <span>เชื่อมต่อ Cloud</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="no-print fixed bottom-5 right-5 z-50 max-w-md px-4 py-3 rounded-lg shadow-lg border flex items-center gap-2.5 text-xs font-semibold bg-slate-900 text-white border-slate-700">
          {toastMessage.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          ) : (
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Main Workspace Content */}
      <main className="no-print flex-1">
        {activeNavTab === 'customers' && (
          <CustomerDatabaseView
            customers={customers}
            activeCustomerId={docSet.customerId}
            isCloudConnected={Boolean(currentUser)}
            onSelectCustomerForDoc={handleApplyCustomerToDoc}
            onSaveCustomer={handleSaveCustomer}
            onDeleteCustomer={handleDeleteCustomer}
          />
        )}

        {activeNavTab === 'archive' && (
          <SavedDocumentSetsView
            savedSets={savedDocSets}
            activeDocSetId={docSet.id}
            isCloudConnected={Boolean(currentUser)}
            onLoadDocSet={handleLoadDocumentSet}
            onCreateNewDocSet={handleCreateNewDocumentSet}
            onDuplicateCurrentDocSet={handleDuplicateCurrentDocSet}
            onDeleteDocSet={handleDeleteDocumentSet}
          />
        )}

        {activeNavTab === 'seller' && (
          <SellerProfileView
            docSet={docSet}
            onUpdateSellerFields={updateDocFields}
            onReturnToEditor={() => setActiveNavTab('editor')}
          />
        )}

        {activeNavTab === 'editor' && (
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT COLUMN (5 cols): Synchronized Data & Tax Editor */}
            <div className="lg:col-span-5 space-y-5">
              {/* Card 1: 01. ข้อมูลลูกค้า (Cleaned per Image 3) */}
              <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">
                      01. ข้อมูลลูกค้า
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      ข้อมูลทุกช่องซิงค์ไปแสดงทั้ง 4 หน้าทันที
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleQuickSaveCurrentCustomerToDb}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    title="บันทึกข้อมูลลูกค้าที่กรอกอยู่นี้เข้าสู่ฐานข้อมูลลูกค้า"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>บันทึกลูกค้าเข้าฐานข้อมูล</span>
                  </button>
                </div>

                {/* Quick Select Customer Dropdown */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ดึงข้อมูลจากฐานข้อมูลลูกค้า ({customers.length} รายชื่อ)
                  </label>
                  <select
                    value={docSet.customerId}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) {
                        updateDocFields({ customerId: '' });
                        return;
                      }
                      const found = customers.find((c) => c.id === val);
                      if (found) {
                        handleApplyCustomerToDoc(found);
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="">-- เลือกลูกค้าจากฐานข้อมูล หรือกรอกเองด้านล่าง --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        [{c.code}] {c.name} (Tax ID: {c.taxId || '-'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
                  <div className="sm:col-span-8">
                    <label className="block font-semibold text-slate-700 mb-1">
                      ชื่อบริษัท / ชื่อลูกค้า
                    </label>
                    <input
                      type="text"
                      value={docSet.customerName}
                      onChange={(e) => updateDocFields({ customerName: e.target.value })}
                      placeholder="บริษัท ลูกค้า จำกัด"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div className="sm:col-span-4">
                    <label className="block font-semibold text-slate-700 mb-1">
                      สำนักงานใหญ่ / สาขา
                    </label>
                    <input
                      type="text"
                      value={docSet.customerBranch}
                      onChange={(e) => updateDocFields({ customerBranch: e.target.value })}
                      placeholder="สำนักงานใหญ่"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div className="sm:col-span-6">
                    <label className="block font-semibold text-slate-700 mb-1">
                      เลขประจำตัวผู้เสียภาษี 13 หลัก
                    </label>
                    <input
                      type="text"
                      value={docSet.customerTaxId}
                      onChange={(e) => updateDocFields({ customerTaxId: e.target.value })}
                      placeholder="01055XXXXXXXX"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md font-mono-tabular text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div className="sm:col-span-6">
                    <label className="block font-semibold text-slate-700 mb-1">
                      ผู้ติดต่อ
                    </label>
                    <input
                      type="text"
                      value={docSet.customerContact}
                      onChange={(e) => updateDocFields({ customerContact: e.target.value })}
                      placeholder="ชื่อผู้ติดต่อ"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div className="sm:col-span-6">
                    <label className="block font-semibold text-slate-700 mb-1">
                      เบอร์โทรศัพท์ลูกค้า
                    </label>
                    <input
                      type="text"
                      value={docSet.customerPhone}
                      onChange={(e) => updateDocFields({ customerPhone: e.target.value })}
                      placeholder="08X-XXX-XXXX"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md font-mono-tabular text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div className="sm:col-span-6">
                    <label className="block font-semibold text-slate-700 mb-1">
                      อีเมลลูกค้า (Email)
                    </label>
                    <input
                      type="email"
                      value={docSet.customerEmail}
                      onChange={(e) => updateDocFields({ customerEmail: e.target.value })}
                      placeholder="customer@company.co.th"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div className="sm:col-span-12">
                    <label className="block font-semibold text-slate-700 mb-1">
                      ที่อยู่ลูกค้า
                    </label>
                    <textarea
                      rows={2}
                      value={docSet.customerAddress}
                      onChange={(e) => updateDocFields({ customerAddress: e.target.value })}
                      placeholder="ที่อยู่สำหรับออกเอกสาร"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-md text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div className="sm:col-span-8 pt-2 border-t border-slate-100">
                    <label className="block font-semibold text-slate-700 mb-1">
                      ชื่องาน / โครงการ (ซิงค์ทุกหน้า)
                    </label>
                    <input
                      type="text"
                      value={docSet.projectTitle}
                      onChange={(e) => updateDocFields({ projectTitle: e.target.value })}
                      placeholder="ระบุชื่องานหรือโปรเจกต์"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div className="sm:col-span-4 pt-2 border-t border-slate-100">
                    <label className="block font-semibold text-slate-700 mb-1">
                      เลขที่ใบสั่งซื้อ / Ref. PO
                    </label>
                    <input
                      type="text"
                      value={docSet.referenceNo}
                      onChange={(e) => updateDocFields({ referenceNo: e.target.value })}
                      placeholder="PO-2026-XXXX"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md font-mono-tabular text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  {/* Auto-running Document Numbers Header */}
                  <div className="sm:col-span-12 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="font-semibold text-slate-700">
                      เลขที่เอกสารทั้ง 4 หน้า (รันเลขใบเสนอราคาอัตโนมัติ)
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAutoRunQuotationNumber()}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded transition-colors cursor-pointer"
                      title="รันเลขใบเสนอราคาและเอกสารทั้งชุดเป็นลำดับถัดไปอัตโนมัติ"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>รันเลขถัดไปอัตโนมัติ</span>
                    </button>
                  </div>

                  {/* Document Numbers for all 4 pages */}
                  <div className="sm:col-span-3">
                    <label className="block font-semibold text-slate-600 mb-1">
                      เลขใบเสนอราคา
                    </label>
                    <input
                      type="text"
                      value={docSet.quotationNo}
                      onChange={(e) => {
                        const newQt = e.target.value;
                        const synced = syncCompanionDocNumbersFromQuotation(newQt);
                        updateDocFields({
                          quotationNo: newQt,
                          ...synced,
                        });
                      }}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-md font-mono-tabular text-xs font-semibold text-blue-900"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block font-semibold text-slate-600 mb-1">
                      เลขใบวางบิล
                    </label>
                    <input
                      type="text"
                      value={docSet.billingNoteNo}
                      onChange={(e) => updateDocFields({ billingNoteNo: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-md font-mono-tabular text-xs"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block font-semibold text-slate-600 mb-1">
                      เลขใบแจ้งหนี้
                    </label>
                    <input
                      type="text"
                      value={docSet.invoiceNo}
                      onChange={(e) => updateDocFields({ invoiceNo: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-md font-mono-tabular text-xs"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block font-semibold text-slate-600 mb-1">
                      เลขใบเสร็จรับเงิน
                    </label>
                    <input
                      type="text"
                      value={docSet.receiptNo}
                      onChange={(e) => updateDocFields({ receiptNo: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-md font-mono-tabular text-xs"
                    />
                  </div>

                  {/* Dates formatted strictly as DD/MM/YYYY (วัน/เดือน/ปี) */}
                  <div className="sm:col-span-6">
                    <label className="block font-semibold text-slate-700 mb-1">
                      วันที่ออกเอกสาร (วัน/เดือน/ปี)
                    </label>
                    <DateInputDMY
                      value={docSet.issueDate}
                      onChange={(newDate) => {
                        const oldYm = (docSet.issueDate || '').slice(0, 7);
                        const newYm = newDate.slice(0, 7);
                        if (newYm && newYm !== oldYm) {
                          const generated = generateRunningDocumentNumbers(
                            newDate,
                            savedDocSets,
                            1
                          );
                          updateDocFields({
                            issueDate: newDate,
                            quotationNo: generated.quotationNo,
                            billingNoteNo: generated.billingNoteNo,
                            invoiceNo: generated.invoiceNo,
                            receiptNo: generated.receiptNo,
                          });
                        } else {
                          updateDocFields({ issueDate: newDate });
                        }
                      }}
                    />
                  </div>

                  <div className="sm:col-span-6">
                    <label className="block font-semibold text-slate-700 mb-1">
                      วันครบกำหนดชำระ / ยืนราคาถึงวันที่ (วัน/เดือน/ปี)
                    </label>
                    <DateInputDMY
                      value={docSet.dueDate}
                      onChange={(newDate) => updateDocFields({ dueDate: newDate })}
                    />
                  </div>
                </div>
              </section>

              {/* Card 2: Synced Work Line Items (Multi-line Sub-description) */}
              <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">
                      02. รายละเอียดงานและบริการ (ซิงค์อัตโนมัติ 4 หน้า)
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      ช่องรายละเอียดสามารถกด Enter เพื่อพิมพ์แยกหลายบรรทัดได้ตามต้องการ
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>เพิ่มรายการงาน</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {docSet.items.map((item, idx) => {
                    const lineTotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
                    return (
                      <div
                        key={item.id}
                        className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono-tabular font-bold text-slate-700">
                            รายการที่ #{idx + 1}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="font-mono-tabular font-semibold text-slate-900">
                              รวม: ฿{formatCurrency(lineTotal)}
                            </span>
                            {docSet.items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(item.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                                title="ลบรายการนี้"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) =>
                              handleUpdateItem(item.id, { description: e.target.value })
                            }
                            placeholder="หัวข้อรายการงาน / บริการหลัก (เช่น Motion Graphic)"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-slate-500 mb-1">
                            รายละเอียดขอบเขตงาน (กรอกได้หลายบรรทัด กด Enter เพื่อขึ้นบรรทัดใหม่)
                          </label>
                          <textarea
                            rows={3}
                            value={item.subDescription}
                            onChange={(e) =>
                              handleUpdateItem(item.id, { subDescription: e.target.value })
                            }
                            placeholder={
                              '- ความยาว 1 นาที\n- รวมพากย์เสียงและซาวด์เอฟเฟกต์\n- แก้ไขงานได้ 2 ครั้ง'
                            }
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-700 leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-600"
                          />
                        </div>

                        <div className="grid grid-cols-12 gap-2">
                          <div className="col-span-4">
                            <label className="block text-[11px] text-slate-500 mb-0.5">
                              จำนวน
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={item.quantity}
                              onChange={(e) =>
                                handleUpdateItem(item.id, {
                                  quantity: parseFloat(e.target.value) || 0,
                                })
                              }
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md font-mono-tabular text-right"
                            />
                          </div>

                          <div className="col-span-3">
                            <label className="block text-[11px] text-slate-500 mb-0.5">
                              หน่วยนับ
                            </label>
                            <input
                              type="text"
                              value={item.unit}
                              onChange={(e) =>
                                handleUpdateItem(item.id, { unit: e.target.value })
                              }
                              placeholder="งาน / คลิป"
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-center"
                            />
                          </div>

                          <div className="col-span-5">
                            <label className="block text-[11px] text-slate-500 mb-0.5">
                              ราคาต่อหน่วย (บาท)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={item.unitPrice}
                              onChange={(e) =>
                                handleUpdateItem(item.id, {
                                  unitPrice: parseFloat(e.target.value) || 0,
                                })
                              }
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md font-mono-tabular text-right font-semibold"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Card 3: 03. คำนวณเงินรวม และภาษีหัก ณ ที่จ่าย (VAT section removed per Image 2) */}
              <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
                <div className="pb-3 border-b border-slate-200">
                  <h2 className="text-sm font-bold text-slate-900">
                    03. คำนวณเงินรวม และภาษีหัก ณ ที่จ่าย
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    เลือกเปอร์เซ็นต์ภาษีหัก ณ ที่จ่ายมาตรฐาน หรือพิมพ์กำหนดเปอร์เซ็นต์เองได้ตามต้องการ
                  </p>
                </div>

                {/* Withholding Tax (WHT) Configuration */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <label className="inline-flex items-center gap-2 font-bold text-slate-900 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={docSet.whtEnabled}
                        onChange={(e) => updateDocFields({ whtEnabled: e.target.checked })}
                        className="w-4 h-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                      />
                      <span>หักภาษี ณ ที่จ่าย (Withholding Tax)</span>
                    </label>
                    {docSet.whtEnabled && (
                      <span className="font-mono-tabular font-bold text-amber-800">
                        หัก {docSet.whtRate}% (-฿{formatCurrency(financialSummary.whtAmount)})
                      </span>
                    )}
                  </div>

                  {docSet.whtEnabled && (
                    <div className="space-y-3 pt-2 border-t border-slate-200">
                      <div>
                        <div className="text-[11px] font-semibold text-slate-600 mb-1.5">
                          เลือกอัตราภาษีหัก ณ ที่จ่ายด่วน หรือกรอกเปอร์เซ็นต์เองในช่องขวา:
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                          {PRESET_WHT_OPTIONS.map((preset) => {
                            const active = Number(docSet.whtRate) === preset.rate;
                            return (
                              <button
                                key={preset.rate}
                                type="button"
                                onClick={() =>
                                  updateDocFields({
                                    whtRate: preset.rate,
                                    whtType: preset.desc,
                                  })
                                }
                                className={`py-1.5 px-2 rounded border text-left transition-colors cursor-pointer ${
                                  active
                                    ? 'bg-slate-900 border-slate-900 text-white'
                                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                                }`}
                              >
                                <div className="font-mono-tabular font-bold text-xs">
                                  {preset.label}
                                </div>
                                <div
                                  className={`text-[10px] truncate ${
                                    active ? 'text-slate-300' : 'text-slate-500'
                                  }`}
                                >
                                  {preset.desc}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                        <div className="sm:col-span-5">
                          <label className="block font-semibold text-slate-700 mb-1">
                            กำหนดเปอร์เซ็นต์เอง (%)
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={docSet.whtRate}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                updateDocFields({
                                  whtRate: Number.isFinite(val)
                                    ? Math.min(100, Math.max(0, val))
                                    : 0,
                                });
                              }}
                              className="w-full pr-8 pl-3 py-1.5 bg-white border border-slate-300 rounded-md font-mono-tabular font-bold text-slate-900 text-right focus:outline-none focus:ring-2 focus:ring-blue-600"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono-tabular text-slate-500 font-semibold">
                              %
                            </span>
                          </div>
                        </div>

                        <div className="sm:col-span-7">
                          <label className="block font-semibold text-slate-700 mb-1">
                            ประเภทเงินได้หัก ณ ที่จ่าย
                          </label>
                          <input
                            type="text"
                            value={docSet.whtType}
                            onChange={(e) => updateDocFields({ whtType: e.target.value })}
                            placeholder="เช่น ค่าบริการ / จ้างทำของ"
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Live Financial Summary Box */}
                <div className="p-4 bg-slate-900 text-white rounded-lg space-y-2 text-xs">
                  <div className="flex justify-between text-sm font-bold">
                    <span>จำนวนเงินรวมทั้งสิ้น (Grand Total)</span>
                    <span className="font-mono-tabular">
                      ฿{formatCurrency(financialSummary.grandTotal)}
                    </span>
                  </div>
                  {docSet.whtEnabled && (
                    <>
                      <div className="flex justify-between text-amber-300">
                        <span>หักภาษี ณ ที่จ่าย {docSet.whtRate}%</span>
                        <span className="font-mono-tabular">
                          -฿{formatCurrency(financialSummary.whtAmount)}
                        </span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-slate-700 text-sm font-bold text-emerald-400">
                        <span>ยอดชำระสุทธิ (Net Payable)</span>
                        <span className="font-mono-tabular">
                          ฿{formatCurrency(financialSummary.netPayable)}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* Payment Method & Notes */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs pt-2">
                  <div className="sm:col-span-7">
                    <label className="block font-semibold text-slate-700 mb-1">
                      วิธีรับชำระเงิน (แสดงในหน้า 4 ใบเสร็จรับเงิน)
                    </label>
                    <input
                      type="text"
                      value={docSet.paymentMethod}
                      onChange={(e) => updateDocFields({ paymentMethod: e.target.value })}
                      placeholder="โอนเงินเข้าบัญชีธนาคาร / เช็คธนาคาร"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-md"
                    />
                  </div>
                  <div className="sm:col-span-5">
                    <label className="block font-semibold text-slate-700 mb-1">
                      วันที่รับชำระเงิน (วัน/เดือน/ปี)
                    </label>
                    <DateInputDMY
                      value={docSet.paymentDate}
                      onChange={(newDate) => updateDocFields({ paymentDate: newDate })}
                    />
                  </div>
                  <div className="sm:col-span-12">
                    <label className="block font-semibold text-slate-700 mb-1">
                      หมายเหตุ / เงื่อนไขท้ายเอกสาร (ซิงค์ทั้ง 4 หน้า)
                    </label>
                    <textarea
                      rows={3}
                      value={docSet.notes}
                      onChange={(e) => updateDocFields({ notes: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-md"
                    />
                  </div>
                </div>
              </section>
            </div>

            {/* RIGHT COLUMN (7 cols): Synchronized 4-Page Live A4 Preview */}
            <div className="lg:col-span-7 space-y-4">
              {/* Preview Switcher Toolbar */}
              <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
                {/* 4 Page Tabs */}
                <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
                  {DOCUMENT_PAGES.map((page) => {
                    const isActive =
                      previewLayout === 'single' && activeDocPage === page.key;
                    return (
                      <button
                        key={page.key}
                        type="button"
                        onClick={() => {
                          setPreviewLayout('single');
                          setActiveDocPage(page.key);
                        }}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          isActive
                            ? 'bg-white text-slate-900 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {page.shortLabel}
                      </button>
                    );
                  })}
                </div>

                {/* View Mode Toggle: Single Page vs All 4 Pages Together */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setPreviewLayout((prev) => (prev === 'single' ? 'all4' : 'single'))
                    }
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      previewLayout === 'all4'
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {previewLayout === 'all4' ? (
                      <>
                        <FileText className="w-3.5 h-3.5" />
                        <span>ดูทีละหน้า</span>
                      </>
                    ) : (
                      <>
                        <Layers className="w-3.5 h-3.5" />
                        <span>ดูเรียงทั้ง 4 หน้าพร้อมกัน</span>
                      </>
                    )}
                  </button>

                  {previewLayout === 'single' && (
                    <button
                      type="button"
                      disabled={isExportingPdf}
                      onClick={() => handleDownloadSelectedPdf([activePageMeta.key])}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>โหลดเฉพาะหน้านี้ (PDF)</span>
                    </button>
                  )}
                </div>
              </div>

              {/* A4 Sheet Viewport */}
              {previewLayout === 'single' ? (
                <div className="overflow-x-auto pb-6 flex justify-center">
                  <A4DocumentSheet
                    pageMeta={activePageMeta}
                    docSet={docSet}
                    summary={financialSummary}
                  />
                </div>
              ) : (
                <div className="space-y-8 pb-8">
                  {DOCUMENT_PAGES.map((pageMeta) => {
                    const isChecked = selectedPdfPages.includes(pageMeta.key);
                    return (
                      <div key={pageMeta.key} className="space-y-2">
                        <div className="flex items-center justify-between px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs">
                          <button
                            type="button"
                            onClick={() => togglePdfPageSelection(pageMeta.key)}
                            className="inline-flex items-center gap-2 font-bold text-slate-900 cursor-pointer"
                          >
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-blue-700" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400" />
                            )}
                            <span>
                              หน้าที่ {pageMeta.index}: {pageMeta.thaiTitle} ({pageMeta.englishTitle})
                            </span>
                          </button>

                          <button
                            type="button"
                            disabled={isExportingPdf}
                            onClick={() => handleDownloadSelectedPdf([pageMeta.key])}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50 rounded cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>ดาวน์โหลดหน้านี้ (PDF)</span>
                          </button>
                        </div>

                        <div className="overflow-x-auto flex justify-center">
                          <A4DocumentSheet
                            pageMeta={pageMeta}
                            docSet={docSet}
                            summary={financialSummary}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Hidden Offscreen Full-Scale A4 Renderer for Instant Multi-Page PDF Capture */}
      <div
        aria-hidden="true"
        className="no-print fixed top-0 left-[-9999px] pointer-events-none opacity-0"
      >
        {DOCUMENT_PAGES.map((pageMeta) => (
          <A4DocumentSheet
            key={pageMeta.key}
            pageMeta={pageMeta}
            docSet={docSet}
            summary={financialSummary}
            sheetRef={(el) => {
              pdfSheetRefs.current[pageMeta.key] = el;
            }}
          />
        ))}
      </div>

      {/* Print-Only Container: Prints ONLY the checked pages in selectedPdfPages */}
      <div className="hidden print-only-container">
        {DOCUMENT_PAGES.filter((p) => selectedPdfPages.includes(p.key)).map(
          (pageMeta) => (
            <A4DocumentSheet
              key={pageMeta.key}
              pageMeta={pageMeta}
              docSet={docSet}
              summary={financialSummary}
              className="a4-print-page"
            />
          )
        )}
      </div>
    </div>
  );
}
