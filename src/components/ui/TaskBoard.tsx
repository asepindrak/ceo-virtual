'use client';

import React, { useState } from 'react';
import { TaskTicket, Agent, TaskType, TaskStatus } from '@/types/office';
import {
  X,
  Plus,
  CheckCircle,
  Code,
  FileText,
  ShieldAlert,
  Sparkles,
  User,
  Folder,
  ExternalLink,
  Pencil,
  Trash2,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface TaskBoardProps {
  tasks: TaskTicket[];
  agents: Agent[];
  onClose: () => void;
  onAddTask: (newTask: Omit<TaskTicket, 'id' | 'createdAt' | 'progress' | 'artifacts' | 'logs'>) => void;
  onAssignTask: (taskId: string, agentId: string) => void;
  onDeleteTask?: (taskId: string) => void;
  onEditTask?: (updatedTask: TaskTicket) => void;
}

export const TaskBoard: React.FC<TaskBoardProps> = ({
  tasks,
  agents,
  onClose,
  onAddTask,
  onAssignTask,
  onDeleteTask,
  onEditTask,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskTicket | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [taskType, setTaskType] = useState<TaskType>('coding');
  const [assignedAgentId, setAssignedAgentId] = useState<string>(agents[0]?.id || '');
  const [selectedArtifact, setSelectedArtifact] = useState<{ title: string; content: string } | null>(null);

  // Project management state
  const uniqueProjects = Array.from(
    new Set(tasks.map((t) => t.projectName).filter(Boolean))
  ) as string[];
  const defaultProjects = uniqueProjects.length > 0 ? uniqueProjects : ['ShadowMove Landing Page'];

  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>('all');
  const [taskProjectName, setTaskProjectName] = useState<string>(defaultProjects[0]);
  const [customProjectInput, setCustomProjectInput] = useState('');
  const [isNewProjectMode, setIsNewProjectMode] = useState(false);

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

    const finalProjectName = isNewProjectMode
      ? customProjectInput.trim() || 'ShadowMove Landing Page'
      : taskProjectName;

    const assigned = agents.find((a) => a.id === assignedAgentId);
    onAddTask({
      title,
      projectName: finalProjectName,
      description,
      type: taskType,
      departmentId: assigned?.departmentId || agents[0]?.departmentId || 'dept-eng',
      assignedAgentId: assignedAgentId || undefined,
      status: assignedAgentId ? 'in_progress' : 'backlog',
    });

    setTitle('');
    setDescription('');
    setCustomProjectInput('');
    setIsNewProjectMode(false);
    setIsAdding(false);
  };

  const filteredTasks =
    selectedProjectFilter === 'all'
      ? tasks
      : tasks.filter((t) => t.projectName === selectedProjectFilter);

  const backlogTasks = filteredTasks.filter((t) => t.status === 'backlog');
  const inProgressTasks = filteredTasks.filter((t) => t.status === 'in_progress');
  const doneTasks = filteredTasks.filter((t) => t.status === 'done');

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-[#faf5eb] border-l-2 border-[#d6c5ad] shadow-2xl z-50 flex flex-col overflow-hidden text-[#2c231c] animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="p-4 border-b border-[#d6c5ad] bg-[#f4ebe1] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-[#fdeed9] text-[#c85a2b] border border-[#e8ba8c]">
            <Code className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#2c231c]">Office Kanban & Sprint Board</h2>
            <p className="text-xs text-[#786653]">Autonomous workflow orchestration and task outputs</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenExplorer()}
            className="px-2.5 py-1.5 bg-[#fffdf9] hover:bg-[#ede2d1] text-[#2c231c] text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors border border-[#d6c5ad]"
            title="Buka Folder Proyek (~/.vigent/workspaces) di Windows Explorer"
          >
            <Folder className="w-3.5 h-3.5 text-[#c85a2b]" />
            <span className="hidden sm:inline">Folder Proyek</span>
          </button>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="px-3 py-1.5 bg-[#c85a2b] hover:bg-[#b54d22] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Task</span>
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-[#786653] hover:text-[#2c231c] hover:bg-[#ede2d1] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Project Filter Navigation Bar */}
      <div className="px-4 py-2 bg-[#f4ebe1] border-b border-[#d6c5ad] flex items-center gap-1.5 overflow-x-auto text-xs no-scrollbar">
        <span className="text-[11px] font-bold text-[#786653] uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
          <Folder className="w-3.5 h-3.5 text-[#c85a2b]" />
          Project:
        </span>
        <button
          onClick={() => setSelectedProjectFilter('all')}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition-colors ${
            selectedProjectFilter === 'all'
              ? 'bg-[#c85a2b] text-white shadow-xs'
              : 'bg-[#fffdf9] text-[#6e5a48] border border-[#d6c5ad] hover:bg-[#ede2d1]'
          }`}
        >
          Semua ({tasks.length})
        </button>
        {defaultProjects.map((proj) => {
          const count = tasks.filter((t) => t.projectName === proj).length;
          return (
            <button
              key={proj}
              onClick={() => setSelectedProjectFilter(proj)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition-colors flex items-center gap-1.5 ${
                selectedProjectFilter === proj
                  ? 'bg-[#c85a2b] text-white shadow-xs'
                  : 'bg-[#fffdf9] text-[#6e5a48] border border-[#d6c5ad] hover:bg-[#ede2d1]'
              }`}
            >
              <span>{proj}</span>
              <span
                className={`text-[10px] px-1 rounded-full ${
                  selectedProjectFilter === proj ? 'bg-white/20 text-white' : 'bg-[#ede2d1] text-[#4d3c2e]'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Scrollable Main Body (Form & Kanban Columns Scroll Smoothly) */}
      <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
        {/* New Task Form Modal / Accordion */}
        {isAdding && (
          <form onSubmit={handleCreate} className="p-4 bg-[#fffdf9] border-b-2 border-[#c85a2b]/30 space-y-3 text-xs shrink-0 shadow-sm animate-in slide-in-from-top-2">
            <div className="font-semibold text-[#2c231c] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#c85a2b]" />
              Create Work Order for Office Agents
            </div>

            {/* Project Selection / Creation */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[#615042] font-medium">Target Project</label>
                <button
                  type="button"
                  onClick={() => setIsNewProjectMode(!isNewProjectMode)}
                  className="text-[10px] text-[#c85a2b] font-bold hover:underline"
                >
                  {isNewProjectMode ? '← Pilih Project Yang Ada' : '+ Buat Project Baru'}
                </button>
              </div>
              {isNewProjectMode ? (
                <input
                  type="text"
                  required
                  placeholder="Nama project baru (misal: API Gateway Microservice)"
                  value={customProjectInput}
                  onChange={(e) => setCustomProjectInput(e.target.value)}
                  className="w-full bg-[#fbf7ee] border border-[#d6c5ad] rounded-lg px-3 py-2 text-[#2c231c] placeholder-[#9c8976] focus:outline-none focus:border-[#c85a2b]"
                />
              ) : (
                <select
                  value={taskProjectName}
                  onChange={(e) => setTaskProjectName(e.target.value)}
                  className="w-full bg-[#fbf7ee] border border-[#d6c5ad] rounded-lg px-2.5 py-2 text-[#2c231c] focus:outline-none focus:border-[#c85a2b]"
                >
                  {defaultProjects.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-[#615042] mb-1 font-medium">Task Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Implement OAuth2 Login Flow or Write Product Review"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-[#fbf7ee] border border-[#d6c5ad] rounded-lg px-3 py-2 text-[#2c231c] placeholder-[#9c8976] focus:outline-none focus:border-[#c85a2b]"
              />
            </div>
            <div>
              <label className="block text-[#615042] mb-1 font-medium">Task Description</label>
              <textarea
                rows={2}
                placeholder="Provide context and requirements..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-[#fbf7ee] border border-[#d6c5ad] rounded-lg px-3 py-2 text-[#2c231c] placeholder-[#9c8976] focus:outline-none focus:border-[#c85a2b]"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[#615042] mb-1 font-medium">Type</label>
                <select
                  value={taskType}
                  onChange={(e) => setTaskType(e.target.value as TaskType)}
                  className="w-full bg-[#fbf7ee] border border-[#d6c5ad] rounded-lg px-2.5 py-2 text-[#2c231c] focus:outline-none focus:border-[#c85a2b]"
                >
                  <option value="coding">💻 Coding & Architecture</option>
                  <option value="content">✍️ Content & Copywriting</option>
                  <option value="qa">🛡️ Quality & Testing</option>
                  <option value="design">🎨 UI/UX Design</option>
                </select>
              </div>
              <div>
                <label className="block text-[#615042] mb-1 font-medium">Assignee</label>
                <select
                  value={assignedAgentId}
                  onChange={(e) => setAssignedAgentId(e.target.value)}
                  className="w-full bg-[#fbf7ee] border border-[#d6c5ad] rounded-lg px-2.5 py-2 text-[#2c231c] focus:outline-none focus:border-[#c85a2b]"
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
                className="px-3 py-1.5 text-[#615042] hover:text-[#2c231c] hover:bg-[#ede2d1] rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-[#c85a2b] hover:bg-[#b54d22] text-white font-medium rounded-lg transition-colors shadow-sm"
              >
                Dispatch Ticket
              </button>
            </div>
          </form>
        )}

        {/* Artifact Viewer Drawer Modal if clicked */}
        {selectedArtifact && (
          <div className="p-4 bg-[#f4ebe1] border-b border-[#d6c5ad] text-xs shrink-0">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#d6c5ad]">
              <span className="font-mono text-[#c85a2b] font-bold">{selectedArtifact.title}</span>
              <button onClick={() => setSelectedArtifact(null)} className="text-[#615042] hover:text-[#2c231c]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <pre className="p-3 bg-[#fffdf9] border border-[#d6c5ad] rounded-lg text-[#2c231c] font-mono text-[11px] overflow-x-auto max-h-48 whitespace-pre-wrap">
              {selectedArtifact.content}
            </pre>
          </div>
        )}

        {/* Kanban Board Columns */}
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Column 1: Backlog */}
        <div className="bg-[#f4ebe1] rounded-xl p-3 border border-[#d6c5ad] flex flex-col">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#d6c5ad] text-xs font-semibold text-[#615042]">
            <span>Backlog</span>
            <span className="px-1.5 py-0.5 rounded-full bg-[#ebdcc9] text-[#4d3c2e] text-[10px] font-bold">
              {backlogTasks.length}
            </span>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto">
            {backlogTasks.map((task) => (
              <div
                key={task.id}
                className="p-3 bg-[#fffdf9] rounded-lg border border-[#d6c5ad] text-xs space-y-2 shadow-xs group/card relative"
              >
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 text-[10px] text-[#1f6860] bg-[#e6f4f2] px-2 py-0.5 rounded font-mono font-medium border border-[#a2d8d0] truncate max-w-[140px]">
                    <Folder className="w-2.5 h-2.5 shrink-0" />
                    <span className="truncate">{task.projectName || 'General Project'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingTask(task)}
                      className="p-1 text-[#786653] hover:text-[#2c231c] hover:bg-[#ede2d1] rounded transition-colors"
                      title="Edit Task"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    {onDeleteTask && (
                      <button
                        onClick={() => {
                          if (confirm(`Hapus task "${task.title}"?`)) {
                            onDeleteTask(task.id);
                          }
                        }}
                        className="p-1 text-rose-500/80 hover:text-rose-600 hover:bg-rose-100 rounded transition-colors"
                        title="Hapus Task"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="font-semibold text-[#2c231c]">{task.title}</div>
                <p className="text-[11px] text-[#615042] line-clamp-2">{task.description}</p>
                <div className="flex items-center justify-between pt-1">
                  <span className="px-2 py-0.5 rounded bg-[#f0e3ce] text-[10px] text-[#784620] uppercase font-bold">
                    {task.type}
                  </span>
                  <select
                    onChange={(e) => {
                      if (e.target.value) onAssignTask(task.id, e.target.value);
                    }}
                    defaultValue=""
                    className="text-[10px] bg-[#fbf7ee] border border-[#d6c5ad] text-[#c85a2b] font-medium rounded px-1.5 py-0.5 focus:outline-none"
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
              <div className="text-center py-6 text-[#9c8976] text-xs italic">No backlog tickets</div>
            )}
          </div>
        </div>

        {/* Column 2: In Progress */}
        <div className="bg-[#f4ebe1] rounded-xl p-3 border border-[#d6c5ad] flex flex-col">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#d6c5ad] text-xs font-semibold text-[#c85a2b]">
            <span>In Progress</span>
            <span className="px-1.5 py-0.5 rounded-full bg-[#fdeed9] text-[#c85a2b] border border-[#f0c8a5] text-[10px] font-bold">
              {inProgressTasks.length}
            </span>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto">
            {inProgressTasks.map((task) => {
              const assigned = agents.find((a) => a.id === task.assignedAgentId);
              return (
                <div
                  key={task.id}
                  className="p-3 bg-[#fffdf9] rounded-lg border-2 border-[#e8ba8c] text-xs space-y-2 shadow-sm relative overflow-hidden group/card"
                >
                  <div className="flex items-start justify-between gap-1">
                    <span className="font-semibold text-[#2c231c] leading-tight flex-1">{task.title}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setEditingTask(task)}
                        className="p-1 text-[#786653] hover:text-[#2c231c] hover:bg-[#ede2d1] rounded transition-colors"
                        title="Edit Task"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      {onDeleteTask && (
                        <button
                          onClick={() => {
                            if (confirm(`Hapus task "${task.title}"?`)) {
                              onDeleteTask(task.id);
                            }
                          }}
                          className="p-1 text-rose-500/80 hover:text-rose-600 hover:bg-rose-100 rounded transition-colors"
                          title="Hapus Task"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px] text-[#1f6860] bg-[#e6f4f2] px-2 py-0.5 rounded font-mono font-medium border border-[#a2d8d0] w-fit">
                    <Folder className="w-2.5 h-2.5" />
                    <span>{task.projectName || 'General Project'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-[#c85a2b] font-medium">
                    <User className="w-3 h-3" />
                    <span>{assigned?.name || 'Assigned'}</span>
                  </div>
                  <div className="w-full bg-[#ebdcc9] h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-[#c85a2b] to-[#d97736] h-full rounded-full transition-all duration-300"
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-[#786653]">
                    <span>{Math.round(task.progress)}% executed</span>
                    {task.artifacts.length > 0 && (
                      <button
                        onClick={() =>
                          setSelectedArtifact({
                            title: task.artifacts[0].fileName,
                            content: task.artifacts[0].content,
                          })
                        }
                        className="text-[#c85a2b] font-bold hover:underline"
                      >
                        View code ({task.artifacts.length})
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {inProgressTasks.length === 0 && (
              <div className="text-center py-6 text-[#9c8976] text-xs italic">All agents are resting</div>
            )}
          </div>
        </div>

        {/* Column 3: Completed */}
        <div className="bg-[#f4ebe1] rounded-xl p-3 border border-[#d6c5ad] flex flex-col">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#d6c5ad] text-xs font-semibold text-[#288279]">
            <span>Completed</span>
            <span className="px-1.5 py-0.5 rounded-full bg-[#e6f4f2] text-[#1f6860] border border-[#a2d8d0] text-[10px] font-bold">
              {doneTasks.length}
            </span>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto">
            {doneTasks.map((task) => (
              <div
                key={task.id}
                className="p-3 bg-[#fffdf9] rounded-lg border border-[#a2d8d0] text-xs space-y-2 shadow-xs group/card"
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-1.5 text-[10px] text-[#1f6860] bg-[#e6f4f2] px-2 py-0.5 rounded font-mono font-medium border border-[#a2d8d0] truncate max-w-[140px]">
                    <Folder className="w-2.5 h-2.5 shrink-0" />
                    <span className="truncate">{task.projectName || 'General Project'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingTask(task)}
                      className="p-1 text-[#786653] hover:text-[#2c231c] hover:bg-[#ede2d1] rounded transition-colors"
                      title="Edit Task"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    {onDeleteTask && (
                      <button
                        onClick={() => {
                          if (confirm(`Hapus task "${task.title}"?`)) {
                            onDeleteTask(task.id);
                          }
                        }}
                        className="p-1 text-rose-500/80 hover:text-rose-600 hover:bg-rose-100 rounded transition-colors"
                        title="Hapus Task"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[#288279] font-semibold">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{task.title}</span>
                </div>
                <p className="text-[11px] text-[#615042]">{task.description}</p>
                {task.artifacts.length > 0 && (
                  <button
                    onClick={() =>
                      setSelectedArtifact({
                        title: task.artifacts[0].fileName,
                        content: task.artifacts[0].content,
                      })
                    }
                    className="text-[10px] text-[#288279] font-bold hover:underline block"
                  >
                    📄 View Output Artifact
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      </div>

      {/* Edit Task Modal */}
      {editingTask && (
        <div className="fixed inset-0 bg-[#2c231c]/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#faf5eb] border-2 border-[#d6c5ad] rounded-2xl w-full max-w-lg shadow-2xl p-5 text-[#2c231c] animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#d6c5ad]">
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-[#c85a2b]" />
                <h3 className="font-bold text-sm text-[#2c231c]">Edit Task Ticket</h3>
              </div>
              <button onClick={() => setEditingTask(null)} className="text-[#615042] hover:text-[#2c231c]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (editingTask && onEditTask) {
                  onEditTask(editingTask);
                }
                setEditingTask(null);
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-[#615042] mb-1 font-medium">Judul Task</label>
                <input
                  type="text"
                  required
                  value={editingTask.title}
                  onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                  className="w-full bg-[#fffdf9] border border-[#d6c5ad] rounded-lg px-3 py-2 text-[#2c231c] focus:outline-none focus:border-[#c85a2b]"
                />
              </div>

              <div>
                <label className="block text-[#615042] mb-1 font-medium">Project</label>
                <input
                  type="text"
                  value={editingTask.projectName || ''}
                  onChange={(e) => setEditingTask({ ...editingTask, projectName: e.target.value })}
                  className="w-full bg-[#fffdf9] border border-[#d6c5ad] rounded-lg px-3 py-2 text-[#2c231c] focus:outline-none focus:border-[#c85a2b]"
                />
              </div>

              <div>
                <label className="block text-[#615042] mb-1 font-medium">Deskripsi</label>
                <textarea
                  rows={3}
                  value={editingTask.description || ''}
                  onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                  className="w-full bg-[#fffdf9] border border-[#d6c5ad] rounded-lg px-3 py-2 text-[#2c231c] focus:outline-none focus:border-[#c85a2b]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#615042] mb-1 font-medium">Status</label>
                  <select
                    value={editingTask.status}
                    onChange={(e) => setEditingTask({ ...editingTask, status: e.target.value as TaskStatus })}
                    className="w-full bg-[#fffdf9] border border-[#d6c5ad] rounded-lg px-2.5 py-2 text-[#2c231c] focus:outline-none focus:border-[#c85a2b]"
                  >
                    <option value="backlog">Backlog</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#615042] mb-1 font-medium">Assignee</label>
                  <select
                    value={editingTask.assignedAgentId || ''}
                    onChange={(e) => setEditingTask({ ...editingTask, assignedAgentId: e.target.value || undefined })}
                    className="w-full bg-[#fffdf9] border border-[#d6c5ad] rounded-lg px-2.5 py-2 text-[#2c231c] focus:outline-none focus:border-[#c85a2b]"
                  >
                    <option value="">(Unassigned)</option>
                    {agents.map((ag) => (
                      <option key={ag.id} value={ag.id}>
                        {ag.name} ({ag.roleTitle.split(' ')[0]})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-[#d6c5ad]">
                {onDeleteTask ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Hapus task "${editingTask.title}"?`)) {
                        onDeleteTask(editingTask.id);
                        setEditingTask(null);
                      }
                    }}
                    className="px-3 py-1.5 text-rose-600 hover:bg-rose-100 rounded-lg font-medium transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>
                ) : <div />}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingTask(null)}
                    className="px-3 py-1.5 text-[#615042] hover:bg-[#ede2d1] rounded-lg font-medium transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-[#c85a2b] hover:bg-[#b54d22] text-white rounded-lg font-medium transition-colors shadow-sm"
                  >
                    Simpan Perubahan
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Artifact Preview Modal */}
      {selectedArtifact && (
        <div className="fixed inset-0 bg-[#2c231c]/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#fffdf9] border-2 border-[#d6c5ad] rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 text-[#2c231c]">
            <div className="p-4 border-b border-[#d6c5ad] flex items-center justify-between bg-[#f4ebe1]">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#c85a2b]" />
                <h3 className="font-bold text-sm text-[#2c231c]">{selectedArtifact.title}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenExplorer()}
                  className="px-2.5 py-1 bg-[#c85a2b] hover:bg-[#b54d22] text-white text-xs rounded-lg flex items-center gap-1 shadow-sm font-semibold"
                  title="Buka Folder Proyek di Windows Explorer"
                >
                  <Folder className="w-3.5 h-3.5" />
                  <span>Buka di Explorer</span>
                </button>
                <button
                  onClick={() => setSelectedArtifact(null)}
                  className="p-1 text-[#615042] hover:text-[#2c231c] rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-4 overflow-auto bg-[#fbf7ee] font-mono text-xs text-[#2c231c] flex-1">
              <pre className="whitespace-pre-wrap leading-relaxed">{selectedArtifact.content}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
