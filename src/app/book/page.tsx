"use client";

import { useEffect, useMemo, useState } from "react";
import { addDays, format } from "date-fns";
import { th } from "date-fns/locale";
import { CheckCircle2, Clock, Phone, Sparkles, User } from "lucide-react";
import { APP_NAME } from "@/config/branding";
import { createBookingRow, listBookings, listPackages, listStaff, listStaffSchedule } from "@/lib/supabase/queries";
import type { Booking, Package, Staff } from "@/lib/types";

const OPEN_MIN = 9 * 60; // 09:00
const CLOSE_MIN = 19 * 60; // 19:00
const STEP_MIN = 30;
const DAYS_AHEAD = 21;

const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
const toTime = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

export default function PublicBookingPage() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [packageId, setPackageId] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [workingIds, setWorkingIds] = useState<string[]>([]);
  const [dayBookings, setDayBookings] = useState<Booking[]>([]);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ time: string; end: string } | null>(null);

  const days = useMemo(() => Array.from({ length: DAYS_AHEAD }, (_, i) => addDays(new Date(), i)), []);
  const pkg = packages.find((p) => p.id === packageId);

  useEffect(() => {
    Promise.all([listPackages(), listStaff()]).then(([p, s]) => {
      setPackages(p);
      setStaff(s);
      setPackageId(p[0]?.id ?? "");
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    setSelectedTime(null);
    Promise.all([listStaffSchedule(date, date), listBookings(date, date)]).then(([schedule, bookings]) => {
      setWorkingIds(schedule.map((r) => r.staffId));
      setDayBookings(bookings.filter((b) => b.status === "confirmed"));
    });
  }, [date]);

  const availableSlots = useMemo(() => {
    if (!pkg || workingIds.length === 0) return [];
    const slots: string[] = [];
    for (let start = OPEN_MIN; start + pkg.durationMinutes <= CLOSE_MIN; start += STEP_MIN) {
      const end = start + pkg.durationMinutes;
      const freeStaff = workingIds.some((staffId) => {
        return !dayBookings.some((b) => {
          if (b.staffId !== staffId) return false;
          const bStart = toMin(b.startTime);
          const bEnd = toMin(b.endTime);
          return start < bEnd && end > bStart;
        });
      });
      if (freeStaff) slots.push(toTime(start));
    }
    return slots;
  }, [pkg, workingIds, dayBookings]);

  async function handleSubmit() {
    if (!pkg || !selectedTime || !customerName.trim() || !phone.trim()) return;
    setSubmitting(true);
    const start = toMin(selectedTime);
    const end = start + pkg.durationMinutes;
    const freeStaffId = workingIds.find(
      (staffId) =>
        !dayBookings.some((b) => {
          if (b.staffId !== staffId) return false;
          const bStart = toMin(b.startTime);
          const bEnd = toMin(b.endTime);
          return start < bEnd && end > bStart;
        }),
    );
    if (!freeStaffId) {
      window.alert("ช่วงเวลานี้เต็มแล้ว ลองเลือกเวลาอื่น");
      setSubmitting(false);
      return;
    }
    try {
      await createBookingRow({
        customerName: customerName.trim(),
        phone: phone.trim(),
        packageId: pkg.id,
        staffId: freeStaffId,
        bookingDate: date,
        startTime: selectedTime,
        endTime: toTime(end),
        source: "customer",
      });
      setDone({ time: selectedTime, end: toTime(end) });
    } catch (err) {
      console.error(err);
      window.alert("จองไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-gray-400">กำลังโหลด...</div>;
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-pink-50 px-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
          <CheckCircle2 className="mx-auto mb-3 text-brand-500" size={40} />
          <h2 className="mb-1 text-lg font-semibold text-gray-900">จองคิวสำเร็จ</h2>
          <p className="text-sm text-gray-500">
            {format(new Date(date), "d MMM yyyy", { locale: th })} เวลา {done.time}–{done.end} น.
          </p>
          <p className="mt-1 text-sm text-gray-500">{pkg?.name}</p>
          <button
            onClick={() => {
              setDone(null);
              setCustomerName("");
              setPhone("");
            }}
            className="mt-5 w-full rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
          >
            จองคิวอีกครั้ง
          </button>
        </div>
      </div>
    );
  }

  const field =
    "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300";

  return (
    <div className="min-h-screen bg-pink-50 px-4 py-8">
      <div className="mx-auto max-w-md space-y-5">
        <div className="text-center">
          <Sparkles className="mx-auto mb-2 text-brand-500" size={28} />
          <h1 className="text-xl font-semibold text-gray-900">{APP_NAME}</h1>
          <p className="text-sm text-gray-500">จองคิวแต่งหน้าออนไลน์</p>
        </div>

        <div className="space-y-4 rounded-2xl bg-white p-5 shadow-card">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">เลือกแพ็คเกจ</span>
            <select value={packageId} onChange={(e) => setPackageId(e.target.value)} className={field}>
              {packages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — ฿{p.price.toLocaleString("th-TH")} ({p.durationMinutes} นาที)
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">เลือกวันที่</span>
            <select value={date} onChange={(e) => setDate(e.target.value)} className={field}>
              {days.map((d) => (
                <option key={d.toISOString()} value={format(d, "yyyy-MM-dd")}>
                  {format(d, "EEEE d MMM", { locale: th })}
                </option>
              ))}
            </select>
          </label>

          <div>
            <span className="mb-1.5 flex items-center gap-1 text-xs font-medium text-gray-500">
              <Clock size={12} />
              เลือกเวลา
            </span>
            {availableSlots.length === 0 ? (
              <p className="rounded-lg bg-gray-50 px-3 py-3 text-center text-sm text-gray-400">วันนี้คิวเต็มแล้ว ลองเลือกวันอื่น</p>
            ) : (
              <div className="grid grid-cols-4 gap-1.5">
                {availableSlots.map((t) => (
                  <button
                    key={t}
                    onClick={() => setSelectedTime(t)}
                    className={`rounded-lg border px-2 py-1.5 text-xs font-medium ${
                      selectedTime === t ? "border-brand-500 bg-brand-500 text-white" : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>

          <label className="block">
            <span className="mb-1 flex items-center gap-1 text-xs font-medium text-gray-500">
              <User size={12} />
              ชื่อลูกค้า
            </span>
            <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className={field} />
          </label>
          <label className="block">
            <span className="mb-1 flex items-center gap-1 text-xs font-medium text-gray-500">
              <Phone size={12} />
              เบอร์โทร
            </span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className={field} />
          </label>

          <button
            onClick={handleSubmit}
            disabled={!selectedTime || !customerName.trim() || !phone.trim() || submitting}
            className="w-full rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? "กำลังจอง..." : "ยืนยันการจอง"}
          </button>
        </div>
      </div>
    </div>
  );
}
