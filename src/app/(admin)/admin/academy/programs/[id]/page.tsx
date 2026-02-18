"use client";

import { AddMilestoneModal } from "@/components/academy/AddMilestoneModal";
import { Card } from "@/components/ui/Card";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import { useMediaUrls } from "@/hooks/useMediaUrl";
import { AcademyApi, Milestone, Program } from "@/lib/academy";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function ProgramDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [program, setProgram] = useState<Program | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishLoading, setPublishLoading] = useState(false);
  const [isAddMilestoneModalOpen, setIsAddMilestoneModalOpen] = useState(false);
  const milestoneVideoUrls = useMediaUrls(
    milestones.map((milestone) => milestone.video_media_id || null),
  );

  useEffect(() => {
    async function loadData() {
      try {
        const [programData, milestonesData] = await Promise.all([
          AcademyApi.getProgram(id),
          AcademyApi.listMilestones(id),
        ]);
        setProgram(programData);
        setMilestones(milestonesData);
      } catch (error) {
        console.error("Failed to load program details", error);
        toast.error("Failed to load program details");
      } finally {
        setLoading(false);
      }
    }
    if (id) {
      loadData();
    }
  }, [id]);

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this program? This action cannot be undone.",
      )
    )
      return;
    try {
      await AcademyApi.deleteProgram(id);
      toast.success("Program deleted");
      router.push("/admin/academy");
    } catch (error) {
      console.error("Failed to delete program", error);
      toast.error("Failed to delete program");
    }
  };

  const handleTogglePublish = async () => {
    if (!program) return;
    const newPublishedState = !program.is_published;
    const action = newPublishedState ? "publish" : "unpublish";

    if (
      !newPublishedState &&
      !confirm(
        "Unpublishing will hide this program from members and prevent new enrollments. Continue?",
      )
    ) {
      return;
    }

    setPublishLoading(true);
    try {
      const updated = await AcademyApi.updateProgram(id, {
        is_published: newPublishedState,
      });
      setProgram(updated);
      toast.success(
        `Program ${newPublishedState ? "published" : "unpublished"} successfully`,
      );
    } catch (error) {
      console.error(`Failed to ${action} program`, error);
      toast.error(`Failed to ${action} program`);
    } finally {
      setPublishLoading(false);
    }
  };

  if (loading) {
    return <LoadingPage text="Loading program..." />;
  }

  if (!program) {
    return <div className="p-6">Program not found</div>;
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <button
              onClick={() => router.push("/admin/academy")}
              className="hover:text-slate-900"
            >
              Academy
            </button>
            <span>/</span>
            <span>Programs</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">{program.name}</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleTogglePublish}
            disabled={publishLoading}
            className={`rounded px-4 py-2 text-sm font-medium border ${
              program.is_published
                ? "bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100"
                : "bg-green-50 text-green-700 border-green-300 hover:bg-green-100"
            } disabled:opacity-50`}
          >
            {publishLoading
              ? "Loading..."
              : program.is_published
                ? "Unpublish"
                : "Publish"}
          </button>
          <button
            onClick={() => router.push(`/admin/academy/programs/${id}/edit`)}
            className="rounded bg-white px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 hover:bg-slate-50"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Info */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Details
            </h2>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-slate-500">Level</dt>
                <dd className="mt-1 text-sm text-slate-900 uppercase">
                  {program.level}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">Duration</dt>
                <dd className="mt-1 text-sm text-slate-900">
                  {program.duration_weeks} weeks
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">Price</dt>
                <dd className="mt-1 text-sm text-slate-900">
                  {program.currency}{" "}
                  {(program.price_amount || 0).toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">Capacity</dt>
                <dd className="mt-1 text-sm text-slate-900">
                  {program.default_capacity} students
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-slate-500">
                  Description
                </dt>
                <dd className="mt-1 text-sm text-slate-900">
                  {program.description || "No description provided."}
                </dd>
              </div>
            </dl>
          </Card>

          {/* Curriculum Section - Improved */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Curriculum
              </h2>
              <button
                onClick={() =>
                  router.push(`/admin/academy/programs/${id}/curriculum`)
                }
                className="text-sm text-cyan-600 hover:text-cyan-700 font-medium"
              >
                Manage Curriculum →
              </button>
            </div>
            {!program.curriculum_json ||
            !program.curriculum_json.weeks ||
            program.curriculum_json.weeks.length === 0 ? (
              <p className="text-sm text-slate-500">
                No curriculum defined yet.
              </p>
            ) : (
              <div className="space-y-4">
                {program.curriculum_json.weeks.map(
                  (week: any, index: number) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-slate-900">
                          Week {week.week}
                        </h3>
                        {week.theme && (
                          <span className="text-sm text-cyan-600 font-medium">
                            {week.theme}
                          </span>
                        )}
                      </div>
                      {week.objectives && (
                        <p className="text-sm text-slate-600 mb-3">
                          <span className="font-medium">Objectives:</span>{" "}
                          {week.objectives}
                        </p>
                      )}
                      {week.lessons && week.lessons.length > 0 && (
                        <div className="space-y-2">
                          {week.lessons.map(
                            (lesson: any, lessonIdx: number) => (
                              <div
                                key={lessonIdx}
                                className="bg-slate-50 rounded-lg p-3"
                              >
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-medium text-slate-900">
                                    {lesson.title}
                                  </p>
                                  <span className="text-xs text-slate-500">
                                    {lesson.duration_minutes} min
                                  </span>
                                </div>
                                {lesson.description && (
                                  <p className="text-xs text-slate-600 mt-1">
                                    {lesson.description}
                                  </p>
                                )}
                                {lesson.video_url && (
                                  <a
                                    href={lesson.video_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-cyan-600 hover:underline mt-1 inline-block"
                                  >
                                    📹 Video
                                  </a>
                                )}
                              </div>
                            ),
                          )}
                        </div>
                      )}
                    </div>
                  ),
                )}
              </div>
            )}
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Milestones
              </h2>
              <button
                onClick={() => setIsAddMilestoneModalOpen(true)}
                className="text-sm text-cyan-600 hover:text-cyan-700 font-medium"
              >
                + Add Milestone
              </button>
            </div>
            {milestones.length === 0 ? (
              <p className="text-slate-500 text-sm">
                No milestones defined for this program.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {milestones.map((milestone) => {
                  const videoUrl = milestone.video_media_id
                    ? milestoneVideoUrls.get(milestone.video_media_id)
                    : null;
                  return (
                    <li key={milestone.id} className="py-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-900">
                          {milestone.name}
                        </p>
                        <span className="text-xs text-slate-500 capitalize">
                          {milestone.milestone_type}
                        </span>
                      </div>
                      {milestone.criteria && (
                        <p className="text-xs text-slate-600 mt-1">
                          {milestone.criteria}
                        </p>
                      )}
                      {videoUrl && (
                        <a
                          href={videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-cyan-600 hover:underline mt-1 inline-block"
                        >
                          📹 Demo Video
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        {/* Sidebar / Stats */}
        <div className="space-y-6">
          <Card>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Quick Stats
            </h2>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm text-slate-500">Status</dt>
                <dd className="text-sm font-medium">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs ${
                      program.is_published
                        ? "bg-green-100 text-green-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {program.is_published ? "Published" : "Draft"}
                  </span>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-slate-500">Weeks</dt>
                <dd className="text-sm font-medium text-slate-900">
                  {program.duration_weeks}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-slate-500">Lessons</dt>
                <dd className="text-sm font-medium text-slate-900">
                  {program.curriculum_json?.weeks?.reduce(
                    (acc: number, w: any) => acc + (w.lessons?.length || 0),
                    0,
                  ) || 0}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-slate-500">Milestones</dt>
                <dd className="text-sm font-medium text-slate-900">
                  {milestones.length}
                </dd>
              </div>
            </dl>
          </Card>

          {program.prep_materials && (
            <Card>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                Prep Materials
              </h2>
              <div className="text-sm text-slate-600 space-y-6">
                {program.prep_materials &&
                typeof program.prep_materials === "object" ? (
                  <>
                    {program.prep_materials.safety_briefing && (
                      <div>
                        <h3 className="font-medium text-slate-900 mb-2">
                          ⚠️ Safety Briefing
                        </h3>
                        <p className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-900">
                          {program.prep_materials.safety_briefing}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {program.prep_materials.required_equipment &&
                        Array.isArray(
                          program.prep_materials.required_equipment,
                        ) && (
                          <div>
                            <h3 className="font-medium text-slate-900 mb-2">
                              Required Equipment
                            </h3>
                            <ul className="list-disc pl-5 space-y-1">
                              {program.prep_materials.required_equipment.map(
                                (item: string, idx: number) => (
                                  <li key={idx}>{item}</li>
                                ),
                              )}
                            </ul>
                          </div>
                        )}

                      {program.prep_materials.optional_equipment &&
                        Array.isArray(
                          program.prep_materials.optional_equipment,
                        ) && (
                          <div>
                            <h3 className="font-medium text-slate-900 mb-2">
                              Optional / Recommended
                            </h3>
                            <ul className="list-disc pl-5 space-y-1 text-slate-500">
                              {program.prep_materials.optional_equipment.map(
                                (item: string, idx: number) => (
                                  <li key={idx}>{item}</li>
                                ),
                              )}
                            </ul>
                          </div>
                        )}
                    </div>

                    {program.prep_materials.pre_program_reading &&
                      Array.isArray(
                        program.prep_materials.pre_program_reading,
                      ) && (
                        <div>
                          <h3 className="font-medium text-slate-900 mb-2">
                            Pre-program Reading
                          </h3>
                          <div className="space-y-3">
                            {program.prep_materials.pre_program_reading.map(
                              (item: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="bg-slate-50 p-3 rounded-lg border border-slate-100"
                                >
                                  <p className="font-medium text-slate-900">
                                    {typeof item === "string"
                                      ? item
                                      : item.title}
                                  </p>
                                  {typeof item !== "string" && (
                                    <>
                                      {item.description && (
                                        <p className="text-slate-600 mt-1">
                                          {item.description}
                                        </p>
                                      )}
                                      {item.url && (
                                        <a
                                          href={item.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-xs text-cyan-600 hover:underline mt-2 inline-block"
                                        >
                                          Read Article →
                                        </a>
                                      )}
                                    </>
                                  )}
                                </div>
                              ),
                            )}
                          </div>
                        </div>
                      )}

                    {/* Fallback for completely unrecognizable structures */}
                    {!program.prep_materials.required_equipment &&
                      !program.prep_materials.pre_program_reading &&
                      !program.prep_materials.safety_briefing &&
                      !program.prep_materials.optional_equipment && (
                        <pre className="whitespace-pre-wrap font-sans text-sm text-slate-600 bg-slate-50 p-2 rounded">
                          {JSON.stringify(program.prep_materials, null, 2)}
                        </pre>
                      )}
                  </>
                ) : (
                  <p>{String(program.prep_materials)}</p>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>

      {program && (
        <AddMilestoneModal
          isOpen={isAddMilestoneModalOpen}
          onClose={() => setIsAddMilestoneModalOpen(false)}
          onSuccess={(newMilestone) => {
            setMilestones([...milestones, newMilestone]);
            toast.success("Milestone added successfully");
          }}
          programId={program.id}
        />
      )}
    </div>
  );
}
