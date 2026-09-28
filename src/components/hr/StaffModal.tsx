"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { NO_PERMISSIONS } from "@/lib/permissions";
import type { Staff } from "@/lib/types";

const AVATAR_COLORS = [
  "bg-pink-500",
  "bg-rose-500",
  "bg-fuchsia-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-sky-500",
];

export type StaffFormValues = Omit<Staff, "id" | "avatarColor">;

export function StaffModal({
  initial,
  onClose,
  onSave,
}: {
  initial?: Staff;
  onClose: () => void;
  onSave: (values: StaffFormValues, avatarColor: string, pin?: string) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [position, setPosition] = useState(initial?.position ?? "ช่างแต่งหน้า");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [pin, setPin] = useState("");
  const [color] = useState(
    initial?.avatarColor ?? AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
  );

  const isNew = !initial;
  const pinValid = pin === "" || /^\d{4}$/.test(pin);
  const canSave = name.trim().length > 0 && pinValid && (!isNew || /^\d{4}$/.test(pin));

  function handleSave() {
    if (!canSave) return;
    onSave(
      {
        name: name.trim(),
        position: position.trim(),
        phone,
        email: undefined,
        hireDate: undefined,
        baseSalary: 0,
        role: initial?.role ?? "staff",
        permissions: NO_PERMISSIONS,
      },
      color,
      pin || undefined,
    );
  }

  const field =
    "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">{initial ? "แก้ไขพนักงาน" : "เพิ่มพนักงาน"}</h3>
          <button onClick={onClose} className="rounded-full p-1 text-gray-400 hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">ชื่อพนักงาน</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className={field} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">ตำแหน่ง</span>
            <input value={position} onChange={(e) => setPosition(e.target.value)} className={field} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">เบอร์โทร</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className={field} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">
              รหัส PIN 4 หลัก {isNew ? "" : "(เว้นว่างถ้าไม่เปลี่ยน)"}
            </span>
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric"
              className={field}
            />
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
