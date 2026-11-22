"use client";
import { useEffect, useState } from "react";
import { AcademyQuizApi, type QuizTemplate, type QuizAssignmentInput, type QuizQuestion } from "@/lib/academy-quizzes";

export function CohortQuizSetup({ programId, durationWeeks, value, onChange }: {
  programId: string; durationWeeks: number; value: QuizAssignmentInput[]; onChange: (next: QuizAssignmentInput[]) => void;
}) {
  const [templates, setTemplates] = useState<QuizTemplate[]>([]);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [saving, setSaving] = useState(false);
  const load = async () => {
    if (!programId) { setTemplates([]); return; }
    try { setTemplates(await AcademyQuizApi.listTemplates(programId)); setError(""); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not load quizzes"); }
  };
  useEffect(() => { void load(); }, [programId]);

  const create = async () => {
    if (!title.trim() || questions.length === 0) { setError("Enter a title and at least one question."); return; }
    setSaving(true); setError("");
    try {
      await AcademyQuizApi.createTemplate({ program_id:programId, title:title.trim(), description:description.trim() || null, questions });
      setTitle(""); setDescription(""); setQuestions([]); await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save quiz"); }
    finally { setSaving(false); }
  };
  const patch = (index: number, patch: Partial<QuizAssignmentInput>) => onChange(value.map((v,i) => i===index ? {...v,...patch} : v));
  return <section className="space-y-4">
    <header>
      <h2 className="text-xl font-semibold text-slate-900">Weekly knowledge quizzes</h2>
      <p className="text-sm text-slate-600">Choose the quizzes and weeks to assign. Students unlock each quiz at the beginning of its week.</p>
    </header>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {templates.length === 0 && <p className="text-sm text-slate-600">No quizzes yet for this programme. Create one below.</p>}
    <div className="space-y-3">
      {value.map((q,index) => (
        <div key={index} className="grid grid-cols-1 gap-2 rounded-lg border p-3 sm:grid-cols-5">
          <label className="sm:col-span-2 text-xs font-medium">Quiz
            <select className="mt-1 w-full rounded border p-2" value={q.quiz_id} onChange={e=>patch(index,{quiz_id:e.target.value})}>
              {templates.map(t=><option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium">Week
            <select className="mt-1 w-full rounded border p-2" value={q.week_number} onChange={e=>patch(index,{week_number:Number(e.target.value)})}>
              {Array.from({length:durationWeeks},(_,i)=>i+1).map(w=><option key={w} value={w}>Week {w}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium">Pass score
            <input className="mt-1 w-full rounded border p-2" type="number" min="1" max="100" value={q.passing_score} onChange={e=>patch(index,{passing_score:Number(e.target.value)})}/>
          </label>
          <div className="flex items-end gap-2">
            <label className="text-xs">Attempts
              <input type="number" min="1" max="20" className="mt-1 w-16 rounded border p-2" value={q.max_attempts ?? ""} placeholder="∞" onChange={e=>patch(index,{max_attempts:e.target.value?Number(e.target.value):null})}/>
            </label>
            <button type="button" className="text-sm text-red-700" onClick={()=>onChange(value.filter((_,i)=>i!==index))}>Remove</button>
          </div>
          <label className="flex items-center gap-2 text-xs sm:col-span-5">
            <input type="checkbox" checked={q.required} onChange={e=>patch(index,{required:e.target.checked})}/> Required for knowledge completion
          </label>
        </div>
      ))}
    </div>
    <button type="button" disabled={!templates.length} onClick={() => { if (templates.length) onChange([...value,{quiz_id:templates[0].id,week_number:1,passing_score:80,max_attempts:3,required:true}]); }}
      className="rounded border border-teal-700 px-3 py-2 text-sm text-teal-800 disabled:opacity-50">Add quiz to cohort</button>
    <details className="rounded-lg border p-3">
      <summary className="cursor-pointer font-medium">Create reusable quiz template</summary>
      <div className="mt-3 space-y-3">
        <label className="block text-sm">Title<input className="mt-1 w-full rounded border p-2" value={title} onChange={e=>setTitle(e.target.value)}/></label>
        <label className="block text-sm">Description<input className="mt-1 w-full rounded border p-2" value={description} onChange={e=>setDescription(e.target.value)}/></label>
        {questions.map((q,i) => (
          <div className="space-y-2 rounded border p-3" key={q.id}>
            <label className="block text-sm">Question {i+1}<textarea className="mt-1 w-full rounded border p-2" value={q.text} onChange={e=>setQuestions(prev=>prev.map((x,j)=>j===i?{...x,text:e.target.value}:x))}/></label>
            <label className="block text-sm">Type
              <select className="ml-2 rounded border p-1" value={q.kind} onChange={e=>{
                const kind=e.target.value as QuizQuestion["kind"];
                setQuestions(prev=>prev.map((x,j)=>j===i?{...x,kind,correct_option_ids:[x.correct_option_ids[0]]}:x));
              }}>
                <option value="single">Single answer</option><option value="multiple">Multiple answers</option><option value="true_false">True / False</option>
              </select>
            </label>
            {q.options.map((o,k)=><div key={o.id} className="flex items-center gap-2">
              <input aria-label="Correct answer" type={q.kind==="multiple"?"checkbox":"radio"} name={"correct-"+q.id}
                checked={q.correct_option_ids.includes(o.id)} onChange={()=>setQuestions(prev=>prev.map((x,j)=>j===i?{...x,correct_option_ids:q.kind==="multiple"?(x.correct_option_ids.includes(o.id)?x.correct_option_ids.filter(id=>id!==o.id):[...x.correct_option_ids,o.id]):[o.id]}:x))}/>
              <input aria-label={"Option "+(k+1)} className="flex-1 rounded border p-2 text-sm" value={o.text} onChange={e=>setQuestions(prev=>prev.map((x,j)=>j===i?{...x,options:x.options.map((v,h)=>h===k?{...v,text:e.target.value}:v)}:x))}/>
            </div>)}
            {q.kind!=="true_false" && q.options.length<8 && <button type="button" className="text-xs text-teal-800" onClick={()=>setQuestions(prev=>prev.map((x,j)=>j===i?{...x,options:[...x.options,{id:"o"+(x.options.length+1),text:""}]}:x))}>Add option</button>}
            <label className="block text-sm">Explanation<textarea className="mt-1 w-full rounded border p-2" value={q.explanation} onChange={e=>setQuestions(prev=>prev.map((x,j)=>j===i?{...x,explanation:e.target.value}:x))}/></label>
            <button type="button" className="text-sm text-red-700" onClick={()=>setQuestions(prev=>prev.filter((_,j)=>j!==i))}>Remove question</button>
          </div>
        ))}
        <button type="button" className="rounded border px-3 py-2 text-sm" onClick={()=>setQuestions(prev=>[...prev,{id:"q"+(prev.length+1),text:"",kind:"single",options:[{id:"o1",text:""},{id:"o2",text:""}],correct_option_ids:["o1"],explanation:""}])}>Add question</button>
        <button type="button" disabled={saving} onClick={()=>void create()} className="ml-2 rounded bg-teal-700 px-3 py-2 text-sm text-white disabled:opacity-50">{saving?"Saving…":"Save quiz template"}</button>
      </div>
    </details>
  </section>;
}
