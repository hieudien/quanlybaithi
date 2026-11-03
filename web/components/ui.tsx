import type { Status } from "@/lib/db";

export const Skeleton = ({ n = 4 }: { n?: number }) => (
  <div aria-busy="true" aria-label="Đang tải">{Array.from({ length: n }, (_, i) => <div className="skel" key={i} />)}</div>
);

export const Empty = ({ msg, children }: { msg: string; children?: React.ReactNode }) => (
  <div className="empty"><p>{msg}</p>{children}</div>
);

export const ErrorBox = ({ msg, onRetry }: { msg: string; onRetry: () => void }) => (
  <div className="alert" role="alert">{msg} <button className="btn ghost" onClick={onRetry}>Thử lại</button></div>
);

export const StatusBadge = ({ status }: { status: Status }) =>
  status === "published" ? <span className="badge success">Đã đăng</span> : <span className="badge warning">Nháp</span>;
