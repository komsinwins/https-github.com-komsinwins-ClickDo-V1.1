export interface Customer {
  id: string;
  name: string;
}

export interface Owner {
  id: string;
  name: string;
  installationLocations?: string[];
}

export interface Salesperson {
  id: string;
  name: string;
}

export interface ProjectManager {
  id: string;
  name: string;
}

export interface ProjectStatus {
  id: string;
  name: string;
  color?: string;
}

export interface Project {
  id: string;
  name: string;
  purchaseOrder?: string;
  location: string;
  installationArea?: string;
  projectDetails?: string;
  startDate: string;
  endDate: string;
  actualCompletionDate: string;
  customerId: string;
  ownerId: string;
  salespersonId: string;
  managerId: string;
  contractorId?: string;
  statusId?: string;
}

export interface ScopeOfWork {
  id: string;
  projectId: string;
  taskName: string;
  parentId?: string;
  order?: number;
  durationDays?: number;
  baselineStartDate?: string;
  baselineEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  progress: number;
}

export interface ScheduleTask {
  id: string;
  projectId: string;
  taskName: string;
  parentId?: string;
  order?: number;
  durationDays?: number;
  baselineStartDate?: string;
  baselineEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
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
  percentage?: number;
  note?: string;
  status?: 'pending' | 'paid';
}

export interface Worker {
  id: string;
  projectId: string;
  firstName: string;
  lastName: string;
  phone: string;
  role?: string;
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

export interface WorkerRole {
  id: string;
  name: string;
}

export interface ContactRole {
  id: string;
  name: string;
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
  signatureUrl?: string;
  clientSignatureUrl?: string;
  officerSignatureUrl?: string;
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
  projectStatuses: ProjectStatus[];
  customers: Customer[];
  owners: Owner[];
  salespersons: Salesperson[];
  projectManagers: ProjectManager[];
  contractorMaster: ContractorMaster[];
  contactRoles?: ContactRole[];
  workerRoles?: WorkerRole[];
  projects: Project[];
  scopes: ScopeOfWork[];
  scheduleTasks?: ScheduleTask[];
  contractors: Contractor[];
  workers: Worker[];
  vehicles: Vehicle[];
  contacts: Contact[];
  reports: Report[];
  files: FileAsset[];
}
