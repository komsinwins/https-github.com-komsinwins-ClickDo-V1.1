export interface Customer {
  id: string;
  name: string;
}

export interface Owner {
  id: string;
  name: string;
}

export interface Salesperson {
  id: string;
  name: string;
}

export interface ProjectManager {
  id: string;
  name: string;
}

export interface Project {
  id: string;
  name: string;
  location: string;
  startDate: string;
  endDate: string;
  actualCompletionDate: string;
  customerId: string;
  ownerId: string;
  salespersonId: string;
  managerId: string;
}

export interface ScopeOfWork {
  id: string;
  projectId: string;
  taskName: string;
  baselineStartDate: string;
  baselineEndDate: string;
  actualStartDate: string;
  actualEndDate: string;
  progress: number;
}

export interface ContractorMaster {
  id: string;
  company?: string;
  firstName: string;
  lastName: string;
  phone: string;
  note?: string;
}

export interface Contractor {
  id: string;
  projectId: string;
  contractorMasterId?: string;
  company?: string;
  headFirstName: string;
  headLastName: string;
  phone?: string;
  totalWage: number;
  installments: Installment[];
}

export interface Installment {
  id: string;
  periodNumber: number;
  amount: number;
  dueDate: string;
}

export interface Worker {
  id: string;
  projectId: string;
  firstName: string;
  lastName: string;
  phone: string;
}

export interface Vehicle {
  id: string;
  projectId: string;
  type: string;
  licensePlate: string;
  model: string;
  brand: string;
  color: string;
}

export interface Contact {
  id: string;
  projectId: string;
  firstName: string;
  lastName: string;
  role: string;
  phone: string;
  email: string;
  lineId: string;
}

export interface Report {
  id: string;
  projectId: string;
  type: 'daily' | 'weekly' | 'monthly' | 'closeout';
  date: string;
  progressDesc: string;
  problems: string;
  solutions: string;
  nextSteps: string;
  remarks: string;
  photos: { url: string; caption: string }[];
}

export interface FileAsset {
  id: string;
  projectId: string;
  name: string;
  url: string;
  uploadedAt: string;
}

export interface AppState {
  language: 'th' | 'en';
  customers: Customer[];
  owners: Owner[];
  salespersons: Salesperson[];
  projectManagers: ProjectManager[];
  contractorMaster: ContractorMaster[];
  projects: Project[];
  scopes: ScopeOfWork[];
  contractors: Contractor[];
  workers: Worker[];
  vehicles: Vehicle[];
  contacts: Contact[];
  reports: Report[];
  files: FileAsset[];
}
