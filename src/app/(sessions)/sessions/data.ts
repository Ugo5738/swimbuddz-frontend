export type Session = {
  id: string;
  title: string;
  type: "Club" | "Meetup" | "Academy";
  location: string;
  date: string;
  startTime: string;
  endTime: string;
  poolFee: number;
  rideShareFee?: number;
  description: string;
};

export const mockSessions: Session[] = [
  {
    id: "yaba-0713",
    title: "Club Session – Yaba",
    type: "Club",
    location: "Rowe Park Yaba",
    date: "2026-01-03",
    startTime: "12:00",
    endTime: "15:00",
    poolFee: 4000,
    rideShareFee: 6000,
    description: "Structured endurance sets + technique focus on pull work.",
  },
  {
    id: "federal-palace-meetup",
    title: "Meetup – Federal Palace Swim",
    type: "Meetup",
    location: "Federal Palace Hotel",
    date: "2026-02-21",
    startTime: "09:00",
    endTime: "12:00",
    poolFee: 50000,
    description: "Recovery swim plus mobility session with Coach Dan.",
  },
  {
    id: "academy-trials",
    title: "Academy Trials",
    type: "Academy",
    location: "Rowe Park Yaba",
    date: "2026-01-03",
    startTime: "09:00",
    endTime: "12:00",
    poolFee: 15000,
    description:
      "Assessments for the July cohort. Includes dryland warm-up and breathwork.",
  },
];

export function getSessionById(id: string) {
  return mockSessions.find((session) => session.id === id);
}
