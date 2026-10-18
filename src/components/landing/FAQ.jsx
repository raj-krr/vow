import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Reveal } from './Reveal';

const faqItems = [
  {
    question: 'What is VOW?',
    answer:
      'VOW (Virtual Organised World) is a collaborative 2D virtual office platform for remote teams. It recreates the presence and spontaneous energy of a physical workplace through spatial avatars, customizable rooms, and real-time interaction.',
  },
  {
    question: 'How do I create or join a workspace?',
    answer:
      "You can create a workspace directly from your dashboard by naming it for fresh projects, or join an existing workspace by entering your team's unique Workspace ID.",
  },
  {
    question: 'How does real-time communication work?',
    answer:
      'Team members move their avatars across the virtual office floor. Approaching or meeting another teammate initiates an instant direct 1-on-1 voice, video, or chat huddle without scheduling links, or you can step into conference rooms for group video calls.',
  },
  {
    question: 'Who can create and schedule meetings?',
    answer:
      'In VOW, Managers and Supervisors have dedicated permissions to schedule, name, and host meetings from the Meeting section of the workspace dashboard.',
  },
  {
    question: 'Can we share files within the workspace?',
    answer:
      'Yes, VOW includes an integrated File Sharing section accessible directly from the workspace sidebar where team members can upload, manage, and download shared project files.',
  },
];

export const FAQ = () => {
  const [openIndex, setOpenIndex] = useState(0);

  const toggleAccordion = (index) => {
    setOpenIndex(openIndex === index ? -1 : index);
  };

  return (
    <section id="faq" className="py-24 sm:py-32 px-4 sm:px-6 md:px-12 lg:px-20 bg-[#F9F6FC] relative">
      <div className="max-w-4xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16 sm:mb-20">
          <span className="vow-eyebrow mb-4">FAQ</span>
          <h2 className="vow-headline-section text-[#0B0E13] tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#707070] font-body max-w-2xl mx-auto">
            Everything you need to know about getting started in your virtual office.
          </p>
        </div>

        {/* Accordion List */}
        <Reveal y={24} className="space-y-4">
          {faqItems.map((item, index) => {
            const isOpen = openIndex === index;

            return (
              <div
                key={index}
                className="reveal-child rounded-2xl bg-white/90 border border-[rgba(204,180,233,0.4)] shadow-xs transition-all duration-300 overflow-hidden"
              >
                <button
                  id={`faq-question-${index}`}
                  onClick={() => toggleAccordion(index)}
                  className="w-full py-5 sm:py-6 px-6 sm:px-8 min-h-[44px] flex items-center justify-between text-left gap-4 cursor-pointer hover:bg-purple-50/40 transition-colors focus-visible:ring-2 focus-visible:ring-[#5C0EA4] focus-visible:outline-none"
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${index}`}
                >
                  <span className="font-display text-base sm:text-lg font-bold text-[#0B0E13] tracking-tight">
                    {item.question}
                  </span>

                  <div
                    className={`w-8 h-8 rounded-full border border-[rgba(204,180,233,0.6)] flex items-center justify-center shrink-0 transition-transform duration-300 ${
                      isOpen
                        ? 'rotate-45 bg-[#5C0EA4] text-white border-[#5C0EA4]'
                        : 'bg-purple-50 text-[#5C0EA4]'
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                  </div>
                </button>

                {/* Animated Height Container */}
                <div
                  id={`faq-answer-${index}`}
                  role="region"
                  aria-labelledby={`faq-question-${index}`}
                  className={`grid transition-all duration-300 ease-in-out px-6 sm:px-8 ${
                    isOpen ? 'grid-rows-[1fr] pb-6 opacity-100' : 'grid-rows-[0fr] pb-0 opacity-0'
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="text-sm sm:text-base text-[#4B5563] leading-relaxed font-body border-t border-[rgba(204,180,233,0.25)] pt-4">
                      {item.answer}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </Reveal>
      </div>
    </section>
  );
};

export default FAQ;
