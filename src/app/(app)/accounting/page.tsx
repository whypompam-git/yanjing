"use client";

import { useEffect, useMemo, useState } from "react";
import { addMonths, endOfMonth, format, startOfMonth } from "date-fns";
import { th } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, Trash2, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/dashboard/StatCard";
import { LoadingView } from "@/components/ui/LoadingView";
import { TransactionModal, type TransactionFormValues } from "@/components/accounting/TransactionModal";
import { createTransactionRow, deleteTransactionRow, listTransactions } from "@/lib/supabase/queries";
import type { Transaction, TransactionType } from "@/lib/types";
import { useAuth } from "@/lib/auth/AuthContext";
import { cn } from "@/lib/utils";

const currency = (n: number) => n.toLocaleString("th-TH", { minimumFractionDigits: 0 });

export default function AccountingPage() {
  const auth = useAuth();
  const [anchor, setAnchor] = useState(() => new Date());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalType, setModalType] = useState<TransactionType | null>(null);

  const from = format(startOfMonth(anchor), "yyyy-MM-dd");
  const to = format(endOfMonth(anchor), "yyyy-MM-dd");

  useEffect(() => {
    setLoading(true);
    listTransactions(from, to)
      .then(setTransactions)
      .finally(() => setLoading(false));
  }, [from, to]);

  const totals = useMemo(() => {
    const income = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    return { income, expense, net: income - expense };
  }, [transactions]);

  async function handleSave(values: TransactionFormValues) {
    const created = await createTransactionRow(values);
    if (created.occurredAt >= from && created.occurredAt <= to) {
      setTransactions((prev) => [created, ...prev].sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1)));
    }
    setModalType(null);
  }

  async function handleDelete(t: Transaction) {
    if (!window.confirm("ลบรายการนี้ใช่ไหม?")) return;
    setTransactions((prev) => prev.filter((x) => x.id !== t.id));
    try {
      await deleteTransactionRow(t.id);
    } catch (err) {
      console.error(err);
      setTransactions((prev) => [t, ...prev]);
      window.alert("ลบไม่สำเร็จ ลองใหม่อีกครั้ง");
    }
  }

  if (!auth.permissions.accounting) {
    return (
      <>
        <Topbar title="บัญชี" subtitle="รายรับ-รายจ่าย" />
        <div className="flex-1 p-6">
          <p className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-gray-400 shadow-card">
            คุณไม่มีสิทธิ์เข้าดูหน้านี้
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar title="บัญชี" subtitle="สรุปรายรับ-รายจ่ายของร้าน" />
      <div className="flex-1 space-y-6 p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <button onClick={() => setAnchor((d) => addMonths(d, -1))} className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50">
            <ChevronLeft size={16} />
          </button>
          <h2 className="text-base font-semibold text-gray-800">{format(anchor, "MMMM yyyy", { locale: th })}</h2>
          <button onClick={() => setAnchor((d) => addMonths(d, 1))} className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50">
            <ChevronRight size={16} />
          </button>
        </div>

        {loading ? (
          <LoadingView />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatCard label="รายรับรวม" value={`฿${currency(totals.income)}`} icon={TrendingUp} tone="emerald" />
              <StatCard label="รายจ่ายรวม" value={`฿${currency(totals.expense)}`} icon={TrendingDown} tone="amber" />
              <StatCard label="กำไรสุทธิ" value={`฿${currency(totals.net)}`} icon={Wallet} tone={totals.net >= 0 ? "orange" : "amber"} />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setModalType("income")}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
              >
                <Plus size={16} />
                เพิ่มรายรับ
              </button>
              <button
                onClick={() => setModalType("expense")}
                className="flex items-center gap-1.5 rounded-lg bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-600"
              >
                <Plus size={16} />
                เพิ่มรายจ่าย
              </button>
            </div>

            <div className="space-y-2">
              {transactions.map((t) => (
                <Card key={t.id} className="flex items-center justify-between gap-3 !p-4">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-medium text-gray-900">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          t.type === "income" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700",
                        )}
                      >
                        {t.type === "income" ? "รายรับ" : "รายจ่าย"}
                      </span>
                      {t.category || "ไม่ระบุหมวดหมู่"}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-gray-500">
                      {format(new Date(t.occurredAt), "d MMM yyyy", { locale: th })}
                      {t.description ? ` · ${t.description}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={cn("text-sm font-semibold", t.type === "income" ? "text-emerald-600" : "text-rose-600")}>
                      {t.type === "income" ? "+" : "-"}฿{currency(t.amount)}
                    </span>
                    <button onClick={() => handleDelete(t)} className="rounded-full p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600" aria-label="ลบ">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </Card>
              ))}
              {transactions.length === 0 && (
                <p className="rounded-2xl bg-white py-10 text-center text-sm text-gray-400">
                  ยังไม่มีรายการในเดือนนี้
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {modalType && (
        <TransactionModal initialType={modalType} onClose={() => setModalType(null)} onSave={handleSave} />
      )}
    </>
  );
}
