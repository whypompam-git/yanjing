"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { th } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Phone } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { Card } from "@/components/ui/Card";
import { LoadingView } from "@/components/ui/LoadingView";
import { listBookings, listPackages, listStaff, listStaffSchedule } from "@/lib/supabase/queries";
import type { Booking, Package, Staff } from "@/lib/types";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
type ViewMode = "month" | "week" | "day";
const VIEW_LABELS: Record<ViewMode, string> = { month: "เดือน", week: "สัปดาห์", day: "วัน" };

export default function CalendarPage() {
  const router = useRouter();
  const [view, setView] = useState<ViewMode>("month");
  const [anchor, setAnchor] = useState(() => new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [staffCounts, setStaffCounts] = useState<Record<string, number>>({});
  const [packages, setPackages] = useState<Package[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);

  const rangeStart =
    view === "month" ? startOfWeek(startOfMonth(anchor)) : view === "week" ? startOfWeek(anchor) : anchor;
  const rangeEnd = view === "month" ? endOfWeek(endOfMonth(anchor)) : view === "week" ? endOfWeek(anchor) : anchor;
  const days = useMemo(() => eachDayOfInterval({ start: rangeStart, end: rangeEnd }), [rangeStart, rangeEnd]);

  useEffect(() => {
    listPackages().then(setPackages);
    listStaff().then(setStaff);
  }, []);

  useEffect(() => {
    setLoading(true);
    const from = format(rangeStart, "yyyy-MM-dd");
    const to = format(rangeEnd, "yyyy-MM-dd");
    Promise.all([listBookings(from, to), listStaffSchedule(from, to)]).then(([b, schedule]) => {
      setBookings(b.filter((x) => x.status === "confirmed"));
      const sc: Record<string, number> = {};
      schedule.forEach((row) => {
        sc[row.workDate] = (sc[row.workDate] ?? 0) + 1;
      });
      setStaffCounts(sc);
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeStart.getTime(), rangeEnd.getTime()]);

  const bookingsByDay = useMemo(() => {
    const m: Record<string, Booking[]> = {};
    bookings.forEach((b) => {
      (m[b.bookingDate] ??= []).push(b);
    });
    Object.values(m).forEach((list) => list.sort((a, b) => a.startTime.localeCompare(b.startTime)));
    return m;
  }, [bookings]);

  const packageName = (id: string) => packages.find((p) => p.id === id)?.name ?? "—";
  const staffName = (id: string | null) => staff.find((s) => s.id === id)?.name ?? "ไม่ระบุ";

  function goPrev() {
    setAnchor((d) => (view === "month" ? addMonths(d, -1) : view === "week" ? addWeeks(d, -1) : addDays(d, -1)));
  }
  function goNext() {
    setAnchor((d) => (view === "month" ? addMonths(d, 1) : view === "week" ? addWeeks(d, 1) : addDays(d, 1)));
  }
  function openDay(d: Date) {
    setAnchor(d);
    setView("day");
  }

  const headerLabel =
    view === "month"
      ? format(anchor, "MMMM yyyy", { locale: th })
      : view === "week"
        ? `${format(rangeStart, "d MMM", { locale: th })} – ${format(rangeEnd, "d MMM yyyy", { locale: th })}`
        : format(anchor, "EEEE d MMMM yyyy", { locale: th });

  return (
    <>
      <Topbar title="ปฏิทิน" subtitle="ภาพรวมคิวจองของร้าน" />
      <div className="flex-1 space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button onClick={goPrev} className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50">
              <ChevronLeft size={16} />
            </button>
            <h2 className="min-w-0 text-base font-semibold text-gray-800">{headerLabel}</h2>
            <button onClick={goNext} className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50">
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
            {(Object.keys(VIEW_LABELS) as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  view === v ? "bg-white text-brand-600 shadow-sm" : "text-gray-500 hover:text-gray-700",
                )}
              >
                {VIEW_LABELS[v]}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <LoadingView />
        ) : view === "month" ? (
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card">
            <div className="grid grid-cols-7 border-b border-gray-100 text-center text-xs font-medium text-gray-400">
              {WEEKDAYS.map((w) => (
                <div key={w} className="py-2">
                  {w}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {days.map((d) => {
                const iso = format(d, "yyyy-MM-dd");
                const inMonth = isSameMonth(d, anchor);
                const count = bookingsByDay[iso]?.length ?? 0;
                const staffOn = staffCounts[iso] ?? 0;
                return (
                  <button
                    key={iso}
                    onClick={() => openDay(d)}
                    className={cn(
                      "flex min-h-20 flex-col items-start gap-1 border-b border-r border-gray-50 p-2 text-left hover:bg-gray-50",
                      !inMonth && "bg-gray-50/50 text-gray-300",
                      isSameDay(d, new Date()) && "bg-brand-50/60",
                    )}
                  >
                    <span className={cn("text-xs font-medium", isSameDay(d, new Date()) && "text-brand-600")}>{format(d, "d")}</span>
                    {inMonth && staffOn > 0 && <span className="text-[10px] text-gray-400">ช่าง {staffOn} คน</span>}
                    {inMonth && count > 0 && (
                      <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-medium text-brand-700">{count} คิว</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : view === "week" ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-7">
            {days.map((d) => {
              const iso = format(d, "yyyy-MM-dd");
              const dayBookings = bookingsByDay[iso] ?? [];
              return (
                <Card
                  key={iso}
                  className={cn("!p-3", isSameDay(d, new Date()) && "border-brand-200 bg-brand-50/40")}
                >
                  <button onClick={() => openDay(d)} className="mb-2 flex w-full items-center justify-between text-left">
                    <span className="text-xs font-semibold text-gray-700">
                      {format(d, "EEEE d MMM", { locale: th })}
                    </span>
                    {dayBookings.length > 0 && (
                      <span className="rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-medium text-brand-700">
                        {dayBookings.length}
                      </span>
                    )}
                  </button>
                  <div className="space-y-1.5">
                    {dayBookings.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => router.push(`/dashboard?date=${iso}`)}
                        className="block w-full truncate rounded-lg bg-gray-50 px-2 py-1.5 text-left text-[11px] text-gray-600 hover:bg-gray-100"
                      >
                        <span className="font-medium text-gray-800">{b.startTime}</span> {b.customerName}
                      </button>
                    ))}
                    {dayBookings.length === 0 && <p className="text-[11px] text-gray-300">ไม่มีคิว</p>}
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2.5">
            {(staffCounts[format(anchor, "yyyy-MM-dd")] ?? 0) === 0 && (
              <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
                วันนี้ยังไม่มีพนักงานลงวันทำงาน
              </p>
            )}
            {(bookingsByDay[format(anchor, "yyyy-MM-dd")] ?? []).map((b) => (
              <Card
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-3 !p-4"
              >
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
                  </p>
                </div>
                <button
                  onClick={() => router.push(`/dashboard?date=${format(anchor, "yyyy-MM-dd")}`)}
                  className="shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                >
                  จัดการ
                </button>
              </Card>
            ))}
            {(bookingsByDay[format(anchor, "yyyy-MM-dd")] ?? []).length === 0 && (
              <p className="rounded-2xl bg-white py-10 text-center text-sm text-gray-400">
                ยังไม่มีคิวในวันนี้
              </p>
            )}
            <button
              onClick={() => router.push(`/dashboard?date=${format(anchor, "yyyy-MM-dd")}`)}
              className="w-full rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
            >
              ลงคิวใหม่วันนี้
            </button>
          </div>
        )}
      </div>
    </>
  );
}
