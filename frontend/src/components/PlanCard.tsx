import type { PlanData } from "../types";
import s from "./PlanCard.module.css";

interface PlanCardProps {
  plan: PlanData;
  onConfirm: () => void;
  onCancel: () => void;
}

export function PlanCard({ plan, onConfirm, onCancel }: PlanCardProps) {
  return (
    <div className={s.card}>
      <div className={s.title}>📋 {plan.title}</div>
      <div className={s.steps}>
        {plan.steps.map((step, i) => (
          <span key={step.id}>
            {i > 0 && <span className={s.arrow}>→</span>}
            <span className={s.step}>
              <span className={s.stepNum}>{step.id}</span>
              {step.label}
            </span>
          </span>
        ))}
      </div>
      <div className={s.actions}>
        <button className={s.cancel} onClick={onCancel}>
          取消
        </button>
        <button className={s.confirm} onClick={onConfirm}>
          ✅ 确认执行
        </button>
      </div>
    </div>
  );
}
