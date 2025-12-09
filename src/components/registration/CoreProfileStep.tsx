"use client";

import { useState } from "react";
import { Camera, Eye, EyeOff, X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Country, City } from "country-state-city";
import 'react-phone-number-input/style.css'
import PhoneInput from 'react-phone-number-input'

interface CoreProfileStepProps {
    formData: {
        firstName: string;
        lastName: string;
        email: string;
        password?: string;
        phone: string;
        gender: string;
        dateOfBirth: string;
        city: string;
        country: string;
        swimLevel: string;
        discoverySource: string;
        profilePhotoUrl?: string;
        occupation?: string;
        areaInLagos?: string;
        previousCommunities?: string;
    };
    onUpdate: (field: string, value: any) => void;
}

// Get all countries
const countries = Country.getAllCountries();



export function CoreProfileStep({ formData, onUpdate }: CoreProfileStepProps) {
    const [photoPreview, setPhotoPreview] = useState<string | null>(
        formData.profilePhotoUrl || null
    );
    const [showPassword, setShowPassword] = useState(false);

    // Get cities for selected country
    const selectedCountry = countries.find((c) => c.name === formData.country);
    const cities = selectedCountry
        ? City.getCitiesOfCountry(selectedCountry.isoCode) || []
        : [];

    const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                setPhotoPreview(result);
                onUpdate("profilePhotoUrl", result);
            };
            reader.readAsDataURL(file);
        }
    };

    const removePhoto = () => {
        setPhotoPreview(null);
        onUpdate("profilePhotoUrl", "");
    };



    return (
        <div className="space-y-6">
            {/* Profile Photo - Modern click-to-upload area */}
            <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-700">
                    Profile Photo <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-6">
                    <div className="relative group">
                        <label className="cursor-pointer block">
                            <div className={`h-28 w-28 shrink-0 overflow-hidden rounded-full transition-all ${photoPreview
                                ? 'ring-4 ring-cyan-200'
                                : 'bg-gradient-to-br from-cyan-100 to-cyan-200 hover:from-cyan-200 hover:to-cyan-300'
                                }`}>
                                {photoPreview ? (
                                    <img
                                        src={photoPreview}
                                        alt="Profile preview"
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <div className="flex h-full w-full flex-col items-center justify-center text-cyan-600 gap-1">
                                        <Camera className="h-8 w-8" />
                                        <span className="text-xs font-medium">Add Photo</span>
                                    </div>
                                )}
                            </div>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handlePhotoUpload}
                                className="sr-only"
                            />
                            {/* Hover overlay for existing photo */}
                            {photoPreview && (
                                <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Camera className="h-8 w-8 text-white" />
                                </div>
                            )}
                        </label>

                        {/* Remove button */}
                        {photoPreview && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removePhoto();
                                }}
                                className="absolute -top-1 -right-1 p-1.5 rounded-full bg-red-500 text-white hover:bg-red-600 shadow-lg transition-all hover:scale-110"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    <div className="flex-1">
                        <p className="text-sm text-slate-700 font-medium mb-1">
                            {photoPreview ? 'Looking good!' : 'Click to upload your photo'}
                        </p>
                        <p className="text-xs text-slate-500">
                            JPG, PNG or GIF. Max 5MB. This helps our community recognize you.
                        </p>
                    </div>
                </div>
            </div>

            {/* Name */}
            <div className="grid gap-4 md:grid-cols-2">
                <Input
                    label="First Name"
                    name="firstName"
                    value={formData.firstName}
                    onChange={(e) => onUpdate("firstName", e.target.value)}
                    required
                    placeholder="John"
                />
                <Input
                    label="Last Name"
                    name="lastName"
                    value={formData.lastName}
                    onChange={(e) => onUpdate("lastName", e.target.value)}
                    required
                    placeholder="Doe"
                />
            </div>

            {/* Contact Info */}
            <Input
                label="Email Address"
                name="email"
                type="email"
                value={formData.email}
                onChange={(e) => onUpdate("email", e.target.value)}
                required
                placeholder="john.doe@example.com"
            />

            {/* Password with visibility toggle */}
            <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">
                    Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                    <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={formData.password || ""}
                        onChange={(e) => onUpdate("password", e.target.value)}
                        required
                        placeholder="••••••••"
                        className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pr-10 text-sm ring-offset-white placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        {showPassword ? (
                            <EyeOff className="h-5 w-5" />
                        ) : (
                            <Eye className="h-5 w-5" />
                        )}
                    </button>
                </div>
                <p className="text-xs text-slate-500">Must be at least 8 characters</p>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Phone Number <span className="text-red-500">*</span>
                </label>
                <PhoneInput
                    placeholder="Enter phone number"
                    value={formData.phone}
                    onChange={(value) => onUpdate("phone", value)}
                    defaultCountry="NG"
                    className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <p className="mt-1 text-xs text-slate-500">
                    Enter your phone number with country code
                </p>
            </div>

            {/* Personal Info */}
            <div className="grid gap-4 md:grid-cols-2">
                <Select
                    label="Gender"
                    name="gender"
                    value={formData.gender}
                    onChange={(e) => onUpdate("gender", e.target.value)}
                    required
                >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                </Select>

                <Input
                    label="Date of Birth"
                    name="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => onUpdate("dateOfBirth", e.target.value)}
                    required
                />
            </div>

            {/* Address / Area */}
            <Input
                label="Address"
                name="areaInLagos"
                value={formData.areaInLagos || ""}
                onChange={(e) => onUpdate("areaInLagos", e.target.value)}
                placeholder="e.g. Lekki, Yaba"
                hint="Helps us coordinate sessions and ride-shares"
                required
            />

            {/* Location */}
            <div className="grid gap-4 md:grid-cols-2">
                <Select
                    label="Country"
                    name="country"
                    value={formData.country}
                    onChange={(e) => {
                        onUpdate("country", e.target.value);
                        onUpdate("city", ""); // Reset city when country changes
                    }}
                    required
                >
                    <option value="">Select country</option>
                    {countries.map((country) => (
                        <option key={country.isoCode} value={country.name}>
                            {country.name}
                        </option>
                    ))}
                </Select>

                <Select
                    label="City"
                    name="city"
                    value={formData.city}
                    onChange={(e) => onUpdate("city", e.target.value)}
                    required
                    disabled={!formData.country}
                >
                    <option value="">Select city</option>
                    {cities.map((city) => (
                        <option key={city.name} value={city.name}>
                            {city.name}
                        </option>
                    ))}
                </Select>
            </div>

            {/* Occupation */}
            <Input
                label="Occupation"
                name="occupation"
                value={formData.occupation || ""}
                onChange={(e) => onUpdate("occupation", e.target.value)}
                placeholder="e.g. Software Engineer"
                hint="This helps us understand our community better"
                required
            />

            {/* Swimming Level */}
            <Select
                label="Current Swimming Level"
                name="swimLevel"
                value={formData.swimLevel}
                onChange={(e) => onUpdate("swimLevel", e.target.value)}
                required
                hint="Be honest - this helps us provide better support"
            >
                <option value="">Select your level</option>
                <option value="non_swimmer">Non-Swimmer (Cannot swim at all)</option>
                <option value="beginner">Beginner (Can float/basic movements)</option>
                <option value="intermediate">Intermediate (Can swim 25m+)</option>
                <option value="advanced">Advanced (Confident in deep water)</option>
            </Select>

            {/* Discovery Source */}
            <Select
                label="How did you find out about SwimBuddz?"
                name="discoverySource"
                value={formData.discoverySource}
                onChange={(e) => onUpdate("discoverySource", e.target.value)}
                required
            >
                <option value="">Select an option</option>
                <option value="social_media">Social Media</option>
                <option value="friend_referral">Friend/Family Referral</option>
                <option value="google_search">Google Search</option>
                <option value="event">Event/Beach Day</option>
                <option value="other">Other</option>
            </Select>

            {/* Previous Communities */}
            <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">
                    Previous Sports/Fitness Communities
                </label>
                <textarea
                    name="previousCommunities"
                    value={formData.previousCommunities || ""}
                    onChange={(e) => onUpdate("previousCommunities", e.target.value)}
                    placeholder="Tell us about any gyms, clubs, or groups you've been part of..."
                    rows={3}
                    className="flex w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
            </div>
        </div>
    );
}

