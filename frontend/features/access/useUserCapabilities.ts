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
  const subject = typeof user?.profile?.sub === "string" ? user.profile.sub : null;
  const [membershipState, setMembershipState] = useState<{
    subject: string | null;
    items: OrganizationMembership[];
  }>({ subject: null, items: [] });
  const [requestState, setRequestState] = useState<{
    subject: string | null;
    organizerApproved: boolean;
    venueOwnerApproved: boolean;
  }>({ subject: null, organizerApproved: false, venueOwnerApproved: false });
  const memberships = useMemo(
    () => (membershipState.subject === subject ? membershipState.items : []),
    [membershipState, subject],
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
        ).catch(() => null),
        apiRequest<Array<{ capability: string; status: string }>>(
          "/me/capability-requests",
          accessToken,
        ).catch(() => null),
      ]).then(([organizations, requests]) => {
        if (!active) return;
        setMembershipState((current) =>
          organizations === null && current.subject === subject
            ? current
            : { subject, items: organizations ?? [] },
        );
        setRequestState((current) =>
          requests === null && current.subject === subject
            ? current
            : {
                subject,
                organizerApproved: (requests ?? []).some(
                  (request) =>
                    request.capability === "MATCH_ORGANIZER" &&
                    request.status === "APPROVED",
                ),
                venueOwnerApproved: (requests ?? []).some(
                  (request) =>
                    request.capability === "VENUE_OWNER" &&
                    request.status === "APPROVED",
                ),
              },
        );
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
  }, [accessToken, authLoading, subject]);

  return {
    capabilities: useMemo(
      () =>
        resolveCapabilities(
          user,
          memberships,
          requestState.subject === subject && requestState.organizerApproved,
          requestState.subject === subject && requestState.venueOwnerApproved,
        ),
      [memberships, requestState, subject, user],
    ),
    memberships,
    loading:
      authLoading ||
      Boolean(
        accessToken && subject &&
        (membershipState.subject !== subject ||
          requestState.subject !== subject),
      ),
  };
}
