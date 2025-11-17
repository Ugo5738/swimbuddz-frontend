export type Announcement = {
  id: string;
  title: string;
  date: string;
  category: "weather" | "meetup" | "academy" | "general";
  summary: string;
  body: string;
  whatsapp: string;
  email: string;
};

export const mockAnnouncements: Announcement[] = [
  {
    id: "1",
    title: "Yaba Club Session – Rain Update",
    date: "2024-06-14",
    category: "weather",
    summary: "Saturday’s 7 am club session will now start at 9 am due to early showers.",
    body:
      "Rain showers are expected between 6–8 am. We are shifting Saturday’s start time to 9 am so the pool can be cleared. Please arrive warmed up and allow coaches to adjust the sets on deck.",
    whatsapp:
      "SwimBuddz update: Yaba club session now starts 9 am on Sat due to rain. Warm up early + expect adjusted sets.",
    email:
      "Hello SwimBuddz members,\n\nWeather updates show rain between 6–8 am. Saturday’s club session will therefore begin at 9:00 am. Please warm up before arrival and be ready for coaches to adjust sets on deck.\n\nThanks!"
  },
  {
    id: "2",
    title: "Meetup: Ikoyi Night Swim",
    date: "2024-06-12",
    category: "meetup",
    summary: "Midweek recovery swim plus coach-led mobility drills. Limited slots available.",
    body:
      "Midweek recovery swim plus coach-led mobility drills at Ikoyi Club. Slots are limited; RSVP through the sessions page once it's live.",
    whatsapp: "Ikoyi Night Swim on Wednesday – recovery swim + mobility drills. Slots limited; RSVP soon.",
    email:
      "Hi SwimBuddz crew,\n\nWe have a midweek Ikoyi Night Swim focused on recovery and mobility drills. Save your slot via the Sessions page the moment it launches.\n\nSee you by the pool!"
  },
  {
    id: "3",
    title: "Academy Trials – July Cohort",
    date: "2024-06-10",
    category: "academy",
    summary: "Sign-ups are live for the next academy on-boarding block. Interviews run all week.",
    body:
      "Applications are open for the July academy cohort. Expect phone interviews and a water assessment. Reply to this email with your level if you’re interested.",
    whatsapp: "SwimBuddz academy trials for July are live. Interviews + water test in July. Reply with your level to join.",
    email:
      "SwimBuddz family,\n\nWe are filling the July academy cohort. Each candidate will have a quick phone interview and a water assessment. Reply with your swim level + goals to be shortlisted.\n\nCoach Team"
  }
];

export function getAnnouncementById(id: string) {
  return mockAnnouncements.find((announcement) => announcement.id === id);
}
