import AvvvatarsModule from "avvvatars-react";
import { personInitials } from "../lib/personInitials";
import { settingsMockText } from "../i18n/settingsMock";
import { useModuleCopy } from "../i18n/moduleMessages";
import { useGlobalUi } from "../i18n/globalUi";
import { useRemainingCopy } from "../i18n/remainingMessages";
import { useI18n } from "../i18n/I18nProvider";
import { mockPersonName } from "../i18n/mockContent";
import { PreviewCard } from "@base-ui/react/preview-card";
import React, { type ComponentPropsWithoutRef, type CSSProperties, forwardRef, type ReactElement, useEffect, useRef, useState } from "react";
import { ClipboardCheck, Mail, Phone, UserRound, X } from "lucide-react";
import type { PersonOption } from "../data/sharedTypes";
import { useResolvedPersonProfile } from "./PersonDirectory";
import { createPersonProfileCardModel } from "./personProfileCardModel";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

export type PersonInvitationStatus = "accepted" | "pending";

export type PersonAvatarProps = {
  avatarUrl?: string;
  name: string;
  personId?: string;
  profile?: PersonOption | null;
  profilePreviewFocusable?: boolean;
  showProfilePreview?: boolean;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  status?: "online" | "busy";
  invitationStatus?: PersonInvitationStatus;
  className?: string;
};

// The package's CommonJS build wraps its default export during server rendering.
const Avvvatars = typeof AvvvatarsModule === "function"
  ? AvvvatarsModule
  : (AvvvatarsModule as unknown as { default: typeof AvvvatarsModule }).default;

const sizeMap = { xs: 22, sm: 28, md: 36, lg: 48 };
type PersonAvatarVisualProps = Pick<PersonAvatarProps, "avatarUrl" | "className" | "invitationStatus" | "name" | "size" | "status"> & Omit<ComponentPropsWithoutRef<"span">, "children" | "className" | "title"> & {
  identity?: string;
  pendingMembership?: boolean;
  ariaLabel?: string;
  decorative?: boolean;
  focusable?: boolean;
  title?: string;
};

const PersonAvatarVisual = forwardRef<HTMLSpanElement, PersonAvatarVisualProps>(function PersonAvatarVisual({ ariaLabel, avatarUrl, className = "", decorative = true, focusable = false, invitationStatus, identity, name, pendingMembership, role: _injectedRole, size = "md", status, tabIndex: _injectedTabIndex, title, ...triggerProps }, forwardedRef) {
  const ui = useGlobalUi();
  const { locale } = useI18n();
  const displayName = mockPersonName(locale, identity, name);
  const [customImageFailed, setCustomImageFailed] = useState(false);
  const style = {
    "--person-avatar-size": size === "xl" ? "var(--ad-person-profile-avatar-size)" : `${sizeMap[size]}px`,
  } as CSSProperties;
  const resolvedAriaLabel = ariaLabel ?? triggerProps["aria-label"];

  useEffect(() => {
    setCustomImageFailed(false);
  }, [avatarUrl]);

  return (
    <span
      {...triggerProps}
      aria-label={resolvedAriaLabel}
      aria-hidden={decorative || undefined}
      className={`person-avatar ${className}`}
      data-name={name}
      ref={forwardedRef}
      role={focusable ? "group" : undefined}
      style={style}
      tabIndex={focusable ? 0 : undefined}
      title={title}
    >
      <span className="person-avatar-fallback">{pendingMembership ? <UserRound aria-hidden="true" size={16} /> : name.slice(0, 1)}</span>
      {!pendingMembership && (avatarUrl && !customImageFailed
        ? <img alt="" onError={() => setCustomImageFailed(true)} src={avatarUrl} />
        : <span aria-hidden="true" className="person-avatar-initials"><Avvvatars value={identity ?? name} displayValue={personInitials(displayName)} style="character" size={size === "xl" ? 80 : sizeMap[size]} /></span>)}
      {invitationStatus === "pending" ? (
        <i
          aria-hidden="true"
          className="person-avatar-invitation-status pending"
          title={ui("等待接受邀请")}
        >
        </i>
      ) : status ? <i aria-label={status === "online" ? ui("在线") : ui("忙碌")} className={`person-avatar-status ${status}`} /> : null}
    </span>
  );
});

export function PersonProfileCardContent({ profile }: { profile: PersonOption }) {
  const u = useRemainingCopy();
  const m = useModuleCopy();
  const { locale } = useI18n();
  const card = createPersonProfileCardModel(profile);
  return (
    <div className="person-profile-card-content">
      <span className="person-profile-avatar-shell"><PersonAvatarVisual avatarUrl={profile.avatarUrl} identity={profile.id} name={card.name} pendingMembership={profile.membershipStatus === "invited"} size="xl" /><i aria-hidden="true" className="person-profile-avatar-ring" /></span>
      <strong className="person-profile-name">{mockPersonName(locale, profile.id, card.name)}</strong>
      {profile.membershipStatus === "invited" && <span className="person-membership-badge">{u('invited')}</span>}
      <p aria-label={u('responsibility')} className="person-profile-responsibility"><ClipboardCheck aria-hidden="true" size={16} strokeWidth={1.7} /><span>{profile.dynamicResponsibility?.trim() ? settingsMockText(locale, profile.id, card.responsibility) : m("noResponsibility")}</span></p>
      {card.contacts.length > 0 && <div className="person-profile-contact-list">
        {card.contacts.map((contact) => <div className="person-profile-contact" key={contact.kind}>
          {contact.kind === "email" ? <Mail aria-hidden="true" size={16} strokeWidth={1.9} /> : <Phone aria-hidden="true" size={16} strokeWidth={1.9} />}
          <span title={contact.value}>{contact.value}</span>
        </div>)}
      </div>}
    </div>
  );
}

function PersonProfilePreview({ onOpenChange, open, profile, trigger }: { onOpenChange: (open: boolean) => void; open: boolean; profile: PersonOption; trigger: ReactElement }) {
  const u = useRemainingCopy();
  const { locale } = useI18n();
  return (
    <PreviewCard.Root onOpenChange={onOpenChange} open={open}>
      <PreviewCard.Trigger
        aria-label={u("personProfile", { name: mockPersonName(locale, profile.id, profile.name) })}
        closeDelay={160}
        delay={320}
        render={trigger}
      />
      <PreviewCard.Portal>
        <PreviewCard.Positioner align="center" className="person-profile-card-positioner" side="top" sideOffset={12}>
          <PreviewCard.Popup aria-label={u("personProfile", { name: mockPersonName(locale, profile.id, profile.name) })} className="person-profile-card">
            <PreviewCard.Arrow className="person-profile-card-arrow" />
            <PersonProfileCardContent profile={profile} />
          </PreviewCard.Popup>
        </PreviewCard.Positioner>
      </PreviewCard.Portal>
    </PreviewCard.Root>
  );
}

// Avvvatars colors are keyed by member identity; initials follow the displayed name.
// Base UI PreviewCard keeps the hover content outside scrolling containers.
export function PersonAvatar({ avatarUrl, className = "", invitationStatus, name, personId, profile, profilePreviewFocusable = true, showProfilePreview = true, size = "md", status }: PersonAvatarProps) {
  const { locale } = useI18n();
  const u = useRemainingCopy();
  const resolvedProfile = useResolvedPersonProfile({ identity: personId, name, profile });
  const [previewOpen, setPreviewOpen] = useState(false);
  const hasProfilePreview = Boolean(showProfilePreview && resolvedProfile);
  const avatar = <PersonAvatarVisual
    ariaLabel={resolvedProfile && profilePreviewFocusable ? u("personProfile", { name: mockPersonName(locale, resolvedProfile.id, resolvedProfile.name) }) : undefined}
    avatarUrl={avatarUrl ?? resolvedProfile?.avatarUrl}
    identity={personId ?? resolvedProfile?.id}
    className={`${className}${hasProfilePreview ? " is-profile-trigger" : ""}`}
    data-person-preview-trigger={hasProfilePreview ? "avatar" : undefined}
    decorative={!resolvedProfile || !profilePreviewFocusable}
    focusable={Boolean(resolvedProfile && profilePreviewFocusable)}
    invitationStatus={resolvedProfile?.membershipStatus === "invited" ? "pending" : invitationStatus}
    pendingMembership={resolvedProfile?.membershipStatus === "invited"}
    name={resolvedProfile?.name ?? name}
    onClick={hasProfilePreview ? (event) => {
      event.stopPropagation();
      setPreviewOpen(true);
    } : undefined}
    onPointerDown={hasProfilePreview ? (event) => event.stopPropagation() : undefined}
    size={size}
    status={status}
    title={resolvedProfile ? undefined : name}
  />;

  if (!hasProfilePreview || !resolvedProfile) return avatar;

  return <PersonProfilePreview onOpenChange={setPreviewOpen} open={previewOpen} profile={resolvedProfile} trigger={avatar as ReactElement} />;
}

type PersonNameProps = {
  className?: string;
  prefix?: string;
  name: string;
  personId?: string;
  profile?: PersonOption | null;
  profilePreviewFocusable?: boolean;
  showProfilePreview?: boolean;
};

type PersonNameVisualProps = Omit<ComponentPropsWithoutRef<"span">, "children" | "className"> & {
  ariaLabel?: string;
  className?: string;
  focusable?: boolean;
  name: string;
};

const PersonNameVisual = forwardRef<HTMLSpanElement, PersonNameVisualProps>(function PersonNameVisual({ ariaLabel, className = "", focusable = false, name, role: _injectedRole, tabIndex: _injectedTabIndex, ...triggerProps }, forwardedRef) {
  return <span {...triggerProps} aria-label={ariaLabel ?? triggerProps["aria-label"]} className={`person-name-trigger ${className}`.trim()} ref={forwardedRef} role={focusable ? "group" : undefined} tabIndex={focusable ? 0 : undefined}>{name}</span>;
});

export function PersonName({ className = "", prefix = "", name, personId, profile, profilePreviewFocusable = false, showProfilePreview = true }: PersonNameProps) {
  const u = useRemainingCopy();
  const { locale } = useI18n();
  const resolvedProfile = useResolvedPersonProfile({ identity: personId, name, profile });
  const [previewOpen, setPreviewOpen] = useState(false);
  const label = <PersonNameVisual ariaLabel={resolvedProfile && profilePreviewFocusable ? u("personProfile", { name: mockPersonName(locale, resolvedProfile.id, resolvedProfile.name) }) : undefined} className={className} focusable={Boolean(resolvedProfile && profilePreviewFocusable)} name={`${prefix}${mockPersonName(locale, personId ?? resolvedProfile?.id, resolvedProfile?.name ?? name)}`} />;
  const badge = resolvedProfile?.membershipStatus === "invited" ? <span className="person-membership-badge">{u('invited')}</span> : null;

  if (!showProfilePreview || !resolvedProfile) return <>{label}{badge}</>;
  return <><PersonProfilePreview onOpenChange={setPreviewOpen} open={previewOpen} profile={resolvedProfile} trigger={label as ReactElement} />{badge}</>;
}

export function PersonOverflowList({ className = "person-avatar-overflow", invitationStatusById = {}, label = "参与者", people, style }: {
  className?: string;
  invitationStatusById?: Record<string, PersonInvitationStatus>;
  label?: string;
  people: PersonOption[];
  style?: CSSProperties;
}) {
  const ui = useGlobalUi();
  const { locale } = useI18n();
  const [open, setOpen] = useState(false);

  return <Popover onOpenChange={setOpen} open={open}>
    <PopoverTrigger aria-label={ui("另有 {0} 位{1}", {0: people.length, 1: label})} className={className} closeDelay={150} delay={100} onFocus={(event) => { if (event.currentTarget.matches(":focus-visible")) setOpen(true); }} openOnHover style={style} type="button">+{people.length}</PopoverTrigger>
    <PopoverContent aria-label={ui("更多{0}", {0: label})} className="person-overflow-popover" finalFocus={false} initialFocus={false}>
      <ul aria-label={ui("收起的{0}", {0: label})} className="person-overflow-list">
        {people.map((person) => <li key={person.id}>
          <PersonAvatar invitationStatus={invitationStatusById[person.id]} name={person.name} profile={person} showProfilePreview={false} size="sm" />
          <span>{mockPersonName(locale, person.id, person.name)}</span>
        </li>)}
      </ul>
    </PopoverContent>
  </Popover>;
}

type PersonAvatarGroupProps = {
  className?: string;
  fitAvailable?: boolean;
  invitationStatusById?: Record<string, PersonInvitationStatus>;
  maxVisible?: number;
  onRemove?: (personId: string) => void;
  people: PersonOption[];
  removeLabel?: string;
  size?: Exclude<NonNullable<PersonAvatarProps["size"]>, "xl">;
};

// Adapted from the stacked avatar-group anatomy used by 21st.dev's Hero UI and ReUI components.
export function PersonAvatarGroup({ className = "", fitAvailable = false, invitationStatusById = {}, onRemove, people, removeLabel = "参与人", maxVisible = people.length, size = "sm" }: PersonAvatarGroupProps) {
  const u = useRemainingCopy();
  const { locale } = useI18n();
  const groupRef = useRef<HTMLSpanElement>(null);
  const [fittedMaxVisible, setFittedMaxVisible] = useState(maxVisible);

  useEffect(() => {
    if (!fitAvailable) {
      setFittedMaxVisible(maxVisible);
      return;
    }

    const group = groupRef.current;
    if (!group) return;

    const updateVisibleCount = () => {
      const availableWidth = group.getBoundingClientRect().width;
      if (!availableWidth) return;

      const avatarSize = sizeMap[size];
      const overlap = Number.parseFloat(getComputedStyle(group).getPropertyValue("--ad-space-2")) || 8;
      const visibleStep = avatarSize - overlap;
      const availableSlots = Math.max(1, Math.floor((availableWidth - avatarSize) / visibleStep) + 1);
      const nextVisibleCount = people.length <= availableSlots
        ? people.length
        : Math.max(1, availableSlots - 1);

      setFittedMaxVisible(Math.min(maxVisible, nextVisibleCount));
    };

    updateVisibleCount();
    if (typeof ResizeObserver === "undefined") return;
    const resizeObserver = new ResizeObserver(updateVisibleCount);
    resizeObserver.observe(group);
    return () => resizeObserver.disconnect();
  }, [fitAvailable, maxVisible, people.length, size]);

  const visiblePeople = people.slice(0, fitAvailable ? fittedMaxVisible : maxVisible);
  const hiddenCount = Math.max(0, people.length - visiblePeople.length);
  const style = { "--person-avatar-size": `${sizeMap[size]}px` } as CSSProperties;

  return (
    <span
      aria-label={u("participants", { names: people.map(person => mockPersonName(locale, person.id, person.name)).join(", ") })}
      className={`person-avatar-group${fitAvailable ? " is-fit-available" : ""} ${className}`}
      ref={groupRef}
      role="group"
    >
      {visiblePeople.map((person) => onRemove ? <span className="person-avatar-group-item" key={person.id}>
        <PersonAvatar invitationStatus={invitationStatusById[person.id]} name={person.name} profile={person} size={size} />
        <button aria-label={u("removePerson", { label: removeLabel, name: mockPersonName(locale, person.id, person.name) })} className="person-avatar-group-remove" onClick={() => onRemove(person.id)} type="button"><X aria-hidden="true" /></button>
      </span> : <PersonAvatar invitationStatus={invitationStatusById[person.id]} key={person.id} name={person.name} profile={person} size={size} />)}
      {hiddenCount > 0 && <PersonOverflowList invitationStatusById={invitationStatusById} people={people.slice(visiblePeople.length)} style={style} />}
    </span>
  );
}
