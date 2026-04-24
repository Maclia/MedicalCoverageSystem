// CRM Service Type Definitions
export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Company {
  id: string;
  name: string;
  industry: string;
  contactCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Lead {
  id: string;
  contactId: string;
  source: string;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
  score: number;
  assignedTo: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Opportunity {
  id: string;
  leadId: string;
  value: number;
  stage: string;
  probability: number;
  closeDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Activity {
  id: string;
  type: 'call' | 'email' | 'meeting' | 'note';
  contactId: string;
  userId: string;
  description: string;
  createdAt: Date;
}

export interface Campaign {
  id: string;
  name: string;
  type: string;
  startDate: Date;
  endDate: Date;
  budget: number;
  status: 'draft' | 'active' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}