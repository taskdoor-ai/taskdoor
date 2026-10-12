import { createContext, type RefObject } from 'react';

export const TaskSidebarContext = createContext<{
  collapsed: boolean;
  sidebarId: string;
  toggle: () => void;
  toggleRef: RefObject<HTMLButtonElement | null>;
} | null>(null);
