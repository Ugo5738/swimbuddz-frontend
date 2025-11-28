"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Calendar, Plus, Trash2 } from "lucide-react";

interface Template {
    id: string;
    title: string;
    day_of_week: number;
    start_time: string;
    duration_minutes: number;
    location: string;
    pool_fee: number;
    capacity: number;
    auto_generate: boolean;
    is_active: boolean;
}

interface TemplatesSidebarProps {
    templates: Template[];
    onCreateTemplate: () => void;
    onGenerateSessions: (templateId: string) => void;
    onDeleteTemplate: (templateId: string) => void;
    onEditTemplate: (template: Template) => void;
}

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function TemplatesSidebar({
    templates,
    onCreateTemplate,
    onGenerateSessions,
    onDeleteTemplate,
    onEditTemplate
}: TemplatesSidebarProps) {
    return (
        <Card className="h-full space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                    <Calendar className="h-5 w-5 text-cyan-600" />
                    <span>Templates</span>
                </h3>
                <Button size="sm" onClick={onCreateTemplate}>
                    <Plus className="h-4 w-4" />
                    <span>New</span>
                </Button>
            </div>

            {templates.length === 0 ? (
                <div className="flex h-32 items-center justify-center rounded-lg bg-slate-50">
                    <p className="text-sm text-slate-500">No templates yet</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {templates.map((template) => (
                        <div
                            key={template.id}
                            className="group rounded-lg border border-slate-200 p-3 transition-all hover:border-cyan-300 hover:bg-cyan-50/30"
                        >
                            <div className="mb-2 flex items-start justify-between">
                                <div className="min-w-0 flex-1">
                                    <p className="font-medium text-slate-900 truncate">{template.title}</p>
                                    <p className="text-xs text-slate-500">
                                        {DAY_NAMES[template.day_of_week]}s at {template.start_time}
                                    </p>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => onEditTemplate(template)}
                                        className="text-slate-400 hover:text-cyan-600"
                                        title="Edit template"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                                    </button>
                                    <button
                                        onClick={() => onDeleteTemplate(template.id)}
                                        className="text-slate-400 hover:text-red-600"
                                        title="Delete template"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-slate-600">
                                <span>{template.location}</span>
                                <span>•</span>
                                <span>{template.duration_minutes}min</span>
                                {template.auto_generate && (
                                    <>
                                        <span>•</span>
                                        <span className="text-green-600 font-medium">Auto</span>
                                    </>
                                )}
                            </div>

                            <Button
                                size="sm"
                                variant="secondary"
                                className="mt-2 w-full"
                                onClick={() => onGenerateSessions(template.id)}
                            >
                                Generate Sessions
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );
}
