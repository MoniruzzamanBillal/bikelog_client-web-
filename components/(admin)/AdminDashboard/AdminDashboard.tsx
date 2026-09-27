"use client";

import ErrorLogList from "../ErrorLog/ErrorLogList";

const AdminDashboard = () => {
  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-lg font-semibold">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Server errors captured across all users.
        </p>
      </div>

      <ErrorLogList />
    </div>
  );
};

export default AdminDashboard;
