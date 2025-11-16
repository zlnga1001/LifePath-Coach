import React, { useEffect, useState } from 'react';

interface GuidanceProps {
  userName?: string;
}

const Guidance: React.FC<GuidanceProps> = ({ userName }) => {
  const [current, setCurrent] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const popupRef = React.useRef<HTMLDivElement | null>(null);

  const steps: Array<{ title: string; body: string; selector?: string }> = [
    {
      title: `Welcome${userName ? `, ${userName}` : ''}`,
      body: 'Welcome to LifePath Coach — I will guide you through the main features so you know where to start. Click Next to continue or Skip to close this walkthrough.',
    },
    {
      title: 'Resume Mentor',
      body: 'Start by adding a draft of your resume in the Resume Mentor. You can save up to 5 drafts and generate tailored resumes and cover letters for job descriptions.',
      selector: '[data-guidance="resume-card"]',
    },
    {
      title: 'Career Track',
      body: 'Explore curated career roadmaps (Software, Data Science, Trading, Finance). Choose a track to convert milestones into actionable tasks.',
      selector: '[data-guidance="track-card"]',
    },
    {
      title: 'Skill Analysis',
      body: 'Run a skill gap analysis to see the skills you match and the skills to improve — with targeted free resources.',
      selector: '[data-guidance="analysis-card"]',
    },
    {
      title: 'Mentor Chat',
      body: 'Use Mentor Chat for personalized advice, interview prep, and quick explanations. Ask focused questions and get practical next steps.',
      selector: '[data-guidance="chat-card"]',
    },
    {
      title: 'Sidebar Navigation',
      body: 'Use the sidebar to quickly jump between areas. You can always reopen this guide from the bottom-right banner.',
      selector: 'button[data-guidance="sidebar-track"]',
    },
  ];

  useEffect(() => {
    try {
      const stored = localStorage.getItem('guidanceCompleted');
      const banner = localStorage.getItem('guidanceBannerDismissed');
      if (stored === 'true') {
        setCompleted(true);
      } else {
        // show modal on first sign in / first mount when not completed
        setShowModal(true);
      }
      setBannerDismissed(banner === 'true');
    } catch (e) {
      // ignore
      setShowModal(true);
    }
  }, []);

  // when modal shows or current step changes, highlight and position near target
  useEffect(() => {
    if (!showModal) return;
    const step = steps[current];
    clearHighlights();
    if (step && step.selector) {
      const el = document.querySelector(step.selector) as HTMLElement | null;
      if (el) {
        el.classList.add('guidance-outline');
        // scroll into view
        try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
        // position popup near element
        positionPopupNear(el);
      }
    } else {
      // center modal
      positionPopupCenter();
    }
    const onScroll = () => {
      const s = steps[current];
      if (s && s.selector) {
        const el = document.querySelector(s.selector) as HTMLElement | null;
        if (el) positionPopupNear(el);
      }
    };
    window.addEventListener('scroll', onScroll);
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      clearHighlights();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showModal, current]);

  const clearHighlights = () => {
    document.querySelectorAll('.guidance-outline').forEach(el => el.classList.remove('guidance-outline'));
  };

  const positionPopupCenter = () => {
    const popup = popupRef.current;
    if (!popup) return;
    popup.style.position = 'fixed';
    popup.style.left = '50%';
    popup.style.top = '50%';
    popup.style.transform = 'translate(-50%, -50%)';
  };

  const positionPopupNear = (el: HTMLElement) => {
    const popup = popupRef.current;
    if (!popup) return;
    const rect = el.getBoundingClientRect();
    const padding = 12;
    const popupWidth = 360;
    const rightSpace = window.innerWidth - rect.right;
    const leftSpace = rect.left;
    const top = Math.max(12, rect.top + window.scrollY - 8);
    popup.style.position = 'absolute';
    if (rightSpace > popupWidth + padding) {
      popup.style.left = `${rect.right + padding + window.scrollX}px`;
      popup.style.top = `${top}px`;
      popup.style.transform = '';
    } else if (leftSpace > popupWidth + padding) {
      popup.style.left = `${Math.max(12, rect.left + window.scrollX - popupWidth - padding)}px`;
      popup.style.top = `${top}px`;
      popup.style.transform = '';
    } else {
      // fallback: place above element
      popup.style.left = `${Math.max(12, rect.left + window.scrollX)}px`;
      popup.style.top = `${Math.max(12, rect.top + window.scrollY - 120)}px`;
      popup.style.transform = '';
    }
  };

  const closeAndPersist = (markCompleted = false) => {
    setShowModal(false);
    if (markCompleted) {
      setCompleted(true);
      try {
        localStorage.setItem('guidanceCompleted', 'true');
        localStorage.setItem('guidanceBannerDismissed', 'false');
      } catch (e) {}
    }
  };

  const reopen = () => {
    setCurrent(0);
    setShowModal(true);
  };

  const dismissBanner = () => {
    setBannerDismissed(true);
    try { localStorage.setItem('guidanceBannerDismissed', 'true'); } catch (e) {}
  };

  if (!showModal && !completed) return null; // not ready to show anything

  return (
    <>
      <style>{`
        .guidance-outline { box-shadow: 0 0 0 4px rgba(234,88,12,0.28) !important; border-radius: 8px; position: relative; z-index: 9999; }
        .guidance-popup { width: 360px; z-index: 10000; }
      `}</style>
      {showModal && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => closeAndPersist(false)} />
          <div ref={popupRef} className="guidance-popup bg-white rounded-lg shadow-lg overflow-hidden p-4">
            <div>
              <h3 className="text-xl font-bold text-gray-800">{steps[current].title}</h3>
              <p className="mt-2 text-gray-600">{steps[current].body}</p>

              <div className="mt-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button onClick={() => { setCurrent(Math.max(0, current - 1)); }} disabled={current === 0} className="px-3 py-1 rounded-md bg-gray-100 text-sm">Previous</button>
                  <button onClick={() => { if (current < steps.length - 1) setCurrent(current + 1); else closeAndPersist(true); }} className="px-3 py-1 rounded-md bg-indigo-600 text-white text-sm">{current < steps.length - 1 ? 'Next' : 'Finish'}</button>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => closeAndPersist(true)} className="text-sm text-gray-500 hover:underline">Finish walkthrough</button>
                  <button onClick={() => closeAndPersist(false)} className="text-sm text-red-500">Skip</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {completed && !bannerDismissed && (
        <div className="fixed bottom-6 right-6 z-40">
          <div className="bg-white/95 backdrop-blur-md text-gray-900 rounded-md shadow-lg p-3 w-72">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-semibold">Getting started</div>
                <div className="text-xs text-gray-600">You completed the walkthrough. Open it again or hide this banner.</div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <button onClick={reopen} className="text-sm px-2 py-1 bg-indigo-600 text-white rounded-md">Open</button>
                <button onClick={dismissBanner} className="text-xs text-gray-500">Hide</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Guidance;
