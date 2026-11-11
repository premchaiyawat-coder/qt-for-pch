import React from 'react';
import {
  DocumentPageMeta,
  DocumentSetRecord,
  FinancialSummary,
  formatCurrency,
  formatDateDMY,
} from '../types/billing';

interface A4DocumentSheetProps {
  pageMeta: DocumentPageMeta;
  docSet: DocumentSetRecord;
  summary: FinancialSummary;
  sheetRef?: (el: HTMLDivElement | null) => void;
  className?: string;
}

export const A4DocumentSheet: React.FC<A4DocumentSheetProps> = ({
  pageMeta,
  docSet,
  summary,
  sheetRef,
  className = '',
}) => {
  // Sub-pages under "5. เอกสารเพิ่มเติม": Pure blank A4 page showing ONLY the uploaded image
  if (pageMeta.key === 'attachmentIdCard' || pageMeta.key === 'attachmentBankBook') {
    const isIdCard = pageMeta.key === 'attachmentIdCard';
    const imageUrl = isIdCard ? docSet.idCardImageDataUrl : docSet.bankBookImageDataUrl;
    const altLabel = isIdCard ? 'สำเนาบัตรประชาชน' : 'สำเนาสมุดธนาคาร';

    return (
      <div
        ref={sheetRef}
        data-doc-page={pageMeta.key}
        className={`a4-sheet font-doc bg-white text-slate-900 p-10 flex items-center justify-center border border-slate-200 shadow-sm ${className}`}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={altLabel}
            referrerPolicy="no-referrer"
            className="max-w-full max-h-[1040px] object-contain"
          />
        ) : (
          <div className="no-print text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg px-8 py-12">
            หน้ากระดาษเปล่าสำหรับแสดงภาพ <span className="font-semibold text-slate-600">{altLabel}</span> เท่านั้น
            <br />
            (กรุณาอัปโหลดรูป{altLabel}ในหมวด 04 ด้านซ้าย หรือในหน้าข้อมูลผู้ขาย)
          </div>
        )}
      </div>
    );
  }

  const docNumber = docSet[pageMeta.docNumberField] || '-';
  const secondaryDateRaw =
    pageMeta.key === 'receipt'
      ? docSet.paymentDate || docSet.issueDate || ''
      : docSet.dueDate || '';

  return (
    <div
      ref={sheetRef}
      data-doc-page={pageMeta.key}
      className={`a4-sheet font-doc bg-white text-slate-900 p-10 flex flex-col justify-between border border-slate-200 shadow-sm ${className}`}
    >
      {/* Top Content Area */}
      <div>
        {/* Document Header: Seller Logo & Info + Document Title Box */}
        <div className="flex items-start justify-between gap-6 pb-5 border-b-2 border-slate-900">
          <div className="flex items-start gap-4 max-w-[62%]">
            {docSet.sellerLogoDataUrl && (
              <div className="shrink-0">
                <img
                  src={docSet.sellerLogoDataUrl}
                  alt="โลโก้ร้าน / บริษัทผู้ขาย"
                  referrerPolicy="no-referrer"
                  className="max-h-16 max-w-[140px] object-contain"
                />
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-snug">
                {docSet.sellerName || 'ชื่อบริษัท / ผู้ให้บริการ'}
              </h1>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {docSet.sellerAddress || 'ที่อยู่ผู้ประกอบการ'}
              </p>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-700 mt-2 font-mono-tabular">
                <span>เลขประจำตัวผู้เสียภาษี {docSet.sellerTaxId || '-'}</span>
                {docSet.sellerBranch && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{docSet.sellerBranch}</span>
                  </>
                )}
                {docSet.sellerPhone && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>โทร {docSet.sellerPhone}</span>
                  </>
                )}
                {docSet.sellerEmail && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{docSet.sellerEmail}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div
              className="text-2xl font-bold tracking-tight"
              style={{ color: pageMeta.accentHex }}
            >
              {pageMeta.thaiTitle}
            </div>
            <div className="text-xs font-semibold tracking-widest text-slate-500 mt-0.5">
              {pageMeta.englishTitle}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 whitespace-nowrap">
              ต้นฉบับ / Original (เอกสารออกเป็นชุด)
            </div>
          </div>
        </div>

        {/* Customer Info & Document Metadata Grid */}
        <div className="grid grid-cols-12 gap-6 py-4 border-b border-slate-200 text-xs">
          {/* Customer Details (Left 6 cols) */}
          <div className="col-span-6 pr-4 border-r border-slate-200">
            <div className="text-[11px] font-semibold text-slate-500 mb-1">
              ลูกค้า / นามผู้รับบริการ (Customer)
            </div>
            <div className="text-sm font-bold text-slate-900 leading-snug">
              {docSet.customerName || 'ระบุชื่อลูกค้า / บริษัท'}
            </div>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed break-words">
              {docSet.customerAddress || '-'}
            </p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-700 mt-2 font-mono-tabular">
              <span className="whitespace-nowrap">เลขประจำตัวผู้เสียภาษี {docSet.customerTaxId || '-'}</span>
              {docSet.customerBranch && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="whitespace-nowrap">{docSet.customerBranch}</span>
                </>
              )}
            </div>
            {(docSet.customerContact || docSet.customerPhone || docSet.customerEmail) && (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-600 mt-1.5 leading-relaxed">
                {docSet.customerContact && (
                  <span className="break-words">ผู้ติดต่อ: {docSet.customerContact}</span>
                )}
                {docSet.customerPhone && (
                  <>
                    {docSet.customerContact && <span aria-hidden="true">·</span>}
                    <span className="font-mono-tabular whitespace-nowrap">โทร {docSet.customerPhone}</span>
                  </>
                )}
                {docSet.customerEmail && (
                  <>
                    {(docSet.customerContact || docSet.customerPhone) && (
                      <span aria-hidden="true">·</span>
                    )}
                    <span className="break-all">{docSet.customerEmail}</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Document Metadata (Right 6 cols) - Dates formatted as DD/MM/YYYY */}
          <div className="col-span-6 flex flex-col justify-between space-y-1.5 pl-2">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-slate-500 whitespace-nowrap">เลขที่เอกสาร / No.</span>
              <span className="font-mono-tabular font-bold text-slate-900 text-sm whitespace-nowrap">
                {docNumber}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-slate-500 whitespace-nowrap">{pageMeta.dateLabel}</span>
              <span className="font-mono-tabular font-medium text-slate-900 whitespace-nowrap">
                {formatDateDMY(docSet.issueDate)}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-slate-500 whitespace-nowrap">{pageMeta.dueDateLabel}</span>
              <span className="font-mono-tabular font-medium text-slate-900 whitespace-nowrap">
                {formatDateDMY(secondaryDateRaw)}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-slate-500 whitespace-nowrap">อ้างอิง / Ref. PO</span>
              <span className="font-mono-tabular font-medium text-slate-800 whitespace-nowrap">
                {docSet.referenceNo || '-'}
              </span>
            </div>
            {pageMeta.key === 'billingNote' && (
              <div className="flex items-baseline justify-between gap-2 pt-1 border-t border-slate-100">
                <span className="text-slate-500 whitespace-nowrap">อ้างอิงใบแจ้งหนี้</span>
                <span className="font-mono-tabular font-semibold text-indigo-700 whitespace-nowrap">
                  {docSet.invoiceNo || '-'}
                </span>
              </div>
            )}
            {pageMeta.key === 'invoice' && (
              <div className="flex items-baseline justify-between gap-2 pt-1 border-t border-slate-100">
                <span className="text-slate-500 whitespace-nowrap">อ้างอิงใบเสนอราคา</span>
                <span className="font-mono-tabular font-semibold text-amber-700 whitespace-nowrap">
                  {docSet.quotationNo || '-'}
                </span>
              </div>
            )}
            {pageMeta.key === 'receipt' && (
              <div className="flex items-baseline justify-between gap-2 pt-1 border-t border-slate-100">
                <span className="text-slate-500 whitespace-nowrap">อ้างอิงใบแจ้งหนี้</span>
                <span className="font-mono-tabular font-semibold text-emerald-700 whitespace-nowrap">
                  {docSet.invoiceNo || '-'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Project / Job Subject Banner */}
        <div className="py-2.5 px-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-4 text-xs">
          <div className="flex-1 min-w-0">
            <span className="font-semibold text-slate-600 mr-2 whitespace-nowrap">ชื่องาน / โครงการ (Project):</span>
            <span className="font-bold text-slate-900">{docSet.projectTitle || '-'}</span>
          </div>
        </div>

        {/* Line Items Table */}
            <div className="mt-4">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-y-2 border-slate-900 text-slate-900 bg-slate-50/80">
                    <th className="py-2.5 px-2 text-center font-bold w-12">ลำดับ</th>
                    <th className="py-2.5 px-3 text-left font-bold">
                      รายการรายละเอียดงาน / บริการ (Description)
                    </th>
                    <th className="py-2.5 px-2 text-right font-bold w-20">จำนวน</th>
                    <th className="py-2.5 px-2 text-center font-bold w-20">หน่วย</th>
                    <th className="py-2.5 px-3 text-right font-bold w-28">ราคาต่อหน่วย</th>
                    <th className="py-2.5 px-3 text-right font-bold w-32">จำนวนเงิน (บาท)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 border-b border-slate-300">
                  {docSet.items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        ยังไม่มีรายการงาน — กรุณาเพิ่มรายการในแผงแก้ไขด้านซ้าย
                      </td>
                    </tr>
                  ) : (
                    docSet.items.map((item, idx) => {
                      const lineTotal =
                        (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
                      return (
                        <tr key={item.id || idx} className="align-top">
                          <td className="py-3 px-2 text-center font-mono-tabular text-slate-600">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-900 leading-snug">
                              {item.description || '-'}
                            </div>
                            {item.subDescription && (
                              <div className="text-[11px] text-slate-600 mt-1 leading-relaxed whitespace-pre-line">
                                {item.subDescription}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-2 text-right font-mono-tabular text-slate-900">
                            {formatCurrency(item.quantity).replace(/\.00$/, '')}
                          </td>
                          <td className="py-3 px-2 text-center text-slate-700">
                            {item.unit || 'งาน'}
                          </td>
                          <td className="py-3 px-3 text-right font-mono-tabular text-slate-900">
                            {formatCurrency(item.unitPrice)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono-tabular font-semibold text-slate-900">
                            {formatCurrency(lineTotal)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Summary & Tax Breakdown Section */}
            <div className="grid grid-cols-12 gap-6 mt-4 pt-2">
              {/* Left 6 Cols: Thai Baht Text, WHT Info, Bank Info, Notes */}
              <div className="col-span-6 flex flex-col justify-between space-y-3 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200">
                  <div className="text-[11px] text-slate-500 whitespace-nowrap">
                    จำนวนเงินรวมทั้งสิ้น (ตัวอักษร)
                  </div>
                  <div className="font-bold text-slate-900 text-sm mt-0.5 leading-snug">
                    ({summary.grandTotalThaiText})
                  </div>
                  {docSet.whtEnabled && (
                    <div className="mt-2 pt-2 border-t border-slate-200 flex items-baseline justify-between gap-2 text-[11px]">
                      <span className="text-slate-600 whitespace-nowrap">
                        ยอดชำระสุทธิหลังหัก ณ ที่จ่าย {docSet.whtRate}%:
                      </span>
                      <span className="font-semibold text-slate-900 text-right leading-tight">
                        ({summary.netPayableThaiText})
                      </span>
                    </div>
                  )}
                </div>

                {pageMeta.key === 'receipt' && (
                  <div className="p-3 bg-emerald-50/60 border border-emerald-200 text-xs space-y-1">
                    <div className="font-bold text-emerald-900">
                      บันทึกการรับชำระเงิน (Payment Confirmation)
                    </div>
                    <div className="text-slate-700">
                      วิธีชำระเงิน:{' '}
                      <span className="font-semibold">
                        {docSet.paymentMethod || 'โอนเงินผ่านธนาคาร'}
                      </span>
                    </div>
                    <div className="text-slate-700">
                      วันที่รับชำระ:{' '}
                      <span className="font-mono-tabular font-semibold">
                        {formatDateDMY(docSet.paymentDate || docSet.issueDate)}
                      </span>
                    </div>
                  </div>
                )}

                {docSet.sellerBankInfo && pageMeta.key !== 'quotation' && (
                  <div className="text-xs text-slate-700">
                    <span className="font-semibold text-slate-900">ช่องทางการชำระเงิน: </span>
                    <span className="break-words">{docSet.sellerBankInfo}</span>
                  </div>
                )}

                {docSet.notes && (
                  <div className="text-xs text-slate-600">
                    <div className="font-semibold text-slate-800 mb-0.5">
                      หมายเหตุ / เงื่อนไข (Terms & Conditions):
                    </div>
                    <div className="whitespace-pre-line leading-relaxed text-[11px]">
                      {docSet.notes}
                    </div>
                  </div>
                )}
              </div>

              {/* Right 6 Cols: Numeric Totals & Withholding Tax Breakdown */}
              <div className="col-span-6 text-xs space-y-1.5">
                <div className="flex items-center justify-between py-1.5 px-3 border-b border-slate-200">
                  <span className="text-slate-600 whitespace-nowrap">รวมเป็นเงิน (Subtotal)</span>
                  <span className="font-mono-tabular font-medium text-slate-900 whitespace-nowrap">
                    {formatCurrency(summary.rawSubtotal)}
                  </span>
                </div>

                {/* Grand Total Row */}
                <div className="flex items-center justify-between py-2 px-3 bg-slate-900 text-white font-bold text-sm min-h-[40px]">
                  <span className="whitespace-nowrap">จำนวนเงินรวมทั้งสิ้น</span>
                  <span className="font-mono-tabular whitespace-nowrap">
                    ฿{formatCurrency(summary.grandTotal)}
                  </span>
                </div>

                {/* Withholding Tax Deduction Section */}
                {docSet.whtEnabled && (
                  <div className="pt-1.5 space-y-1.5">
                    <div className="flex items-center justify-between py-1.5 px-3 bg-amber-50 border border-amber-200 text-amber-950 min-h-[38px]">
                      <div className="pr-2">
                        <div className="font-semibold whitespace-nowrap">
                          หักภาษี ณ ที่จ่าย {docSet.whtRate}%
                        </div>
                        {docSet.whtType && (
                          <div className="text-[10px] text-amber-800 leading-tight">
                            ({docSet.whtType})
                          </div>
                        )}
                      </div>
                      <span className="font-mono-tabular font-semibold text-amber-900 whitespace-nowrap">
                        -{formatCurrency(summary.whtAmount)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-2 px-3 border-2 border-slate-900 font-bold text-sm text-slate-900 min-h-[40px]">
                      <span className="whitespace-nowrap">ยอดชำระสุทธิ (Net Payable)</span>
                      <span className="font-mono-tabular whitespace-nowrap">
                        ฿{formatCurrency(summary.netPayable)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
      </div>

      {/* Bottom Signature Block: 2 Columns with 2x Larger Signature Image */}
      <div className="pt-8 mt-8 border-t border-slate-300 grid grid-cols-2 gap-16 text-center text-xs">
        {/* Left Signature Column: Customer / Receiver */}
        <div className="flex flex-col justify-end px-4">
          <div className="border-b border-dashed border-slate-400 h-24 mb-2" />
          <div className="font-semibold text-slate-800">{pageMeta.footerLeftTitle}</div>
          <div className="text-[11px] text-slate-500 mt-1">วันที่ ____/____/________</div>
        </div>

        {/* Right Signature Column: Authorized Seller with 2x Enlarged Uploaded Signature */}
        <div className="flex flex-col justify-end px-4">
          <div className="border-b border-dashed border-slate-400 h-24 mb-2 flex flex-col items-center justify-end pb-1">
            {docSet.sellerSignatureDataUrl && docSet.showSellerSignature !== false ? (
              <img
                src={docSet.sellerSignatureDataUrl}
                alt="ลายเซ็นผู้มีอำนาจลงนาม"
                referrerPolicy="no-referrer"
                className="h-24 max-h-24 max-w-[340px] object-contain"
              />
            ) : null}
          </div>
          <div className="font-semibold text-slate-800">{pageMeta.footerRightTitle}</div>
          {docSet.sellerSignerName && (
            <div className="text-[11px] text-slate-700 font-medium mt-0.5">
              ({docSet.sellerSignerName})
            </div>
          )}
          <div className="text-[11px] text-slate-500 mt-0.5">
            ในนาม {docSet.sellerName || 'ผู้ให้บริการ'} · วันที่{' '}
            {docSet.issueDate ? formatDateDMY(docSet.issueDate) : '____/____/________'}
          </div>
        </div>
      </div>
    </div>
  );
};
