import { cn } from "@/lib/utils";
import type {
  EmployeeStatus,
  PayslipStatus,
  DeliveryState,
  FeeStatus,
  RequisitionStatus,
} from "@/lib/types";

const EMPLOYEE_TONE: Record<EmployeeStatus, string> = {
  active: "bg-success/12 text-success",
  leave: "bg-brand-gold/20 text-[oklch(0.42_0.09_70)]",
  inactive: "bg-muted text-muted-foreground",
};

const EMPLOYEE_LABEL: Record<EmployeeStatus, string> = {
  active: "Active",
  leave: "On Leave",
  inactive: "Inactive",
};

export function EmployeeStatusBadge({ status }: { status: EmployeeStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        EMPLOYEE_TONE[status],
      )}
    >
      {EMPLOYEE_LABEL[status]}
    </span>
  );
}

const PAYSLIP_TONE: Record<PayslipStatus, string> = {
  draft: "bg-brand-gold/20 text-[oklch(0.42_0.09_70)]",
  sent: "bg-success/12 text-success",
  partial: "bg-brand-clay/15 text-brand-clay",
  failed: "bg-destructive/10 text-destructive",
};

const PAYSLIP_LABEL: Record<PayslipStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  partial: "Partial",
  failed: "Failed",
};

export function PayslipStatusBadge({ status }: { status: PayslipStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        PAYSLIP_TONE[status],
      )}
    >
      {PAYSLIP_LABEL[status]}
    </span>
  );
}

const DELIVERY_TONE: Record<DeliveryState, string> = {
  pending: "bg-muted text-muted-foreground",
  queued: "bg-brand-gold/20 text-[oklch(0.42_0.09_70)]",
  sending: "bg-brand-pine-mid/15 text-brand-pine-mid",
  sent: "bg-success/12 text-success",
  failed: "bg-destructive/10 text-destructive",
};

const DELIVERY_LABEL: Record<DeliveryState, string> = {
  pending: "Pending",
  queued: "Queued",
  sending: "Sending…",
  sent: "Sent",
  failed: "Failed",
};

export function DeliveryStateBadge({ state }: { state: DeliveryState }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        DELIVERY_TONE[state],
      )}
    >
      {DELIVERY_LABEL[state]}
    </span>
  );
}

const FEE_TONE: Record<FeeStatus, string> = {
  paid: "bg-success/12 text-success",
  partial: "bg-brand-clay/15 text-brand-clay",
  unpaid: "bg-destructive/10 text-destructive",
  social_case: "bg-brand-pine-mid/15 text-brand-pine-mid",
};

const FEE_LABEL: Record<FeeStatus, string> = {
  paid: "Paid",
  partial: "Partial",
  unpaid: "Unpaid",
  social_case: "Social Case",
};

export function FeeStatusBadge({ status }: { status: FeeStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        FEE_TONE[status],
      )}
    >
      {FEE_LABEL[status]}
    </span>
  );
}

const REQUISITION_TONE: Record<RequisitionStatus, string> = {
  pending: "bg-brand-gold/20 text-[oklch(0.42_0.09_70)]",
  approved: "bg-brand-pine-mid/15 text-brand-pine-mid",
  rejected: "bg-destructive/10 text-destructive",
  paid: "bg-success/12 text-success",
};

const REQUISITION_LABEL: Record<RequisitionStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  paid: "Paid",
};

export function RequisitionStatusBadge({ status }: { status: RequisitionStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        REQUISITION_TONE[status],
      )}
    >
      {REQUISITION_LABEL[status]}
    </span>
  );
}
