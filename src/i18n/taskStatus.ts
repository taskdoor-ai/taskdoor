/** Compatibility adapter: translate labels, never mutate existing persisted status values. */
export const statusMessageKey = {
  '待开始': 'status.notStarted',
  '进行中': 'status.inProgress',
  '待审核': 'status.inReview',
  '已阻塞': 'status.blocked',
  '已完成': 'status.completed',
  '已取消': 'status.cancelled',
} as const;
