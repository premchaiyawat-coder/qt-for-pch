import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Check,
  Pencil,
  Trash2,
  Building2,
  X,
} from 'lucide-react';
import {
  BLUEPRINT_CONSTRAINTS,
  CustomerRecord,
  sanitizeId,
} from '../types/billing';

interface CustomerDatabaseViewProps {
  customers: CustomerRecord[];
  activeCustomerId: string;
  isCloudConnected: boolean;
  onSelectCustomerForDoc: (customer: CustomerRecord) => void;
  onSaveCustomer: (customer: CustomerRecord, isExisting: boolean) => Promise<void>;
  onDeleteCustomer: (customerId: string) => Promise<void>;
}

const EMPTY_FORM: Omit<CustomerRecord, 'id' | 'ownerId'> = {
  code: '',
  name: '',
  taxId: '',
  branch: 'สำนักงานใหญ่',
  address: '',
  contactPerson: '',
  phone: '',
  email: '',
  notes: '',
};

export const CustomerDatabaseView: React.FC<CustomerDatabaseViewProps> = ({
  customers,
  activeCustomerId,
  isCloudConnected,
  onSelectCustomerForDoc,
  onSaveCustomer,
  onDeleteCustomer,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingCustomer, setEditingCustomer] = useState<CustomerRecord | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formState, setFormState] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.taxId.toLowerCase().includes(q) ||
        c.contactPerson.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q)
    );
  }, [customers, searchQuery]);

  const handleStartCreate = () => {
    const nextIndex = customers.length + 1;
    const nextCode = `CUS-${String(nextIndex).padStart(3, '0')}`;
    setEditingCustomer(null);
    setFormState({
      ...EMPTY_FORM,
      code: nextCode,
    });
    setIsCreating(true);
  };

  const handleStartEdit = (customer: CustomerRecord) => {
    setIsCreating(false);
    setEditingCustomer(customer);
    setFormState({
      code: customer.code,
      name: customer.name,
      taxId: customer.taxId,
      branch: customer.branch,
      address: customer.address,
      contactPerson: customer.contactPerson,
      phone: customer.phone,
      email: customer.email,
      notes: customer.notes,
    });
  };

  const handleCancelForm = () => {
    setIsCreating(false);
    setEditingCustomer(null);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.name.trim()) return;

    setSaving(true);
    try {
      const isExisting = Boolean(editingCustomer);
      const record: CustomerRecord = {
        id: editingCustomer ? editingCustomer.id : sanitizeId(`cus_${Date.now()}`),
        ownerId: editingCustomer ? editingCustomer.ownerId : 'local',
        code: formState.code.trim() || 'CUS-001',
        name: formState.name.trim(),
        taxId: formState.taxId.trim(),
        branch: formState.branch.trim(),
        address: formState.address.trim(),
        contactPerson: formState.contactPerson.trim(),
        phone: formState.phone.trim(),
        email: formState.email.trim(),
        notes: formState.notes.trim(),
      };
      await onSaveCustomer(record, isExisting);
      setIsCreating(false);
      setEditingCustomer(null);
      setFeedbackMsg(
        isExisting
          ? `อัปเดตข้อมูล "${record.name}" เรียบร้อยแล้ว`
          : `เพิ่มลูกค้า "${record.name}" เข้าสู่ฐานข้อมูลเรียบร้อยแล้ว`
      );
      setTimeout(() => setFeedbackMsg(null), 3500);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async (id: string) => {
    await onDeleteCustomer(id);
    setConfirmDeleteId(null);
    setFeedbackMsg('ลบรายการลูกค้าออกจากฐานข้อมูลแล้ว');
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const C = BLUEPRINT_CONSTRAINTS.CUSTOMER;

  return (
    <div className="max-w-[1360px] mx-auto px-6 py-8 space-y-6">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            ฐานข้อมูลลูกค้า (Customer Directory)
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            จัดเก็บเลขประจำตัวผู้เสียภาษี ที่อยู่ และผู้ติดต่อ เพื่อดึงไปซิงค์ในใบเสนอราคา ใบวางบิล ใบแจ้งหนี้ และใบเสร็จรับเงินได้ทันที
            {' · '}
            <span className="font-mono-tabular font-medium text-slate-800">
              ทั้งหมด {customers.length} รายการ
            </span>
            {' · '}
            <span>
              {isCloudConnected
                ? 'ซิงค์ฐานข้อมูล Cloud Firestore อัตโนมัติ'
                : 'โหมดทำงานในเครื่อง (เข้าสู่ระบบเพื่อซิงค์ขึ้น Cloud)'}
            </span>
          </p>
        </div>

        <button
          type="button"
          onClick={handleStartCreate}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>เพิ่มลูกค้าใหม่</span>
        </button>
      </div>

      {feedbackMsg && (
        <div className="px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm rounded-lg flex items-center justify-between">
          <span>{feedbackMsg}</span>
          <button
            type="button"
            onClick={() => setFeedbackMsg(null)}
            className="text-emerald-700 hover:text-emerald-950 text-xs font-medium cursor-pointer"
          >
            ปิด
          </button>
        </div>
      )}

      {/* Create / Edit Customer Form Drawer Panel */}
      {(isCreating || editingCustomer) && (
        <form
          onSubmit={handleSubmitForm}
          className="bg-white border border-slate-200 rounded-lg p-6 space-y-5"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h2 className="text-base font-bold text-slate-900">
              {editingCustomer
                ? `แก้ไขข้อมูลลูกค้า: ${editingCustomer.name}`
                : 'เพิ่มรายชื่อลูกค้าใหม่เข้าฐานข้อมูล'}
            </h2>
            <button
              type="button"
              onClick={handleCancelForm}
              className="p-1.5 text-slate-500 hover:text-slate-900 rounded-md cursor-pointer"
              aria-label="ปิดฟอร์ม"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 text-sm">
            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                รหัสลูกค้า (Code) *
              </label>
              <input
                type="text"
                required
                maxLength={C.codeMax}
                value={formState.code}
                onChange={(e) => setFormState({ ...formState, code: e.target.value })}
                placeholder="CUS-001"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md font-mono-tabular text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="md:col-span-9">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ชื่อบริษัท / ชื่อลูกค้า (Customer Name) *
              </label>
              <input
                type="text"
                required
                maxLength={C.nameMax}
                value={formState.name}
                onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                placeholder="บริษัท ตัวอย่าง จำกัด (มหาชน)"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="md:col-span-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                เลขประจำตัวผู้เสียภาษี 13 หลัก (Tax ID)
              </label>
              <input
                type="text"
                maxLength={C.taxIdMax}
                value={formState.taxId}
                onChange={(e) => setFormState({ ...formState, taxId: e.target.value })}
                placeholder="01055XXXXXXXX"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md font-mono-tabular text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="md:col-span-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                สำนักงานใหญ่ / สาขา (Branch)
              </label>
              <input
                type="text"
                maxLength={C.branchMax}
                value={formState.branch}
                onChange={(e) => setFormState({ ...formState, branch: e.target.value })}
                placeholder="สำนักงานใหญ่ หรือ สาขาที่ 00001"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="md:col-span-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ชื่อผู้ติดต่อ (Contact Person)
              </label>
              <input
                type="text"
                maxLength={C.contactPersonMax}
                value={formState.contactPerson}
                onChange={(e) => setFormState({ ...formState, contactPerson: e.target.value })}
                placeholder="คุณสมชาย (ฝ่ายจัดซื้อ)"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="md:col-span-6">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                เบอร์โทรศัพท์ (Phone)
              </label>
              <input
                type="text"
                maxLength={C.phoneMax}
                value={formState.phone}
                onChange={(e) => setFormState({ ...formState, phone: e.target.value })}
                placeholder="02-XXX-XXXX, 08X-XXX-XXXX"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md font-mono-tabular text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="md:col-span-6">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                อีเมล (Email)
              </label>
              <input
                type="email"
                maxLength={C.emailMax}
                value={formState.email}
                onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                placeholder="accounting@company.co.th"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="md:col-span-8">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ที่อยู่จดทะเบียนสำหรับออกใบกำกับภาษี (Billing Address)
              </label>
              <textarea
                rows={2}
                maxLength={C.addressMax}
                value={formState.address}
                onChange={(e) => setFormState({ ...formState, address: e.target.value })}
                placeholder="เลขที่ อาคาร ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด รหัสไปรษณีย์"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="md:col-span-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                หมายเหตุ / เงื่อนไขเครดิตลูกค้า (Notes)
              </label>
              <textarea
                rows={2}
                maxLength={C.notesMax}
                value={formState.notes}
                onChange={(e) => setFormState({ ...formState, notes: e.target.value })}
                placeholder="เช่น เครดิต 30 วัน วางบิลทุกวันที่ 15"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleCancelForm}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูลลูกค้า'}
            </button>
          </div>
        </form>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาชื่อบริษัท, รหัสลูกค้า, เลขผู้เสียภาษี หรือผู้ติดต่อ..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
        <div className="text-xs text-slate-500 font-mono-tabular">
          แสดง {filteredCustomers.length} จาก {customers.length} รายการ
        </div>
      </div>

      {/* High-Density Customer Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {filteredCustomers.length === 0 ? (
          <div className="py-14 px-6 text-center space-y-3">
            <Building2 className="w-8 h-8 text-slate-400 mx-auto" />
            <div className="text-sm font-semibold text-slate-800">
              ไม่พบข้อมูลลูกค้าที่ค้นหา
            </div>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              คุณสามารถเพิ่มข้อมูลลูกค้าใหม่เพื่อเก็บเลขประจำตัวผู้เสียภาษีและที่อยู่สำหรับดึงไปออกเอกสารทั้ง 4 หน้าอัตโนมัติ
            </p>
            <button
              type="button"
              onClick={handleStartCreate}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>เพิ่มลูกค้าคนแรก</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4 w-28">รหัส</th>
                  <th className="py-3 px-4">ชื่อบริษัท / ลูกค้า และที่อยู่</th>
                  <th className="py-3 px-4 w-44">เลขผู้เสียภาษี · สาขา</th>
                  <th className="py-3 px-4 w-52">ผู้ติดต่อ · โทรศัพท์</th>
                  <th className="py-3 px-4 text-right w-60">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredCustomers.map((cus) => {
                  const isSelected = cus.id === activeCustomerId;
                  return (
                    <tr
                      key={cus.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 align-top font-mono-tabular font-semibold text-slate-900 text-xs">
                        {cus.code}
                      </td>
                      <td className="py-3.5 px-4 align-top">
                        <div className="font-semibold text-slate-900">{cus.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                          {cus.address || '-'}
                        </div>
                        {cus.notes && (
                          <div className="text-[11px] text-slate-500 mt-1">
                            หมายเหตุ: {cus.notes}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 align-top text-xs">
                        <div className="font-mono-tabular font-medium text-slate-900">
                          {cus.taxId || '-'}
                        </div>
                        <div className="text-slate-500 mt-0.5">{cus.branch || '-'}</div>
                      </td>
                      <td className="py-3.5 px-4 align-top text-xs">
                        <div className="text-slate-800 font-medium">
                          {cus.contactPerson || '-'}
                        </div>
                        <div className="font-mono-tabular text-slate-600 mt-0.5">
                          {cus.phone || '-'}
                        </div>
                        {cus.email && (
                          <div className="text-slate-500 truncate max-w-[190px]">
                            {cus.email}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 align-top text-right">
                        <div className="inline-flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => onSelectCustomerForDoc(cus)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                                : 'bg-slate-900 text-white hover:bg-slate-800'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{isSelected ? 'ใช้อยู่ในเอกสาร' : 'ดึงไปใส่ชุดเอกสาร'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStartEdit(cus)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                            title="แก้ไขข้อมูลลูกค้า"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>

                          {confirmDeleteId === cus.id ? (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleConfirmDelete(cus.id)}
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
                              onClick={() => setConfirmDeleteId(cus.id)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                              title="ลบลูกค้า"
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
