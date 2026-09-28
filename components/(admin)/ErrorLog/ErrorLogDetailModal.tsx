"use client";

import BaseModal from "@/components/shared/Modal/BaseModal";
import StatusTag from "@/components/shared/StatusTag/StatusTag";
import { format } from "date-fns";
import { getStatusTone } from "./errorLogStatus";
import { TErrorLog } from "./type/error-log.types";

type TProps = {
  log: TErrorLog;
  onClose: () => void;
};

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="break-all text-sm">{value}</p>
  </div>
);

export default function ErrorLogDetailModal({ log, onClose }: TProps) {
  return (
    <BaseModal open onClose={onClose} title="Error details">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <StatusTag tone={getStatusTone(log?.status)}>{log?.status}</StatusTag>
          {log?.errorName && (
            <span className="text-sm font-medium">{log?.errorName}</span>
          )}
        </div>

        <DetailRow label="Message" value={log?.message} />
        <DetailRow label="Request" value={`${log?.method} ${log?.path}`} />
        <DetailRow
          label="User"
          value={
            log?.userEmail
              ? `${log?.userEmail}${log?.userId ? ` (${log?.userId})` : ""}`
              : "Anonymous"
          }
        />
        <DetailRow
          label="Time"
          value={format(new Date(log?.createdAt), "dd-MMM-yyyy, hh:mm:ss a")}
        />

        {log?.errorSources && log?.errorSources?.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground">Error Sources</p>
            <ul className="mt-1 space-y-1">
              {log?.errorSources?.map((source, index) => (
                <li key={index} className="break-all text-sm">
                  {source?.path !== "" && (
                    <span className="font-mono text-xs">{source?.path}: </span>
                  )}
                  {source?.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {log?.stack && (
          <div>
            <p className="text-xs text-muted-foreground">Stack Trace</p>
            <pre className="mt-1 max-h-64 overflow-auto rounded-md bg-muted p-3 font-mono text-xs whitespace-pre">
              {log?.stack}
            </pre>
          </div>
        )}
      </div>
    </BaseModal>
  );
}
