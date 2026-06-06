export interface PatientListItem {
  id: string;
  refNumber: string;
  publicId: string;
  name: string;
  phone: string | null;
  notes: string | null;
  status: string;
  notifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { results: number };
}

export interface ResultItem {
  id: string;
  storedName: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export interface PatientDetail extends PatientListItem {
  results: ResultItem[];
}

export interface AppSettings {
  id: string;
  labName: string;
  whatsappEnabled: boolean;
  messageTemplate: string;
  updatedAt: string;
}
