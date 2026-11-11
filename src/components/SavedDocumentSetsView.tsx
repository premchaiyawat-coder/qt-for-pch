import React, { useState } from 'react';
import { FilePlus2, FolderOpen, Trash2, Copy } from 'lucide-react';
import { DocumentSetRecord, formatDateDMY } from '../types/billing';

interface SavedDocumentSetsViewProps {
  savedSets: Omit<DocumentSetRecord, 'items'>[];
  activeDocSetId: string;
  isCloudConnected: boolean;
  onLoadDocSet: (docSetId: string) => Promise<void>;
  onCreateNewDocSet: () => void;
  onDuplicateCurrentDocSet: () => void;
  onDeleteDocSet: (docSetId: string) => Promise<void>;
}

export const SavedDocumentSetsView: React.FC<SavedDocumentSetsViewProps> = ({
  savedSets,
  activeDocSetId,
  isCloudConnected,
  onLoadDocSet,
  onCreateNewDocSet,
  onDuplicateCurrentDocSet,
  onDeleteDocSet,
}) => {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleLoad = async (id: string) => {
    setLoadingId(id);
    try {
      await onLoadDocSet(id);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="max-w-[1360px] mx-auto px-6 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            คลังชุดเอกสาร 4 หน้า (Saved Document Suites)
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            บริหารชุดเอกสารที่บันทึกไว้ (1 ชุดประกอบด้วย ใบเสนอราคา · ใบวางบิล · ใบแจ้งหนี้ · ใบเสร็จรับเงิน)
            {' · '}
            <span className="font-mono-tabular font-medium text-slate-800">
              บันทึกไว้ {savedSets.length} ชุด
            </span>
            {' · '}
            <span>
              {isCloudConnected
                ? 'เชื่อมต่อ Cloud Firestore แล้ว'
                : 'จัดเก็บในเครื่องอัตโนมัติ'}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onDuplicateCurrentDocSet}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>คัดลอกชุดปัจจุบันเป็นชุดใหม่</span>
          </button>

          <button
            type="button"
            onClick={onCreateNewDocSet}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FilePlus2 className="w-3.5 h-3.5" />
            <span>สร้างชุดเอกสารใหม่</span>
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {savedSets.length === 0 ? (
          <div className="py-14 px-6 text-center space-y-3">
            <FolderOpen className="w-8 h-8 text-slate-400 mx-auto" />
            <div className="text-sm font-semibold text-slate-800">
              ยังไม่มีชุดเอกสารที่บันทึกไว้ในคลัง
            </div>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              เมื่อคุณกดปุ่ม "บันทึกชุดเอกสาร" ในหน้าแก้ไข ระบบจะเก็บข้อมูลทั้ง 4 หน้าพร้อมรายการงานไว้ที่นี่
            </p>
            <button
              type="button"
              onClick={onCreateNewDocSet}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <FilePlus2 className="w-3.5 h-3.5" />
              <span>เริ่มสร้างชุดเอกสารใหม่</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4 w-56">เลขที่ชุดเอกสาร (4 หน้า)</th>
                  <th className="py-3 px-4">ชื่องาน / โครงการ และลูกค้า</th>
                  <th className="py-3 px-4 w-40">วันที่ออก · ครบกำหนด (ว/ด/ป)</th>
                  <th className="py-3 px-4 w-44">ภาษีหัก ณ ที่จ่าย</th>
                  <th className="py-3 px-4 text-right w-52">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {savedSets.map((docItem) => {
                  const isCurrent = docItem.id === activeDocSetId;
                  return (
                    <tr
                      key={docItem.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isCurrent ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 align-top font-mono-tabular text-xs">
                        <div className="font-bold text-slate-900">
                          {docItem.quotationNo} · {docItem.invoiceNo}
                        </div>
                        <div className="text-slate-500 mt-0.5">
                          {docItem.billingNoteNo} · {docItem.receiptNo}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 align-top">
                        <div className="font-semibold text-slate-900">
                          {docItem.projectTitle || 'ไม่ได้ระบุชื่องาน'}
                        </div>
                        <div className="text-xs text-slate-600 mt-0.5">
                          ลูกค้า: {docItem.customerName || '-'}
                          {docItem.referenceNo ? ` · Ref: ${docItem.referenceNo}` : ''}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 align-top font-mono-tabular text-xs">
                        <div className="text-slate-900">
                          {formatDateDMY(docItem.issueDate)}
                        </div>
                        <div className="text-slate-500 mt-0.5">
                          ถึง {formatDateDMY(docItem.dueDate)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 align-top text-xs text-slate-700 font-mono-tabular">
                        <div>
                          หัก ณ ที่จ่าย:{' '}
                          {docItem.whtEnabled ? `${docItem.whtRate}%` : 'ไม่หัก'}
                        </div>
                        {docItem.whtEnabled && docItem.whtType && (
                          <div className="text-slate-500 mt-0.5 truncate max-w-[160px]">
                            {docItem.whtType}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 align-top text-right">
                        <div className="inline-flex items-center justify-end gap-2">
                          <button
                            type="button"
                            disabled={loadingId === docItem.id}
                            onClick={() => handleLoad(docItem.id)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                              isCurrent
                                ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                                : 'bg-slate-900 text-white hover:bg-slate-800'
                            }`}
                          >
                            {loadingId === docItem.id
                              ? 'กำลังโหลด...'
                              : isCurrent
                              ? 'เปิดแก้ไขอยู่'
                              : 'เปิดชุดเอกสารนี้'}
                          </button>

                          {confirmDeleteId === docItem.id ? (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={async () => {
                                  await onDeleteDocSet(docItem.id);
                                  setConfirmDeleteId(null);
                                }}
                                className="px-2 py-1 text-[11px] font-semibold bg-rose-600 text-white rounded hover:bg-rose-700 cursor-pointer"
                              >
                                ยืนยันลบ
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-2 py-1 text-[11px] text-slate-600 bg-slate-100 rounded hover:bg-slate-200 cursor-pointer"
                              >
                                ยกเลิก
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(docItem.id)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                              title="ลบชุดเอกสาร"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
