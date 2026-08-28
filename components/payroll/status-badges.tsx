"use client";

import { useTranslations } from "next-intl";
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

const EMPLOYEE_LABEL_KEY: Record<EmployeeStatus, string> = {
  active: "employeeActive",
  leave: "employeeLeave",
  inactive: "employeeInactive",
};

export function EmployeeStatusBadge({ status }: { status: EmployeeStatus }) {
  const t = useTranslations("statusBadges");
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        EMPLOYEE_TONE[status],
      )}
    >
      {t(EMPLOYEE_LABEL_KEY[status])}
    </span>
  );
}

const PAYSLIP_TONE: Record<PayslipStatus, string> = {
  draft: "bg-brand-gold/20 text-[oklch(0.42_0.09_70)]",
  sent: "bg-success/12 text-success",
  partial: "bg-brand-clay/15 text-brand-clay",
  failed: "bg-destructive/10 text-destructive",
};

const PAYSLIP_LABEL_KEY: Record<PayslipStatus, string> = {
  draft: "payslipDraft",
  sent: "payslipSent",
  partial: "payslipPartial",
  failed: "payslipFailed",
};

export function PayslipStatusBadge({ status }: { status: PayslipStatus }) {
  const t = useTranslations("statusBadges");
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        PAYSLIP_TONE[status],
      )}
    >
      {t(PAYSLIP_LABEL_KEY[status])}
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

const DELIVERY_LABEL_KEY: Record<DeliveryState, string> = {
  pending: "deliveryPending",
  queued: "deliveryQueued",
  sending: "deliverySending",
  sent: "deliverySent",
  failed: "deliveryFailed",
};

export function DeliveryStateBadge({ state }: { state: DeliveryState }) {
  const t = useTranslations("statusBadges");
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        DELIVERY_TONE[state],
      )}
    >
      {t(DELIVERY_LABEL_KEY[state])}
    </span>
  );
}

const FEE_TONE: Record<FeeStatus, string> = {
  paid: "bg-success/12 text-success",
  partial: "bg-brand-clay/15 text-brand-clay",
  unpaid: "bg-destructive/10 text-destructive",
  social_case: "bg-brand-pine-mid/15 text-brand-pine-mid",
};

const FEE_LABEL_KEY: Record<FeeStatus, string> = {
  paid: "feePaid",
  partial: "feePartial",
  unpaid: "feeUnpaid",
  social_case: "feeSocialCase",
};

export function FeeStatusBadge({ status }: { status: FeeStatus }) {
  const t = useTranslations("statusBadges");
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        FEE_TONE[status],
      )}
    >
      {t(FEE_LABEL_KEY[status])}
    </span>
  );
}

const REQUISITION_TONE: Record<RequisitionStatus, string> = {
  pending: "bg-brand-gold/20 text-[oklch(0.42_0.09_70)]",
  approved: "bg-brand-pine-mid/15 text-brand-pine-mid",
  rejected: "bg-destructive/10 text-destructive",
  paid: "bg-success/12 text-success",
};

const REQUISITION_LABEL_KEY: Record<RequisitionStatus, string> = {
  pending: "requisitionPending",
  approved: "requisitionApproved",
  rejected: "requisitionRejected",
  paid: "requisitionPaid",
};

export function RequisitionStatusBadge({ status }: { status: RequisitionStatus }) {
  const t = useTranslations("statusBadges");
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        REQUISITION_TONE[status],
      )}
    >
      {t(REQUISITION_LABEL_KEY[status])}
    </span>
  );
}
