import { createClient } from "./client";
import { cachedFetch } from "@/lib/offline/cache";
import { normalizePermissions } from "@/lib/permissions";
import type { Booking, Package, Staff, StaffScheduleEntry, Transaction } from "../types";

// Thin data-access layer over the schema in supabase/migrations/.
const supabase = () => createClient();

// ── Staff ──────────────────────────────────────────────────────────────
type StaffRow = {
  id: string;
  name: string;
  position: string | null;
  phone: string | null;
  email: string | null;
  hire_date: string | null;
  base_salary: number;
  avatar_color: string;
  role: Staff["role"];
  can_view_accounting: boolean;
  permissions: Record<string, boolean> | null;
  photo_url: string | null;
};

const STAFF_COLUMNS =
  "id, name, position, phone, email, hire_date, base_salary, avatar_color, role, can_view_accounting, permissions, photo_url";

const fromStaffRow = (r: StaffRow): Staff => ({
  id: r.id,
  name: r.name,
  position: r.position ?? "",
  phone: r.phone ?? undefined,
  email: r.email ?? undefined,
  hireDate: r.hire_date ?? undefined,
  baseSalary: r.base_salary,
  avatarColor: r.avatar_color,
  role: r.role,
  photoUrl: r.photo_url ?? undefined,
  permissions: normalizePermissions(r.permissions, r.can_view_accounting),
});

export async function listStaff(): Promise<Staff[]> {
  return cachedFetch("staff", async () => {
    const { data, error } = await supabase()
      .from("staff")
      .select(STAFF_COLUMNS)
      .eq("is_active", true)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data as StaffRow[]).map(fromStaffRow);
  });
}

// pin, when provided, is hashed client-side with bcryptjs before being sent
// — the resulting pin_hash column is never selected back to the browser
// (see STAFF_COLUMNS), and PIN verification only ever happens server-side
// in /api/auth/login via the service-role admin client.
export async function createStaffRow(
  values: Omit<Staff, "id">,
  pin?: string,
): Promise<Staff> {
  const bcrypt = await import("bcryptjs");
  const { data, error } = await supabase()
    .from("staff")
    .insert({
      name: values.name,
      position: values.position,
      phone: values.phone,
      email: values.email,
      hire_date: values.hireDate || null,
      base_salary: values.baseSalary,
      avatar_color: values.avatarColor,
      role: values.role,
      can_view_accounting: values.permissions.accounting,
      permissions: values.permissions,
      pin_hash: pin ? bcrypt.hashSync(pin, 10) : null,
    })
    .select(STAFF_COLUMNS)
    .single();
  if (error) throw error;
  return fromStaffRow(data as StaffRow);
}

export async function updateStaffRow(
  id: string,
  values: Omit<Staff, "id">,
  pin?: string,
): Promise<void> {
  const patch: Record<string, unknown> = {
    name: values.name,
    position: values.position,
    phone: values.phone,
    email: values.email,
    hire_date: values.hireDate || null,
    base_salary: values.baseSalary,
    avatar_color: values.avatarColor,
    role: values.role,
    can_view_accounting: values.permissions.accounting,
    permissions: values.permissions,
  };
  if (pin) {
    const bcrypt = await import("bcryptjs");
    patch.pin_hash = bcrypt.hashSync(pin, 10);
  }
  const { error } = await supabase().from("staff").update(patch).eq("id", id);
  if (error) throw error;
}

// Self-service — used by /profile, where a staff member edits only their
// own display name and photo, not the full admin staff record.
export async function updateOwnProfile(
  id: string,
  values: { name: string; photoUrl: string | null },
): Promise<void> {
  const { error } = await supabase()
    .from("staff")
    .update({ name: values.name, photo_url: values.photoUrl })
    .eq("id", id);
  if (error) throw error;
}

// Soft delete — tasks/payroll/leave rows reference staff.id with no cascade,
// so a hard delete would fail once a staff member has any history. Matches
// listStaff()'s own `eq("is_active", true)` filter.
export async function deleteStaffRow(id: string): Promise<void> {
  const { error } = await supabase().from("staff").update({ is_active: false }).eq("id", id);
  if (error) throw error;
}

// ── Deactivated staff management (Settings page, owner only) ────────────
export async function listInactiveStaff(): Promise<Staff[]> {
  const { data, error } = await supabase()
    .from("staff")
    .select(STAFF_COLUMNS)
    .eq("is_active", false)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as StaffRow[]).map(fromStaffRow);
}

export async function reactivateStaffRow(id: string): Promise<void> {
  const { error } = await supabase().from("staff").update({ is_active: true }).eq("id", id);
  if (error) throw error;
}

// Clears the staff member's schedule and unassigns their bookings first,
// since those rows reference staff.id with no cascade — an explicit,
// owner-only action for cleaning up test/duplicate rows.
export async function permanentlyDeleteStaffRow(id: string): Promise<void> {
  const db = supabase();
  const [scheduleRes, bookingsRes] = await Promise.all([
    db.from("staff_schedule").delete().eq("staff_id", id),
    db.from("bookings").update({ staff_id: null }).eq("staff_id", id),
  ]);
  if (scheduleRes.error) throw scheduleRes.error;
  if (bookingsRes.error) throw bookingsRes.error;

  const { error } = await db.from("staff").delete().eq("id", id);
  if (error) throw error;
}


// ── Packages ───────────────────────────────────────────────────────────
type PackageRow = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
};

const PACKAGE_COLUMNS = "id, name, description, price, duration_minutes";

const fromPackageRow = (r: PackageRow): Package => ({
  id: r.id,
  name: r.name,
  description: r.description ?? undefined,
  price: r.price,
  durationMinutes: r.duration_minutes,
});

export async function listPackages(): Promise<Package[]> {
  const { data, error } = await supabase()
    .from("packages")
    .select(PACKAGE_COLUMNS)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as PackageRow[]).map(fromPackageRow);
}

export async function createPackageRow(values: Omit<Package, "id">): Promise<Package> {
  const { data, error } = await supabase()
    .from("packages")
    .insert({
      name: values.name,
      description: values.description,
      price: values.price,
      duration_minutes: values.durationMinutes,
    })
    .select(PACKAGE_COLUMNS)
    .single();
  if (error) throw error;
  return fromPackageRow(data as PackageRow);
}

export async function updatePackageRow(id: string, values: Omit<Package, "id">): Promise<void> {
  const { error } = await supabase()
    .from("packages")
    .update({
      name: values.name,
      description: values.description,
      price: values.price,
      duration_minutes: values.durationMinutes,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function deletePackageRow(id: string): Promise<void> {
  const { error } = await supabase().from("packages").delete().eq("id", id);
  if (error) throw error;
}

// ── Staff working-day schedule ────────────────────────────────────────
export async function listStaffSchedule(dateFrom: string, dateTo: string): Promise<StaffScheduleEntry[]> {
  const { data, error } = await supabase()
    .from("staff_schedule")
    .select("id, staff_id, work_date")
    .gte("work_date", dateFrom)
    .lte("work_date", dateTo);
  if (error) throw error;
  return (data ?? []).map((r) => ({ id: r.id, staffId: r.staff_id, workDate: r.work_date }));
}

export async function setStaffWorkingDay(staffId: string, workDate: string, working: boolean): Promise<void> {
  if (working) {
    const { error } = await supabase().from("staff_schedule").upsert(
      { staff_id: staffId, work_date: workDate },
      { onConflict: "staff_id,work_date" },
    );
    if (error) throw error;
  } else {
    const { error } = await supabase()
      .from("staff_schedule")
      .delete()
      .eq("staff_id", staffId)
      .eq("work_date", workDate);
    if (error) throw error;
  }
}

// ── Bookings ───────────────────────────────────────────────────────────
type BookingRow = {
  id: string;
  customer_name: string;
  phone: string;
  package_id: string;
  staff_id: string | null;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: Booking["status"];
  source: Booking["source"];
  note: string | null;
};

const BOOKING_COLUMNS =
  "id, customer_name, phone, package_id, staff_id, booking_date, start_time, end_time, status, source, note";

const fromBookingRow = (r: BookingRow): Booking => ({
  id: r.id,
  customerName: r.customer_name,
  phone: r.phone,
  packageId: r.package_id,
  staffId: r.staff_id,
  bookingDate: r.booking_date,
  startTime: r.start_time.slice(0, 5),
  endTime: r.end_time.slice(0, 5),
  status: r.status,
  source: r.source,
  note: r.note ?? undefined,
});

export async function listBookings(dateFrom: string, dateTo: string): Promise<Booking[]> {
  const { data, error } = await supabase()
    .from("bookings")
    .select(BOOKING_COLUMNS)
    .gte("booking_date", dateFrom)
    .lte("booking_date", dateTo)
    .order("booking_date", { ascending: true })
    .order("start_time", { ascending: true });
  if (error) throw error;
  return (data as BookingRow[]).map(fromBookingRow);
}

export async function createBookingRow(values: Omit<Booking, "id" | "status">): Promise<Booking> {
  const { data, error } = await supabase()
    .from("bookings")
    .insert({
      customer_name: values.customerName,
      phone: values.phone,
      package_id: values.packageId,
      staff_id: values.staffId,
      booking_date: values.bookingDate,
      start_time: values.startTime,
      end_time: values.endTime,
      source: values.source,
      note: values.note,
    })
    .select(BOOKING_COLUMNS)
    .single();
  if (error) throw error;
  return fromBookingRow(data as BookingRow);
}

export async function updateBookingRow(id: string, values: Partial<Omit<Booking, "id">>): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (values.customerName !== undefined) patch.customer_name = values.customerName;
  if (values.phone !== undefined) patch.phone = values.phone;
  if (values.packageId !== undefined) patch.package_id = values.packageId;
  if (values.staffId !== undefined) patch.staff_id = values.staffId;
  if (values.bookingDate !== undefined) patch.booking_date = values.bookingDate;
  if (values.startTime !== undefined) patch.start_time = values.startTime;
  if (values.endTime !== undefined) patch.end_time = values.endTime;
  if (values.status !== undefined) patch.status = values.status;
  if (values.note !== undefined) patch.note = values.note;
  const { error } = await supabase().from("bookings").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteBookingRow(id: string): Promise<void> {
  const { error } = await supabase().from("bookings").delete().eq("id", id);
  if (error) throw error;
}

// ── Accounting transactions ───────────────────────────────────────────
// Reuses the `transactions` table already in the schema (income/expense
// ledger) — no migration needed, this is the first page to query it.
type TransactionRow = {
  id: string;
  type: string;
  category: string | null;
  amount: number;
  description: string | null;
  occurred_at: string;
};

const TRANSACTION_COLUMNS = "id, type, category, amount, description, occurred_at";

const fromTransactionRow = (r: TransactionRow): Transaction => ({
  id: r.id,
  type: r.type as Transaction["type"],
  category: r.category ?? undefined,
  amount: Number(r.amount),
  description: r.description ?? undefined,
  occurredAt: r.occurred_at,
});

export async function listTransactions(dateFrom: string, dateTo: string): Promise<Transaction[]> {
  const { data, error } = await supabase()
    .from("transactions")
    .select(TRANSACTION_COLUMNS)
    .gte("occurred_at", dateFrom)
    .lte("occurred_at", dateTo)
    .order("occurred_at", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as TransactionRow[]).map(fromTransactionRow);
}

export async function createTransactionRow(values: Omit<Transaction, "id">): Promise<Transaction> {
  const { data, error } = await supabase()
    .from("transactions")
    .insert({
      type: values.type,
      category: values.category || null,
      amount: values.amount,
      description: values.description || null,
      occurred_at: values.occurredAt,
    })
    .select(TRANSACTION_COLUMNS)
    .single();
  if (error) throw error;
  return fromTransactionRow(data as TransactionRow);
}

export async function deleteTransactionRow(id: string): Promise<void> {
  const { error } = await supabase().from("transactions").delete().eq("id", id);
  if (error) throw error;
}
