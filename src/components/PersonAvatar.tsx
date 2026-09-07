import { PreviewCard } from "@base-ui/react/preview-card";
import React, { type ComponentPropsWithoutRef, type CSSProperties, forwardRef, type ReactElement, useEffect, useRef, useState } from "react";
import { Check, ClipboardCheck, Mail, Phone, X } from "lucide-react";
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

const sizeMap = { xs: 22, sm: 28, md: 36, lg: 48 };
function nameSeed(name: string) {
  return Array.from(name).reduce((total, character) => total + (character.codePointAt(0) ?? 0), 0);
}

const backgrounds = ["b6e3f4", "c0aede", "d1d4f9", "ffd5dc", "ffdfbf"];
const anonymousSeeds = ["Aster", "Birch", "Cedar", "Dune", "Elm", "Flint", "Grove"];

type PersonAvatarVisualProps = Pick<PersonAvatarProps, "avatarUrl" | "className" | "invitationStatus" | "name" | "size" | "status"> & Omit<ComponentPropsWithoutRef<"span">, "children" | "className" | "title"> & {
  ariaLabel?: string;
  decorative?: boolean;
  focusable?: boolean;
  title?: string;
};

const PersonAvatarVisual = forwardRef<HTMLSpanElement, PersonAvatarVisualProps>(function PersonAvatarVisual({ ariaLabel, avatarUrl, className = "", decorative = true, focusable = false, invitationStatus, name, role: _injectedRole, size = "md", status, tabIndex: _injectedTabIndex, title, ...triggerProps }, forwardedRef) {
  const [customImageFailed, setCustomImageFailed] = useState(false);
  const [generatedImageFailed, setGeneratedImageFailed] = useState(false);
  const seed = nameSeed(name);
  const style = {
    "--person-avatar-size": size === "xl" ? "var(--ad-person-profile-avatar-size)" : `${sizeMap[size]}px`,
  } as CSSProperties;
  const generatedImageUrl = `https://api.dicebear.com/9.x/micah/svg?seed=${anonymousSeeds[seed % anonymousSeeds.length]}&backgroundColor=${backgrounds[seed % backgrounds.length]}`;
  const imageUrl = avatarUrl && !customImageFailed ? avatarUrl : generatedImageUrl;
  const imageFailed = avatarUrl && !customImageFailed ? false : generatedImageFailed;
  const resolvedAriaLabel = ariaLabel ?? triggerProps["aria-label"];

  useEffect(() => {
    setCustomImageFailed(false);
    setGeneratedImageFailed(false);
  }, [avatarUrl, name]);

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
      <span className="person-avatar-fallback">{name.slice(0, 1)}</span>
      {!imageFailed && <img alt="" onError={() => avatarUrl && !customImageFailed ? setCustomImageFailed(true) : setGeneratedImageFailed(true)} src={imageUrl} />}
      {invitationStatus ? (
        <i
          aria-hidden="true"
          className={`person-avatar-invitation-status ${invitationStatus}`}
          title={invitationStatus === "accepted" ? "邀请已接受" : "等待接受邀请"}
        >
          {invitationStatus === "accepted" && <Check strokeWidth={3} />}
        </i>
      ) : status ? <i aria-label={status === "online" ? "在线" : "忙碌"} className={`person-avatar-status ${status}`} /> : null}
    </span>
  );
});

export function PersonProfileCardContent({ profile }: { profile: PersonOption }) {
  const card = createPersonProfileCardModel(profile);
  return (
    <div className="person-profile-card-content">
      <span className="person-profile-avatar-shell"><PersonAvatarVisual avatarUrl={profile.avatarUrl} name={card.name} size="xl" /><i aria-hidden="true" className="person-profile-avatar-ring" /></span>
      <strong className="person-profile-name">{card.name}</strong>
      <p aria-label="责任" className="person-profile-responsibility"><ClipboardCheck aria-hidden="true" size={16} strokeWidth={1.7} /><span>{card.responsibility}</span></p>
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
  return (
    <PreviewCard.Root onOpenChange={onOpenChange} open={open}>
      <PreviewCard.Trigger
        aria-label={`查看${profile.name}的人员信息`}
        closeDelay={160}
        delay={320}
        render={trigger}
      />
      <PreviewCard.Portal>
        <PreviewCard.Positioner align="center" className="person-profile-card-positioner" side="top" sideOffset={12}>
          <PreviewCard.Popup aria-label={`${profile.name}的人员信息`} className="person-profile-card">
            <PreviewCard.Arrow className="person-profile-card-arrow" />
            <PersonProfileCardContent profile={profile} />
          </PreviewCard.Popup>
        </PreviewCard.Positioner>
      </PreviewCard.Portal>
    </PreviewCard.Root>
  );
}

// Uses the same DiceBear Micah portrait source as 21st.dev Member Selector #9908.
// Base UI PreviewCard keeps the hover content outside scrolling containers.
export function PersonAvatar({ avatarUrl, className = "", invitationStatus, name, personId, profile, profilePreviewFocusable = true, showProfilePreview = true, size = "md", status }: PersonAvatarProps) {
  const resolvedProfile = useResolvedPersonProfile({ identity: personId, name, profile });
  const [previewOpen, setPreviewOpen] = useState(false);
  const hasProfilePreview = Boolean(showProfilePreview && resolvedProfile);
  const avatar = <PersonAvatarVisual
    ariaLabel={resolvedProfile && profilePreviewFocusable ? `查看${resolvedProfile.name}的人员信息` : undefined}
    avatarUrl={avatarUrl ?? resolvedProfile?.avatarUrl}
    className={`${className}${hasProfilePreview ? " is-profile-trigger" : ""}`}
    data-person-preview-trigger={hasProfilePreview ? "avatar" : undefined}
    decorative={!resolvedProfile || !profilePreviewFocusable}
    focusable={Boolean(resolvedProfile && profilePreviewFocusable)}
    invitationStatus={invitationStatus}
    name={name}
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

export function PersonName({ className = "", name, personId, profile, profilePreviewFocusable = false, showProfilePreview = true }: PersonNameProps) {
  const resolvedProfile = useResolvedPersonProfile({ identity: personId, name, profile });
  const [previewOpen, setPreviewOpen] = useState(false);
  const label = <PersonNameVisual ariaLabel={resolvedProfile && profilePreviewFocusable ? `查看${resolvedProfile.name}的人员信息` : undefined} className={className} focusable={Boolean(resolvedProfile && profilePreviewFocusable)} name={name} />;

  if (!showProfilePreview || !resolvedProfile) return label;
  return <PersonProfilePreview onOpenChange={setPreviewOpen} open={previewOpen} profile={resolvedProfile} trigger={label as ReactElement} />;
}

export function PersonOverflowList({ className = "person-avatar-overflow", invitationStatusById = {}, label = "参与者", people, style }: {
  className?: string;
  invitationStatusById?: Record<string, PersonInvitationStatus>;
  label?: string;
  people: PersonOption[];
  style?: CSSProperties;
}) {
  const [open, setOpen] = useState(false);

  return <Popover onOpenChange={setOpen} open={open}>
    <PopoverTrigger aria-label={`另有 ${people.length} 位${label}`} className={className} closeDelay={150} delay={100} onFocus={(event) => { if (event.currentTarget.matches(":focus-visible")) setOpen(true); }} openOnHover style={style} type="button">+{people.length}</PopoverTrigger>
    <PopoverContent aria-label={`更多${label}`} className="person-overflow-popover" finalFocus={false} initialFocus={false}>
      <ul aria-label={`收起的${label}`} className="person-overflow-list">
        {people.map((person) => <li key={person.id}>
          <PersonAvatar invitationStatus={invitationStatusById[person.id]} name={person.name} profile={person} showProfilePreview={false} size="sm" />
          <span>{person.name}</span>
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
      aria-label={`参与者：${people.map((person) => person.name).join("、")}`}
      className={`person-avatar-group${fitAvailable ? " is-fit-available" : ""} ${className}`}
      ref={groupRef}
      role="group"
    >
      {visiblePeople.map((person) => onRemove ? <span className="person-avatar-group-item" key={person.id}>
        <PersonAvatar invitationStatus={invitationStatusById[person.id]} name={person.name} profile={person} size={size} />
        <button aria-label={`移除${removeLabel}：${person.name}`} className="person-avatar-group-remove" onClick={() => onRemove(person.id)} type="button"><X aria-hidden="true" /></button>
      </span> : <PersonAvatar invitationStatus={invitationStatusById[person.id]} key={person.id} name={person.name} profile={person} size={size} />)}
      {hiddenCount > 0 && <PersonOverflowList invitationStatusById={invitationStatusById} people={people.slice(visiblePeople.length)} style={style} />}
    </span>
  );
}
