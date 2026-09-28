"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { CalendarClock, Pencil, Phone, Plus, Trash2, Users } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card } from "@/components/ui/Card";
import { LoadingView } from "@/components/ui/LoadingView";
import { BookingModal, type BookingFormValues } from "@/components/bookings/BookingModal";
import {
  createBookingRow,
  deleteBookingRow,
  listBookings,
  listPackages,
  listStaff,
  listStaffSchedule,
  updateBookingRow,
} from "@/lib/supabase/queries";
import type { Booking, Package, Staff } from "@/lib/types";

const todayIso = () => format(new Date(), "yyyy-MM-dd");

export default function DashboardPage() {
  return (
    <Suspense fallback={<LoadingView />}>
      <DashboardBody />
    </Suspense>
  );
}

function DashboardBody() {
  const searchParams = useSearchParams();
  const [date, setDate] = useState(searchParams.get("date") || todayIso());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [workingStaffIds, setWorkingStaffIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState<"closed" | "create" | { edit: Booking }>("closed");

  async function load(forDate: string) {
    const [b, p, s, schedule] = await Promise.all([
      listBookings(forDate, forDate),
      listPackages(),
      listStaff(),
      listStaffSchedule(forDate, forDate),
    ]);
    setBookings(b.filter((x) => x.status === "confirmed"));
    setPackages(p);
    setStaff(s);
    setWorkingStaffIds(schedule.map((row) => row.staffId));
    setLoading(false);
  }

  useEffect(() => {
    setLoading(true);
    load(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const workingStaff = useMemo(() => staff.filter((s) => workingStaffIds.includes(s.id)), [staff, workingStaffIds]);
  const packageName = (id: string) => packages.find((p) => p.id === id)?.name ?? "—";
  const staffName = (id: string | null) => staff.find((s) => s.id === id)?.name ?? "ไม่ระบุ";

  async function handleSave(values: BookingFormValues) {
    if (modalMode === "create") {
      const created = await createBookingRow({ ...values, source: "admin" });
      if (created.bookingDate === date) setBookings((prev) => [...prev, created]);
    } else if (modalMode !== "closed") {
      const { edit } = modalMode;
      await updateBookingRow(edit.id, values);
      if (values.bookingDate === date) {
        setBookings((prev) => prev.map((b) => (b.id === edit.id ? { ...b, ...values } : b)));
      } else {
        setBookings((prev) => prev.filter((b) => b.id !== edit.id));
      }
    }
    setModalMode("closed");
  }

  async function handleDelete(b: Booking) {
    if (!window.confirm(`ยกเลิกคิวของ "${b.customerName}" ใช่ไหม?`)) return;
    setBookings((prev) => prev.filter((x) => x.id !== b.id));
    try {
      await deleteBookingRow(b.id);
    } catch (err) {
      console.error(err);
      setBookings((prev) => [...prev, b]);
      window.alert("ยกเลิกไม่สำเร็จ ลองใหม่อีกครั้ง");
    }
  }

  if (loading && bookings.length === 0) {
    return (
      <>
        <Topbar title="คิววันนี้" subtitle="ภาพรวมคิวจองของร้าน" />
        <LoadingView />
      </>
    );
  }

  return (
    <>
      <Topbar title="คิววันนี้" subtitle="ภาพรวมคิวจองของร้าน" />
      <div className="flex-1 space-y-6 p-4 sm:p-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard label="คิววันนี้" value={bookings.length} icon={CalendarClock} tone="orange" />
          <StatCard label="ช่างที่ลงวันนี้" value={workingStaff.length} icon={Users} tone="sky" />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            วันที่
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm"
            />
          </label>
          <button
            onClick={() => setModalMode("create")}
            className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            <Plus size={16} />
            ลงคิวใหม่
          </button>
        </div>

        {workingStaff.length === 0 && (
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
            วันนี้ยังไม่มีพนักงานลงวันทำงาน — ไปตั้งค่าที่เมนู &quot;ตั้งค่า&quot;
          </p>
        )}

        <div className="space-y-2.5">
          {bookings
            .slice()
            .sort((a, b) => a.startTime.localeCompare(b.startTime))
            .map((b) => (
              <Card key={b.id} className="flex flex-wrap items-center justify-between gap-3 !p-4">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900">
                    {b.startTime}–{b.endTime} · {b.customerName}
                  </p>
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Phone size={11} />
                      {b.phone}
                    </span>
                    <span>{packageName(b.packageId)}</span>
                    <span>ช่าง: {staffName(b.staffId)}</span>
                    {b.source === "customer" && (
                      <span className="rounded-full bg-brand-50 px-2 py-0.5 font-medium text-brand-600">ลูกค้าจองเอง</span>
                    )}
                  </p>
                  {b.note && <p className="mt-1 text-xs text-gray-400">{b.note}</p>}
                </div>
                <div className="flex shrink-0 gap-1">
                  <button onClick={() => setModalMode({ edit: b })} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600" aria-label="แก้ไข">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleDelete(b)} className="rounded-full p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600" aria-label="ยกเลิกคิว">
                    <Trash2 size={14} />
                  </button>
                </div>
              </Card>
            ))}
          {bookings.length === 0 && (
            <p className="rounded-2xl bg-white py-10 text-center text-sm text-gray-400">
              ยังไม่มีคิวในวันที่ {format(new Date(date), "d MMM yyyy", { locale: th })}
            </p>
          )}
        </div>
      </div>

      {modalMode !== "closed" && (
        <BookingModal
          initial={modalMode === "create" ? undefined : modalMode.edit}
          date={date}
          packages={packages}
          staffOptions={workingStaff}
          onClose={() => setModalMode("closed")}
          onSave={handleSave}
        />
      )}
    </>
  );
}
