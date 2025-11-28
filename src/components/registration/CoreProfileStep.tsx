"use client";

import { useState } from "react";
import { Upload, X } from "lucide-react";
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
    };
    onUpdate: (field: string, value: any) => void;
}

// Get all countries
const countries = Country.getAllCountries();



export function CoreProfileStep({ formData, onUpdate }: CoreProfileStepProps) {
    const [photoPreview, setPhotoPreview] = useState<string | null>(
        formData.profilePhotoUrl || null
    );

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
            {/* Profile Photo */}
            <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-700">
                    Profile Photo <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-6">
                    <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-cyan-400 to-blue-500">
                        {photoPreview ? (
                            <img
                                src={photoPreview}
                                alt="Profile preview"
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center text-white">
                                <Upload className="h-8 w-8" />
                            </div>
                        )}
                    </div>

                    <div className="flex-1">
                        {!photoPreview ? (
                            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700">
                                <Upload className="h-4 w-4" />
                                <span>Upload Photo</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handlePhotoUpload}
                                    className="sr-only"
                                />
                            </label>
                        ) : (
                            <button
                                type="button"
                                onClick={removePhoto}
                                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                            >
                                <X className="h-4 w-4" />
                                <span>Remove Photo</span>
                            </button>
                        )}
                        <p className="mt-2 text-xs text-slate-600">
                            JPG, PNG or GIF. Max size 5MB. Required for registration.
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

            <Input
                label="Password"
                name="password"
                type="password"
                value={formData.password}
                onChange={(e) => onUpdate("password", e.target.value)}
                required
                placeholder="••••••••"
                hint="Must be at least 8 characters"
            />

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Phone Number <span className="text-red-500">*</span>
                </label>
                <PhoneInput
                    placeholder="Enter phone number"
                    value={formData.phone}
                    onChange={(value) => onUpdate("phone", value)}
                    defaultCountry="NG"
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <p className="mt-1 text-xs text-slate-600">
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
                label="How did you hear about SwimBuddz?"
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
        </div>
    );
}
