import { ArrowRight, CheckCircle2, X } from "lucide-react";
import type { CSSProperties } from "react";
import type { Member } from "./MemberSelector";
import { PersonAvatar } from "./PersonAvatar";

type TaskCreationSuccessProps = {
  cycle: string;
  members: Member[];
  onClose: () => void;
  onContinue: () => void;
  owner: string[];
  participants: string[];
  title: string;
  todoCount: number;
};

const confetti = Array.from({ length: 100 }, (_, index) => ({
  color: ["#ef4444", "#3b82f6", "#22c55e", "#eab308", "#8b5cf6", "#f97316"][index % 6],
  delay: `${((index * 17) % 21) / 10}s`,
  drift: `${-90 + ((index * 37) % 180)}px`,
  duration: `${2.8 + ((index * 13) % 24) / 10}s`,
  height: `${9 + ((index * 7) % 8)}px`,
  left: `${1 + ((index * 29) % 98)}%`,
  rotate: `${(index * 47) % 360}deg`,
  width: `${5 + ((index * 11) % 5)}px`,
}));

export function TaskCreationSuccess({ cycle, members, onClose, onContinue, owner, participants, title, todoCount }: TaskCreationSuccessProps) {
  const people = [...owner, ...participants].map((id) => members.find((member) => member.id === id)).filter(Boolean) as Member[];

  return (
    <div aria-labelledby="task-created-title" aria-modal="true" className="task-created-overlay" role="dialog">
      <button aria-label="关闭创建成功提示" className="task-created-backdrop" onClick={onClose} type="button" />
      <div aria-hidden="true" className="task-created-confetti">
        {confetti.map((piece, index) => <i key={index} style={{ "--confetti-color": piece.color, "--confetti-delay": piece.delay, "--confetti-drift": piece.drift, "--confetti-duration": piece.duration, "--confetti-height": piece.height, "--confetti-left": piece.left, "--confetti-rotate": piece.rotate, "--confetti-width": piece.width } as CSSProperties} />)}
      </div>

      <section className="task-created-ticket">
        <button aria-label="关闭" className="task-created-close" onClick={onClose} type="button"><X /></button>

        <header>
          <span><CheckCircle2 /></span>
          <h2 id="task-created-title">任务创建成功</h2>
          <p>任务已按当前草稿创建，人员、文件与子任务可在后续按需补充。</p>
        </header>

        <div className="task-created-dash" />

        <div className="task-created-content">
          <small>协作任务</small>
          <strong>{title}</strong>

          <dl>
            <div><dt>拥有者</dt><dd>{owner[0] || "待指定"}</dd></div>
            <div><dt>推进节奏</dt><dd>{cycle}</dd></div>
            <div><dt>文件</dt><dd>按需引用</dd></div>
            <div><dt>已创建子任务</dt><dd>{todoCount} 项</dd></div>
          </dl>

          <div className="task-created-people">
            <span className="task-created-avatar-stack">
              {people.map((member) => <PersonAvatar key={member.id} name={member.name} size="xs" />)}
            </span>
            <p><strong>{people.length ? `${people.length} 位协作成员` : "暂未分配成员"}</strong><small>{people.length ? people.map((member) => member.name).join("、") : "可由创建者或执行者稍后决定"}</small></p>
          </div>
        </div>

        <div className="task-created-dash" />

        <footer>
          <button onClick={onContinue} type="button"><span>查看任务详情</span><ArrowRight /></button>
        </footer>
      </section>
    </div>
  );
}
