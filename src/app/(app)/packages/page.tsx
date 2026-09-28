"use client";

import { useEffect, useState } from "react";
import { Clock, Pencil, Plus, Trash2 } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { Card } from "@/components/ui/Card";
import { LoadingView } from "@/components/ui/LoadingView";
import { PackageModal, type PackageFormValues } from "@/components/packages/PackageModal";
import { createPackageRow, deletePackageRow, listPackages, updatePackageRow } from "@/lib/supabase/queries";
import type { Package } from "@/lib/types";

const currency = (n: number) => n.toLocaleString("th-TH", { minimumFractionDigits: 0 });

export default function PackagesPage() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState<"closed" | "create" | { edit: Package }>("closed");

  useEffect(() => {
    listPackages()
      .then(setPackages)
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(values: PackageFormValues) {
    if (modalMode === "create") {
      const created = await createPackageRow(values);
      setPackages((prev) => [created, ...prev]);
    } else if (modalMode !== "closed") {
      const { edit } = modalMode;
      await updatePackageRow(edit.id, values);
      setPackages((prev) => prev.map((p) => (p.id === edit.id ? { ...p, ...values } : p)));
    }
    setModalMode("closed");
  }

  async function handleDelete(pkg: Package) {
    if (!window.confirm(`ลบแพ็คเกจ "${pkg.name}" ใช่ไหม?`)) return;
    setPackages((prev) => prev.filter((p) => p.id !== pkg.id));
    try {
      await deletePackageRow(pkg.id);
    } catch (err) {
      console.error(err);
      setPackages((prev) => [pkg, ...prev]);
      window.alert("ลบไม่สำเร็จ — อาจมีคิวผูกอยู่กับแพ็คเกจนี้");
    }
  }

  if (loading) {
    return (
      <>
        <Topbar title="แพ็คเกจ" subtitle="รายการบริการและราคา" />
        <LoadingView />
      </>
    );
  }

  return (
    <>
      <Topbar title="แพ็คเกจ" subtitle="รายการบริการและราคา" />
      <div className="flex-1 space-y-6 p-4 sm:p-6">
        <div className="flex justify-end">
          <button
            onClick={() => setModalMode("create")}
            className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            <Plus size={16} />
            เพิ่มแพ็คเกจ
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg) => (
            <Card key={pkg.id} className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-gray-900">{pkg.name}</p>
                <div className="flex shrink-0 gap-1">
                  <button onClick={() => setModalMode({ edit: pkg })} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600" aria-label="แก้ไข">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleDelete(pkg)} className="rounded-full p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600" aria-label="ลบ">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {pkg.description && <p className="text-sm text-gray-500">{pkg.description}</p>}
              <div className="flex items-center gap-3 pt-1 text-sm">
                <span className="font-semibold text-brand-600">฿{currency(pkg.price)}</span>
                <span className="flex items-center gap-1 text-gray-400">
                  <Clock size={13} />
                  {pkg.durationMinutes} นาที
                </span>
              </div>
            </Card>
          ))}
          {packages.length === 0 && (
            <p className="rounded-2xl bg-white px-4 py-6 text-center text-sm text-gray-400 sm:col-span-2 lg:col-span-3">
              ยังไม่มีแพ็คเกจ — กด &quot;เพิ่มแพ็คเกจ&quot;
            </p>
          )}
        </div>
      </div>

      {modalMode !== "closed" && (
        <PackageModal initial={modalMode === "create" ? undefined : modalMode.edit} onClose={() => setModalMode("closed")} onSave={handleSave} />
      )}
    </>
  );
}
