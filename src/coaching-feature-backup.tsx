// Backup of coaching feature code extracted from Profile page

export const certificationOptions = [
  { value: "cpr", label: "CPR / First Aid" },
  { value: "asce", label: "ASCE Level 1" },
  { value: "asce_2", label: "ASCE Level 2" },
  { value: "fina", label: "FINA Certified" },
  { value: "lifeguard", label: "Lifeguard" },
];

export const coachingSpecialtyOptions = [
  { value: "technique", label: "Technique correction" },
  { value: "open_water_coach", label: "Open water coaching" },
  { value: "triathlon", label: "Triathlon training" },
  { value: "kids", label: "Kids / Learn to swim" },
  { value: "masters", label: "Masters swimming" },
];

// Types
export type CoachingProfile = {
  certifications: string[];
  coachingExperience: string;
  coachingSpecialties: string[];
  coachingYears: string;
  coachingPortfolioLink: string;
  coachingDocumentLink: string;
  coachingDocumentFileName: string;
};

// Component snippet for rendering coaching details
export function CoachingDetails({ profile }: { profile: CoachingProfile }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Coaching Profile</h3>
      <div>
        <span className="font-medium">Certifications:</span>{" "}
        {profile.certifications.join(", ") || "None"}
      </div>
      <div>
        <span className="font-medium">Experience:</span>{" "}
        {profile.coachingExperience || "--"}
      </div>
      <div>
        <span className="font-medium">Specialties:</span>{" "}
        {profile.coachingSpecialties.join(", ") || "None"}
      </div>
      <div>
        <span className="font-medium">Years Coaching:</span>{" "}
        {profile.coachingYears || "--"}
      </div>
      <div>
        <span className="font-medium">Portfolio:</span>{" "}
        {profile.coachingPortfolioLink || "--"}
      </div>
      <div>
        <span className="font-medium">Documents:</span>{" "}
        {profile.coachingDocumentLink || "--"}
      </div>
    </div>
  );
}
