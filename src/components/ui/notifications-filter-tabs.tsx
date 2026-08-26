import * as Tabs from "@radix-ui/react-tabs";

type NotificationsFilterOption<T extends string> = {
  count: number;
  label: string;
  value: T;
};

type NotificationsFilterTabsProps<T extends string> = {
  ariaLabel: string;
  onValueChange: (value: T) => void;
  options: NotificationsFilterOption<T>[];
  value: T;
};

/**
 * Filter structure adapted from 21st.dev / Ahmed Mayara / Notifications Menu.
 * The selected segment uses the component's white surface and subtle inset shadow;
 * counts remain inline text instead of becoming separate badges.
 */
export function NotificationsFilterTabs<T extends string>({ ariaLabel, onValueChange, options, value }: NotificationsFilterTabsProps<T>) {
  return <Tabs.Root className="notifications-filter" onValueChange={(nextValue) => onValueChange(nextValue as T)} value={value}>
    <Tabs.List aria-label={ariaLabel} className="notifications-filter-list">
      {options.map((option) => <Tabs.Trigger className="notifications-filter-trigger" key={option.value} value={option.value}>
        <span>{option.label}</span>
        <small>{option.count}</small>
      </Tabs.Trigger>)}
    </Tabs.List>
  </Tabs.Root>;
}
