// src/hooks/useSubscriptionAccess.ts
'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'unpaid'
  | 'none';

export function useSubscriptionAccess() {
  const { data: session, status } = useSession();
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>('none');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubscription = async () => {
      if (!session?.user?.id) {
        setSubscriptionStatus('none');
        setLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/subscription');
        if (!res.ok) throw new Error('Failed to fetch subscription');

        const data = await res.json();

        if (data && data.subscription?.status) {
          setSubscriptionStatus(data.subscription.status);
        } else {
          setSubscriptionStatus('none');
        }
      } catch (error) {
        console.error('Error fetching subscription:', error);
        setSubscriptionStatus('none');
      } finally {
        setLoading(false);
      }
    };

    if (status === 'authenticated') {
      fetchSubscription();
    } else if (status === 'unauthenticated') {
      setLoading(false);
    }
  }, [session?.user?.id, status]);

  const hasAccess =
    subscriptionStatus === 'active' || subscriptionStatus === 'trialing';

  return {
    loading,
    hasAccess,
    subscriptionStatus,
    isLoggedIn: status === 'authenticated',
  };
}
