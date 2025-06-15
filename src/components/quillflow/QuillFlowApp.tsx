
"use client";

import Image from 'next/image';
import bearIcon from '@/app/bear.png';
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarGroup,
  SidebarGroupLabel
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from "@/hooks/use-toast";
import {
  PlusCircle, Save, Trash2, BookMarked, Book, FileText, Edit3, Sparkles, Settings, X,
  Bold, Italic, Underline, List, ListOrdered, Palette, Table, Image as ImageIcon, Type,
  Heading1, Heading2, Heading3, Highlighter, Pencil, Eraser // Added Eraser
} from 'lucide-react';
import NotebookIcon from './icons';
import { ThemeSwitcher } from './ThemeSwitcher';
import { DailyQuote } from './DailyQuote';
import type { Notebook, Note } from '@/types';
import { summarizeNotes, type SummarizeNotesInput, type SummarizeNotesOutput } from '@/ai/flows/summarize-notes';

const iconOptions = ['BookOpen', 'GraduationCap', 'Briefcase', 'Heart', 'Settings', 'Lightbulb', 'Smile', 'Star'];
const notebookColorOptions = ['#352208', '#E1BB80', '#7B6B43', '#685634', '#806443', '#ffd93d', '#65B0E2', '#6C3F26'];
const editorTextColors = ['#000000', '#FF0000', '#008000', '#0000FF', '#FFA500', '#800080', '#FFFFFF'];
const HIGHLIGHT_COLOR = 'yellow';

const whiteboardPenColors = ['#000000', '#FF0000', '#008000', '#0000FF', '#FFFF00', '#FFA500', '#800080'];
const DEFAULT_PEN_COLOR = '#000000';
const DEFAULT_PEN_WIDTH = 2;
const ERASER_WIDTH = 20;


const LOCAL_STORAGE_NOTEBOOKS_KEY = 'Notatie-notebooks';
const LOCAL_STORAGE_NOTES_KEY = 'Notatie-notes';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

export default function QuillFlowApp() {
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNotebookId, setSelectedNotebookId] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  
  const [currentNoteTitle, setCurrentNoteTitle] = useState('');
  const [currentNoteContent, setCurrentNoteContent] = useState(''); 
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  const [newNotebookName, setNewNotebookName] = useState('');
  const [newNotebookColor, setNewNotebookColor] = useState(notebookColorOptions[0]);
  const [newNotebookIcon, setNewNotebookIcon] = useState(iconOptions[0]);  
  const [isNewNotebookDialogOpen, setIsNewNotebookDialogOpen] = useState(false);
  const [notebookToDelete, setNotebookToDelete] = useState<Notebook | null>(null);

  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);

  const { toast } = useToast();
  const editorRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Whiteboard refs and state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingContextRef = useRef<CanvasRenderingContext2D | null>(null);
  const isDrawingRef = useRef(false);
  const lastPositionRef = useRef<{ x: number; y: number } | null>(null);
  const [penColor, setPenColor] = useState<string>(DEFAULT_PEN_COLOR);
  const [drawingTool, setDrawingTool] = useState<'pen' | 'eraser'>('pen');


  useEffect(() => {
    if (typeof window !== 'undefined') {
      const rawNotebooks = localStorage.getItem(LOCAL_STORAGE_NOTEBOOKS_KEY);
      if (rawNotebooks) {
        try {
          setNotebooks(JSON.parse(rawNotebooks));
        } catch { 
          setNotebooks([]); 
        }
      } else {
        // Initialize with empty array if nothing in local storage
        setNotebooks([]); 
      }

      const rawNotes = localStorage.getItem(LOCAL_STORAGE_NOTES_KEY);
      if (rawNotes) {
        try {
          setNotes(JSON.parse(rawNotes));
        } catch { 
          // Handle potential parsing errors, e.g., corrupted data
          setNotes([]); 
        }
      } else {
         // Initialize with empty array if nothing in local storage
        setNotes([]);
      }
    }
  }, []); 

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_NOTEBOOKS_KEY, JSON.stringify(notebooks));
    }
  }, [notebooks]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_NOTES_KEY, JSON.stringify(notes));
    }
  }, [notes]);
  
  useEffect(() => {
    if (notebooks.length > 0) {
      // If there's no selected notebook or the selected one doesn't exist, select the first one
      if (!selectedNotebookId || !notebooks.find(nb => nb.id === selectedNotebookId)) {
        setSelectedNotebookId(notebooks[0].id);
      }
    } else if (notebooks.length === 0 && selectedNotebookId) {
      // If all notebooks are deleted, clear selectedNotebookId
      setSelectedNotebookId(null); 
    }
  }, [notebooks, selectedNotebookId]);

  useEffect(() => {
    if (selectedNotebookId) {
      const notesInCurrentNotebook = notes.filter(note => note.notebookId === selectedNotebookId);
      if (notesInCurrentNotebook.length > 0) {
        // If no note is selected or selected note is not in current notebook, select the first one
        if (!selectedNoteId || !notesInCurrentNotebook.find(note => note.id === selectedNoteId)) {
          setSelectedNoteId(notesInCurrentNotebook[0].id);
        }
      } else {
        // No notes in this notebook, clear selectedNoteId
        setSelectedNoteId(null); 
      }
    } else {
      // No notebook selected, clear selectedNoteId
      setSelectedNoteId(null); 
    }
  }, [selectedNotebookId, notes, selectedNoteId]);


  const selectedNote = useMemo(() => {
    return notes.find(note => note.id === selectedNoteId);
  }, [notes, selectedNoteId]);

  // Effect to update current note details when selectedNote changes
  useEffect(() => {
    if (selectedNote) {
      setCurrentNoteTitle(selectedNote.title);
      setCurrentNoteContent(selectedNote.content); // For notes, this is HTML; for whiteboards, a Data URL
      if (selectedNote.type === 'note' && editorRef.current) {
        editorRef.current.innerHTML = selectedNote.content;
      }
      setAiSummary(null); // Reset AI summary when note changes
    } else {
      // No note selected, clear fields
      setCurrentNoteTitle('');
      setCurrentNoteContent('');
      if (editorRef.current) {
        editorRef.current.innerHTML = '';
      }
      setAiSummary(null);
    }
  }, [selectedNote]);

  // Canvas setup and loading
  useEffect(() => {
    if (selectedNote?.type === 'whiteboard' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      drawingContextRef.current = ctx;

      if (ctx) {
        // Set default drawing styles initially
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // Clear canvas before drawing new content
        // Important: fill with background color if not transparent
        const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
        ctx.fillStyle = currentTheme === 'dark' ? '#17120E' : '#FAF8F4'; // Match CSS --background
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        if (selectedNote.content) { // content is a Data URL
          const img = new window.Image();
          img.onload = () => {
            ctx.drawImage(img, 0, 0);
          };
          img.onerror = () => {
            // console.error("Error loading image to canvas");
            // Fallback: ensure canvas is cleared to background color if image load fails
            ctx.fillStyle = currentTheme === 'dark' ? '#17120E' : '#FAF8F4';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
          img.src = selectedNote.content;
        }
        // Reset tool to pen when a whiteboard is loaded
        setDrawingTool('pen');
        setPenColor(DEFAULT_PEN_COLOR);
      }
    }
  }, [selectedNote, canvasRef]);


  const handleContentChange = (event: React.FormEvent<HTMLDivElement>) => {
    setCurrentNoteContent(event.currentTarget.innerHTML);
  };

  const handleAddNotebook = () => {
    if (!newNotebookName.trim()) {
      toast({ title: "Error", description: "Notebook name cannot be empty.", variant: "destructive" });
      return;
    }
    const newNotebook: Notebook = {
      id: `nb-${Date.now()}`,
      name: newNotebookName,
      color: newNotebookColor,
      icon: newNotebookIcon,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setNotebooks(prev => [...prev, newNotebook]);
    setSelectedNotebookId(newNotebook.id); // Select the new notebook
    setNewNotebookName('');
    // setNewNotebookColor(notebookColorOptions[0]); // Reset color if needed
    // setNewNotebookIcon(iconOptions[0]); // Reset icon if needed
    setIsNewNotebookDialogOpen(false);
    toast({ title: "Success", description: `Notebook "${newNotebook.name}" created.` });
  };

  const createNewItem = (type: 'note' | 'whiteboard') => {
    if (!selectedNotebookId) {
      toast({ title: "Error", description: "Please select a notebook first.", variant: "destructive" });
      return;
    }
    const newItem: Note = {
      id: `item-${Date.now()}`,
      notebookId: selectedNotebookId,
      title: type === 'note' ? 'Untitled Note' : 'Untitled Whiteboard',
      content: '', // Initial content is empty
      type: type,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isBookmarked: false,
    };
    setNotes(prev => [...prev, newItem]);
    setSelectedNoteId(newItem.id); // Select the new item
    toast({ title: "Success", description: `New ${type} created.` });
  };

  const handleAddNote = () => createNewItem('note');
  const handleAddWhiteboard = () => createNewItem('whiteboard');


  const handleSaveNote = () => {
    if (!selectedNote) return;

    let contentToSave = currentNoteContent;
    if (selectedNote.type === 'whiteboard' && canvasRef.current) {
      // Ensure the canvas background is drawn before saving if it's meant to be opaque
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
          // Create a temporary canvas to draw the current content over an opaque background
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = canvas.width;
          tempCanvas.height = canvas.height;
          const tempCtx = tempCanvas.getContext('2d');
          if (tempCtx) {
              const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
              tempCtx.fillStyle = currentTheme === 'dark' ? '#17120E' : '#FAF8F4'; // Match CSS --background
              tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
              tempCtx.drawImage(canvas, 0, 0);
              contentToSave = tempCanvas.toDataURL('image/png');
          } else {
             contentToSave = canvas.toDataURL('image/png'); // fallback
          }
      } else {
          contentToSave = canvas.toDataURL('image/png'); // fallback
      }
    }
    
    setNotes(prev => prev.map(note => 
      note.id === selectedNote.id 
      ? { ...note, title: currentNoteTitle, content: contentToSave, updatedAt: new Date().toISOString() } 
      : note
    ));
    setIsEditingTitle(false);
    toast({ title: `${selectedNote.type === 'note' ? 'Note' : 'Whiteboard'} Saved`, description: `"${currentNoteTitle}" has been saved.` });
  };

  const handleDeleteNote = () => {
    if (!selectedNote) return;
    const itemTitle = selectedNote.title;
    const itemType = selectedNote.type;
    setNotes(prev => prev.filter(note => note.id !== selectedNote.id));
    // Potentially select next/prev note or clear selection
    toast({ title: `${itemType === 'note' ? 'Note' : 'Whiteboard'} Deleted`, description: `"${itemTitle}" has been deleted.` });
  };

  const handleToggleBookmark = (noteId: string) => {
    setNotes(prev => prev.map(note => 
      note.id === noteId 
        ? { ...note, isBookmarked: !note.isBookmarked }
        : note
    ));
    const note = notes.find(n => n.id === noteId);
    if (note) {
      toast({
        title: note.isBookmarked ? "Bookmark Removed" : "Bookmark Added",
        description: `"${note.title}" has been ${note.isBookmarked ? "removed from" : "added to"} bookmarks.`
      });
    }
  };

  const handleSummarizeNote = async () => {
    if (!selectedNote || selectedNote.type === 'whiteboard') return; // Cannot summarize whiteboards
    
    // Extract text from contentEditable div
    const textContent = editorRef.current?.innerText || ''; // Use innerText to get raw text
    if (!textContent.trim()) {
        toast({ title: "Error", description: "No content to summarize.", variant: "destructive" });
        return;
    }

    setIsSummarizing(true);
    setAiSummary(null);
    try {
      const input: SummarizeNotesInput = { notes: textContent };
      const result: SummarizeNotesOutput = await summarizeNotes(input);
      setAiSummary(result.summary);
      toast({ title: "Summary Generated!", description: "AI has summarized your note." });
    } catch (error) {
      console.error("Error summarizing notes:", error);
      toast({ title: "Summarization Error", description: "Could not generate summary.", variant: "destructive" });
      setAiSummary("Failed to generate summary.");
    } finally {
      setIsSummarizing(false);
    }
  };
  
  const execFormatCommand = (command: string, value?: string) => {
    if (selectedNote?.type !== 'note' || !editorRef.current) return;
    editorRef.current.focus(); // Ensure editor has focus
    document.execCommand(command, false, value);
    setCurrentNoteContent(editorRef.current.innerHTML); // Update state after command
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (selectedNote?.type !== 'note') return; // Only for notes
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        // Insert image into contentEditable div
        execFormatCommand('insertHTML', `<img src="${dataUrl}" alt="${file.name}" style="max-width: 100%; height: auto; border-radius: 0.25rem; margin: 0.5rem 0;" data-ai-hint="uploaded image" />`);
      };
      reader.readAsDataURL(file);
    }
    // Reset file input to allow uploading the same file again
    if(imageInputRef.current) imageInputRef.current.value = ""; 
  };
  
  const notesInSelectedNotebook = useMemo(() => {
    if (!selectedNotebookId) return [];
    return notes.filter(note => note.notebookId === selectedNotebookId);
  }, [notes, selectedNotebookId]);

  const bookmarkedNotes = useMemo(() => {
    return notes.filter(note => note.isBookmarked);
  }, [notes]);
  
  const activeNotebookColor = useMemo(() => {
    if (selectedNote && notebooks) {
      const notebook = notebooks.find(nb => nb.id === selectedNote.notebookId);
      return notebook?.color;
    }
    return 'var(--border)'; // Default border color
  }, [selectedNote, notebooks]);


  const handleDeleteNotebook = (notebook: Notebook) => {
    // Gather notes to be deleted for the toast message
    const notesToDelete = notes.filter(note => note.notebookId === notebook.id);
    
    // Filter out notes belonging to the deleted notebook
    setNotes(prev => prev.filter(note => note.notebookId !== notebook.id));
    // Filter out the notebook itself
    setNotebooks(prev => prev.filter(nb => nb.id !== notebook.id));

    // If the deleted notebook was selected, clear the selection
    if (selectedNotebookId === notebook.id) {
      setSelectedNotebookId(null);
      // setSelectedNoteId(null); // Also clear selected note
    }
    setNotebookToDelete(null); // Close confirmation dialog
    toast({ 
      title: "Notebook Deleted", 
      description: `"${notebook.name}" and its ${notesToDelete.length} item${notesToDelete.length === 1 ? '' : 's'} have been deleted.` 
    });
  };

  // Whiteboard Drawing Handlers
  const getEventCoordinates = (event: MouseEvent | TouchEvent): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if (event instanceof MouseEvent) {
      clientX = event.clientX;
      clientY = event.clientY;
    } else if (event.touches && event.touches.length > 0) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else {
      return null; // Should not happen if event types are correct
    }
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDrawing = useCallback((event: MouseEvent | TouchEvent) => {
    if (selectedNote?.type !== 'whiteboard' || !drawingContextRef.current) return;
    event.preventDefault(); 
    const coords = getEventCoordinates(event);
    if (!coords) return;

    isDrawingRef.current = true;
    const ctx = drawingContextRef.current;
    
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    lastPositionRef.current = coords;

    // Apply current tool settings
    if (drawingTool === 'pen') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = penColor;
      ctx.lineWidth = DEFAULT_PEN_WIDTH;
    } else if (drawingTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out'; // Erases to transparent
      ctx.lineWidth = ERASER_WIDTH;
    }
  }, [selectedNote, penColor, drawingTool]);

  const draw = useCallback((event: MouseEvent | TouchEvent) => {
    if (!isDrawingRef.current || selectedNote?.type !== 'whiteboard' || !drawingContextRef.current) return;
     event.preventDefault();
    const coords = getEventCoordinates(event);
    if (!coords || !lastPositionRef.current) return; // Ensure coords and lastPosition are valid
    
    const ctx = drawingContextRef.current;
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    lastPositionRef.current = coords;
  }, [selectedNote]);

  const stopDrawing = useCallback(() => {
    if (!isDrawingRef.current || selectedNote?.type !== 'whiteboard') return;
    isDrawingRef.current = false;
    if (drawingContextRef.current) {
      drawingContextRef.current.closePath(); // Close path for the current stroke
    }
    if (canvasRef.current) {
      const imageDataUrl = canvasRef.current.toDataURL('image/png');
      setCurrentNoteContent(imageDataUrl); // Update content state for potential auto-save or manual save
      // Optionally, call handleSaveNote here if you want to auto-save on mouse up
      // handleSaveNote(); 
    }
    lastPositionRef.current = null;
  }, [selectedNote]);

  // Attach/detach drawing listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || selectedNote?.type !== 'whiteboard') return;

    // Mouse events
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing); // Stop if mouse leaves canvas

    // Touch events
    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);
    canvas.addEventListener('touchcancel', stopDrawing);


    return () => {
      canvas.removeEventListener('mousedown', startDrawing);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseup', stopDrawing);
      canvas.removeEventListener('mouseleave', stopDrawing);

      canvas.removeEventListener('touchstart', startDrawing);
      canvas.removeEventListener('touchmove', draw);
      canvas.removeEventListener('touchend', stopDrawing);
      canvas.removeEventListener('touchcancel', stopDrawing);
    };
  }, [selectedNote, startDrawing, draw, stopDrawing]);


  return (
    <SidebarProvider defaultOpen>
      <Sidebar variant="sidebar" collapsible="icon" className="border-r shadow-md">
        <SidebarHeader className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">               
              <Image src={bearIcon} alt="Bear Icon" className="h-7 w-7" width={28} height={28} />
              <h1 className="text-2xl font-headline text-foreground group-data-[collapsible=icon]:hidden">Notatie</h1>
            </div>
            <SidebarTrigger />
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
             <DailyQuote />
          </div>
        </SidebarHeader>

        <SidebarContent className="p-2">
          <SidebarGroup className="group-data-[collapsible=icon]:hidden">
            <SidebarGroupLabel className="flex items-center justify-between">
              Notebooks              
              <Button variant="sidebarAction" size="icon" className="h-7 w-7" onClick={() => setIsNewNotebookDialogOpen(true)}>
                <PlusCircle className="h-4 w-4" />
              </Button>
              <Dialog open={isNewNotebookDialogOpen} onOpenChange={setIsNewNotebookDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Notebook</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-2 pb-4">
                    <div className="space-y-2">
                      <Label htmlFor="notebookName">Name</Label>
                      <Input id="notebookName" value={newNotebookName} onChange={(e) => setNewNotebookName(e.target.value)} placeholder="e.g. My Awesome Project" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notebookColor">Color</Label>
                       <div className="flex flex-wrap gap-2">
                        {notebookColorOptions.map(color => (
                          <Button key={color} variant="outline" size="icon" onClick={() => setNewNotebookColor(color)} className={`w-8 h-8 rounded-full ${newNotebookColor === color ? 'ring-2 ring-ring' : ''}`} style={{backgroundColor: color}} aria-label={`Select color ${color}`} />
                        ))}
                      </div>
                    </div>
                     <div className="space-y-2">
                      <Label htmlFor="notebookIcon">Icon</Label>
                      <div className="flex flex-wrap gap-2">
                        {iconOptions.map(iconName => (
                           <Button key={iconName} variant="outline" size="icon" onClick={() => setNewNotebookIcon(iconName)} className={`w-8 h-8 ${newNotebookIcon === iconName ? 'ring-2 ring-ring bg-accent' : ''}`}>
                             <NotebookIcon name={iconName} className="h-4 w-4" />
                           </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsNewNotebookDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleAddNotebook}>Create</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </SidebarGroupLabel>
            <SidebarMenu>
              {notebooks.map(nb => (
                <SidebarMenuItem key={nb.id}>                  
                  <div className="flex items-center w-full gap-1">
                    <SidebarMenuButton 
                      onClick={() => setSelectedNotebookId(nb.id)}
                      isActive={selectedNotebookId === nb.id}
                      className="justify-start flex-grow"
                      tooltip={nb.name}
                    >
                      <NotebookIcon name={nb.icon} style={{ color: nb.color }} className="h-5 w-5" />
                      <span className="group-data-[collapsible=icon]:hidden">{nb.name}</span>
                    </SidebarMenuButton>                    
                    <Button 
                      variant="sidebarAction" 
                      size="icon" 
                      className="h-7 w-7 opacity-40 hover:opacity-100 transition-opacity group-data-[collapsible=icon]:hidden"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent selecting notebook
                        setNotebookToDelete(nb);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </SidebarMenuItem>
              ))}
               {notebooks.length === 0 && (
                <p className="p-2 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">No notebooks yet. Create one!</p>
              )}
            </SidebarMenu>
          </SidebarGroup>
          
          <SidebarGroup className="mt-4 group-data-[collapsible=icon]:hidden">
            <SidebarGroupLabel>Items</SidebarGroupLabel>
             <SidebarMenu>
                {selectedNotebookId && (
                  <>
                  <SidebarMenuItem>
                    <Button 
                      variant="sidebarAction" 
                      size="sm" 
                      className="w-full justify-start gap-2 opacity-70 hover:opacity-100 transition-opacity" 
                      onClick={handleAddNote}
                    >
                      <PlusCircle className="h-4 w-4"/> New Note
                    </Button>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <Button 
                      variant="sidebarAction" 
                      size="sm" 
                      className="w-full justify-start gap-2 opacity-70 hover:opacity-100 transition-opacity" 
                      onClick={handleAddWhiteboard}
                    >
                      <Pencil className="h-4 w-4"/> New Whiteboard
                    </Button>
                  </SidebarMenuItem>
                  </>
                )}
                {notesInSelectedNotebook.map(item => (
                  <SidebarMenuItem key={item.id}>
                    <div className="flex items-center w-full gap-1">
                      <SidebarMenuButton 
                        onClick={() => setSelectedNoteId(item.id)} 
                        isActive={selectedNoteId === item.id}
                        className="justify-start text-sm flex-grow"
                        tooltip={item.title}
                      >
                        {item.type === 'note' ? <FileText className="h-4 w-4 opacity-70" /> : <Pencil className="h-4 w-4 opacity-70" />}
                        <span className="truncate group-data-[collapsible=icon]:hidden">{item.title}</span>
                      </SidebarMenuButton>
                      <Button 
                        variant="sidebarAction" 
                        size="icon" 
                        className="h-7 w-7 opacity-40 hover:opacity-100 transition-opacity group-data-[collapsible=icon]:hidden"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleBookmark(item.id);
                        }}
                      >
                        <BookMarked className={`h-4 w-4 ${item.isBookmarked ? 'text-yellow-500 fill-yellow-400' : ''}`} />
                      </Button>
                    </div>
                  </SidebarMenuItem>
                ))}
                {selectedNotebookId && notesInSelectedNotebook.length === 0 && (
                    <p className="p-2 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">No items in this notebook yet.</p>
                )}
                {!selectedNotebookId && notebooks.length > 0 && (
                     <p className="p-2 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">Select a notebook to see items.</p>
                )}
             </SidebarMenu>
          </SidebarGroup>

          <SidebarGroup className="mt-4 group-data-[collapsible=icon]:hidden">
            <SidebarGroupLabel>Bookmarks</SidebarGroupLabel>
             <SidebarMenu>
                {bookmarkedNotes.map(note => (
                  <SidebarMenuItem key={note.id}>
                    <SidebarMenuButton 
                      onClick={() => { setSelectedNotebookId(note.notebookId); setSelectedNoteId(note.id); }}
                      className="justify-start text-sm"
                      tooltip={note.title}
                    >
                      <BookMarked className="h-4 w-4 text-yellow-500" />
                       <span className="truncate group-data-[collapsible=icon]:hidden">{note.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
                {bookmarkedNotes.length === 0 && (
                    <p className="p-2 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">No bookmarked items.</p>
                )}
             </SidebarMenu>
          </SidebarGroup>

        </SidebarContent>

        <SidebarFooter className="p-4 border-t flex items-center justify-between group-data-[collapsible=icon]:justify-center">
          <div className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
            {/* Could add user avatar or settings icon here later */}
          </div>
          <ThemeSwitcher />
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="flex-1 flex flex-col bg-background">
        {selectedNote ? (
          <div className="flex-1 flex flex-col p-4 md:p-6 space-y-4 overflow-y-auto">
            <Card 
              className="flex-1 flex flex-col shadow-lg rounded-xl overflow-hidden border-4" 
              style={{borderColor: activeNotebookColor}}
            >
              <CardHeader 
                className="p-4 border-b flex flex-row items-center justify-between space-y-0"
                style={{backgroundColor: activeNotebookColor ? `${activeNotebookColor}33` : 'var(--card)' }} // Apply notebook color with opacity
              >
                <div className="flex items-center gap-2 flex-grow min-w-0">
                  {isEditingTitle ? (
                     <Input 
                        value={currentNoteTitle} 
                        onChange={(e) => setCurrentNoteTitle(e.target.value)} 
                        onBlur={handleSaveNote} // Save on blur
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveNote()} // Save on Enter
                        className="text-2xl font-headline h-auto p-0 border-0 focus-visible:ring-0 flex-grow bg-transparent placeholder-muted-foreground"
                        autoFocus
                      />
                  ) : (
                    <button onClick={() => setIsEditingTitle(true)} className="flex items-center gap-2 group min-w-0">
                      <CardTitle className="text-2xl font-headline truncate" title={currentNoteTitle}>{currentNoteTitle}</CardTitle>
                      <Edit3 className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  )}
                </div>
                <div className="flex items-center space-x-1">
                  <Button 
                    variant="sidebarAction" 
                    size="icon" 
                    className="h-7 w-7 opacity-40 hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleBookmark(selectedNote.id);
                    }}
                    aria-label={selectedNote.isBookmarked ? "Remove bookmark" : "Add bookmark"}
                  >
                    <BookMarked className={`h-4 w-4 ${selectedNote.isBookmarked ? 'text-yellow-500 fill-yellow-400' : ''}`} />
                  </Button>
                  <Button 
                    variant="sidebarAction" 
                    size="icon" 
                    className="h-7 w-7 opacity-40 hover:opacity-100 transition-opacity"
                    onClick={handleSaveNote} 
                    aria-label="Save item"
                  >
                    <Save className="h-4 w-4 text-green-600" />
                  </Button>
                   <Button 
                    variant="sidebarAction" 
                    size="icon" 
                    className="h-7 w-7 opacity-40 hover:opacity-100 transition-opacity"
                    onClick={handleDeleteNote} 
                    aria-label="Delete item"
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 flex-1 flex flex-col">
                {/* Rich Text Editor Toolbar - Only for 'note' type */}
                {selectedNote.type === 'note' && (
                  <div className="mb-2 flex flex-wrap gap-0.5 border rounded-md p-1 bg-muted overflow-x-auto">
                    <Button variant="ghost" size="sm" className="text-muted-foreground" title="Bold" onClick={() => execFormatCommand('bold')}><Bold /></Button>
                    <Button variant="ghost" size="sm" className="text-muted-foreground" title="Italic" onClick={() => execFormatCommand('italic')}><Italic /></Button>
                    <Button variant="ghost" size="sm" className="text-muted-foreground" title="Underline" onClick={() => execFormatCommand('underline')}><Underline /></Button>
                    <Button variant="ghost" size="sm" className="text-muted-foreground" title="Bullet List" onClick={() => execFormatCommand('insertUnorderedList')}><List /></Button>
                    <Button variant="ghost" size="sm" className="text-muted-foreground" title="Numbered List" onClick={() => execFormatCommand('insertOrderedList')}><ListOrdered /></Button>
                    <Button variant="ghost" size="sm" className="text-muted-foreground" title="Heading 1" onClick={() => execFormatCommand('formatBlock', '<h1>')}><Heading1 className="h-5 w-5" /></Button>
                    <Button variant="ghost" size="sm" className="text-muted-foreground" title="Heading 2" onClick={() => execFormatCommand('formatBlock', '<h2>')}><Heading2 className="h-5 w-5" /></Button>
                    <Button variant="ghost" size="sm" className="text-muted-foreground" title="Heading 3" onClick={() => execFormatCommand('formatBlock', '<h3>')}><Heading3 className="h-5 w-5" /></Button>
                    <Button variant="ghost" size="sm" className="text-muted-foreground" title="Highlight" onClick={() => execFormatCommand('backColor', HIGHLIGHT_COLOR)}><Highlighter className="h-5 w-5"/></Button>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-muted-foreground" title="Change Text Color"><Palette /></Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-2">
                        <div className="flex gap-1">
                          {editorTextColors.map(color => (
                            <Button
                              key={color}
                              variant="outline"
                              size="icon"
                              className="h-6 w-6 rounded-full"
                              style={{ backgroundColor: color }}
                              onClick={() => execFormatCommand('foreColor', color)}
                              aria-label={`Set text color to ${color}`}
                            />
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                    <Button variant="ghost" size="sm" className="text-muted-foreground" title="Insert Table" onClick={() => execFormatCommand('insertHTML', '<table border="1" style="border-collapse: collapse; width: 100%;"><tbody><tr><td>&nbsp;</td><td>&nbsp;</td></tr><tr><td>&nbsp;</td><td>&nbsp;</td></tr></tbody></table>')}><Table /></Button>
                    <Button variant="ghost" size="sm" className="text-muted-foreground" title="Insert Image" onClick={() => imageInputRef.current?.click()}><ImageIcon /></Button>
                    <label htmlFor="note-image-upload" className="sr-only">Upload image</label>
                    <input
                      id="note-image-upload"
                      type="file"
                      accept="image/*"
                      ref={imageInputRef}
                      onChange={handleImageUpload}
                      className="hidden"
                      aria-label="Upload image for note" // More specific aria-label
                    />
                  </div>
                )}

                 {/* Whiteboard Toolbar - Only for 'whiteboard' type */}
                {selectedNote.type === 'whiteboard' && (
                  <div className="mb-2 flex flex-wrap items-center gap-1 border rounded-md p-1 bg-muted overflow-x-auto">
                    <Button 
                        variant={drawingTool === 'pen' ? 'secondary' : 'ghost'} 
                        size="sm" 
                        className="text-muted-foreground" title="Pen Tool" 
                        onClick={() => setDrawingTool('pen')}
                    >
                        <Pencil className="h-5 w-5" />
                    </Button>
                    <Button 
                        variant={drawingTool === 'eraser' ? 'secondary' : 'ghost'} 
                        size="sm" 
                        className="text-muted-foreground" title="Eraser Tool" 
                        onClick={() => setDrawingTool('eraser')}
                    >
                        <Eraser className="h-5 w-5" />
                    </Button>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-muted-foreground" title="Change Pen Color">
                            <Palette className="h-5 w-5" style={{color: drawingTool === 'pen' ? penColor : undefined }} />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-2">
                        <div className="flex flex-wrap gap-1">
                          {whiteboardPenColors.map(color => (
                            <Button
                              key={color}
                              variant="outline"
                              size="icon"
                              className={`h-6 w-6 rounded-full ${penColor === color && drawingTool === 'pen' ? 'ring-2 ring-ring' : ''}`}
                              style={{ backgroundColor: color }}
                              onClick={() => { setPenColor(color); setDrawingTool('pen'); }}
                              aria-label={`Set pen color to ${color}`}
                            />
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                )}


                {/* Content Area: Editor or Whiteboard */}
                {selectedNote.type === 'note' ? (
                  <div 
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning // Suppress warning for contentEditable
                    onInput={handleContentChange}
                    data-placeholder="Start writing your brilliant notes here..."
                    className="flex-1 w-full text-base p-2 rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring prose dark:prose-invert max-w-none prose-img:rounded-md prose-img:my-2" // Added prose styling
                    aria-label="Note content"
                    style={{minHeight: '200px'}} 
                  />
                ) : ( // Whiteboard
                  <div className="flex-1 w-full flex items-center justify-center bg-muted/30 rounded-md overflow-hidden relative">
                    <canvas 
                      ref={canvasRef} 
                      width={CANVAS_WIDTH} 
                      height={CANVAS_HEIGHT}
                      className="border border-border shadow-inner bg-background cursor-crosshair"
                      aria-label="Whiteboard drawing area"
                      style={{touchAction: 'none'}} // Important for touch events on some browsers
                    />
                  </div>
                )}

                {/* AI Summary - Only for 'note' type */}
                {selectedNote.type === 'note' && (
                  <div className="mt-4">
                    <Button onClick={handleSummarizeNote} disabled={isSummarizing || !currentNoteContent.trim()} size="sm">
                      <Sparkles className="mr-2 h-4 w-4" />
                      {isSummarizing ? 'Summarizing...' : 'AI Summarize'}
                    </Button>
                    {aiSummary && (
                      <Card className="mt-4 bg-primary/20 border-primary/50">
                        <CardHeader className="py-2 px-3 flex flex-row items-center justify-between">
                          <CardTitle className="text-lg font-headline">AI Summary</CardTitle>
                          <Button variant="ghost" size="icon" onClick={() => setAiSummary(null)} className="h-7 w-7 text-muted-foreground hover:text-foreground">
                            <X className="h-4 w-4" />
                            <span className="sr-only">Close summary</span>
                          </Button>
                        </CardHeader>
                        <CardContent className="p-3 pt-1">
                          <p className="text-sm whitespace-pre-wrap">{aiSummary}</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <Book className="h-24 w-24 text-muted-foreground/50 mb-6" />
            <h2 className="text-2xl font-headline text-muted-foreground mb-2">
              {selectedNotebookId && notesInSelectedNotebook.length === 0 && notebooks.length > 0 ? 'This notebook is empty' : 
               !selectedNotebookId && notebooks.length > 0 ? 'Select a notebook' :
               notebooks.length === 0 ? 'No notebooks yet' : 'Select an item to view'}
            </h2>
            <p className="text-muted-foreground mb-4">
              {selectedNotebookId && notesInSelectedNotebook.length === 0 && notebooks.length > 0
                ? 'Create your first note or whiteboard in this notebook using the buttons in the sidebar.' 
                : !selectedNotebookId && notebooks.length > 0 ? 'Select a notebook from the sidebar to see its items.'
                : 'Create a new notebook to start your journey with Notatie!'}
            </p>
            {(selectedNotebookId && notesInSelectedNotebook.length === 0 && notebooks.length > 0) && (
              <div className="flex gap-2">
                <Button onClick={handleAddNote}><PlusCircle className="mr-2 h-4 w-4" /> Create New Note</Button>
                <Button onClick={handleAddWhiteboard}><Pencil className="mr-2 h-4 w-4" /> Create New Whiteboard</Button>
              </div>
            )}            
            {notebooks.length === 0 && (
              <div>
                <Button onClick={() => setIsNewNotebookDialogOpen(true)}><PlusCircle className="mr-2 h-4 w-4" /> Create New Notebook</Button>
                <Dialog open={isNewNotebookDialogOpen} onOpenChange={setIsNewNotebookDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Notebook</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-2 pb-4">
                    <div className="space-y-2">
                      <Label htmlFor="notebookNameModal">Name</Label>
                      <Input id="notebookNameModal" value={newNotebookName} onChange={(e) => setNewNotebookName(e.target.value)} placeholder="e.g. My Awesome Project" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notebookColorModal">Color</Label>
                       <div className="flex flex-wrap gap-2">
                        {notebookColorOptions.map(color => (
                          <Button key={color} variant="outline" size="icon" onClick={() => setNewNotebookColor(color)} className={`w-8 h-8 rounded-full ${newNotebookColor === color ? 'ring-2 ring-ring' : ''}`} style={{backgroundColor: color}} aria-label={`Select color ${color}`} />
                        ))}
                      </div>
                    </div>
                     <div className="space-y-2">
                      <Label htmlFor="notebookIconModal">Icon</Label>
                      <div className="flex flex-wrap gap-2">
                        {iconOptions.map(iconName => (
                           <Button key={iconName} variant="outline" size="icon" onClick={() => setNewNotebookIcon(iconName)} className={`w-8 h-8 ${newNotebookIcon === iconName ? 'ring-2 ring-ring bg-accent' : ''}`}>
                             <NotebookIcon name={iconName} className="h-4 w-4" />
                           </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsNewNotebookDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleAddNotebook}>Create</Button>
                  </DialogFooter>
                </DialogContent>              </Dialog>
              </div>
            )}
          </div>
        )}
      </SidebarInset>

      {/* Delete Notebook Confirmation Dialog */}
      <Dialog open={notebookToDelete !== null} onOpenChange={(open) => !open && setNotebookToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Notebook</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p>Are you sure you want to delete "{notebookToDelete?.name}"?</p>
            <p className="mt-2 text-sm text-muted-foreground">
              This will permanently delete this notebook and all {notes.filter(note => note.notebookId === notebookToDelete?.id).length} items inside it. 
              This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotebookToDelete(null)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={() => notebookToDelete && handleDeleteNotebook(notebookToDelete)}
            >
              Delete Notebook
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}


    