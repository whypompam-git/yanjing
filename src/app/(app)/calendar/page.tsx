"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addMonths,
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
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { LoadingView } from "@/components/ui/LoadingView";
import { listBookings, listStaffSchedule } from "@/lib/supabase/queries";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

export default function CalendarPage() {
  const router = useRouter();
  const [anchor, setAnchor] = useState(() => new Date());
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [staffCounts, setStaffCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const rangeStart = startOfWeek(startOfMonth(anchor));
  const rangeEnd = endOfWeek(endOfMonth(anchor));
  const days = useMemo(() => eachDayOfInterval({ start: rangeStart, end: rangeEnd }), [rangeStart, rangeEnd]);

  useEffect(() => {
    setLoading(true);
    const from = format(rangeStart, "yyyy-MM-dd");
    const to = format(rangeEnd, "yyyy-MM-dd");
    Promise.all([listBookings(from, to), listStaffSchedule(from, to)]).then(([bookings, schedule]) => {
      const c: Record<string, number> = {};
      bookings.filter((b) => b.status === "confirmed").forEach((b) => {
        c[b.bookingDate] = (c[b.bookingDate] ?? 0) + 1;
      });
      const sc: Record<string, number> = {};
      schedule.forEach((row) => {
        sc[row.workDate] = (sc[row.workDate] ?? 0) + 1;
      });
      setCounts(c);
      setStaffCounts(sc);
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeStart.getTime(), rangeEnd.getTime()]);

  return (
    <>
      <Topbar title="ปฏิทิน" subtitle="ภาพรวมคิวทั้งร้านรายเดือน" />
      <div className="flex-1 space-y-4 p-4 sm:p-6">
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
                const count = counts[iso] ?? 0;
                const staffOn = staffCounts[iso] ?? 0;
                return (
                  <button
                    key={iso}
                    onClick={() => router.push(`/dashboard?date=${iso}`)}
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
        )}
      </div>
    </>
  );
}
