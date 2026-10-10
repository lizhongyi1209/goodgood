import { Zap } from "lucide-react";
import styles from "./design-system.module.css";

export function CreditPill({ balance, loading = false, unavailable = false, onClick }: { balance: string; loading?: boolean; unavailable?: boolean; onClick?: () => void }) {
  const text = loading ? "—" : unavailable ? "—" : balance;
  const label = loading ? "积分正在读取" : unavailable ? "积分暂不可用" : `积分 ${balance}`;
  const content = <><Zap aria-hidden="true" fill="currentColor" /><span>{text}</span></>;
  return onClick ? <button className={styles.creditPill} type="button" aria-label={label} onClick={onClick}>{content}</button>
    : <span className={styles.creditPill} role="status" aria-label={label}>{content}</span>;
}
