"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import type { Booking, Package, Staff } from "@/lib/types";

export type BookingFormValues = Omit<Booking, "id" | "status" | "source">;

function addMinutes(time: string, minutes: number) {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const hh = String(Math.floor((total % (24 * 60)) / 60)).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function BookingModal({
  initial,
  date,
  packages,
  staffOptions,
  onClose,
  onSave,
}: {
  initial?: Booking;
  date: string;
  packages: Package[];
  staffOptions: Staff[];
  onClose: () => void;
  onSave: (values: BookingFormValues) => void;
}) {
  const [customerName, setCustomerName] = useState(initial?.customerName ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [packageId, setPackageId] = useState(initial?.packageId ?? packages[0]?.id ?? "");
  const [staffId, setStaffId] = useState(initial?.staffId ?? staffOptions[0]?.id ?? "");
  const [bookingDate, setBookingDate] = useState(initial?.bookingDate ?? date);
  const [startTime, setStartTime] = useState(initial?.startTime ?? "10:00");
  const [note, setNote] = useState(initial?.note ?? "");

  const pkg = packages.find((p) => p.id === packageId);
  const endTime = useMemo(() => (pkg ? addMinutes(startTime, pkg.durationMinutes) : startTime), [pkg, startTime]);
  const canSave = customerName.trim().length > 0 && phone.trim().length > 0 && !!packageId && !!staffId;

  function handleSave() {
    if (!canSave) return;
    onSave({
      customerName: customerName.trim(),
      phone: phone.trim(),
      packageId,
      staffId: staffId || null,
      bookingDate,
      startTime,
      endTime,
      note: note.trim() || undefined,
    });
  }

  const field =
    "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">{initial ? "แก้ไขคิว" : "ลงคิวใหม่"}</h3>
          <button onClick={onClose} className="rounded-full p-1 text-gray-400 hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>
        <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">ชื่อลูกค้า</span>
            <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className={field} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">เบอร์โทร</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className={field} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">แพ็คเกจ</span>
            <select value={packageId} onChange={(e) => setPackageId(e.target.value)} className={field}>
              {packages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.durationMinutes} นาที)
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">ช่างแต่งหน้า</span>
            <select value={staffId} onChange={(e) => setStaffId(e.target.value)} className={field}>
              {staffOptions.length === 0 && <option value="">ไม่มีพนักงานลงวันนี้</option>}
              {staffOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">วันที่</span>
              <input type="date" value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} className={field} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">เวลาเริ่ม</span>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={field} />
            </label>
          </div>
          <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">จบเวลา {endTime} น. (คำนวณจากแพ็คเกจ)</p>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">โน้ตเพิ่มเติม</span>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={field} />
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
            ยกเลิก
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            บันทึก
          </button>
        </div>
      </div>
    </div>
  );
}
