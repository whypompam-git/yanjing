"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { Package } from "@/lib/types";

export type PackageFormValues = Omit<Package, "id">;

export function PackageModal({
  initial,
  onClose,
  onSave,
}: {
  initial?: Package;
  onClose: () => void;
  onSave: (values: PackageFormValues) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [price, setPrice] = useState(initial?.price ?? 0);
  const [durationMinutes, setDurationMinutes] = useState(initial?.durationMinutes ?? 60);

  const canSave = name.trim().length > 0 && durationMinutes > 0;

  function handleSave() {
    if (!canSave) return;
    onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      price,
      durationMinutes,
    });
  }

  const field =
    "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">{initial ? "แก้ไขแพ็คเกจ" : "เพิ่มแพ็คเกจใหม่"}</h3>
          <button onClick={onClose} className="rounded-full p-1 text-gray-400 hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">ชื่อแพ็คเกจ</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น แต่งหน้าเจ้าสาว"
              className={field}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">รายละเอียด</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={field} />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">ราคา (บาท)</span>
              <input
                type="number"
                min={0}
                value={price || ""}
                onChange={(e) => setPrice(Number(e.target.value))}
                className={field}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">ใช้เวลา (นาที)</span>
              <input
                type="number"
                min={5}
                step={5}
                value={durationMinutes || ""}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className={field}
              />
            </label>
          </div>
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
