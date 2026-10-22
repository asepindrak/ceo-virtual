'use client';

import React, { useState, useEffect } from 'react';
import { DevServer } from '@/types/office';
import {
  X,
  ExternalLink,
  Copy,
  Check,
  Globe,
  Radio,
  Plus,
  Trash2,
  RefreshCw,
  Monitor,
  Tablet,
  Smartphone,
  Server,
  Layers,
  Sparkles,
} from 'lucide-react';

interface DevServersModalProps {
  onClose: () => void;
  initialSelectedServerId?: string;
}

export const DevServersModal: React.FC<DevServersModalProps> = ({
  onClose,
  initialSelectedServerId,
}) => {
  const STORAGE_KEY = 'vigent_dev_servers_list';

  const [servers, setServers] = useState<DevServer[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            // Clean out any legacy dummy servers
            const realServers = parsed.filter(
              (s: any) =>
                s &&
                !['srv-shadowmove', 'srv-vigent-app', 'srv-llm-gateway'].includes(s.id) &&
                !s.url?.includes('shadowmove')
            );
            return realServers;
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  const [activePreviewUrl, setActivePreviewUrl] = useState<string | null>(() => {
    if (initialSelectedServerId) {
      const found = servers.find((s) => s.id === initialSelectedServerId);
      return found ? found.url : null;
    }
    return null;
  });
  const [activePreviewTitle, setActivePreviewTitle] = useState<string>(() => {
    if (initialSelectedServerId) {
      const found = servers.find((s) => s.id === initialSelectedServerId);
      return found ? found.projectName : '';
    }
    return '';
  });

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deviceViewport, setDeviceViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [iframeKey, setIframeKey] = useState(0);

  // Add Server Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newPort, setNewPort] = useState('3000');
  const [newUrl, setNewUrl] = useState('http://localhost:3000');
  const [newFramework, setNewFramework] = useState('Vite / React');
  const [newDescription, setNewDescription] = useState('Local development server');

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(servers));
    } catch (e) {
      console.error(e);
    }
  }, [servers]);

  const handleCopyUrl = (server: DevServer) => {
    const fullUrl = server.url.startsWith('http')
      ? server.url
      : `${window.location.origin}${server.url}`;

    navigator.clipboard.writeText(fullUrl);
    setCopiedId(server.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenBrowser = (server: DevServer) => {
    const fullUrl = server.url.startsWith('http')
      ? server.url
      : `${window.location.origin}${server.url}`;

    window.open(fullUrl, '_blank', 'noopener,noreferrer');
  };

  const handlePreviewInApp = (server: DevServer) => {
    const fullUrl = server.url.startsWith('http')
      ? server.url
      : `${window.location.origin}${server.url}`;

    setActivePreviewUrl(fullUrl);
    setActivePreviewTitle(server.projectName);
  };

  const handleAddServer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim() || !newUrl.trim()) return;

    const newServer: DevServer = {
      id: `srv-${Date.now()}`,
      projectName: newProjectName.trim(),
      port: parseInt(newPort, 10) || 3000,
      url: newUrl.trim(),
      status: 'running',
      framework: newFramework.trim() || 'Custom Dev Server',
      description: newDescription.trim() || 'Local development server connected to CEO Virtual.',
    };

    setServers((prev) => [...prev, newServer]);
    setNewProjectName('');
    setNewPort('3000');
    setNewUrl('http://localhost:3000');
    setNewFramework('Vite / React');
    setNewDescription('');
    setShowAddForm(false);
  };

  const handleDeleteServer = (id: string) => {
    setServers((prev) => prev.filter((s) => s.id !== id));
    if (activePreviewUrl && servers.find((s) => s.id === id)?.url === activePreviewUrl) {
      setActivePreviewUrl(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#2c231c]/55 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5 text-[#2c231c] animate-in fade-in duration-200">
      <div className="bg-[#faf5eb] border-2 border-[#d6c5ad] rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden relative">
        {/* Header */}
        <div className="p-4 border-b border-[#d6c5ad] bg-[#f4ebe1] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#1f6860] to-[#288279] text-white shadow-md">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-[#2c231c]">
                  Active Dev Servers & Open Ports
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#e6f4f2] text-[#1f6860] border border-[#9fd3cc] font-mono font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Docker Desktop Style
                </span>
              </div>
              <p className="text-xs text-[#786653]">
                Active dev server ports and endpoints for projects. Click port or link to launch in external browser or in-app preview.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1f6860] hover:bg-[#164e48] text-white text-xs font-semibold rounded-xl transition-all shadow-sm"
              title="Register Custom Local Port / Dev Server"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Port</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-[#786653] hover:text-[#2c231c] hover:bg-[#ede2d1] rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-[#fbf7ee]">
          {/* Left Panel: Port & Dev Servers List */}
          <div
            className={`flex flex-col border-r border-[#d6c5ad] transition-all duration-300 ${
              activePreviewUrl ? 'w-full md:w-5/12' : 'w-full'
            }`}
          >
            {/* Add Port Form */}
            {showAddForm && (
              <form
                onSubmit={handleAddServer}
                className="p-3.5 bg-[#f4ebe1] border-b border-[#d6c5ad] space-y-2.5 text-xs animate-in slide-in-from-top-2"
              >
                <div className="flex items-center justify-between font-bold text-[#2c231c]">
                  <span>Register New Dev Server / Port</span>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="text-[#786653] hover:text-[#2c231c]"
                  >
                    Cancel
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#5c4939] mb-1">
                      Project Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. My Next.js Web App"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      required
                      className="w-full px-2.5 py-1.5 bg-[#fffdf9] border border-[#d6c5ad] rounded-lg text-xs focus:outline-none focus:border-[#1f6860]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#5c4939] mb-1">
                      Port Number
                    </label>
                    <input
                      type="number"
                      placeholder="3000"
                      value={newPort}
                      onChange={(e) => {
                        setNewPort(e.target.value);
                        setNewUrl(`http://localhost:${e.target.value}`);
                      }}
                      required
                      className="w-full px-2.5 py-1.5 bg-[#fffdf9] border border-[#d6c5ad] rounded-lg text-xs font-mono focus:outline-none focus:border-[#1f6860]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#5c4939] mb-1">
                      URL Endpoint
                    </label>
                    <input
                      type="text"
                      placeholder="http://localhost:3000"
                      value={newUrl}
                      onChange={(e) => setNewUrl(e.target.value)}
                      required
                      className="w-full px-2.5 py-1.5 bg-[#fffdf9] border border-[#d6c5ad] rounded-lg text-xs font-mono focus:outline-none focus:border-[#1f6860]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#5c4939] mb-1">
                      Framework / Tech Stack
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Vite • React"
                      value={newFramework}
                      onChange={(e) => setNewFramework(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-[#fffdf9] border border-[#d6c5ad] rounded-lg text-xs focus:outline-none focus:border-[#1f6860]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#5c4939] mb-1">
                    Short Description
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Frontend client dev server"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#fffdf9] border border-[#d6c5ad] rounded-lg text-xs focus:outline-none focus:border-[#1f6860]"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-[#1f6860] hover:bg-[#164e48] text-white rounded-lg font-bold text-xs shadow-sm"
                  >
                    Save Dev Server
                  </button>
                </div>
              </form>
            )}

            {/* List Table */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-[#786653] px-1">
                <span>{servers.length} SERVERS DETECTED</span>
                {servers.length > 0 && (
                  <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    ● ALL SERVICES RUNNING
                  </span>
                )}
              </div>

              {servers.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center bg-[#fffdf9] rounded-xl border border-dashed border-[#d6c5ad] my-4">
                  <div className="w-12 h-12 rounded-full bg-[#f4ebe1] flex items-center justify-center text-[#786653] mb-3">
                    <Server className="w-6 h-6" />
                  </div>
                  <h4 className="text-xs font-bold text-[#2c231c]">No Active Dev Servers</h4>
                  <p className="text-[11px] text-[#786653] max-w-xs mt-1 leading-relaxed">
                    No development servers are currently running. Servers will appear automatically when agents execute web scripts, or you can register ports manually using the <strong>+ Add Port</strong> button above.
                  </p>
                </div>
              ) : (
                servers.map((srv) => {
                const isSelected = activePreviewUrl === (srv.url.startsWith('http') ? srv.url : `${typeof window !== 'undefined' ? window.location.origin : ''}${srv.url}`);
                const fullDisplayUrl = srv.url.startsWith('http')
                  ? srv.url
                  : `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:28483'}${srv.url}`;

                return (
                  <div
                    key={srv.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-[#eef8f6] border-[#1f6860] shadow-md ring-2 ring-[#1f6860]/20'
                        : 'bg-[#fffdf9] border-[#d6c5ad] hover:border-[#1f6860] hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Port Badge Docker Style */}
                        <button
                          onClick={() => handleOpenBrowser(srv)}
                          className="px-2 py-1 rounded-md bg-[#24292f] hover:bg-black text-emerald-400 font-mono text-xs font-bold flex items-center gap-1.5 shadow-xs border border-gray-700 transition-colors group cursor-pointer"
                          title="Click to open port in a new browser tab"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>:{srv.port}</span>
                          <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-white" />
                        </button>

                        <h3 className="font-bold text-sm text-[#2c231c]">
                          {srv.projectName}
                        </h3>
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold font-mono">
                          RUNNING
                        </span>
                        {srv.isExternal && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-800 font-mono">
                            Remote
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-[#5c4939] mb-2 leading-relaxed">
                      {srv.description}
                    </p>

                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#786653] bg-[#f4ebe1] px-2.5 py-1 rounded-lg mb-3 truncate">
                      <Globe className="w-3.5 h-3.5 text-[#1f6860] shrink-0" />
                      <span className="truncate flex-1 select-all">{fullDisplayUrl}</span>
                      <button
                        onClick={() => handleCopyUrl(srv)}
                        className="p-1 hover:text-[#1f6860] transition-colors shrink-0"
                        title="Copy URL to clipboard"
                      >
                        {copiedId === srv.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-[#ede2d1] text-xs">
                      <span className="text-[11px] font-medium text-[#786653] truncate max-w-[180px]">
                        {srv.framework}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handlePreviewInApp(srv)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                            isSelected
                              ? 'bg-[#1f6860] text-white'
                              : 'bg-[#ede2d1] hover:bg-[#dccab3] text-[#2c231c]'
                          }`}
                          title="Display interactive side preview"
                        >
                          <Monitor className="w-3 h-3" />
                          <span>In-App Preview</span>
                        </button>

                        <button
                          onClick={() => handleOpenBrowser(srv)}
                          className="px-2.5 py-1 bg-[#fffdf9] hover:bg-[#f4ebe1] border border-[#d6c5ad] rounded-lg text-xs font-medium text-[#2c231c] flex items-center gap-1 transition-colors"
                          title="Open directly in a new browser tab"
                        >
                          <ExternalLink className="w-3 h-3 text-[#1f6860]" />
                          <span className="hidden sm:inline">Open Web</span>
                        </button>

                          <button
                            onClick={() => handleDeleteServer(srv.id)}
                            className="p-1 text-[#786653] hover:text-red-600 transition-colors"
                            title="Remove server from list"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Panel: In-App Live Web Previewer Frame */}
          {activePreviewUrl ? (
            <div className="flex-1 flex flex-col bg-[#1e1e1e] text-white overflow-hidden border-t md:border-t-0 md:border-l border-[#d6c5ad]">
              {/* Browser Mockup Bar */}
              <div className="p-2.5 bg-[#2d2d2d] border-b border-[#3e3e3e] flex items-center justify-between gap-2 text-xs">
                {/* Traffic lights & title */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                    <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                    <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
                  </div>
                  <span className="font-semibold text-gray-200 text-xs hidden sm:inline truncate max-w-[180px]">
                    {activePreviewTitle}
                  </span>
                </div>

                {/* Address Bar */}
                <div className="flex-1 max-w-xl mx-2 bg-[#1e1e1e] border border-[#444] rounded-lg px-2.5 py-1 flex items-center gap-1.5 text-xs text-gray-300 font-mono">
                  <Globe className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span className="truncate flex-1 select-all">{activePreviewUrl}</span>
                  <button
                    onClick={() => setIframeKey((k) => k + 1)}
                    className="p-0.5 hover:text-white transition-colors"
                    title="Reload Web Preview"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </button>
                </div>

                {/* Viewport & External Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setDeviceViewport('desktop')}
                    className={`p-1.5 rounded transition-colors ${
                      deviceViewport === 'desktop' ? 'bg-[#444] text-white' : 'text-gray-400 hover:text-white'
                    }`}
                    title="Desktop View (100%)"
                  >
                    <Monitor className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeviceViewport('tablet')}
                    className={`p-1.5 rounded transition-colors ${
                      deviceViewport === 'tablet' ? 'bg-[#444] text-white' : 'text-gray-400 hover:text-white'
                    }`}
                    title="Tablet View (768px)"
                  >
                    <Tablet className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeviceViewport('mobile')}
                    className={`p-1.5 rounded transition-colors ${
                      deviceViewport === 'mobile' ? 'bg-[#444] text-white' : 'text-gray-400 hover:text-white'
                    }`}
                    title="Mobile View (375px)"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                  </button>

                  <div className="h-4 w-px bg-[#444] mx-1" />

                  <a
                    href={activePreviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-gray-300 hover:text-white hover:bg-[#444] rounded transition-colors"
                    title="Open in new browser tab"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <button
                    onClick={() => setActivePreviewUrl(null)}
                    className="p-1.5 text-gray-400 hover:text-white hover:bg-[#444] rounded transition-colors"
                    title="Close In-App Preview"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Responsive Iframe Container */}
              <div className="flex-1 bg-[#121212] flex items-center justify-center p-2 overflow-auto">
                <div
                  className={`h-full bg-white transition-all duration-300 shadow-2xl overflow-hidden rounded-md ${
                    deviceViewport === 'mobile'
                      ? 'w-[375px] max-w-full border-4 border-gray-800'
                      : deviceViewport === 'tablet'
                      ? 'w-[768px] max-w-full border-4 border-gray-800'
                      : 'w-full border border-gray-700'
                  }`}
                >
                  <iframe
                    key={iframeKey}
                    src={activePreviewUrl}
                    className="w-full h-full border-0"
                    title="Web Dev Server Live Preview"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="hidden md:flex flex-1 flex-col items-center justify-center p-8 text-center text-[#786653] bg-[#faf5eb]/50">
              <div className="w-16 h-16 rounded-2xl bg-[#f4ebe1] border-2 border-[#d6c5ad] flex items-center justify-center mb-3 text-[#1f6860]">
                <Layers className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-[#2c231c] text-sm mb-1">
                Select a Dev Server for Live Preview
              </h3>
              <p className="text-xs max-w-sm text-[#786653] leading-relaxed mb-4">
                Select a port on the left or click the <strong className="text-[#1f6860]">In-App Preview</strong> button to inspect the live web application directly inside CEO Virtual!
              </p>
              {servers.length > 0 && (
                <button
                  onClick={() => handlePreviewInApp(servers[0])}
                  className="px-3.5 py-2 bg-[#1f6860] hover:bg-[#164e48] text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Open Preview for {servers[0].projectName}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
