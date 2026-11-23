'use client';

import { useState, useEffect } from 'react';
import { Joyride, STATUS, Step } from 'react-joyride';
import { useRouter, useSearchParams } from 'next/navigation';
import { useProfile, useUpdateOnboarding } from '@/lib/hooks/use-profile';
import { WelcomeModal } from './welcome-modal';

export function OnboardingManager() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: user, isLoading } = useProfile();
  const updateOnboarding = useUpdateOnboarding();

  const [runTour, setRunTour] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    if (searchParams.get('tour') === 'true') {
      setRunTour(true);
      router.replace('/dashboard');
      return;
    }

    if (!isLoading && user && !user.hasSeenWelcome) {
      setShowWelcome(true);
    }
  }, [user, isLoading, searchParams, router]);

  const handleSkip = () => {
    setShowWelcome(false);
    updateOnboarding.mutate({ hasSeenWelcome: true, quickTourSkipped: true });
  };

  const handleStartTour = () => {
    setShowWelcome(false);
    updateOnboarding.mutate({ hasSeenWelcome: true });
    setRunTour(true);
  };

  const handleOpenGuide = () => {
    setShowWelcome(false);
    updateOnboarding.mutate({ hasSeenWelcome: true });
    router.push('/help');
  };

  const handleJoyrideCallback = (data: any) => {
    const { status } = data;
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      setRunTour(false);
      updateOnboarding.mutate({
        quickTourCompleted: status === STATUS.FINISHED,
        quickTourSkipped: status === STATUS.SKIPPED,
      });
    }
  };

  const steps: Step[] = [
    {
      target: '#tour-dashboard',
      content:
        'This is your Dashboard. Here you get a unified snapshot of your total net worth, cash flow, and recent activity.',
      placement: 'right',
      skipBeacon: true,
    },
    {
      target: '#tour-personal',
      content:
        'The Personal section is where you track your everyday money. Add your bank accounts, mobile money, and record daily transactions here.',
      placement: 'right',
      skipBeacon: true,
    },
    {
      target: '#tour-investments',
      content:
        'In Investments, you can track your portfolio. Add stocks, crypto, or real estate, and monitor your unrealized gains.',
      placement: 'right',
      skipBeacon: true,
    },
    {
      target: '#tour-businesses',
      content:
        'Managing a business? Use this section to track business accounts, calculate P&L, and monitor cash runway.',
      placement: 'right',
      skipBeacon: true,
    },
    {
      target: '#tour-plan',
      content:
        'The Plan section helps you look forward. Set up budgets, create savings goals, and simulate debt payoff strategies.',
      placement: 'right',
      skipBeacon: true,
    },
    {
      target: '#tour-analyze',
      content:
        'Finally, the Analyze section gives you deep reports and automated insights to help you make better financial decisions.',
      placement: 'right',
      skipBeacon: true,
    },
  ];

  if (isLoading) return null;

  return (
    <>
      <WelcomeModal
        isOpen={showWelcome}
        onClose={handleSkip}
        onStartTour={handleStartTour}
        onOpenGuide={handleOpenGuide}
      />

      <Joyride steps={steps} run={runTour} continuous callback={handleJoyrideCallback} />
    </>
  );
}
