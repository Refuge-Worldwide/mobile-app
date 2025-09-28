import { create } from 'zustand';

type Schedule = {
  status: "online" | "offline";
  liveNow: {
    title: string;
    artwork: string;
    link?: string;
    slug?: string;
    isMixedFeelings?: boolean;
  };
  nextUp: any[];
  schedule: any[];
  ch2: {
    status: "online" | "offline";
    liveNow: string;
  };
};

export const useScheduleStore = create<Schedule>((set) => ({
  schedule: null,
  fetchSchedule: async () => {
    try {
      const res = await fetch('https://refugeworldwide.com/api/schedule');
      const data = await res.json();
      set({
        schedule: data,
      });
    } catch (error) {
      console.error('Failed to fetch schedule:', error);
    }
  },
}));