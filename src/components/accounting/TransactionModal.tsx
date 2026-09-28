"use client";

import { useState } from "react";
import { format } from "date-fns";
import { X } from "lucide-react";
import type { Transaction, TransactionType } from "@/lib/types";
import { cn } from "@/lib/utils";

export type TransactionFormValues = Omit<Transaction, "id">;

const INCOME_CATEGORIES = ["รายได้จากคิว", "ขายสินค้า", "อื่นๆ"];
const EXPENSE_CATEGORIES = ["ค่าเช่า/ค่าน้ำค่าไฟ", "ค่าอุปกรณ์/วัตถุดิบ", "เงินเดือน/ค่าคอมมิชชัน", "ค่าการตลาด", "อื่นๆ"];

export function TransactionModal({
  initialType,
  onClose,
  onSave,
}: {
  initialType: TransactionType;
  onClose: () => void;
  onSave: (values: TransactionFormValues) => void;
}) {
  const [type, setType] = useState<TransactionType>(initialType);
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState("");
  const [occurredAt, setOccurredAt] = useState(format(new Date(), "yyyy-MM-dd"));

  const categories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const canSave = amount > 0 && occurredAt.length > 0;

  function handleSave() {
    if (!canSave) return;
    onSave({
      type,
      category: category || undefined,
      amount,
      description: description.trim() || undefined,
      occurredAt,
    });
  }

  const field =
    "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">เพิ่มรายการ</h3>
          <button onClick={onClose} className="rounded-full p-1 text-gray-400 hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setType("income");
                setCategory("");
              }}
              className={cn(
                "rounded-lg border px-3 py-2 text-sm font-medium",
                type === "income" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-gray-200 text-gray-500",
              )}
            >
              รายรับ
            </button>
            <button
              onClick={() => {
                setType("expense");
                setCategory("");
              }}
              className={cn(
                "rounded-lg border px-3 py-2 text-sm font-medium",
                type === "expense" ? "border-rose-500 bg-rose-50 text-rose-700" : "border-gray-200 text-gray-500",
              )}
            >
              รายจ่าย
            </button>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">หมวดหมู่</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={field}>
              <option value="">เลือกหมวดหมู่ (ไม่บังคับ)</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">จำนวนเงิน (บาท)</span>
              <input
                type="number"
                min={0}
                value={amount || ""}
                onChange={(e) => setAmount(Number(e.target.value))}
                className={field}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">วันที่</span>
              <input
                type="date"
                value={occurredAt}
                onChange={(e) => setOccurredAt(e.target.value)}
                className={field}
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">รายละเอียด</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={field} />
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
