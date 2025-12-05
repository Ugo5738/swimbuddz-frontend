"use client";

import { Textarea } from "@/components/ui/Textarea";
import { Input } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";

interface AboutYouStepProps {
    formData: {
        occupation?: string;
        area_in_lagos?: string;
        how_found_us?: string;
        previous_communities?: string;
        hopes_from_swimbuddz?: string;
        community_rules_accepted?: boolean;
    };
    onUpdate: (field: string, value: any) => void;
}

const communityRules = [
    "Be respectful to all members regardless of swimming ability, background, or identity.",
    "Arrive on time for sessions and communicate in advance if you can't make it.",
    "Follow pool safety rules and the instructions of coaches and session leads.",
    "No photography or recording of other members without explicit consent.",
    "This is a family-friendly community - keep language and behavior appropriate.",
    "Report any concerns about safety or behavior to the SwimBuddz team.",
];

export function AboutYouStep({ formData, onUpdate }: AboutYouStepProps) {
    return (
        <div className="space-y-6">
            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 text-white text-3xl mb-4">
                    👋
                </div>
                <h3 className="text-xl font-semibold text-slate-900">Tell us about yourself</h3>
                <p className="text-slate-600 mt-2">
                    Help us get to know you better so we can ensure SwimBuddz is a great fit.
                </p>
            </div>

            <Input
                label="What do you do for work or school?"
                name="occupation"
                value={formData.occupation || ""}
                onChange={(e) => onUpdate("occupation", e.target.value)}
                placeholder="e.g., Software Engineer, University Student, Entrepreneur"
                hint="This helps us understand our community better"
            />

            <Input
                label="Which area of Lagos are you based in?"
                name="area_in_lagos"
                value={formData.area_in_lagos || ""}
                onChange={(e) => onUpdate("area_in_lagos", e.target.value)}
                placeholder="e.g., Lekki, Victoria Island, Ikeja, Yaba"
                hint="Helps us coordinate sessions and ride-shares"
            />

            <Input
                label="How did you find out about SwimBuddz?"
                name="how_found_us"
                value={formData.how_found_us || ""}
                onChange={(e) => onUpdate("how_found_us", e.target.value)}
                placeholder="e.g., Instagram, friend referral, Google search"
            />

            <Textarea
                label="Have you been part of any sports or fitness communities before?"
                name="previous_communities"
                value={formData.previous_communities || ""}
                onChange={(e) => onUpdate("previous_communities", e.target.value)}
                placeholder="Tell us about any gyms, clubs, or groups you've been part of..."
                rows={3}
            />

            <Textarea
                label="What do you hope to get from SwimBuddz?"
                name="hopes_from_swimbuddz"
                value={formData.hopes_from_swimbuddz || ""}
                onChange={(e) => onUpdate("hopes_from_swimbuddz", e.target.value)}
                placeholder="e.g., Learn to swim, improve my technique, meet like-minded people, stay fit..."
                rows={3}
                required
            />

            {/* Community Rules */}
            <div className="space-y-4">
                <div>
                    <h4 className="text-lg font-semibold text-slate-900 mb-2">Community Rules</h4>
                    <p className="text-sm text-slate-600 mb-4">
                        SwimBuddz is a safe, respectful, and family-friendly community. Please review and agree to our community rules.
                    </p>
                </div>

                <div className="bg-slate-50 rounded-xl p-6 space-y-3">
                    {communityRules.map((rule, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center text-sm font-medium">
                                {idx + 1}
                            </span>
                            <p className="text-sm text-slate-700">{rule}</p>
                        </div>
                    ))}
                </div>

                <div className="flex items-start gap-3 pt-4">
                    <Checkbox
                        id="community_rules_accepted"
                        checked={formData.community_rules_accepted || false}
                        onChange={(e) => onUpdate("community_rules_accepted", e.target.checked)}
                        required
                    />
                    <label htmlFor="community_rules_accepted" className="text-sm text-slate-700 cursor-pointer">
                        I have read and agree to the SwimBuddz community rules. I understand that violation of these rules may result in removal from the community.
                        <span className="text-red-500 ml-1">*</span>
                    </label>
                </div>
            </div>
        </div>
    );
}
