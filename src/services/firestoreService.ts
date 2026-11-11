import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  BLUEPRINT_CONSTRAINTS,
  clampNumber,
  clampString,
  CustomerRecord,
  DocumentSetRecord,
  sanitizeId,
  WorkLineItem,
} from '../types/billing';

export function subscribeUserCustomers(
  uid: string,
  onData: (customers: CustomerRecord[]) => void
): Unsubscribe {
  const path = 'customers';
  const q = query(collection(db, path), where('ownerId', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: CustomerRecord[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          ownerId: String(d.ownerId || uid),
          code: String(d.code || 'CUS-001'),
          name: String(d.name || ''),
          taxId: String(d.taxId || ''),
          branch: String(d.branch || ''),
          address: String(d.address || ''),
          contactPerson: String(d.contactPerson || ''),
          phone: String(d.phone || ''),
          email: String(d.email || ''),
          notes: String(d.notes || ''),
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
        };
      });
      list.sort((a, b) => a.code.localeCompare(b.code, 'th'));
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function saveCustomerToFirestore(
  uid: string,
  customer: CustomerRecord,
  isExistingInCloud: boolean
): Promise<void> {
  const customerId = sanitizeId(customer.id);
  const path = `customers/${customerId}`;
  const C = BLUEPRINT_CONSTRAINTS.CUSTOMER;

  const mutableFields = {
    code: clampString(customer.code, C.codeMax, 'CUS-001'),
    name: clampString(customer.name, C.nameMax, 'ลูกค้าทั่วไป'),
    taxId: clampString(customer.taxId, C.taxIdMax, ''),
    branch: clampString(customer.branch, C.branchMax, ''),
    address: clampString(customer.address, C.addressMax, ''),
    contactPerson: clampString(customer.contactPerson, C.contactPersonMax, ''),
    phone: clampString(customer.phone, C.phoneMax, ''),
    email: clampString(customer.email, C.emailMax, ''),
    notes: clampString(customer.notes, C.notesMax, ''),
    updatedAt: serverTimestamp(),
  };

  try {
    if (isExistingInCloud) {
      await updateDoc(doc(db, 'customers', customerId), mutableFields);
    } else {
      await setDoc(doc(db, 'customers', customerId), {
        ownerId: uid,
        ...mutableFields,
        createdAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(
      error,
      isExistingInCloud ? OperationType.UPDATE : OperationType.CREATE,
      path
    );
  }
}

export async function deleteCustomerFromFirestore(customerIdRaw: string): Promise<void> {
  const customerId = sanitizeId(customerIdRaw);
  const path = `customers/${customerId}`;
  try {
    await deleteDoc(doc(db, 'customers', customerId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeUserDocumentSets(
  uid: string,
  onData: (docSets: Omit<DocumentSetRecord, 'items'>[]) => void
): Unsubscribe {
  const path = 'documentSets';
  const q = query(collection(db, path), where('ownerId', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: Omit<DocumentSetRecord, 'items'>[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          ownerId: String(d.ownerId || uid),
          projectTitle: String(d.projectTitle || ''),
          referenceNo: String(d.referenceNo || ''),
          quotationNo: String(d.quotationNo || 'QT-001'),
          billingNoteNo: String(d.billingNoteNo || 'BN-001'),
          invoiceNo: String(d.invoiceNo || 'INV-001'),
          receiptNo: String(d.receiptNo || 'RC-001'),
          issueDate: String(d.issueDate || ''),
          dueDate: String(d.dueDate || ''),
          customerId: String(d.customerId || ''),
          customerName: String(d.customerName || ''),
          customerTaxId: String(d.customerTaxId || ''),
          customerBranch: String(d.customerBranch || ''),
          customerAddress: String(d.customerAddress || ''),
          customerContact: String(d.customerContact || ''),
          customerPhone: String(d.customerPhone || ''),
          customerEmail: String(d.customerEmail || ''),
          sellerName: String(d.sellerName || ''),
          sellerTaxId: String(d.sellerTaxId || ''),
          sellerBranch: String(d.sellerBranch || ''),
          sellerAddress: String(d.sellerAddress || ''),
          sellerPhone: String(d.sellerPhone || ''),
          sellerEmail: String(d.sellerEmail || ''),
          sellerBankInfo: String(d.sellerBankInfo || ''),
          sellerSignerName: String(d.sellerSignerName || ''),
          discountAmount: 0,
          vatMode: d.vatMode === 'none' ? 'none' : 'include',
          vatRate: Number(d.vatRate ?? 7),
          whtEnabled: Boolean(d.whtEnabled),
          whtRate: Number(d.whtRate ?? 3),
          whtType: String(d.whtType || ''),
          paymentMethod: String(d.paymentMethod || ''),
          paymentDate: String(d.paymentDate || ''),
          notes: String(d.notes || ''),
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
        };
      });
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function fetchDocumentItems(
  uid: string,
  docSetIdRaw: string
): Promise<WorkLineItem[]> {
  const docSetId = sanitizeId(docSetIdRaw);
  const path = `documentSets/${docSetId}/items`;
  try {
    const q = query(
      collection(db, 'documentSets', docSetId, 'items'),
      where('ownerId', '==', uid),
      where('docSetId', '==', docSetId)
    );
    const snap = await getDocs(q);
    const items: WorkLineItem[] = snap.docs.map((docSnap) => {
      const d = docSnap.data();
      return {
        id: docSnap.id,
        sortOrder: Number(d.sortOrder) || 0,
        description: String(d.description || ''),
        subDescription: String(d.subDescription || ''),
        quantity: Number(d.quantity) || 0,
        unit: String(d.unit || 'งาน'),
        unitPrice: Number(d.unitPrice) || 0,
      };
    });
    items.sort((a, b) => a.sortOrder - b.sortOrder);
    return items;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveDocumentSetToFirestore(
  uid: string,
  docSet: DocumentSetRecord,
  isExistingInCloud: boolean,
  validCloudCustomerIds: Set<string>
): Promise<void> {
  const docSetId = sanitizeId(docSet.id);
  const path = `documentSets/${docSetId}`;
  const D = BLUEPRINT_CONSTRAINTS.DOC_SET;
  const I = BLUEPRINT_CONSTRAINTS.DOC_ITEM;

  const safeCustomerId =
    docSet.customerId && validCloudCustomerIds.has(sanitizeId(docSet.customerId))
      ? sanitizeId(docSet.customerId)
      : '';

  const mutableDocFields = {
    projectTitle: clampString(docSet.projectTitle, D.projectTitleMax, 'โครงการบริการทั่วไป'),
    referenceNo: clampString(docSet.referenceNo, D.referenceNoMax, ''),
    quotationNo: clampString(docSet.quotationNo, D.docNoMax, 'QT-001'),
    billingNoteNo: clampString(docSet.billingNoteNo, D.docNoMax, 'BN-001'),
    invoiceNo: clampString(docSet.invoiceNo, D.docNoMax, 'INV-001'),
    receiptNo: clampString(docSet.receiptNo, D.docNoMax, 'RC-001'),
    issueDate: clampString(docSet.issueDate, D.dateMax, '2026-11-03'),
    dueDate: clampString(docSet.dueDate, D.dateMax, ''),
    customerId: safeCustomerId,
    customerName: clampString(docSet.customerName, D.nameMax, 'ลูกค้าทั่วไป'),
    customerTaxId: clampString(docSet.customerTaxId, D.taxIdMax, ''),
    customerBranch: clampString(docSet.customerBranch, D.branchMax, ''),
    customerAddress: clampString(docSet.customerAddress, D.addressMax, ''),
    customerContact: clampString(docSet.customerContact, D.contactMax, ''),
    customerPhone: clampString(docSet.customerPhone, D.phoneMax, ''),
    customerEmail: clampString(docSet.customerEmail, D.emailMax, ''),
    sellerName: clampString(docSet.sellerName, D.nameMax, 'ผู้ให้บริการ'),
    sellerTaxId: clampString(docSet.sellerTaxId, D.taxIdMax, ''),
    sellerBranch: clampString(docSet.sellerBranch, D.branchMax, ''),
    sellerAddress: clampString(docSet.sellerAddress, D.addressMax, ''),
    sellerPhone: clampString(docSet.sellerPhone, D.phoneMax, ''),
    sellerEmail: clampString(docSet.sellerEmail, D.emailMax, ''),
    sellerBankInfo: clampString(docSet.sellerBankInfo, D.bankInfoMax, ''),
    sellerSignerName: clampString(docSet.sellerSignerName, D.signerMax, ''),
    discountAmount: 0,
    vatMode: docSet.vatMode === 'none' ? 'none' : 'include',
    vatRate: clampNumber(docSet.vatRate, 0, 100, 7),
    whtEnabled: Boolean(docSet.whtEnabled),
    whtRate: clampNumber(docSet.whtRate, 0, 100, 3),
    whtType: clampString(docSet.whtType, D.whtTypeMax, ''),
    paymentMethod: clampString(docSet.paymentMethod, D.paymentMethodMax, ''),
    paymentDate: clampString(docSet.paymentDate, D.dateMax, ''),
    notes: clampString(docSet.notes, D.notesMax, ''),
    updatedAt: serverTimestamp(),
  };

  try {
    if (isExistingInCloud) {
      await updateDoc(doc(db, 'documentSets', docSetId), mutableDocFields);
    } else {
      await setDoc(doc(db, 'documentSets', docSetId), {
        ownerId: uid,
        ...mutableDocFields,
        createdAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(
      error,
      isExistingInCloud ? OperationType.UPDATE : OperationType.CREATE,
      path
    );
  }

  // Sync line items in subcollection
  const existingItems = await fetchDocumentItems(uid, docSetId);
  const existingIds = new Set(existingItems.map((it) => it.id));
  const incomingIds = new Set(docSet.items.map((it) => sanitizeId(it.id)));

  for (const oldItem of existingItems) {
    if (!incomingIds.has(oldItem.id)) {
      const itemPath = `documentSets/${docSetId}/items/${oldItem.id}`;
      try {
        await deleteDoc(doc(db, 'documentSets', docSetId, 'items', oldItem.id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, itemPath);
      }
    }
  }

  for (let idx = 0; idx < docSet.items.length; idx++) {
    const item = docSet.items[idx];
    const itemId = sanitizeId(item.id);
    const itemPath = `documentSets/${docSetId}/items/${itemId}`;
    const itemExists = existingIds.has(itemId);

    const mutableItemFields = {
      sortOrder: clampNumber(idx + 1, 0, 10000, idx + 1),
      description: clampString(item.description, I.descriptionMax, 'รายการบริการ'),
      subDescription: clampString(item.subDescription, I.subDescriptionMax, ''),
      quantity: clampNumber(item.quantity, 0, 100000000, 1),
      unit: clampString(item.unit, I.unitMax, 'งาน'),
      unitPrice: clampNumber(item.unitPrice, 0, 1000000000, 0),
      updatedAt: serverTimestamp(),
    };

    try {
      if (itemExists) {
        await updateDoc(
          doc(db, 'documentSets', docSetId, 'items', itemId),
          mutableItemFields
        );
      } else {
        await setDoc(doc(db, 'documentSets', docSetId, 'items', itemId), {
          ownerId: uid,
          docSetId,
          ...mutableItemFields,
          createdAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(
        error,
        itemExists ? OperationType.UPDATE : OperationType.CREATE,
        itemPath
      );
    }
  }
}

export async function deleteDocumentSetFromFirestore(
  uid: string,
  docSetIdRaw: string
): Promise<void> {
  const docSetId = sanitizeId(docSetIdRaw);
  const existingItems = await fetchDocumentItems(uid, docSetId);
  for (const item of existingItems) {
    const itemPath = `documentSets/${docSetId}/items/${item.id}`;
    try {
      await deleteDoc(doc(db, 'documentSets', docSetId, 'items', item.id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, itemPath);
    }
  }
  const path = `documentSets/${docSetId}`;
  try {
    await deleteDoc(doc(db, 'documentSets', docSetId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
