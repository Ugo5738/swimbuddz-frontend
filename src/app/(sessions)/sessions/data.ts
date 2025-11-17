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
    location: "Yaba Aquatic Centre",
    date: "2024-07-13",
    startTime: "07:00",
    endTime: "09:30",
    poolFee: 12000,
    rideShareFee: 3000,
    description: "Structured endurance sets + technique focus on pull work."
  },
  {
    id: "ikoyi-meetup",
    title: "Meetup – Ikoyi Night Swim",
    type: "Meetup",
    location: "Ikoyi Club",
    date: "2024-07-10",
    startTime: "19:00",
    endTime: "21:00",
    poolFee: 8000,
    description: "Recovery swim plus mobility session with Coach Ash."
  },
  {
    id: "academy-trials",
    title: "Academy Trials",
    type: "Academy",
    location: "Landmark Beach",
    date: "2024-07-15",
    startTime: "08:00",
    endTime: "11:00",
    poolFee: 15000,
    description: "Assessments for the July cohort. Includes dryland warm-up and breathwork."
  }
];

export function getSessionById(id: string) {
  return mockSessions.find((session) => session.id === id);
}
