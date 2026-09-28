import type { Permissions } from "@/lib/permissions";

export type StaffRole = "owner" | "staff";

export interface Staff {
  id: string;
  name: string;
  position: string;
  avatarColor: string;
  phone?: string;
  email?: string;
  hireDate?: string; // ISO date
  baseSalary: number;
  role: StaffRole;
  permissions: Permissions;
  photoUrl?: string; // data URL, self-uploaded via /profile
}

export interface Package {
  id: string;
  name: string;
  description?: string;
  price: number;
  durationMinutes: number; // used to compute a booking's end time
}

export interface StaffScheduleEntry {
  id: string;
  staffId: string;
  workDate: string; // ISO date
}

export type BookingStatus = "confirmed" | "cancelled";
export type BookingSource = "admin" | "customer";

export interface Booking {
  id: string;
  customerName: string;
  phone: string;
  packageId: string;
  staffId: string | null;
  bookingDate: string; // ISO date
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  status: BookingStatus;
  source: BookingSource;
  note?: string;
}
