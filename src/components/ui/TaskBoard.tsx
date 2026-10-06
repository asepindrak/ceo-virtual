'use client';

import React, { useState } from 'react';
import { TaskTicket, Agent, TaskType } from '@/types/office';
import { X, Plus, CheckCircle, Code, FileText, ShieldAlert, Sparkles, User, Folder, ExternalLink } from 'lucide-react';
import confetti from 'canvas-confetti';

interface TaskBoardProps {
  tasks: TaskTicket[];
  agents: Agent[];
  onClose: () => void;
  onAddTask: (newTask: Omit<TaskTicket, 'id' | 'createdAt' | 'progress' | 'artifacts' | 'logs'>) => void;
  onAssignTask: (taskId: string, agentId: string) => void;
}

export const TaskBoard: React.FC<TaskBoardProps> = ({
  tasks,
  agents,
  onClose,
  onAddTask,
  onAssignTask,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [taskType, setTaskType] = useState<TaskType>('coding');
  const [assignedAgentId, setAssignedAgentId] = useState<string>(agents[0]?.id || '');
  const [selectedArtifact, setSelectedArtifact] = useState<{ title: string; content: string } | null>(null);

  const handleOpenExplorer = async (targetPath?: string) => {
    try {
      await fetch('/api/workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'open_folder', targetPath }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const assigned = agents.find((a) => a.id === assignedAgentId);
    onAddTask({
      title,
      description,
      type: taskType,
      departmentId: assigned?.departmentId || agents[0]?.departmentId || 'dept-eng',
      assignedAgentId: assignedAgentId || undefined,
      status: assignedAgentId ? 'in_progress' : 'backlog',
    });

    setTitle('');
    setDescription('');
    setIsAdding(false);
  };

  const backlogTasks = tasks.filter((t) => t.status === 'backlog');
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress');
  const doneTasks = tasks.filter((t) => t.status === 'done');

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-slate-900/95 backdrop-blur-2xl border-l border-slate-800 shadow-2xl z-50 flex flex-col text-slate-100 animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <Code className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Office Kanban & Sprint Board</h2>
            <p className="text-xs text-slate-400">Autonomous workflow orchestration and task outputs</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenExplorer()}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors border border-slate-700"
            title="Buka Folder Proyek (~/.realagent/workspaces) di Windows Explorer"
          >
            <Folder className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Folder Proyek</span>
          </button>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-lg shadow-cyan-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>New Task</span>
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* New Task Form Modal / Accordion */}
      {isAdding && (
        <form onSubmit={handleCreate} className="p-4 bg-slate-950/90 border-b border-slate-800 space-y-3 text-xs">
          <div className="font-semibold text-slate-200 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            Create Work Order for Office Agents
          </div>
          <div>
            <label className="block text-slate-400 mb-1">Task Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Implement OAuth2 Login Flow or Write Product Review"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1">Task Description</label>
            <textarea
              rows={2}
              placeholder="Provide context and requirements..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">Type</label>
              <select
                value={taskType}
                onChange={(e) => setTaskType(e.target.value as TaskType)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
              >
                <option value="coding">💻 Coding & Architecture</option>
                <option value="content">✍️ Content & Copywriting</option>
                <option value="qa">🛡️ Quality & Testing</option>
                <option value="design">🎨 UI/UX Design</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Assignee</label>
              <select
                value={assignedAgentId}
                onChange={(e) => setAssignedAgentId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
              >
                <option value="">(Unassigned - Backlog)</option>
                {agents.map((ag) => (
                  <option key={ag.id} value={ag.id}>
                    {ag.name} ({ag.roleTitle.split(' ')[0]})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg transition-colors"
            >
              Dispatch Ticket
            </button>
          </div>
        </form>
      )}

      {/* Artifact Viewer Drawer Modal if clicked */}
      {selectedArtifact && (
        <div className="p-4 bg-slate-950 border-b border-cyan-500/30 text-xs">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <span className="font-mono text-cyan-300 font-semibold">{selectedArtifact.title}</span>
            <button onClick={() => setSelectedArtifact(null)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <pre className="p-3 bg-slate-900 rounded-lg text-slate-200 font-mono text-[11px] overflow-x-auto max-h-48 whitespace-pre-wrap">
            {selectedArtifact.content}
          </pre>
        </div>
      )}

      {/* Kanban Board Columns */}
      <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Column 1: Backlog */}
        <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80 flex flex-col">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs font-semibold text-slate-400">
            <span>Backlog</span>
            <span className="px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px]">
              {backlogTasks.length}
            </span>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto">
            {backlogTasks.map((task) => (
              <div
                key={task.id}
                className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 text-xs space-y-2 shadow-sm"
              >
                <div className="font-medium text-slate-200">{task.title}</div>
                <p className="text-[11px] text-slate-400 line-clamp-2">{task.description}</p>
                <div className="flex items-center justify-between pt-1">
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 uppercase">
                    {task.type}
                  </span>
                  <select
                    onChange={(e) => {
                      if (e.target.value) onAssignTask(task.id, e.target.value);
                    }}
                    defaultValue=""
                    className="text-[10px] bg-slate-950 border border-slate-700 text-cyan-300 rounded px-1.5 py-0.5 focus:outline-none"
                  >
                    <option value="" disabled>
                      Assign to...
                    </option>
                    {agents.map((ag) => (
                      <option key={ag.id} value={ag.id}>
                        {ag.name.split(' ')[0]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
            {backlogTasks.length === 0 && (
              <div className="text-center py-6 text-slate-600 text-xs italic">No backlog tickets</div>
            )}
          </div>
        </div>

        {/* Column 2: In Progress */}
        <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80 flex flex-col">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs font-semibold text-cyan-400">
            <span>In Progress</span>
            <span className="px-1.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 text-[10px]">
              {inProgressTasks.length}
            </span>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto">
            {inProgressTasks.map((task) => {
              const assigned = agents.find((a) => a.id === task.assignedAgentId);
              return (
                <div
                  key={task.id}
                  className="p-3 bg-slate-900/90 rounded-lg border border-cyan-500/30 text-xs space-y-2 shadow-md relative overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-1">
                    <span className="font-medium text-slate-100">{task.title}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-cyan-300">
                    <User className="w-3 h-3" />
                    <span>{assigned?.name || 'Assigned'}</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>{Math.round(task.progress)}% executed</span>
                    {task.artifacts.length > 0 && (
                      <button
                        onClick={() =>
                          setSelectedArtifact({
                            title: task.artifacts[0].fileName,
                            content: task.artifacts[0].content,
                          })
                        }
                        className="text-cyan-400 hover:underline"
                      >
                        View code ({task.artifacts.length})
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {inProgressTasks.length === 0 && (
              <div className="text-center py-6 text-slate-600 text-xs italic">All agents are resting</div>
            )}
          </div>
        </div>

        {/* Column 3: Completed */}
        <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80 flex flex-col">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs font-semibold text-emerald-400">
            <span>Completed</span>
            <span className="px-1.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px]">
              {doneTasks.length}
            </span>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto">
            {doneTasks.map((task) => (
              <div
                key={task.id}
                className="p-3 bg-slate-900/90 rounded-lg border border-emerald-500/20 text-xs space-y-2"
              >
                <div className="flex items-center gap-1.5 text-emerald-300 font-medium">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{task.title}</span>
                </div>
                <p className="text-[11px] text-slate-400">{task.description}</p>
                {task.artifacts.length > 0 && (
                  <button
                    onClick={() =>
                      setSelectedArtifact({
                        title: task.artifacts[0].fileName,
                        content: task.artifacts[0].content,
                      })
                    }
                    className="text-[10px] text-emerald-400 hover:underline block"
                  >
                    📄 View Output Artifact
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Artifact Preview Modal */}
      {selectedArtifact && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-sm text-white">{selectedArtifact.title}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenExplorer()}
                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-lg flex items-center gap-1 shadow-sm"
                  title="Buka Folder Proyek di Windows Explorer"
                >
                  <Folder className="w-3.5 h-3.5" />
                  <span>Buka di Explorer</span>
                </button>
                <button
                  onClick={() => setSelectedArtifact(null)}
                  className="p-1 text-slate-400 hover:text-white rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-4 overflow-auto bg-slate-950 font-mono text-xs text-slate-300 flex-1">
              <pre className="whitespace-pre-wrap leading-relaxed">{selectedArtifact.content}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
