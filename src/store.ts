import { create } from 'zustand';
import { AppState } from './types';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './lib/firebase';

const STORAGE_KEY = 'clickdo_v1_data';

const initialState: AppState = {
  language: 'th',
  customers: [],
  owners: [],
  salespersons: [],
  projectManagers: [],
  contractorMaster: [],
  projects: [],
  scopes: [],
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
      return { ...initialState, ...JSON.parse(data) };
    } catch (e) {
      console.error('Failed to parse app data', e);
    }
  }
  return initialState;
};

export const saveAppData = (data: AppState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  // Save to Firebase
  setDoc(doc(db, 'appData', 'main'), data).catch(console.error);
};

interface StoreState {
  data: AppState;
  updateData: (newData: Partial<AppState>) => void;
  isFirebaseLoaded: boolean;
}

export const useAppStore = create<StoreState>((set) => ({
  data: getAppData(),
  isFirebaseLoaded: false,
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
    useAppStore.setState({ data: { ...initialState, ...firebaseData }, isFirebaseLoaded: true });
    // Also update local storage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(firebaseData));
  } else {
    // If no document exists in Firebase yet, push local state up
    const localData = getAppData();
    setDoc(doc(db, 'appData', 'main'), localData).catch(console.error);
    useAppStore.setState({ isFirebaseLoaded: true });
  }
}, (error) => {
  console.error("Firebase sync error:", error);
});
