import { useFavorite } from "@/features/me/lib/favorites";
import { useI18n } from "@/shared/i18n/I18nProvider";
import type { TaskFileNode } from "@/shared/model/task-model";
import { toast } from "@/shared/ui/toast";

/** The file menu's favorite entry. Folders and discussion-only attachments are not offered. */
export function useFileFavorite(taskId: string, node: TaskFileNode | null | undefined) {
  const { locale } = useI18n();
  const en = locale === "en";
  const favorite = useFavorite("file", taskId, node?.id);
  const available = favorite.available && node?.kind === "file" && !node.discussionOnly && !node.attachmentOnly;
  return {
    available,
    active: favorite.active,
    label: favorite.active ? (en ? "Remove from favorites" : "取消收藏") : (en ? "Add to favorites" : "收藏"),
    toggle: () => {
      if (!available || !node) return;
      const saved = favorite.toggle(node.name);
      if (saved === null) toast.error(en ? "Could not update favorites. Please try again." : "收藏未能更新，请重试。");
      else toast.success(saved ? (en ? "Added to favorites" : "已收藏") : (en ? "Removed from favorites" : "已取消收藏"));
    },
  };
}
