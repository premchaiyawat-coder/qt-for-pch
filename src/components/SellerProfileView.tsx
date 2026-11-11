import React, { useState, useRef } from 'react';
import { Check, Upload, Trash2, Image as ImageIcon } from 'lucide-react';
import { BLUEPRINT_CONSTRAINTS, DocumentSetRecord } from '../types/billing';
import { fileToResizedJpegDataUrl, fileToResizedPngDataUrl } from '../utils/imageHelper';

interface SellerProfileViewProps {
  docSet: DocumentSetRecord;
  onUpdateSellerFields: (fields: Partial<DocumentSetRecord>) => void;
  onReturnToEditor: () => void;
}

export const SellerProfileView: React.FC<SellerProfileViewProps> = ({
  docSet,
  onUpdateSellerFields,
  onReturnToEditor,
}) => {
  const [savedNotice, setSavedNotice] = useState(false);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const sigInputRef = useRef<HTMLInputElement | null>(null);
  const idCardInputRef = useRef<HTMLInputElement | null>(null);
  const bankBookInputRef = useRef<HTMLInputElement | null>(null);
  const D = BLUEPRINT_CONSTRAINTS.DOC_SET;

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToResizedPngDataUrl(file, 360, 160);
    onUpdateSellerFields({ sellerLogoDataUrl: dataUrl });
    try {
      localStorage.setItem('syncdoc_seller_logo_v1', dataUrl);
    } catch {
      // Ignore
    }
    e.target.value = '';
  };

  const handleUploadSignature = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToResizedPngDataUrl(file, 640, 280);
    onUpdateSellerFields({ sellerSignatureDataUrl: dataUrl });
    try {
      localStorage.setItem('syncdoc_seller_signature_v1', dataUrl);
    } catch {
      // Ignore
    }
    e.target.value = '';
  };

  const handleUploadIdCard = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToResizedJpegDataUrl(file, 960, 580);
    onUpdateSellerFields({ idCardImageDataUrl: dataUrl });
    try {
      localStorage.setItem('syncdoc_id_card_v1', dataUrl);
    } catch {
      // Ignore
    }
    e.target.value = '';
  };

  const handleUploadBankBook = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToResizedJpegDataUrl(file, 960, 580);
    onUpdateSellerFields({ bankBookImageDataUrl: dataUrl });
    try {
      localStorage.setItem('syncdoc_bank_book_v1', dataUrl);
    } catch {
      // Ignore
    }
    e.target.value = '';
  };

  const handleSaveDefaultSeller = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem(
        'syncdoc_default_seller',
        JSON.stringify({
          sellerName: docSet.sellerName,
          sellerTaxId: docSet.sellerTaxId,
          sellerBranch: docSet.sellerBranch,
          sellerAddress: docSet.sellerAddress,
          sellerPhone: docSet.sellerPhone,
          sellerEmail: docSet.sellerEmail,
          sellerBankInfo: docSet.sellerBankInfo,
          sellerSignerName: docSet.sellerSignerName,
          sellerLogoDataUrl: docSet.sellerLogoDataUrl || '',
          sellerSignatureDataUrl: docSet.sellerSignatureDataUrl || '',
          showSellerSignature: docSet.showSellerSignature !== false,
          idCardImageDataUrl: docSet.idCardImageDataUrl || '',
          bankBookImageDataUrl: docSet.bankBookImageDataUrl || '',
        })
      );
      if (docSet.sellerLogoDataUrl !== undefined) {
        localStorage.setItem('syncdoc_seller_logo_v1', docSet.sellerLogoDataUrl || '');
      }
      if (docSet.sellerSignatureDataUrl !== undefined) {
        localStorage.setItem('syncdoc_seller_signature_v1', docSet.sellerSignatureDataUrl || '');
      }
      if (docSet.idCardImageDataUrl !== undefined) {
        localStorage.setItem('syncdoc_id_card_v1', docSet.idCardImageDataUrl || '');
      }
      if (docSet.bankBookImageDataUrl !== undefined) {
        localStorage.setItem('syncdoc_bank_book_v1', docSet.bankBookImageDataUrl || '');
      }
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 3000);
    } catch {
      // Ignore storage errors
    }
  };

  return (
    <div className="max-w-[960px] mx-auto px-6 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            ข้อมูลผู้ขาย โลโก้ร้าน ลายเซ็น และเอกสารแนบ (Seller Profile & Assets)
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            อัปโหลดโลโก้ร้าน ลายเซ็น สำเนาบัตรประชาชน และหน้าสมุดบัญชีธนาคาร เพื่อซิงค์และดาวน์โหลดพร้อมกันทุกหน้า
          </p>
        </div>

        <button
          type="button"
          onClick={onReturnToEditor}
          className="px-4 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          กลับไปหน้าพรีวิวเอกสารทั้งหมด
        </button>
      </div>

      <form
        onSubmit={handleSaveDefaultSeller}
        className="bg-white border border-slate-200 rounded-lg p-6 space-y-6"
      >
        {/* Logo & Signature Upload Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-slate-200">
          {/* Seller Logo Upload */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold text-slate-900">
                  ภาพโลโก้ร้าน / บริษัทผู้ขาย (Seller Logo)
                </h2>
                <p className="text-[11px] text-slate-500">
                  แสดงมุมซ้ายบนของเอกสารทุกหน้า (แนะนำพื้นหลังใส PNG หรือ JPG)
                </p>
              </div>
              {docSet.sellerLogoDataUrl && (
                <button
                  type="button"
                  onClick={() => {
                    onUpdateSellerFields({ sellerLogoDataUrl: '' });
                    localStorage.removeItem('syncdoc_seller_logo_v1');
                  }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-800 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>ลบโลโก้</span>
                </button>
              )}
            </div>

            <div className="h-24 bg-white border border-dashed border-slate-300 rounded-md flex items-center justify-center p-2">
              {docSet.sellerLogoDataUrl ? (
                <img
                  src={docSet.sellerLogoDataUrl}
                  alt="Seller Logo"
                  referrerPolicy="no-referrer"
                  className="max-h-20 max-w-full object-contain"
                />
              ) : (
                <div className="text-center text-xs text-slate-400 flex flex-col items-center gap-1">
                  <ImageIcon className="w-5 h-5 text-slate-300" />
                  <span>ยังไม่ได้อัปโหลดโลโก้ร้าน</span>
                </div>
              )}
            </div>

            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              onChange={handleUploadLogo}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-blue-700" />
              <span>เลือกไฟล์รูปโลโก้ร้าน...</span>
            </button>
          </div>

          {/* Authorized Signature Upload */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold text-slate-900">
                  ภาพลายเซ็นผู้อนุมัติ / ผู้มีอำนาจลงนาม (Signature)
                </h2>
                <p className="text-[11px] text-slate-500">
                  แสดงในช่องลงนามฝั่งขวาของเอกสารทุกหน้าอัตโนมัติ
                </p>
              </div>
              {docSet.sellerSignatureDataUrl && (
                <button
                  type="button"
                  onClick={() => {
                    onUpdateSellerFields({ sellerSignatureDataUrl: '' });
                    localStorage.removeItem('syncdoc_seller_signature_v1');
                  }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-800 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>ลบลายเซ็น</span>
                </button>
              )}
            </div>

            <div className="h-24 bg-white border border-dashed border-slate-300 rounded-md flex items-center justify-center p-2">
              {docSet.sellerSignatureDataUrl ? (
                <img
                  src={docSet.sellerSignatureDataUrl}
                  alt="Seller Signature"
                  referrerPolicy="no-referrer"
                  className="max-h-20 max-w-full object-contain"
                />
              ) : (
                <div className="text-center text-xs text-slate-400 flex flex-col items-center gap-1">
                  <ImageIcon className="w-5 h-5 text-slate-300" />
                  <span>ยังไม่ได้อัปโหลดลายเซ็น</span>
                </div>
              )}
            </div>

            <input
              ref={sigInputRef}
              type="file"
              accept="image/*"
              onChange={handleUploadSignature}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => sigInputRef.current?.click()}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-blue-700" />
              <span>เลือกไฟล์รูปลายเซ็น...</span>
            </button>

            <label className="flex items-center gap-2 pt-2 border-t border-slate-200 text-xs font-semibold text-slate-800 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={docSet.showSellerSignature !== false}
                onChange={(e) =>
                  onUpdateSellerFields({ showSellerSignature: e.target.checked })
                }
                className="w-4 h-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
              />
              <span>แปะภาพลายเซ็นไว้ในช่องลงนาม (แสดงทุกหน้า)</span>
            </label>
          </div>

          {/* ID Card Copy Upload (Page 5) */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold text-slate-900">
                  1. สำเนาบัตรประชาชน (แสดงในหน้าที่ 5 เอกสารเพิ่มเติม)
                </h2>
                <p className="text-[11px] text-slate-500">
                  อัปโหลดภาพสำเนาบัตรประชาชนเพื่อรวมในไฟล์ PDF ชุดเดียวกัน
                </p>
              </div>
              {docSet.idCardImageDataUrl && (
                <button
                  type="button"
                  onClick={() => {
                    onUpdateSellerFields({ idCardImageDataUrl: '' });
                    localStorage.removeItem('syncdoc_id_card_v1');
                  }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-800 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>ลบรูป</span>
                </button>
              )}
            </div>

            <div className="h-32 bg-white border border-dashed border-slate-300 rounded-md flex items-center justify-center p-2">
              {docSet.idCardImageDataUrl ? (
                <img
                  src={docSet.idCardImageDataUrl}
                  alt="สำเนาบัตรประชาชน"
                  referrerPolicy="no-referrer"
                  className="max-h-28 max-w-full object-contain"
                />
              ) : (
                <div className="text-center text-xs text-slate-400 flex flex-col items-center gap-1">
                  <ImageIcon className="w-5 h-5 text-slate-300" />
                  <span>ยังไม่ได้อัปโหลดสำเนาบัตรประชาชน</span>
                </div>
              )}
            </div>

            <input
              ref={idCardInputRef}
              type="file"
              accept="image/*"
              onChange={handleUploadIdCard}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => idCardInputRef.current?.click()}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-purple-700" />
              <span>เลือกไฟล์รูปสำเนาบัตรประชาชน...</span>
            </button>
          </div>

          {/* Bank Book Copy Upload (Page 5) */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold text-slate-900">
                  2. สำเนาหน้าสมุดธนาคาร (แสดงในหน้าที่ 5 เอกสารเพิ่มเติม)
                </h2>
                <p className="text-[11px] text-slate-500">
                  อัปโหลดภาพหน้าสมุดบัญชีธนาคารเพื่อแนบเบิกจ่ายพร้อมใบวางบิล/ใบแจ้งหนี้
                </p>
              </div>
              {docSet.bankBookImageDataUrl && (
                <button
                  type="button"
                  onClick={() => {
                    onUpdateSellerFields({ bankBookImageDataUrl: '' });
                    localStorage.removeItem('syncdoc_bank_book_v1');
                  }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-800 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>ลบรูป</span>
                </button>
              )}
            </div>

            <div className="h-32 bg-white border border-dashed border-slate-300 rounded-md flex items-center justify-center p-2">
              {docSet.bankBookImageDataUrl ? (
                <img
                  src={docSet.bankBookImageDataUrl}
                  alt="สำเนาหน้าสมุดบัญชีธนาคาร"
                  referrerPolicy="no-referrer"
                  className="max-h-28 max-w-full object-contain"
                />
              ) : (
                <div className="text-center text-xs text-slate-400 flex flex-col items-center gap-1">
                  <ImageIcon className="w-5 h-5 text-slate-300" />
                  <span>ยังไม่ได้อัปโหลดหน้าสมุดธนาคาร</span>
                </div>
              )}
            </div>

            <input
              ref={bankBookInputRef}
              type="file"
              accept="image/*"
              onChange={handleUploadBankBook}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => bankBookInputRef.current?.click()}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-purple-700" />
              <span>เลือกไฟล์รูปหน้าสมุดธนาคาร...</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 text-sm">
          <div className="md:col-span-8">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              ชื่อบริษัท / ชื่อร้าน / ชื่อผู้ขาย (Seller Name) *
            </label>
            <input
              type="text"
              required
              maxLength={D.nameMax}
              value={docSet.sellerName}
              onChange={(e) => onUpdateSellerFields({ sellerName: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="md:col-span-4">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              สำนักงานใหญ่ / สาขา (Branch)
            </label>
            <input
              type="text"
              maxLength={D.branchMax}
              value={docSet.sellerBranch}
              onChange={(e) => onUpdateSellerFields({ sellerBranch: e.target.value })}
              placeholder="สำนักงานใหญ่"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="md:col-span-4">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              เลขประจำตัวผู้เสียภาษี 13 หลัก (Tax ID)
            </label>
            <input
              type="text"
              maxLength={D.taxIdMax}
              value={docSet.sellerTaxId}
              onChange={(e) => onUpdateSellerFields({ sellerTaxId: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md font-mono-tabular text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="md:col-span-4">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              เบอร์โทรศัพท์ติดต่อ (Phone)
            </label>
            <input
              type="text"
              maxLength={D.phoneMax}
              value={docSet.sellerPhone}
              onChange={(e) => onUpdateSellerFields({ sellerPhone: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md font-mono-tabular text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="md:col-span-4">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              อีเมล (Email)
            </label>
            <input
              type="email"
              maxLength={D.emailMax}
              value={docSet.sellerEmail}
              onChange={(e) => onUpdateSellerFields({ sellerEmail: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="md:col-span-12">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              ที่อยู่สถานประกอบการ (Registered Address)
            </label>
            <textarea
              rows={2}
              maxLength={D.addressMax}
              value={docSet.sellerAddress}
              onChange={(e) => onUpdateSellerFields({ sellerAddress: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="md:col-span-7">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              ข้อมูลบัญชีธนาคารสำหรับรับชำระเงิน (แสดงในใบวางบิล / ใบแจ้งหนี้ / ใบเสร็จ)
            </label>
            <input
              type="text"
              maxLength={D.bankInfoMax}
              value={docSet.sellerBankInfo}
              onChange={(e) => onUpdateSellerFields({ sellerBankInfo: e.target.value })}
              placeholder="ธนาคารกสิกรไทย เลขที่บัญชี XXX-X-XXXXX-X ชื่อบัญชี..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="md:col-span-5">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              ชื่อผู้อนุมัติ / ผู้มีอำนาจลงนาม (Authorized Signer)
            </label>
            <input
              type="text"
              maxLength={D.signerMax}
              value={docSet.sellerSignerName}
              onChange={(e) => onUpdateSellerFields({ sellerSignerName: e.target.value })}
              placeholder="นายสมชาย ใจดี (กรรมการผู้จัดการ)"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <div className="text-xs text-slate-500">
            {savedNotice ? (
              <span className="text-emerald-700 font-semibold inline-flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                ตั้งเป็นค่าเริ่มต้นสำหรับชุดเอกสารใหม่เรียบร้อยแล้ว
              </span>
            ) : (
              'ข้อมูล โลโก้ และลายเซ็นจะซิงค์ไปยังเอกสารทั้ง 4 หน้าทันที'
            )}
          </div>
          <button
            type="submit"
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors cursor-pointer"
          >
            บันทึกเป็นข้อมูลผู้ขายเริ่มต้น
          </button>
        </div>
      </form>
    </div>
  );
};
