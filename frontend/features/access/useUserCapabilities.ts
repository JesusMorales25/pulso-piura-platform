"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { apiRequest } from "@/lib/api";
import {
  OrganizationMembership,
  resolveCapabilities,
} from "@/features/access/capabilities";

export function useUserCapabilities() {
  const { accessToken, loading: authLoading, user } = useAuth();
  const [membershipState, setMembershipState] = useState<{
    token: string | null;
    items: OrganizationMembership[];
  }>({ token: null, items: [] });
  const [requestState, setRequestState] = useState<{
    token: string | null;
    organizerApproved: boolean;
    venueOwnerApproved: boolean;
  }>({ token: null, organizerApproved: false, venueOwnerApproved: false });
  const memberships = useMemo(
    () => (membershipState.token === accessToken ? membershipState.items : []),
    [accessToken, membershipState],
  );

  useEffect(() => {
    if (authLoading) return;
    if (!accessToken) return;

    let active = true;
    const loadCapabilities = () => {
      void Promise.all([
        apiRequest<OrganizationMembership[]>(
          "/organizations",
          accessToken,
        ).catch(() => []),
        apiRequest<Array<{ capability: string; status: string }>>(
          "/me/capability-requests",
          accessToken,
        ).catch(() => []),
      ]).then(([organizations, requests]) => {
        if (!active) return;
        setMembershipState({ token: accessToken, items: organizations });
        setRequestState({
          token: accessToken,
          organizerApproved: requests.some(
            (request) =>
              request.capability === "MATCH_ORGANIZER" &&
              request.status === "APPROVED",
          ),
          venueOwnerApproved: requests.some(
            (request) =>
              request.capability === "VENUE_OWNER" &&
              request.status === "APPROVED",
          ),
        });
      });
    };

    loadCapabilities();
    window.addEventListener("pulso:capabilities-changed", loadCapabilities);

    return () => {
      active = false;
      window.removeEventListener(
        "pulso:capabilities-changed",
        loadCapabilities,
      );
    };
  }, [accessToken, authLoading]);

  return {
    capabilities: useMemo(
      () =>
        resolveCapabilities(
          user,
          memberships,
          requestState.token === accessToken && requestState.organizerApproved,
          requestState.token === accessToken && requestState.venueOwnerApproved,
        ),
      [accessToken, memberships, requestState, user],
    ),
    memberships,
    loading:
      authLoading ||
      Boolean(
        accessToken &&
        (membershipState.token !== accessToken ||
          requestState.token !== accessToken),
      ),
  };
}
