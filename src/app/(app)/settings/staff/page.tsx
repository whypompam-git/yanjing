"use client";

import { useEffect, useMemo, useState } from "react";
import { addDays, format, isSameDay } from "date-fns";
import { th } from "date-fns/locale";
import { CheckCircle2, Pencil, Plus, RotateCcw, Trash2, XCircle } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { Card } from "@/components/ui/Card";
import { StaffAvatar } from "@/components/ui/StaffAvatar";
import { LoadingView } from "@/components/ui/LoadingView";
import { StaffModal, type StaffFormValues } from "@/components/hr/StaffModal";
import {
  createStaffRow,
  deleteStaffRow,
  listInactiveStaff,
  listStaff,
  listStaffSchedule,
  permanentlyDeleteStaffRow,
  reactivateStaffRow,
  setStaffWorkingDay,
  updateStaffRow,
} from "@/lib/supabase/queries";
import type { Staff } from "@/lib/types";
import { cn } from "@/lib/utils";

const DAYS_AHEAD = 21;

export default function StaffSettingsPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [inactiveStaff, setInactiveStaff] = useState<Staff[]>([]);
  const [workingDates, setWorkingDates] = useState<Record<string, Set<string>>>({});
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState<"closed" | "create" | { edit: Staff }>("closed");
  const [scheduleFor, setScheduleFor] = useState<Staff | null>(null);

  const days = useMemo(
    () => Array.from({ length: DAYS_AHEAD }, (_, i) => addDays(new Date(), i)),
    [],
  );
  const dateFrom = format(days[0], "yyyy-MM-dd");
  const dateTo = format(days[days.length - 1], "yyyy-MM-dd");

  async function loadAll() {
    const [s, inactive, schedule] = await Promise.all([listStaff(), listInactiveStaff(), listStaffSchedule(dateFrom, dateTo)]);
    setStaff(s);
    setInactiveStaff(inactive);
    const byStaff: Record<string, Set<string>> = {};
    schedule.forEach((row) => {
      if (!byStaff[row.staffId]) byStaff[row.staffId] = new Set();
      byStaff[row.staffId].add(row.workDate);
    });
    setWorkingDates(byStaff);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave(values: StaffFormValues, avatarColor: string, pin?: string) {
    if (modalMode === "create") {
      const created = await createStaffRow({ ...values, avatarColor }, pin);
      setStaff((prev) => [...prev, created]);
    } else if (modalMode !== "closed") {
      const { edit } = modalMode;
      await updateStaffRow(edit.id, { ...values, avatarColor }, pin);
      setStaff((prev) => prev.map((s) => (s.id === edit.id ? { ...s, ...values, avatarColor } : s)));
    }
    setModalMode("closed");
  }

  async function handleDeactivate(s: Staff) {
    if (!window.confirm(`ปิดการใช้งานพนักงาน "${s.name}"?`)) return;
    setStaff((prev) => prev.filter((x) => x.id !== s.id));
    setInactiveStaff((prev) => [...prev, s]);
    await deleteStaffRow(s.id);
  }

  async function handleReactivate(s: Staff) {
    setInactiveStaff((prev) => prev.filter((x) => x.id !== s.id));
    setStaff((prev) => [...prev, s]);
    await reactivateStaffRow(s.id);
  }

  async function handlePurge(s: Staff) {
    if (!window.confirm(`ลบพนักงาน "${s.name}" ถาวร? ลบข้อมูลไม่ได้แล้ว`)) return;
    setInactiveStaff((prev) => prev.filter((x) => x.id !== s.id));
    await permanentlyDeleteStaffRow(s.id);
  }

  async function toggleWorkingDay(s: Staff, date: Date) {
    const iso = format(date, "yyyy-MM-dd");
    const working = workingDates[s.id]?.has(iso) ?? false;
    setWorkingDates((prev) => {
      const next = { ...prev };
      const set = new Set(next[s.id] ?? []);
      if (working) set.delete(iso);
      else set.add(iso);
      next[s.id] = set;
      return next;
    });
    try {
      await setStaffWorkingDay(s.id, iso, !working);
    } catch (err) {
      console.error(err);
      window.alert("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
      loadAll();
    }
  }

  if (loading) {
    return (
      <>
        <Topbar title="ตั้งค่า" subtitle="พนักงานและวันทำงาน" />
        <LoadingView />
      </>
    );
  }

  return (
    <>
      <Topbar title="ตั้งค่า" subtitle="พนักงานและวันทำงาน" />
      <div className="flex-1 space-y-6 p-4 sm:p-6">
        <div className="flex justify-end">
          <button
            onClick={() => setModalMode("create")}
            className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            <Plus size={16} />
            เพิ่มพนักงาน
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {staff.map((s) => {
            const workingCount = workingDates[s.id]?.size ?? 0;
            return (
              <Card key={s.id} className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <StaffAvatar staff={s} />
                    <div>
                      <p className="font-semibold text-gray-900">{s.name}</p>
                      <p className="text-xs text-gray-500">{s.position}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setModalMode({ edit: s })}
                      className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      aria-label="แก้ไข"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDeactivate(s)}
                      className="rounded-full p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600"
                      aria-label="ปิดการใช้งาน"
                    >
                      <XCircle size={14} />
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setScheduleFor(s)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
                >
                  ลงวันทำงาน ({workingCount} วัน ใน {DAYS_AHEAD} วันข้างหน้า)
                </button>
              </Card>
            );
          })}
        </div>

        {inactiveStaff.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold text-gray-700">พนักงานที่ปิดการใช้งาน</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {inactiveStaff.map((s) => (
                <Card key={s.id} className="flex items-center justify-between gap-2 !p-3">
                  <div className="flex items-center gap-3">
                    <StaffAvatar staff={s} />
                    <p className="text-sm text-gray-700">{s.name}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleReactivate(s)} className="rounded-full p-1.5 text-gray-400 hover:bg-emerald-50 hover:text-emerald-600" aria-label="เปิดใช้งานอีกครั้ง">
                      <RotateCcw size={14} />
                    </button>
                    <button onClick={() => handlePurge(s)} className="rounded-full p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600" aria-label="ลบถาวร">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>

      {modalMode !== "closed" && (
        <StaffModal
          initial={modalMode === "create" ? undefined : modalMode.edit}
          onClose={() => setModalMode("closed")}
          onSave={handleSave}
        />
      )}

      {scheduleFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">วันทำงานของ {scheduleFor.name}</h3>
              <button onClick={() => setScheduleFor(null)} className="rounded-full p-1 text-gray-400 hover:bg-gray-100">
                <XCircle size={16} />
              </button>
            </div>
            <p className="mb-3 text-xs text-gray-400">แตะวันที่เพื่อเปิด/ปิดวันทำงาน — ลูกค้าจะจองคิวได้เฉพาะวันที่เปิดไว้</p>
            <div className="max-h-[60vh] space-y-1 overflow-y-auto">
              {days.map((d) => {
                const iso = format(d, "yyyy-MM-dd");
                const working = workingDates[scheduleFor.id]?.has(iso) ?? false;
                return (
                  <button
                    key={iso}
                    onClick={() => toggleWorkingDay(scheduleFor, d)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm",
                      working ? "border-brand-300 bg-brand-50 text-brand-700" : "border-gray-200 text-gray-600",
                      isSameDay(d, new Date()) && "font-semibold",
                    )}
                  >
                    <span>{format(d, "EEEE d MMM", { locale: th })}</span>
                    {working && <CheckCircle2 size={16} />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
