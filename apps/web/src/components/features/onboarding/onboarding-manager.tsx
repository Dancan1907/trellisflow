'use client';

import { useState, useEffect } from 'react';
// Notice the curly braces around Joyride, CallBackProps, STATUS, and Step
import { Joyride, CallBackProps, STATUS, Step } from 'react-joyride';
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
    // Check if the user explicitly asked to restart the tour via URL (?tour=true)
    if (searchParams.get('tour') === 'true') {
      setRunTour(true);
      // Clean up the URL so refreshing doesn't restart it forever
      router.replace('/dashboard');
      return;
    }

    // Otherwise, check if they are a new user who hasn't seen the welcome modal
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

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRunTour(false);
      updateOnboarding.mutate({
        quickTourCompleted: status === STATUS.FINISHED,
        quickTourSkipped: status === STATUS.SKIPPED,
      });
    }
  };

  // Define the 6 steps of the tour
  const steps: Step[] = [
    {
      target: '#tour-dashboard',
      content:
        'This is your Dashboard. Here you get a unified snapshot of your total net worth, cash flow, and recent activity.',
      disableBeacon: true, // Starts the tour immediately on the first step
      placement: 'right',
    },
    {
      target: '#tour-personal',
      content:
        'The Personal section is where you track your everyday money. Add your bank accounts, mobile money, and record daily transactions here.',
      placement: 'right',
    },
    {
      target: '#tour-investments',
      content:
        'In Investments, you can track your portfolio. Add stocks, crypto, or real estate, and monitor your unrealized gains.',
      placement: 'right',
    },
    {
      target: '#tour-businesses',
      content:
        'Managing a business? Use this section to track business accounts, calculate P&L, and monitor cash runway.',
      placement: 'right',
    },
    {
      target: '#tour-plan',
      content:
        'The Plan section helps you look forward. Set up budgets, create savings goals, and simulate debt payoff strategies.',
      placement: 'right',
    },
    {
      target: '#tour-analyze',
      content:
        'Finally, the Analyze section gives you deep reports and automated insights to help you make better financial decisions.',
      placement: 'right',
    },
  ];

  // Don't render anything until the user profile is loaded
  if (isLoading) return null;

  return (
    <>
      <WelcomeModal
        isOpen={showWelcome}
        onClose={handleSkip}
        onStartTour={handleStartTour}
        onOpenGuide={handleOpenGuide}
      />

      <Joyride
        steps={steps}
        run={runTour}
        continuous
        showProgress
        showSkipButton
        callback={handleJoyrideCallback}
        styles={{
          options: {
            primaryColor: 'var(--accent-primary)',
            backgroundColor: 'var(--bg-secondary)',
            textColor: 'var(--fg-primary)',
            arrowColor: 'var(--bg-secondary)',
            overlayColor: 'rgba(0, 0, 0, 0.75)',
          },
          tooltip: {
            borderRadius: '12px',
            border: '1px solid var(--border-subtle)',
            padding: '24px',
          },
          buttonNext: {
            backgroundColor: 'var(--accent-primary)',
            color: 'var(--bg-primary)',
            borderRadius: '6px',
            fontWeight: 'bold',
          },
          buttonBack: {
            color: 'var(--fg-secondary)',
            marginRight: '12px',
          },
          buttonSkip: {
            color: 'var(--fg-tertiary)',
          },
        }}
      />
    </>
  );
}
