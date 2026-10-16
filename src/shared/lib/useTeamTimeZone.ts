import { createContext, useContext } from "react";
import { LEGACY_TEAM_TIME_ZONE } from "@/shared/lib/team-time-zone";

export const TeamTimeZoneContext = createContext(LEGACY_TEAM_TIME_ZONE);
export function useTeamTimeZone() { return useContext(TeamTimeZoneContext); }
