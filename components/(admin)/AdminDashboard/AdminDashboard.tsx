"use client";

import PageHeader from "@/components/shared/PageHeader/PageHeader";
import ErrorLogList from "../ErrorLog/ErrorLogList";

const AdminDashboard = () => {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Error logs"
        crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Admin" }]}
        description="Admin only · read-only · 30-day retention"
      />

      <ErrorLogList />
    </div>
  );
};

export default AdminDashboard;
