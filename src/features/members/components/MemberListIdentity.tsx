import type { PersonOption } from '@/shared/model/task-model'
import { PersonAvatar, PersonName } from '@/shared/ui/PersonAvatar'

export function MemberListIdentity({ name, personId, profile, showProfilePreview = true }: {
  name: string
  personId?: string
  profile?: PersonOption
  showProfilePreview?: boolean
}) {
  return <span className="member-list-identity">
    <PersonAvatar name={name} personId={personId} profile={profile} showProfilePreview={showProfilePreview} size="xs" />
    <PersonName name={name} personId={personId} profile={profile} showProfilePreview={showProfilePreview} />
  </span>
}
