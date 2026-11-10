import { Bell, BellRing } from "lucide-react";
import { useDiscussionNotificationPreference } from "@/features/tasks/discussion/lib/discussion-notification-preference";
import { useGlobalUi } from "@/shared/i18n/global-ui";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";
import { toast } from "@/shared/ui/toast";

/** A participant's choice of what this task's discussion notifies them of. Only participants see it. */
export function DiscussionNotificationToggle({ teamId, taskId, memberId }: { teamId: string; taskId: string; memberId: string }) {
  const ui = useGlobalUi();
  const [preference, write] = useDiscussionNotificationPreference(teamId, taskId, memberId);
  const all = preference === "all";
  const current = all ? ui("接收全部讨论") : ui("只接收 @ 和回复");
  return <DropdownMenu>
    <DropdownMenuTrigger aria-label={`${ui("讨论通知")}：${current}`} className="discussion-notification-toggle" data-all={all || undefined} title={`${ui("讨论通知")}：${current}`} type="button">
      {all ? <BellRing aria-hidden="true" size={16} /> : <Bell aria-hidden="true" size={16} />}
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" className="discussion-notification-menu" side="top" sideOffset={6}>
      <DropdownMenuGroup>
        <DropdownMenuLabel>{ui("讨论通知")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={preference} onValueChange={value => { if (!write(() => value === "all" ? "all" : "mentions")) toast.error(ui("设置未能保存，请重试。")); }}>
          <DropdownMenuRadioItem value="all">{ui("接收全部讨论")}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="mentions">{ui("只接收 @ 和回复")}</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuGroup>
      <p className="discussion-notification-note">{ui("@ 你和回复你的消息始终会通知你。")}</p>
    </DropdownMenuContent>
  </DropdownMenu>;
}
