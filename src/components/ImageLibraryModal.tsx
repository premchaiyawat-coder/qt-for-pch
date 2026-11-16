import React, { useRef, useState } from 'react';
import {
  X,
  Upload,
  Trash2,
  Check,
  Image as ImageIcon,
  FolderOpen,
} from 'lucide-react';
import { AssetCategory, DocumentSetRecord, UserAssetRecord } from '../types/billing';
import { fileToResizedJpegDataUrl, fileToResizedPngDataUrl } from '../utils/imageHelper';

export const ASSET_CATEGORY_META: Record<
  AssetCategory,
  {
    label: string;
    shortLabel: string;
    docField: keyof Pick<
      DocumentSetRecord,
      'sellerLogoDataUrl' | 'sellerSignatureDataUrl' | 'idCardImageDataUrl' | 'bankBookImageDataUrl'
    >;
    badgeClass: string;
  }
> = {
  logo: {
    label: 'โลโก้ร้าน / บริษัท',
    shortLabel: 'โลโก้',
    docField: 'sellerLogoDataUrl',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  signature: {
    label: 'ลายเซ็นผู้มีอำนาจ',
    shortLabel: 'ลายเซ็น',
    docField: 'sellerSignatureDataUrl',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  idCard: {
    label: '1. สำเนาบัตรประชาชน',
    shortLabel: 'บัตรประชาชน',
    docField: 'idCardImageDataUrl',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  bankBook: {
    label: '2. สำเนาสมุดธนาคาร',
    shortLabel: 'สมุดธนาคาร',
    docField: 'bankBookImageDataUrl',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
  },
};

export async function processFileForCategory(
  file: File,
  category: AssetCategory
): Promise<string> {
  if (category === 'logo') {
    return fileToResizedPngDataUrl(file, 360, 160);
  }
  if (category === 'signature') {
    return fileToResizedPngDataUrl(file, 640, 280);
  }
  return fileToResizedJpegDataUrl(file, 1100, 1450);
}

interface InlineAssetQuickPickerProps {
  category: AssetCategory;
  assets: UserAssetRecord[];
  currentDataUrl?: string;
  onSelectDataUrl: (dataUrl: string) => void;
  onDeleteAsset: (assetId: string) => void;
  onOpenLibraryModal: (category: AssetCategory) => void;
}

export const InlineAssetQuickPicker: React.FC<InlineAssetQuickPickerProps> = ({
  category,
  assets,
  currentDataUrl,
  onSelectDataUrl,
  onDeleteAsset,
  onOpenLibraryModal,
}) => {
  const categoryAssets = assets.filter((a) => a.category === category);

  return (
    <div className="pt-2 border-t border-slate-200/80 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold text-slate-600">
          คลังภาพที่เคยอัปโหลด ({categoryAssets.length})
        </span>
        <button
          type="button"
          onClick={() => onOpenLibraryModal(category)}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:text-blue-900 cursor-pointer"
        >
          <FolderOpen className="w-3.5 h-3.5" />
          <span>เปิดคลังรูปภาพ</span>
        </button>
      </div>

      {categoryAssets.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {categoryAssets.map((asset) => {
            const isActive = Boolean(currentDataUrl && currentDataUrl === asset.dataUrl);
            return (
              <div
                key={asset.id}
                className={`group relative shrink-0 w-16 h-12 rounded-md border bg-white p-1 flex items-center justify-center transition-all cursor-pointer ${
                  isActive
                    ? 'border-blue-600 ring-2 ring-blue-600/20'
                    : 'border-slate-200 hover:border-slate-400'
                }`}
                onClick={() => onSelectDataUrl(asset.dataUrl)}
                title={`คลิกเพื่อใช้รูป: ${asset.name}`}
              >
                <img
                  src={asset.dataUrl}
                  alt={asset.name}
                  referrerPolicy="no-referrer"
                  className="max-h-full max-w-full object-contain"
                />
                {isActive && (
                  <span className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-2xs">
                    <Check className="w-2.5 h-2.5" />
                  </span>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteAsset(asset.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-2xs hover:bg-rose-700 transition-opacity cursor-pointer"
                  title="ลบรูปนี้ออกจากคลัง"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

interface ImageLibraryModalProps {
  isOpen: boolean;
  initialCategory?: AssetCategory | 'all';
  assets: UserAssetRecord[];
  docSet: DocumentSetRecord;
  onClose: () => void;
  onSelectAssetForDoc: (category: AssetCategory, dataUrl: string) => void;
  onUploadNewAsset: (category: AssetCategory, name: string, dataUrl: string, applyImmediately: boolean) => void;
  onDeleteAsset: (assetId: string) => void;
}

export const ImageLibraryModal: React.FC<ImageLibraryModalProps> = ({
  isOpen,
  initialCategory = 'all',
  assets,
  docSet,
  onClose,
  onSelectAssetForDoc,
  onUploadNewAsset,
  onDeleteAsset,
}) => {
  const [selectedTab, setSelectedTab] = useState<AssetCategory | 'all'>(initialCategory);
  const [uploadCategory, setUploadCategory] = useState<AssetCategory>(
    initialCategory === 'all' ? 'logo' : initialCategory
  );
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setSelectedTab(initialCategory);
      if (initialCategory !== 'all') {
        setUploadCategory(initialCategory);
      }
    }
  }, [isOpen, initialCategory]);

  if (!isOpen) return null;

  const filteredAssets =
    selectedTab === 'all'
      ? assets
      : assets.filter((a) => a.category === selectedTab);

  const activeCategoryForUpload: AssetCategory =
    selectedTab === 'all' ? uploadCategory : selectedTab;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const dataUrl = await processFileForCategory(file, activeCategoryForUpload);
      const cleanName = file.name.replace(/\.[^.]+$/, '') || ASSET_CATEGORY_META[activeCategoryForUpload].shortLabel;
      onUploadNewAsset(activeCategoryForUpload, cleanName, dataUrl, true);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const isAssetCurrentlyUsed = (asset: UserAssetRecord): boolean => {
    const field = ASSET_CATEGORY_META[asset.category].docField;
    return Boolean(docSet[field] && docSet[field] === asset.dataUrl);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl max-w-4xl w-full max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                คลังรูปภาพที่เคยอัปโหลด (Image Library)
              </h2>
              <p className="text-xs text-slate-500">
                คลิกเลือกภาพที่เคยอัปโหลดไว้เพื่อสลับเปลี่ยนโลโก้ ลายเซ็น สำเนาบัตรประชาชน หรือสำเนาสมุดธนาคารได้ทันที
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Filter Tabs + Upload Bar */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedTab('all')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                selectedTab === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              ทั้งหมด ({assets.length})
            </button>
            {(['logo', 'signature', 'idCard', 'bankBook'] as AssetCategory[]).map((cat) => {
              const count = assets.filter((a) => a.category === cat).length;
              const active = selectedTab === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setSelectedTab(cat);
                    setUploadCategory(cat);
                  }}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                    active
                      ? 'bg-blue-700 text-white'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {ASSET_CATEGORY_META[cat].label} ({count})
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            {selectedTab === 'all' && (
              <select
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value as AssetCategory)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-medium text-slate-800"
              >
                <option value="logo">หมวด: โลโก้ร้าน</option>
                <option value="signature">หมวด: ลายเซ็น</option>
                <option value="idCard">หมวด: 1. สำเนาบัตรประชาชน</option>
                <option value="bankBook">หมวด: 2. สำเนาสมุดธนาคาร</option>
              </select>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-md transition-colors cursor-pointer disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>
                {isUploading
                  ? 'กำลังอัปโหลด...'
                  : `อัปโหลดเพิ่ม (${ASSET_CATEGORY_META[activeCategoryForUpload].shortLabel})`}
              </span>
            </button>
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="p-6 overflow-y-auto flex-1">
          {filteredAssets.length === 0 ? (
            <div className="py-16 text-center space-y-3 border-2 border-dashed border-slate-200 rounded-xl">
              <ImageIcon className="w-10 h-10 text-slate-300 mx-auto" />
              <div className="text-sm font-semibold text-slate-700">
                ยังไม่มีรูปภาพในหมวดหมู่นี้
              </div>
              <p className="text-xs text-slate-500">
                เมื่อคุณอัปโหลดโลโก้ ลายเซ็น หรือเอกสารเพิ่มเติม ระบบจะบันทึกลงในคลังภาพนี้โดยอัตโนมัติ
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>อัปโหลดรูปภาพเข้าคลัง</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {filteredAssets.map((asset) => {
                const isUsed = isAssetCurrentlyUsed(asset);
                const meta = ASSET_CATEGORY_META[asset.category];
                return (
                  <div
                    key={asset.id}
                    className={`group rounded-lg border p-3 flex flex-col justify-between transition-all ${
                      isUsed
                        ? 'border-blue-600 bg-blue-50/20 ring-2 ring-blue-600/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-semibold rounded border ${meta.badgeClass}`}
                        >
                          {meta.shortLabel}
                        </span>
                        <button
                          type="button"
                          onClick={() => onDeleteAsset(asset.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                          title="ลบรูปนี้ออกจากคลัง"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div
                        onClick={() => {
                          onSelectAssetForDoc(asset.category, asset.dataUrl);
                          onClose();
                        }}
                        className="h-28 bg-slate-50 border border-slate-200/80 rounded-md flex items-center justify-center p-2 cursor-pointer hover:bg-slate-100/70 transition-colors"
                      >
                        <img
                          src={asset.dataUrl}
                          alt={asset.name}
                          referrerPolicy="no-referrer"
                          className="max-h-24 max-w-full object-contain"
                        />
                      </div>

                      <div
                        className="text-xs font-medium text-slate-800 truncate mt-2"
                        title={asset.name}
                      >
                        {asset.name}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onSelectAssetForDoc(asset.category, asset.dataUrl);
                        onClose();
                      }}
                      className={`mt-3 w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                        isUsed
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-900 text-white hover:bg-slate-800'
                      }`}
                    >
                      {isUsed ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>กำลังใช้งานอยู่</span>
                        </>
                      ) : (
                        <span>เลือกใช้ภาพนี้</span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>รูปภาพทั้งหมดในคลังจะถูกจดจำไว้ใช้สลับเปลี่ยนในเอกสารชุดถัดไป</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-100 cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
