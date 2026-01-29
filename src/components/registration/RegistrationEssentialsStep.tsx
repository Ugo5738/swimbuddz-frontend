"use client";

import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Country, State } from "country-state-city";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";

interface RegistrationEssentialsStepProps {
    mode?: "registration" | "onboarding";
    includeSwimLevel?: boolean;
    formData: {
        firstName: string;
        lastName: string;
        email?: string;
        password?: string;
        phone: string;
        city: string;
        state: string;
        country: string;
        swimLevel?: string;
    };
    onUpdate: (field: string, value: any) => void;
}

const countries = Country.getAllCountries();

export function RegistrationEssentialsStep({
    mode = "registration",
    includeSwimLevel = true,
    formData,
    onUpdate,
}: RegistrationEssentialsStepProps) {
    const [showPassword, setShowPassword] = useState(false);

    const selectedCountry =
        countries.find((c) => c.name === formData.country) ||
        countries.find((c) => c.isoCode === formData.country);
    const states = selectedCountry ? State.getStatesOfCountry(selectedCountry.isoCode) || [] : [];
    const selectedState =
        states.find((s) => s.name === formData.state) ||
        states.find((s) => s.isoCode === formData.state);

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <h3 className="text-lg font-semibold text-slate-900">
                    {mode === "registration" ? "Account essentials" : "Community basics"}
                </h3>
                <p className="text-sm text-slate-600">
                    {mode === "registration"
                        ? "Just a few details to create your account. You can complete the rest later from your dashboard."
                        : "Confirm your basic details. You can complete the rest later from your profile."}
                </p>
            </div>

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

            {mode === "registration" ? (
                <Input
                    label="Email Address"
                    name="email"
                    type="email"
                    value={formData.email || ""}
                    onChange={(e) => onUpdate("email", e.target.value)}
                    required
                    placeholder="john.doe@example.com"
                />
            ) : null}

            {mode === "registration" ? (
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
                            onClick={() => setShowPassword((prev) => !prev)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                    </div>
                    <p className="text-xs text-slate-500">Must be at least 8 characters</p>
                </div>
            ) : null}

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
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Select
                    label="Country"
                    name="country"
                    value={formData.country}
                    onChange={(e) => {
                        onUpdate("country", e.target.value);
                        onUpdate("state", "");
                        onUpdate("city", "");
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

                {states.length > 0 ? (
                    <Select
                        label="State"
                        name="state"
                        value={formData.state}
                        onChange={(e) => {
                            onUpdate("state", e.target.value);
                            onUpdate("city", "");
                        }}
                        required
                        disabled={!selectedCountry}
                    >
                        <option value="">
                            {selectedCountry ? "Select state" : "Select a country first"}
                        </option>
                        {states.map((state) => (
                            <option key={state.isoCode} value={state.name}>
                                {state.name}
                            </option>
                        ))}
                    </Select>
                ) : (
                    <Input
                        label="State / Region"
                        name="state"
                        value={formData.state}
                        onChange={(e) => onUpdate("state", e.target.value)}
                        required
                        disabled={!selectedCountry}
                        placeholder={selectedCountry ? "Enter state or region" : "Select a country first"}
                    />
                )}

                <Input
                    label="City / Area"
                    name="city"
                    value={formData.city}
                    onChange={(e) => onUpdate("city", e.target.value)}
                    required
                    disabled={!selectedCountry || (states.length > 0 && !selectedState)}
                    placeholder={
                        !selectedCountry
                            ? "Select a country first"
                            : states.length > 0 && !selectedState
                                ? "Select a state first"
                                : "Enter your city or area"
                    }
                />
            </div>

            {includeSwimLevel ? (
                <Select
                    label="Swimming Level"
                    name="swimLevel"
                    value={formData.swimLevel || ""}
                    onChange={(e) => onUpdate("swimLevel", e.target.value)}
                    required
                    hint="Be honest — this helps us personalize your experience."
                >
                    <option value="">Select level</option>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                </Select>
            ) : null}
        </div>
    );
}
