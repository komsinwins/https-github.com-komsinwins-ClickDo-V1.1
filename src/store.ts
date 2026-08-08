import { create } from 'zustand';
import { AppState } from './types';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './lib/firebase';

const STORAGE_KEY = 'clickdo_v1_data';

export const DEFAULT_CONTACT_ROLES = [
  { id: 'role-1', name: 'Project Manager (ผู้จัดการโครงการ)' },
  { id: 'role-2', name: 'Site Engineer (วิศวกรสนาม)' },
  { id: 'role-3', name: 'Foreman (โฟร์แมน)' },
  { id: 'role-4', name: 'Safety Officer (จป.วิชาชีพ)' },
  { id: 'role-5', name: 'Client Representative (ตัวแทนผู้ว่าจ้าง)' },
  { id: 'role-6', name: 'Technician/Worker (ช่างเทคนิค/ผู้ปฏิบัติงาน)' },
  { id: 'role-7', name: 'Other (อื่นๆ)' },
];

export const DEFAULT_WORKER_ROLES = [
  { id: 'wrole-1', name: 'หัวหน้าทีม / หัวหน้าช่าง' },
  { id: 'wrole-2', name: 'ช่างเทคนิค / ช่างติดตั้ง' },
  { id: 'wrole-3', name: 'ช่างไฟฟ้า' },
  { id: 'wrole-4', name: 'ช่างโครงสร้าง / ช่างเชื่อม' },
  { id: 'wrole-5', name: 'เจ้าหน้าที่ความปลอดภัย (จป.)' },
  { id: 'wrole-6', name: 'ผู้ช่วยช่าง / แรงงาน' },
  { id: 'wrole-7', name: 'โฟร์แมน / วิศวกรคุมงาน' },
  { id: 'wrole-8', name: 'อื่นๆ' },
];

const initialState: AppState = {
  language: 'th',
  projectStatuses: [
    { id: 'status-1', name: 'กำลังดำเนินการ', color: '#0061FF' },
    { id: 'status-2', name: 'ระงับ', color: '#FF5E00' },
    { id: 'status-3', name: 'ปิดโครงการ', color: '#22C55E' },
    { id: 'status-4', name: 'ยกเลิก', color: '#EF4444' }
  ],
  customers: [],
  owners: [],
  salespersons: [],
  projectManagers: [],
  contractorMaster: [],
  contactRoles: DEFAULT_CONTACT_ROLES,
  workerRoles: DEFAULT_WORKER_ROLES,
  projects: [],
  scopes: [],
  scheduleTasks: [],
  contractors: [],
  workers: [],
  vehicles: [],
  contacts: [],
  reports: [],
  files: [],
};

export const getAppData = (): AppState => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) {
    try {
      const parsed = JSON.parse(data);
      if (!parsed.contactRoles || parsed.contactRoles.length === 0) {
        parsed.contactRoles = DEFAULT_CONTACT_ROLES;
      }
      if (!parsed.workerRoles || parsed.workerRoles.length === 0) {
        parsed.workerRoles = DEFAULT_WORKER_ROLES;
      }
      if (!parsed.scheduleTasks) {
        parsed.scheduleTasks = [];
      }
      return { ...initialState, ...parsed };
    } catch (e) {
      console.error('Failed to parse app data', e);
    }
  }
  return initialState;
};

export const saveAppData = (data: AppState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  // Save to Firebase (sanitize undefined values which Firestore setDoc rejects)
  const firestoreData = JSON.parse(JSON.stringify(data));
  setDoc(doc(db, 'appData', 'main'), firestoreData).catch(console.error);
};

interface StoreState {
  data: AppState;
  updateData: (newData: Partial<AppState>) => void;
  isFirebaseLoaded: boolean;
  syncError: string | null;
}

export const useAppStore = create<StoreState>((set) => ({
  data: getAppData(),
  isFirebaseLoaded: false,
  syncError: null,
  updateData: (newData) => set((state) => {
    const updatedData = { ...state.data, ...newData };
    saveAppData(updatedData);
    return { data: updatedData };
  }),
}));

// Setup Firebase listener
onSnapshot(doc(db, 'appData', 'main'), (docSnap) => {
  if (docSnap.exists()) {
    const firebaseData = docSnap.data() as AppState;
    if (!firebaseData.contactRoles || firebaseData.contactRoles.length === 0) {
      firebaseData.contactRoles = DEFAULT_CONTACT_ROLES;
    }
    if (!firebaseData.workerRoles || firebaseData.workerRoles.length === 0) {
      firebaseData.workerRoles = DEFAULT_WORKER_ROLES;
    }
    if (!firebaseData.scheduleTasks) {
      firebaseData.scheduleTasks = [];
    }
    useAppStore.setState({ data: { ...initialState, ...firebaseData }, isFirebaseLoaded: true });
    // Also update local storage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(firebaseData));
  } else {
    // If no document exists in Firebase yet, push local state up
    const localData = getAppData();
    const firestoreData = JSON.parse(JSON.stringify(localData));
    setDoc(doc(db, 'appData', 'main'), firestoreData).catch(console.error);
    useAppStore.setState({ isFirebaseLoaded: true, syncError: null });
  }
}, (error) => {
  console.error("Firebase sync error:", error);
  useAppStore.setState({ syncError: error.message || "ไม่สามารถเชื่อมต่อฐานข้อมูลได้ (อาจจะติด Permission)" });
});
