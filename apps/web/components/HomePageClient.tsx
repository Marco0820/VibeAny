"use client";
import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import CreateProjectModal from '@/components/CreateProjectModal';
import DeleteProjectModal from '@/components/DeleteProjectModal';
import GlobalSettings from '@/components/GlobalSettings';
import { useGlobalSettings } from '@/contexts/GlobalSettingsContext';
import Image from 'next/image';
import { Image as ImageIcon, ChevronDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { API_BASE } from '@/lib/env';
import { MotionDiv } from '@/lib/motion';

// Centralized fetch wrapper that includes cookies for cross-origin API calls
const fetchAPI = (input: RequestInfo | URL, init: RequestInit = {}) => {
  const finalInit: RequestInit = {
    ...init,
    credentials: init.credentials ?? 'include',
  };
  return fetch(input, finalInit);
};

type Project = { 
  id: string; 
  name: string; 
  status?: string; 
  preview_url?: string | null;
  created_at: string;
  last_active_at?: string | null;
  last_message_at?: string | null;
  initial_prompt?: string | null;
  preferred_cli?: string | null;
  selected_model?: string | null;
  services?: {
    github?: { connected: boolean; status: string };
    supabase?: { connected: boolean; status: string };
    vercel?: { connected: boolean; status: string };
  };
};

type QueuedImage = {
  id: string;
  name: string;
  url: string;
  path: string;
  file?: File;
};

type MinimalProvider = { id: string; name: string };

const DEFAULT_AUTH_PROVIDERS: MinimalProvider[] = [
  { id: 'google', name: 'Google' },
  { id: 'github', name: 'GitHub' },
];

const PRICING_PATH = '/pricing';

// Define assistant brand colors
const assistantBrandColors: { [key: string]: string } = {
  remote: '#0F172A',
  codex: '#000000',
  claude: '#DE7356',
  cursor: '#6B7280',
  gemini: '#4285F4',
  qwen: '#A855F7'
};

const defaultModelForCli = (cli: string | undefined | null): string => {
  switch (cli) {
    case 'remote':
    case 'codex':
    case 'cursor':
      return 'gpt-5';
    case 'claude':
      return 'claude-sonnet-4';
    case 'qwen':
      return 'qwen3-coder-plus';
    case 'gemini':
      return 'gemini-2.5-pro';
    default:
      return 'gpt-5';
  }
};

const withAlpha = (hex: string, alphaHex: string): string => {
  if (!hex || !hex.startsWith('#')) {
    return hex;
  }

  if (hex.length === 4) {
    const r = hex[1];
    const g = hex[2];
    const b = hex[3];
    return `#${r}${r}${g}${g}${b}${b}${alphaHex}`;
  }

  if (hex.length === 7) {
    return `${hex}${alphaHex}`;
  }

  if (hex.length === 9) {
    return `${hex.slice(0, 7)}${alphaHex}`;
  }

  return hex;
};

export default function HomePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showGlobalSettings, setShowGlobalSettings] = useState(false);
  const [globalSettingsTab, setGlobalSettingsTab] = useState<'general' | 'ai-assistant'>('ai-assistant');
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; project: Project | null }>({ isOpen: false, project: null });
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [prompt, setPrompt] = useState('');
  const [shouldAutoSubmit, setShouldAutoSubmit] = useState(false);
  const [selectedAssistant, setSelectedAssistant] = useState('codex');
  const [selectedModel, setSelectedModel] = useState('gpt-5');
  const [usingGlobalDefaults, setUsingGlobalDefaults] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cliStatus, setCLIStatus] = useState<{ [key: string]: { installed: boolean; checking: boolean; version?: string; error?: string; } }>({});
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );
  const [previewLoadingProjectId, setPreviewLoadingProjectId] = useState<string | null>(null);
  const { user: currentUser, loading: currentUserLoading, providers: authProviders, logout: authLogout } = useAuth();
  const loginOptions = useMemo<MinimalProvider[]>(() => (
    authProviders.length ? authProviders : DEFAULT_AUTH_PROVIDERS
  ), [authProviders]);
  
  // Define models for each assistant statically
  const modelsByAssistant = {
    codex: [
      { id: 'gpt-5', name: 'GPT-5' }
    ],
    claude: [
      { id: 'claude-sonnet-4', name: 'Claude Sonnet 4' },
      { id: 'claude-opus-4.1', name: 'Claude Opus 4.1' }
    ],
    cursor: [
      { id: 'gpt-5', name: 'GPT-5' },
      { id: 'claude-sonnet-4', name: 'Claude Sonnet 4' },
      { id: 'claude-opus-4.1', name: 'Claude Opus 4.1' }
    ],
    qwen: [
      { id: 'qwen3-coder-plus', name: 'Qwen3 Coder Plus' }
    ],
    gemini: [
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' }
    ]
  };
  
  // Get available models based on current assistant
  const availableModels = modelsByAssistant[selectedAssistant as keyof typeof modelsByAssistant] || [];
  
  // Sync with Global Settings (until user overrides locally)
  const { settings: globalSettings } = useGlobalSettings();
  
  // Check if this is a fresh page load (not navigation)
  useEffect(() => {
    const isPageRefresh = !sessionStorage.getItem('navigationFlag');
    
    if (isPageRefresh) {
      // Fresh page load or refresh - use global defaults
      sessionStorage.setItem('navigationFlag', 'true');
      setIsInitialLoad(true);
      setUsingGlobalDefaults(true);
    } else {
      // Navigation within session - check for stored selections
      const storedAssistant = sessionStorage.getItem('selectedAssistant');
      const storedModel = sessionStorage.getItem('selectedModel');
      
      if (storedAssistant && storedModel && !requiresAssistantUpgrade(storedAssistant)) {
        setSelectedAssistant(storedAssistant);
        setSelectedModel(storedModel);
        setUsingGlobalDefaults(false);
        setIsInitialLoad(false);
        return;
      }
    }
    
    // Clean up navigation flag on unmount
    return () => {
      // Don't clear on navigation, only on actual page unload
    };
  }, []);
  
  // Apply global settings when using defaults
  useEffect(() => {
    if (!usingGlobalDefaults || !isInitialLoad) return;
    
    const preferredCLI = globalSettings?.default_cli;
    const cli = preferredCLI && !requiresAssistantUpgrade(preferredCLI) ? preferredCLI : 'codex';
    setSelectedAssistant(cli);
    const modelFromGlobal = globalSettings?.cli_settings?.[cli]?.model;
    if (modelFromGlobal) {
      setSelectedModel(modelFromGlobal);
    } else {
      // Fallback per CLI
      if (cli === 'claude') setSelectedModel('claude-sonnet-4');
      else if (cli === 'cursor') setSelectedModel('gpt-5');
      else if (cli === 'codex') setSelectedModel('gpt-5');
      else if (cli === 'qwen') setSelectedModel('qwen3-coder-plus');
      else if (cli === 'gemini') setSelectedModel('gemini-2.5-pro');
    }
  }, [globalSettings, usingGlobalDefaults, isInitialLoad]);
  
  // Save selections to sessionStorage when they change
  useEffect(() => {
    if (!isInitialLoad && selectedAssistant && selectedModel) {
      sessionStorage.setItem('selectedAssistant', selectedAssistant);
      sessionStorage.setItem('selectedModel', selectedModel);
    }
  }, [selectedAssistant, selectedModel, isInitialLoad]);
  
  // Clear navigation flag on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      sessionStorage.removeItem('navigationFlag');
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      const storedPrompt = window.sessionStorage.getItem('vibeany:landingPrompt');
      const autoSubmitFlag = window.sessionStorage.getItem('vibeany:autoSubmit');

      if (storedPrompt) {
        setPrompt(storedPrompt);
        window.sessionStorage.removeItem('vibeany:landingPrompt');
      }

      if (autoSubmitFlag === 'true') {
        setShouldAutoSubmit(true);
      }

      if (autoSubmitFlag !== null) {
        window.sessionStorage.removeItem('vibeany:autoSubmit');
      }
    } catch (error) {
      console.warn('Failed to restore pending landing prompt', error);
    }
  }, []);
  const [showAssistantDropdown, setShowAssistantDropdown] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<QueuedImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const router = useRouter();
  const prefetchTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const assistantDropdownRef = useRef<HTMLDivElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Check CLI installation status
  useEffect(() => {
    const checkCLIStatus = async () => {
      // Initialize with checking status
      const checkingStatus: { [key: string]: { installed: boolean; checking: boolean; } } = {};
      assistantOptions.forEach(cli => {
        checkingStatus[cli.id] = { installed: false, checking: true };
      });
      setCLIStatus(checkingStatus);
      
      try {
        const response = await fetch(`${API_BASE}/api/settings/cli-status`);
        if (response.ok) {
          const data = await response.json();
          setCLIStatus(data);
        } else {
          // Fallback if API endpoint doesn't exist
          const fallbackStatus: { [key: string]: { installed: boolean; checking: boolean; error: string; } } = {};
          assistantOptions.forEach(cli => {
            fallbackStatus[cli.id] = {
              installed: cli.id === 'codex', // Codex CLI available without upgrade
              checking: false,
              error: 'Unable to check installation status'
            };
          });
          setCLIStatus(fallbackStatus);
        }
      } catch (error) {
        console.error('Failed to check CLI status:', error);
        // Error fallback
        const errorStatus: { [key: string]: { installed: boolean; checking: boolean; error: string; } } = {};
        assistantOptions.forEach(cli => {
          errorStatus[cli.id] = {
            installed: cli.id === 'codex', // Codex CLI available without upgrade
            checking: false,
            error: 'Network error'
          };
        });
        setCLIStatus(errorStatus);
      }
    };

    checkCLIStatus();
  }, []);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (assistantDropdownRef.current && !assistantDropdownRef.current.contains(event.target as Node)) {
        setShowAssistantDropdown(false);
      }
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
        setShowModelDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Format time for display
  const formatTime = (dateString: string | null) => {
    if (!dateString) return 'Never';
    
    // Server sends UTC time without 'Z' suffix, so we need to add it
    // to ensure it's parsed as UTC, not local time
    let utcDateString = dateString;
    
    // Check if the string has timezone info
    const hasTimezone = dateString.endsWith('Z') || 
                       dateString.includes('+') || 
                       dateString.match(/[-+]\d{2}:\d{2}$/);
    
    if (!hasTimezone) {
      // Add 'Z' to indicate UTC
      utcDateString = dateString + 'Z';
    }
    
    // Parse the date as UTC
    const date = new Date(utcDateString);
    const now = new Date();
    
    // Calculate the actual time difference
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  // Format CLI and model information
  const formatCliInfo = (cli?: string, model?: string) => {
    const cliName = cli === 'claude' ? 'Claude' : cli === 'cursor' ? 'Cursor' : cli || 'Unknown';
    const modelName = model || 'Default model';
    return `${cliName} • ${modelName}`;
  };

  const formatFullTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isPreviewLoading = selectedProject ? previewLoadingProjectId === selectedProject.id : false;
  const isPreviewRunning = Boolean(selectedProject?.preview_url);

  async function load() {
    try {
      const r = await fetchAPI(`${API_BASE}/api/projects`);
      if (r.ok) {
        const projectsData = await r.json();
        // Sort by most recent activity (last_message_at or created_at)
        const sortedProjects = projectsData.sort((a: Project, b: Project) => {
          const aTime = a.last_message_at || a.created_at;
          const bTime = b.last_message_at || b.created_at;
          return new Date(bTime).getTime() - new Date(aTime).getTime();
        });
        setProjects(sortedProjects);
        setSelectedProjectId((currentSelected) => {
          if (!sortedProjects.length) {
            return null;
          }
          if (currentSelected && sortedProjects.some((project: Project) => project.id === currentSelected)) {
            return currentSelected;
          }
          return sortedProjects[0].id;
        });
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  }
  
  async function onCreated() { await load(); }
  
  async function start(projectId: string) {
    try {
      setPreviewLoadingProjectId(projectId);
      await fetchAPI(`${API_BASE}/api/projects/${projectId}/preview/start`, { method: 'POST' });
      await load();
    } catch (error) {
      console.error('Failed to start project:', error);
    } finally {
      setPreviewLoadingProjectId((current) => (current === projectId ? null : current));
    }
  }
  
  async function stop(projectId: string) {
    try {
      setPreviewLoadingProjectId(projectId);
      await fetchAPI(`${API_BASE}/api/projects/${projectId}/preview/stop`, { method: 'POST' });
      await load();
    } catch (error) {
      console.error('Failed to stop project:', error);
    } finally {
      setPreviewLoadingProjectId((current) => (current === projectId ? null : current));
    }
  }

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const openDeleteModal = (project: Project) => {
    setDeleteModal({ isOpen: true, project });
  };

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, project: null });
  };

  async function deleteProject() {
    if (!deleteModal.project) return;
    
    setIsDeleting(true);
    try {
      const response = await fetchAPI(`${API_BASE}/api/projects/${deleteModal.project.id}`, { method: 'DELETE' });
      
      if (response.ok) {
        showToast('Project deleted successfully', 'success');
        await load();
        closeDeleteModal();
      } else {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to delete project' }));
        showToast(errorData.detail || 'Failed to delete project', 'error');
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
      showToast('Failed to delete project. Please try again.', 'error');
    } finally {
      setIsDeleting(false);
    }
  }

  async function updateProject(projectId: string, newName: string) {
    try {
      const response = await fetchAPI(`${API_BASE}/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName })
      });
      
      if (response.ok) {
        showToast('Project updated successfully', 'success');
        await load();
        setEditingProject(null);
      } else {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to update project' }));
        showToast(errorData.detail || 'Failed to update project', 'error');
      }
    } catch (error) {
      console.error('Failed to update project:', error);
      showToast('Failed to update project. Please try again.', 'error');
    }
  }

  // Handle files (for both drag drop and file input)
  const handleFiles = async (files: FileList) => {
    if (selectedAssistant === 'cursor') return;
    
    setIsUploading(true);
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Check if file is an image
        if (!file.type.startsWith('image/')) {
          continue;
        }
        
        const imageUrl = URL.createObjectURL(file);

        const newImage = {
          id: crypto.randomUUID(),
          name: file.name,
          url: imageUrl,
          path: '', // Will be set after upload
          file: file // Store the actual file for later upload
        };

        setUploadedImages(prev => [...prev, newImage]);
      }
    } catch (error) {
      console.error('Image processing failed:', error);
      showToast('Failed to process image. Please try again.', 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle image upload - store locally first, upload after project creation
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    await handleFiles(files);
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (selectedAssistant !== 'cursor') {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set to false if we're leaving the container completely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (selectedAssistant !== 'cursor') {
      e.dataTransfer.dropEffect = 'copy';
    } else {
      e.dataTransfer.dropEffect = 'none';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (selectedAssistant === 'cursor') return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFiles(files);
    }
  };

  // Remove uploaded image
  const removeImage = (id: string) => {
    setUploadedImages(prev => {
      const imageToRemove = prev.find(img => img.id === id);
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.url);
      }
      return prev.filter(img => img.id !== id);
    });
  };

  const finalizeProjectSetup = useCallback(async (projectId: string, promptText: string, assistantId: string, imagesToUpload: QueuedImage[]) => {
    const trimmedPrompt = promptText.trim();
    const imagePayload: { name: string; path: string }[] = [];

    if (imagesToUpload.length > 0) {
      for (let i = 0; i < imagesToUpload.length; i++) {
        const image = imagesToUpload[i];
        if (!image.file) continue;
        try {
          const formData = new FormData();
          formData.append('file', image.file);

          const uploadResponse = await fetchAPI(`${API_BASE}/api/assets/${projectId}/upload`, {
            method: 'POST',
            body: formData
          });

          if (uploadResponse.ok) {
            const result = await uploadResponse.json();
            imagePayload.push({
              name: result.filename || image.name,
              path: result.absolute_path
            });
          } else {
            const detail = await uploadResponse.text().catch(() => uploadResponse.statusText);
            console.error(`Image upload failed for ${image.name}:`, detail);
          }
        } catch (error) {
          console.error('Image upload error:', error);
        } finally {
          if (image.url && image.url.startsWith('blob:')) {
            URL.revokeObjectURL(image.url);
          }
        }
      }
    }

    if (!trimmedPrompt) {
      return;
    }

    try {
      const actResponse = await fetchAPI(`${API_BASE}/api/chat/${projectId}/act`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instruction: trimmedPrompt,
          images: imagePayload,
          is_initial_prompt: true,
          cli_preference: assistantId
        })
      });

      if (!actResponse.ok) {
        const detail = await actResponse.text().catch(() => actResponse.statusText);
        console.error('Failed to trigger initial ACT request:', detail);
      } else if (process.env.NODE_ENV !== 'production') {
        console.info('✅ Initial ACT triggered successfully');
      }
    } catch (error) {
      console.error('Failed to trigger project generation:', error);
    }
  }, []);

  const handleSubmit = async () => {
    if ((!prompt.trim() && uploadedImages.length === 0) || isCreatingProject) return;

    setIsCreatingProject(true);

    const promptSnapshot = prompt.trim();
    const assistantSnapshot = selectedAssistant;
    const modelSnapshot = selectedModel;
    const imagesSnapshot = uploadedImages.map(image => ({ ...image }));
    const projectId = `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      const params = new URLSearchParams();
      if (assistantSnapshot) params.set('cli', assistantSnapshot);
      if (modelSnapshot) params.set('model', modelSnapshot);
      const targetUrl = `/${projectId}/chat${params.toString() ? `?${params.toString()}` : ''}`;

      if (typeof window !== 'undefined') {
        sessionStorage.setItem('navigationFlag', 'true');
      }

      router.push(targetUrl);

      const createProject = async () => {
        try {
          const response = await fetchAPI(`${API_BASE}/api/projects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              project_id: projectId,
              name: promptSnapshot.slice(0, 50) + (promptSnapshot.length > 50 ? '...' : ''),
              initial_prompt: promptSnapshot,
              preferred_cli: assistantSnapshot,
              selected_model: modelSnapshot
            })
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            console.error('Failed to create project:', errorData);
            if (isMountedRef.current) {
              showToast('Failed to create project', 'error');
            }
            return;
          }

          if (promptSnapshot || imagesSnapshot.length > 0) {
            void finalizeProjectSetup(projectId, promptSnapshot, assistantSnapshot, imagesSnapshot);
          }
        } catch (error) {
          console.error('Failed to create project:', error);
          if (isMountedRef.current) {
            showToast('Failed to create project', 'error');
          }
        } finally {
          if (isMountedRef.current) {
            setIsCreatingProject(false);
          }
        }
      };

  void createProject();
} catch (error) {
  console.error('Failed to create project:', error);
  if (isMountedRef.current) {
    showToast('Failed to create project', 'error');
    setIsCreatingProject(false);
  }
}
  };

  const handleSubmitRef = useRef(handleSubmit);

  useEffect(() => {
    handleSubmitRef.current = handleSubmit;
  }, [handleSubmit]);

  useEffect(() => {
    if (!shouldAutoSubmit || !prompt.trim()) {
      return;
    }

    void handleSubmitRef.current();
    setShouldAutoSubmit(false);
  }, [shouldAutoSubmit, prompt]);

  useEffect(() => { 
    load();

    // Handle clipboard paste for images
    const handlePaste = (e: ClipboardEvent) => {
      if (selectedAssistant === 'cursor') return;
      
      const items = e.clipboardData?.items;
      if (!items) return;
      
      const imageFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            imageFiles.push(file);
          }
        }
      }
      
      if (imageFiles.length > 0) {
        e.preventDefault();
        const fileList = {
          length: imageFiles.length,
          item: (index: number) => imageFiles[index],
          [Symbol.iterator]: function* () {
            for (let i = 0; i < imageFiles.length; i++) {
              yield imageFiles[i];
            }
          }
        } as FileList;
        
        // Convert to FileList-like object
        Object.defineProperty(fileList, 'length', { value: imageFiles.length });
        imageFiles.forEach((file, index) => {
          Object.defineProperty(fileList, index, { value: file });
        });
        
        handleFiles(fileList);
      }
    };
    
    document.addEventListener('paste', handlePaste);
    
    // Cleanup prefetch timers
    return () => {
      prefetchTimers.current.forEach(timer => clearTimeout(timer));
      prefetchTimers.current.clear();
      document.removeEventListener('paste', handlePaste);
    };
  }, [selectedAssistant]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.relative')) {
        setShowAssistantDropdown(false);
        setShowModelDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);


  function requiresAssistantUpgrade(assistantId: string) {
    return assistantId !== 'codex';
  }

  function requiresModelUpgrade(assistantId: string, modelId: string) {
    if (assistantId === 'codex') {
      return false;
    }
    return true;
  }

  // Update models when assistant changes
  const handleAssistantChange = (assistant: string) => {
    if (requiresAssistantUpgrade(assistant)) {
      setShowAssistantDropdown(false);
      router.push(`${PRICING_PATH}?ref=assistant&cli=${assistant}`);
      return;
    }

    // Don't allow selecting uninstalled CLIs
    if (!cliStatus[assistant]?.installed) return;
    
    if (process.env.NODE_ENV !== 'production') {
      console.info('🔧 Assistant changing from', selectedAssistant, 'to', assistant);
    }
    setUsingGlobalDefaults(false);
    setIsInitialLoad(false);
    setSelectedAssistant(assistant);
    
    // Set default model for each assistant
    if (assistant === 'claude') {
      setSelectedModel('claude-sonnet-4');
    } else if (assistant === 'cursor') {
      setSelectedModel('gpt-5');
    } else if (assistant === 'codex') {
      setSelectedModel('gpt-5');
    } else if (assistant === 'qwen') {
      setSelectedModel('qwen3-coder-plus');
    } else if (assistant === 'gemini') {
      setSelectedModel('gemini-2.5-pro');
    }
    
    setShowAssistantDropdown(false);
  };

  const handleModelChange = (modelId: string) => {
    if (requiresModelUpgrade(selectedAssistant, modelId)) {
      setShowModelDropdown(false);
      router.push(`${PRICING_PATH}?ref=model&model=${modelId}&cli=${selectedAssistant}`);
      return;
    }
    setUsingGlobalDefaults(false);
    setIsInitialLoad(false);
    setSelectedModel(modelId);
    setShowModelDropdown(false);
  };

  const assistantOptions = [
    { id: 'codex', name: 'Codex CLI', icon: '/oai.png' },
    { id: 'claude', name: 'Claude Code', icon: '/claude.png' },
    { id: 'cursor', name: 'Cursor Agent', icon: '/cursor.png' },
    { id: 'gemini', name: 'Gemini CLI', icon: '/gemini.png' },
    { id: 'qwen', name: 'Qwen Coder', icon: '/qwen.png' }
  ];

  return (
    <div
      className="flex relative overflow-hidden bg-transparent"
      style={{ height: 'calc(100vh * 2 / 3)', minHeight: 'calc(100vh * 2 / 3)' }}
    >
      {/* Radial gradient background from bottom center */}
      <div className="absolute inset-0">
        <div className="absolute inset-0" />
        <div 
          className="absolute inset-0 dark:block hidden transition-all duration-1000 ease-in-out"
          style={{
            background: `radial-gradient(circle at 50% 100%, 
              ${assistantBrandColors[selectedAssistant]}66 0%, 
              ${assistantBrandColors[selectedAssistant]}4D 25%, 
              ${assistantBrandColors[selectedAssistant]}33 50%, 
              transparent 70%)`
          }}
        />
        {/* Light mode gradient - subtle */}
        <div 
          className="absolute inset-0 block dark:hidden transition-all duration-1000 ease-in-out"
          style={{
            background: `radial-gradient(circle at 50% 100%, 
              ${assistantBrandColors[selectedAssistant]}40 0%, 
              ${assistantBrandColors[selectedAssistant]}26 25%, 
              transparent 50%)`
          }}
        />
      </div>
      
      {/* Content wrapper */}
      <div className="relative z-10 flex h-full w-full">
        {/* Thin sidebar bar when closed */}
        <div className={`${sidebarOpen ? 'w-0' : 'w-12'} fixed inset-y-0 left-0 z-40 bg-transparent border-r border-gray-200/20 dark:border-white/5 transition-all duration-300 flex flex-col`}>
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-full h-12 flex items-center justify-center text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            title="Open sidebar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          
          {/* Settings button when sidebar is closed */}
          <div className="mt-auto mb-2">
            <button
              onClick={() => setShowGlobalSettings(true)}
              className="w-full h-12 flex items-center justify-center text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
              title="Settings"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
        
        {/* Sidebar - Overlay style */}
        <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-40 w-64 bg-white/95 dark:bg-black/90 backdrop-blur-2xl border-r border-gray-200 dark:border-white/10 transition-transform duration-300`}>
        <div className="flex flex-col h-full">
          {/* History header with close button */}
          <div className="p-3 border-b border-gray-200 dark:border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 px-2 py-1">
                <h2 className="text-gray-900 dark:text-white font-medium text-lg">History</h2>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1 text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded transition-colors"
                title="Close sidebar"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2">
            <div className="space-y-1">
              {projects.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-sm">No conversations yet</p>
                </div>
              ) : (
                projects.map((project) => {
                  const isSelected = project.id === selectedProjectId;
                  const accentHex = assistantBrandColors[project.preferred_cli ?? ''] ?? '#2563EB';
                  const selectedBg = isSelected ? withAlpha(accentHex, '1A') : 'transparent';
                  const selectedBorder = isSelected ? withAlpha(accentHex, '33') : 'transparent';
                  const hoverBg = withAlpha(accentHex, isSelected ? '28' : '12');
                  const hoverBorder = withAlpha(accentHex, '4D');
                  const selectedShadow = isSelected ? `0 12px 30px ${withAlpha(accentHex, '1F')}` : 'none';

                  return (
                    <div 
                      key={project.id}
                      className="p-2 px-3 rounded-lg transition-all group cursor-pointer"
                      style={{
                        backgroundColor: selectedBg,
                        border: `1px solid ${selectedBorder}`,
                      boxShadow: selectedShadow,
                    } as React.CSSProperties}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = hoverBg;
                      e.currentTarget.style.borderColor = hoverBorder;
                      if (!isSelected) {
                        e.currentTarget.style.boxShadow = `0 10px 24px ${withAlpha(accentHex, '18')}`;
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = selectedBg;
                      e.currentTarget.style.borderColor = selectedBorder;
                      e.currentTarget.style.boxShadow = selectedShadow;
                    }}
                    onClick={() => setSelectedProjectId(project.id)}
                  >
                    {editingProject?.id === project.id ? (
                      // Edit mode
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const formData = new FormData(e.target as HTMLFormElement);
                          const newName = formData.get('name') as string;
                          if (newName.trim()) {
                            updateProject(project.id, newName.trim());
                          }
                        }}
                        className="space-y-2"
                      >
                        <input
                          name="name"
                          defaultValue={project.name}
                          className="w-full px-2 py-1 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                          autoFocus
                          onBlur={() => setEditingProject(null)}
                        />
                        <div className="flex gap-1">
                          <button
                            type="submit"
                            className="px-2 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingProject(null)}
                            className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      // View mode
                      <div className="flex items-center justify-between gap-2">
                        <div 
                          className="flex-1 cursor-pointer min-w-0"
                          onClick={() => {
                            // Pass current model selection when navigating from sidebar
                            const params = new URLSearchParams();
                            if (selectedAssistant) params.set('cli', selectedAssistant);
                            if (selectedModel) params.set('model', selectedModel);
                            router.push(`/${project.id}/chat${params.toString() ? '?' + params.toString() : ''}`);
                          }}
                        >
                          <h3 
                            className="text-gray-900 dark:text-white text-sm transition-colors truncate"
                            style={{
                              '--hover-color': project.preferred_cli && assistantBrandColors[project.preferred_cli] 
                                ? assistantBrandColors[project.preferred_cli]
                                : '#DE7356'
                            } as React.CSSProperties}
                          >
                            <span 
                              className="group-hover:text-[var(--hover-color)]"
                              style={{
                                transition: 'color 0.2s'
                              }}
                            >
                              {project.name.length > 28 
                                ? `${project.name.substring(0, 28)}...` 
                                : project.name
                              }
                            </span>
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="text-gray-500 text-xs">
                              {formatTime(project.last_message_at || project.created_at)}
                            </div>
                            {project.preferred_cli && (
                              <div className="flex items-center gap-1">
                                <span className="text-gray-400 text-xs">•</span>
                                <span 
                                  className="text-xs transition-colors"
                                  style={{
                                    color: assistantBrandColors[project.preferred_cli] ? `${assistantBrandColors[project.preferred_cli]}CC` : '#6B7280'
                                  }}
                                >
                                  {project.preferred_cli === 'claude' ? 'Claude' : 
                                   project.preferred_cli === 'cursor' ? 'Cursor' : 
                                   project.preferred_cli === 'qwen' ? 'Qwen' : 
                                   project.preferred_cli === 'gemini' ? 'Gemini' : 
                                   project.preferred_cli === 'codex' ? 'Codex' : 
                                   project.preferred_cli}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingProject(project);
                            }}
                            className="p-1 text-gray-400 hover:text-orange-500 transition-colors"
                            title="Edit project name"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openDeleteModal(project);
                            }}
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                            title="Delete project"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
          
          <div className="p-2 border-t border-gray-200 dark:border-white/10">
            <button 
              onClick={() => setShowGlobalSettings(true)}
              className="w-full flex items-center gap-2 p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-all text-sm"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Settings
            </button>
          </div>
        </div>
      </div>
      
      {/* Main Content - Not affected by sidebar */}
      <div className="flex-1 flex flex-col min-w-0 min-h-[calc(800px*2/3)]">
      <div
        className="flex-1 flex w-full flex-col items-center justify-center p-8"
        style={{
          backgroundColor: 'var(--bg-primary)',
          backgroundImage:
            'linear-gradient(var(--bg-gradient-top) 0%, var(--bg-gradient-mid) 45%, var(--bg-gradient-bottom) 100%)',
          backgroundRepeat: 'no-repeat',
          backgroundSize: '220% 220%',
          backgroundPosition: 'center center',
          color: 'var(--bolt-text-primary)',
        }}
      >
          <div className="text-center mb-12 w-full max-w-4xl mx-auto">
              <div className="flex justify-center mb-6">
                <h1 
                  className="font-extrabold tracking-tight select-none transition-colors duration-1000 ease-in-out"
                  style={{
                    fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    color: assistantBrandColors[selectedAssistant],
                    letterSpacing: '-0.06em',
                    fontWeight: 800,
                    fontSize: '72px',
                    lineHeight: '72px'
                  }}
                >
                  VibeAny
                </h1>
              </div>
              <p className="text-xl text-gray-700 dark:text-white/80 font-light tracking-tight">
                Connect CLI Agent • Build what you want • Deploy instantly
              </p>
              {currentUserLoading ? (
                <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">Loading user information…</div>
              ) : currentUser ? (
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <div className="flex items-center gap-2 bg-white/70 dark:bg-white/10 px-4 py-2 rounded-full border border-gray-200 dark:border-white/10 shadow-sm">
                    {currentUser.avatar_url ? (
                      <img src={currentUser.avatar_url} alt={currentUser.name || currentUser.email || 'VibeAny user'} className="w-7 h-7 rounded-full" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-semibold text-gray-600 dark:text-gray-200">
                        {(currentUser.name || currentUser.email || 'A').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="text-sm text-gray-700 dark:text-gray-200 font-medium">{currentUser.name || currentUser.email || 'VibeAny user'}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Lv.{currentUser.level} · {currentUser.points} pts</div>
                  </div>
                  <a
                    href="/account"
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-gray-900 dark:bg-white dark:text-gray-900 rounded-full shadow-md hover:opacity-90 transition"
                  >
                    Open account dashboard
                  </a>
                  <button
                    onClick={() => authLogout('/')}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition"
                  >
                    Sign out
                  </button>
                </div>
              ) : null}
            </div>
            
            {/* Main Input Form */}
          <form
              onSubmit={(e) => { e.preventDefault(); }}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className={`group flex flex-col gap-4 p-4 w-full max-w-4xl mx-auto rounded-[28px] border backdrop-blur-xl text-base shadow-xl transition-all duration-150 ease-in-out mb-6 relative overflow-visible ${
                isDragOver
                  ? 'border-[#DE7356] bg-[#DE7356]/10 dark:bg-[#DE7356]/20'
                  : ''
              }`}
              style={{
                color: 'var(--bolt-text-primary)',
                backgroundColor: 'var(--bg-primary)',
                backgroundImage:
                  'linear-gradient(var(--bg-gradient-top) 0%, var(--bg-gradient-mid) 45%, var(--bg-gradient-bottom) 100%)',
                backgroundRepeat: 'no-repeat',
                backgroundSize: 'cover, 160% 160%, 140% 140%, cover',
                backgroundPosition: 'center center, 0px 0px, 100% 0px, center center',
                borderColor: 'var(--bolt-border-color)',
                boxShadow: '0 18px 42px rgba(15, 23, 42, 0.08)',
                WebkitTextSizeAdjust: '100%',
                tabSize: 4,
                fontVariationSettings: 'normal',
                WebkitTapHighlightColor: '#0000',
                WebkitFontSmoothing: 'antialiased',
                fontFeatureSettings: '"liga" 1, "calt" 1',
                fontFamily: 'Avenir, Helvetica, Arial, sans-serif',
                WebkitMaskImage: 'none',
              }}
            >
              <div className="relative flex flex-1 items-center">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ask VibeAny to create a blog about..."
                  disabled={isCreatingProject}
                  className="flex w-full rounded-md px-2 py-2 placeholder:text-gray-400 dark:placeholder:text-white/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 resize-none text-[16px] leading-snug md:text-base focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent focus:bg-transparent flex-1 text-gray-900 dark:text-white overflow-y-auto"
                  style={{ height: '120px' }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      const composing = (e as unknown as { isComposing?: boolean }).isComposing ||
                        (e.nativeEvent as unknown as { isComposing?: boolean }).isComposing;
                      if (composing) return; // let IME handle composition
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                />
              </div>
              
              {/* Drag overlay */}
              {isDragOver && selectedAssistant !== 'cursor' && (
                <div className="absolute inset-0 bg-[#DE7356]/10 dark:bg-[#DE7356]/20 rounded-[28px] flex items-center justify-center z-10 border-2 border-dashed border-[#DE7356]">
                  <div className="text-center">
                    <div className="text-3xl mb-3">📸</div>
                    <div className="text-lg font-semibold text-[#DE7356] dark:text-[#DE7356] mb-2">
                      Drop images here
                    </div>
                    <div className="text-sm text-[#DE7356] dark:text-[#DE7356]">
                      Supports: JPG, PNG, GIF, WEBP
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex gap-1 flex-wrap items-center">
                {/* Image Upload Button */}
                <div className="flex items-center gap-2">
                  {selectedAssistant === 'cursor' || selectedAssistant === 'qwen' ? (
                    <div 
                      className="flex items-center justify-center w-8 h-8 text-gray-300 dark:text-gray-600 cursor-not-allowed opacity-50 rounded-full"
                      title={selectedAssistant === 'qwen' ? "Qwen Coder doesn't support image input" : "Cursor CLI doesn't support image input"}
                    >
                      <ImageIcon className="h-4 w-4" />
                    </div>
                  ) : (
                    <label 
                      className="flex items-center justify-center w-8 h-8 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Upload images"
                    >
                      <ImageIcon className="h-4 w-4" />
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        disabled={isUploading || isCreatingProject}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
                {/* Agent Selector */}
                <div className="relative z-[200]" ref={assistantDropdownRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAssistantDropdown(!showAssistantDropdown);
                      setShowModelDropdown(false);
                    }}
                    className="justify-center whitespace-nowrap text-sm font-medium transition-colors duration-100 ease-in-out focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 border border-gray-200/50 dark:border-white/5 bg-transparent shadow-sm hover:bg-gray-50 dark:hover:bg-white/5 hover:border-gray-300/50 dark:hover:border-white/10 px-3 py-2 flex h-8 items-center gap-1 rounded-full text-gray-700 dark:text-white/80 hover:text-gray-900 dark:hover:text-white focus-visible:ring-0"
                  >
                    <div className="w-4 h-4 rounded overflow-hidden">
                      <img 
                        src={selectedAssistant === 'claude' ? '/claude.png' : selectedAssistant === 'cursor' ? '/cursor.png' : selectedAssistant === 'qwen' ? '/qwen.png' : selectedAssistant === 'gemini' ? '/gemini.png' : '/oai.png'} 
                        alt={selectedAssistant === 'claude' ? 'Claude' : selectedAssistant === 'cursor' ? 'Cursor' : selectedAssistant === 'qwen' ? 'Qwen' : selectedAssistant === 'gemini' ? 'Gemini' : 'Codex'}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <span className="hidden md:flex text-sm font-medium">
                      {selectedAssistant === 'claude' ? 'Claude Code' : selectedAssistant === 'cursor' ? 'Cursor Agent' : selectedAssistant === 'qwen' ? 'Qwen Coder' : selectedAssistant === 'gemini' ? 'Gemini CLI' : 'Codex CLI'}
                    </span>
                    <ChevronDown className="shrink-0 h-3 w-3" />
                  </button>
                  
                  {showAssistantDropdown && (
                    <div className="absolute top-full mt-1 left-0 z-[300] min-w-full whitespace-nowrap rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 backdrop-blur-xl shadow-lg">
                      {assistantOptions.map((option) => {
                        const upgradeRequired = requiresAssistantUpgrade(option.id);
                        const isInstalled = cliStatus[option.id]?.installed;
                        const isDisabled = !upgradeRequired && !isInstalled;

                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => handleAssistantChange(option.id)}
                            disabled={isDisabled}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-left first:rounded-t-2xl last:rounded-b-2xl transition-colors ${
                              isDisabled
                                ? 'opacity-50 cursor-not-allowed text-gray-400 dark:text-gray-500'
                                : selectedAssistant === option.id && !upgradeRequired
                                ? 'bg-gray-100 dark:bg-white/10 text-black dark:text-white font-semibold'
                                : 'text-gray-800 dark:text-gray-200 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10'
                            }`}
                          >
                            <div className="w-4 h-4 rounded overflow-hidden">
                              <img 
                                src={option.icon} 
                                alt={option.name}
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <span className="text-sm font-medium">{option.name}</span>
                            {upgradeRequired && (
                              <span className="ml-auto text-xs font-semibold text-violet-500">
                                Upgrade
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                
                {/* Model Selector */}
                <div className="relative z-[200]" ref={modelDropdownRef}>
                  <button
                    type="button"
                    onClick={() => {
                      const newState = !showModelDropdown;
                      if (process.env.NODE_ENV !== 'production') {
                        console.info('🔍 Model dropdown clicked, changing to:', newState);
                      }
                      setShowModelDropdown(newState);
                      setShowAssistantDropdown(false);
                    }}
                    className="justify-center whitespace-nowrap text-sm font-medium transition-colors duration-100 ease-in-out focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 border border-gray-200/50 dark:border-white/5 bg-transparent shadow-sm hover:bg-gray-50 dark:hover:bg-white/5 hover:border-gray-300/50 dark:hover:border-white/10 px-3 py-2 flex h-8 items-center gap-1 rounded-full text-gray-700 dark:text-white/80 hover:text-gray-900 dark:hover:text-white focus-visible:ring-0 min-w-[140px]"
                  >
                    <span className="text-sm font-medium whitespace-nowrap">{(() => {
                      const found = availableModels.find(m => m.id === selectedModel);
                      if (process.env.NODE_ENV !== 'production') {
                        console.info('🔍 Button display - selectedModel:', selectedModel, 'availableModels:', availableModels.map(m => m.id), 'found:', found);
                      }
                      
                      // Force fallback based on assistant type
                      if (!found) {
                        if (selectedAssistant === 'cursor' && selectedModel === 'gpt-5') {
                          return 'GPT-5';
                        } else if (selectedAssistant === 'claude' && selectedModel === 'claude-sonnet-4') {
                          return 'Claude Sonnet 4';
                        } else if (selectedAssistant === 'codex' && selectedModel === 'gpt-5') {
                          return 'GPT-5';
                        } else if (selectedAssistant === 'qwen' && selectedModel === 'qwen3-coder-plus') {
                          return 'Qwen3 Coder Plus';
                        } else if (selectedAssistant === 'gemini' && selectedModel === 'gemini-2.5-pro') {
                          return 'Gemini 2.5 Pro';
                        } else if (selectedAssistant === 'gemini' && selectedModel === 'gemini-2.5-flash') {
                          return 'Gemini 2.5 Flash';
                        }
                      }
                      
                      return found?.name || 'Select Model';
                    })()}</span>
                    <ChevronDown className="shrink-0 h-3 w-3 ml-auto" />
                  </button>
                  
                  {showModelDropdown && (
                    <div className="absolute top-full mt-1 left-0 z-[300] min-w-full max-h-[300px] overflow-y-auto rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 backdrop-blur-xl shadow-lg">
                      {(() => {
                        if (process.env.NODE_ENV !== 'production') {
                          console.info('🔍 Dropdown is OPEN, availableModels:', availableModels);
                          console.info('🔍 availableModels.length:', availableModels.length);
                        }
                        const sortedModels = [...availableModels].sort((a, b) => {
                          const aNeedsUpgrade = requiresModelUpgrade(selectedAssistant, a.id);
                          const bNeedsUpgrade = requiresModelUpgrade(selectedAssistant, b.id);
                          if (aNeedsUpgrade === bNeedsUpgrade) return 0;
                          return aNeedsUpgrade ? 1 : -1;
                        });
                        return sortedModels.map((model) => {
                          if (process.env.NODE_ENV !== 'production') {
                            console.info('🔍 Rendering model option:', model);
                          }
                          const upgradeRequired = requiresModelUpgrade(selectedAssistant, model.id);

                          return (
                          <button
                            key={model.id}
                            type="button"
                            onClick={() => {
                              if (process.env.NODE_ENV !== 'production') {
                                console.info('🎯 Model selected:', model.id, 'from assistant:', selectedAssistant);
                                console.info('🎯 Before - availableModels:', availableModels);
                              }
                              handleModelChange(model.id);
                              if (process.env.NODE_ENV !== 'production') {
                                console.info('🎯 After - availableModels should still be:', availableModels);
                              }
                            }}
                            className={`w-full px-3 py-2 text-left first:rounded-t-2xl last:rounded-b-2xl transition-colors ${
                              !upgradeRequired && selectedModel === model.id 
                                ? 'bg-gray-100 dark:bg-white/10 text-black dark:text-white font-semibold' 
                                : 'text-gray-800 dark:text-gray-200 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10'
                            }`}
                          >
                            <span className="text-sm font-medium">{model.name}</span>
                            {upgradeRequired && (
                              <span className="ml-auto text-xs font-semibold text-violet-500">
                                Upgrade
                              </span>
                            )}
                          </button>
                          );
                        });
                      })()}
                    </div>
                  )}
                </div>
                
                {/* Send Button */}
                <div className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    disabled={(!prompt.trim() && uploadedImages.length === 0) || isCreatingProject}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 transition-opacity duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-50 hover:scale-110"
                    title="Press ⌘/Ctrl + Enter or click the button to run"
                    onClick={handleSubmit}
                  >
                    {isCreatingProject ? (
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 -960 960 960" className="shrink-0" fill="currentColor">
                        <path d="M442.39-616.87 309.78-487.26q-11.82 11.83-27.78 11.33t-27.78-12.33q-11.83-11.83-11.83-27.78 0-15.96 11.83-27.79l198.43-199q11.83-11.82 28.35-11.82t28.35 11.82l198.43 199q11.83 11.83 11.83 27.79 0 15.95-11.83 27.78-11.82 11.83-27.78 11.83t-27.78-11.83L521.61-618.87v348.83q0 16.95-11.33 28.28-11.32 11.33-28.28 11.33t-28.28-11.33q-11.33-11.33-11.33-28.28z"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </form>
            
            {/* Example Cards */}
          <div className="flex flex-wrap gap-2 justify-center mt-8 w-full max-w-4xl">
              {[
                { 
                  text: 'Landing Page',
                  prompt: 'Design a modern, elegant, and visually stunning landing page for VibeAny with a clean, minimalistic aesthetic and a strong focus on user experience and conversion. Use a harmonious color palette, smooth gradients, soft shadows, and subtle animations to create a premium feel. Include a bold hero section with a clear headline and CTA, feature highlights with simple icons, social proof like testimonials or logos, and a final call-to-action at the bottom. Use large, impactful typography, balanced white space, and a responsive grid-based layout for a polished, pixel-perfect design optimized for both desktop and mobile.'
                },
                { 
                  text: 'Gaming Platform',
                  prompt: 'Design a modern, clean, and visually engaging game platform UI for Lunaris Play, focusing on simplicity, usability, and an immersive user experience. Use a minimalistic yet dynamic aesthetic with smooth gradients, soft shadows, and subtle animations to create a premium, gamer-friendly vibe. Include a hero section highlighting trending and featured games, a game catalog grid with attractive thumbnails, quick-access filter and search options, and a user dashboard for profile, achievements, and recent activity. Typography should be bold yet clean, the layout responsive and intuitive, and the overall design polished, pixel-perfect, and optimized for both desktop and mobile.'
                },
                { 
                  text: 'Onboarding Portal',
                  prompt: 'Design a modern, intuitive, and visually appealing onboarding portal for new users, focusing on simplicity, clarity, and a smooth step-by-step experience. Use a clean layout with soft gradients, subtle shadows, and minimalistic icons to guide users through the process. Include a welcome hero section, an interactive progress tracker, and easy-to-follow forms. Typography should be bold yet friendly, and the overall design must feel welcoming, polished, and optimized for both desktop and mobile.'
                },
                { 
                  text: 'Networking App',
                  prompt: 'Design a sleek, modern, and user-friendly networking app interface for professionals to connect, chat, and collaborate. Use a vibrant yet minimal aesthetic with smooth animations, clean typography, and an elegant color palette to create an engaging social experience. Include a profile showcase, smart connection recommendations, real-time messaging, and a personalized activity feed. The layout should be intuitive, responsive, and optimized for seamless interaction across devices.'
                },
                { 
                  text: 'Room Visualizer',
                  prompt: 'Design a modern, immersive, and highly interactive room visualizer platform where users can preview furniture and decor in a 3D virtual environment. Use a clean, minimal design with elegant gradients, realistic visuals, and smooth transitions for a premium feel. Include a drag-and-drop furniture catalog, real-time 3D previews, color and style customization tools, and an intuitive save-and-share feature. Ensure the interface feels intuitive, responsive, and optimized for desktop and mobile experiences.'
                }
              ].map((example) => (
                <button
                  key={example.text}
                  onClick={() => setPrompt(example.prompt)}
                  disabled={isCreatingProject}
                  className="px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-500 bg-transparent border border-[#DE7356]/10 dark:border-[#DE7356]/10 rounded-full hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-[#DE7356]/15 dark:hover:border-[#DE7356]/15 hover:text-gray-700 dark:hover:text-gray-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {example.text}
                </button>
              ))}
            </div>

        </div>
      </div>

      {/* Global Settings Modal */}
      <GlobalSettings
        isOpen={showGlobalSettings}
        onClose={() => setShowGlobalSettings(false)}
      />

      {/* Delete Project Modal */}
      {deleteModal.isOpen && deleteModal.project && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black dark:bg-opacity-70 flex items-center justify-center z-50">
          <MotionDiv
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="w-full max-w-xl mx-4 rounded-lg border border-gray-200 dark:border-white/10 p-6 bg-[var(--bg-primary)] text-gray-900 dark:text-gray-100"
            style={{ backgroundColor: 'var(--bg-primary)' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Delete Project</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">This action cannot be undone</p>
              </div>
            </div>
            
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Are you sure you want to delete <strong>"{deleteModal.project.name}"</strong>? 
              This will permanently delete all project files and chat history.
            </p>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={closeDeleteModal}
                disabled={isDeleting}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={deleteProject}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deleting...
                  </>
                ) : (
                  'Delete Project'
                )}
              </button>
            </div>
          </MotionDiv>
        </div>
      )}

      {/* Toast Messages */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50">
          <MotionDiv
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
          >
            <div className={`px-6 py-4 rounded-lg shadow-lg border flex items-center gap-3 max-w-sm backdrop-blur-lg ${
              toast.type === 'success'
                ? 'bg-green-500/20 border-green-500/30 text-green-400'
                : 'bg-red-500/20 border-red-500/30 text-red-400'
            }`}>
              {toast.type === 'success' ? (
                <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
              <p className="text-sm font-medium">{toast.message}</p>
            </div>
          </MotionDiv>
        </div>
      )}
      </div>
    </div>
  );
}
