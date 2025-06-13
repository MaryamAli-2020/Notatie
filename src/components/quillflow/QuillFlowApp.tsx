
"use client";

import React, { useState, useEffect, useMemo } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from "@/hooks/use-toast";
import {
  PlusCircle, Save, Trash2, BookMarked, Book, FileText, ThumbsUp, Edit3, Sparkles, Settings, X,
  Bold, Italic, Underline, List, ListOrdered, StickyNoteIcon, Palette, Table, Image
} from 'lucide-react';
import NotebookIcon from './icons';
import { ThemeSwitcher } from './ThemeSwitcher';
import { DailyQuote } from './DailyQuote';
import type { Notebook, Note } from '@/types';
import { summarizeNotes, type SummarizeNotesInput, type SummarizeNotesOutput } from '@/ai/flows/summarize-notes';

const iconOptions = ['BookOpen', 'GraduationCap', 'Briefcase', 'Heart', 'Settings', 'Lightbulb', 'Smile', 'Star'];
const colorOptions = ['#FFD700', '#ADD8E6', '#90EE90', '#FFB6C1', '#E6E6FA', '#D8BFD8', '#FFDEAD', '#F0E68C'];

const LOCAL_STORAGE_NOTEBOOKS_KEY = 'quillflow-notebooks';
const LOCAL_STORAGE_NOTES_KEY = 'quillflow-notes';

export default function QuillFlowApp() {
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNotebookId, setSelectedNotebookId] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  
  const [currentNoteTitle, setCurrentNoteTitle] = useState('');
  const [currentNoteContent, setCurrentNoteContent] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  const [newNotebookName, setNewNotebookName] = useState('');
  const [newNotebookColor, setNewNotebookColor] = useState(colorOptions[0]);
  const [newNotebookIcon, setNewNotebookIcon] = useState(iconOptions[0]);
  const [isNewNotebookDialogOpen, setIsNewNotebookDialogOpen] = useState(false);

  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);

  const { toast } = useToast();

  // Load initial data from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const rawNotebooks = localStorage.getItem(LOCAL_STORAGE_NOTEBOOKS_KEY);
      if (rawNotebooks) {
        try {
          setNotebooks(JSON.parse(rawNotebooks));
        } catch { 
          console.error("Failed to parse notebooks from localStorage.");
          setNotebooks([]); 
        }
      } else {
        setNotebooks([]); 
      }

      const rawNotes = localStorage.getItem(LOCAL_STORAGE_NOTES_KEY);
      if (rawNotes) {
        try {
          setNotes(JSON.parse(rawNotes));
        } catch { 
          console.error("Failed to parse notes from localStorage.");
          setNotes([]); 
        }
      } else {
        setNotes([]);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  // Persist notebooks to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_NOTEBOOKS_KEY, JSON.stringify(notebooks));
    }
  }, [notebooks]);

  // Persist notes to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_NOTES_KEY, JSON.stringify(notes));
    }
  }, [notes]);
  
  // Auto-select first notebook if available and none is selected, or if current selection is invalid
  useEffect(() => {
    if (notebooks.length > 0) {
      if (!selectedNotebookId || !notebooks.find(nb => nb.id === selectedNotebookId)) {
        setSelectedNotebookId(notebooks[0].id);
      }
    } else if (notebooks.length === 0 && selectedNotebookId) {
      setSelectedNotebookId(null); // No notebooks, clear selection
    }
  }, [notebooks, selectedNotebookId]);

  // Auto-select first note in the selected notebook, or if current note selection is invalid
  useEffect(() => {
    if (selectedNotebookId) {
      const notesInCurrentNotebook = notes.filter(note => note.notebookId === selectedNotebookId);
      if (notesInCurrentNotebook.length > 0) {
        if (!selectedNoteId || !notesInCurrentNotebook.find(note => note.id === selectedNoteId)) {
          setSelectedNoteId(notesInCurrentNotebook[0].id);
        }
      } else {
        setSelectedNoteId(null); // No notes in this notebook
      }
    } else {
      setSelectedNoteId(null); // No notebook selected
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNotebookId, notes]);


  const selectedNote = useMemo(() => {
    return notes.find(note => note.id === selectedNoteId);
  }, [notes, selectedNoteId]);

  useEffect(() => {
    if (selectedNote) {
      setCurrentNoteTitle(selectedNote.title);
      setCurrentNoteContent(selectedNote.content);
      setAiSummary(null); 
    } else {
      setCurrentNoteTitle('');
      setCurrentNoteContent('');
      setAiSummary(null);
    }
  }, [selectedNote]);

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
    setIsNewNotebookDialogOpen(false);
    toast({ title: "Success", description: `Notebook "${newNotebook.name}" created.` });
  };

  const handleAddNote = () => {
    if (!selectedNotebookId) {
      toast({ title: "Error", description: "Please select a notebook first.", variant: "destructive" });
      return;
    }
    const newNote: Note = {
      id: `note-${Date.now()}`,
      notebookId: selectedNotebookId,
      title: 'Untitled Note',
      content: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isBookmarked: false,
    };
    setNotes(prev => [...prev, newNote]);
    setSelectedNoteId(newNote.id);
    toast({ title: "Success", description: "New note created." });
  };

  const handleSaveNote = () => {
    if (!selectedNote) return;
    setNotes(prev => prev.map(note => 
      note.id === selectedNote.id 
      ? { ...note, title: currentNoteTitle, content: currentNoteContent, updatedAt: new Date().toISOString() } 
      : note
    ));
    setIsEditingTitle(false);
    toast({ title: "Note Saved", description: `"${currentNoteTitle}" has been saved.` });
  };

  const handleDeleteNote = () => {
    if (!selectedNote) return;
    const noteTitle = selectedNote.title;
    setNotes(prev => prev.filter(note => note.id !== selectedNote.id));
    // selectedNoteId will be re-evaluated by the useEffect hook
    toast({ title: "Note Deleted", description: `"${noteTitle}" has been deleted.` });
  };

  const handleToggleBookmark = () => {
    if (!selectedNote) return;
    setNotes(prev => prev.map(note =>
      note.id === selectedNote.id ? { ...note, isBookmarked: !note.isBookmarked } : note
    ));
    toast({ title: "Bookmark Updated", description: `Bookmark status for "${selectedNote.title}" changed.` });
  };

  const handleSummarizeNote = async () => {
    if (!selectedNote || !currentNoteContent.trim()) {
      toast({ title: "Error", description: "No content to summarize.", variant: "destructive" });
      return;
    }
    setIsSummarizing(true);
    setAiSummary(null);
    try {
      const input: SummarizeNotesInput = { notes: currentNoteContent };
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
  
  const notesInSelectedNotebook = useMemo(() => {
    if (!selectedNotebookId) return [];
    return notes.filter(note => note.notebookId === selectedNotebookId);
  }, [notes, selectedNotebookId]);

  const bookmarkedNotes = useMemo(() => {
    return notes.filter(note => note.isBookmarked);
  }, [notes]);


  return (
    <SidebarProvider defaultOpen>
      <Sidebar variant="sidebar" collapsible="icon" className="border-r shadow-md">
        <SidebarHeader className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
               <FileText className="h-7 w-7 text-primary" />
              <h1 className="text-2xl font-headline text-foreground group-data-[collapsible=icon]:hidden">QuillFlow</h1>
            </div>
            <SidebarTrigger className="group-data-[collapsible=icon]:hidden" />
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
             <DailyQuote />
          </div>
        </SidebarHeader>

        <SidebarContent className="p-2">
          <SidebarGroup className="group-data-[collapsible=icon]:hidden">
            <SidebarGroupLabel className="flex items-center justify-between">
              Notebooks
              <Dialog open={isNewNotebookDialogOpen} onOpenChange={setIsNewNotebookDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <PlusCircle className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
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
                        {colorOptions.map(color => (
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
                    <DialogClose asChild>
                       <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button onClick={handleAddNotebook}>Create</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </SidebarGroupLabel>
            <SidebarMenu>
              {notebooks.map(nb => (
                <SidebarMenuItem key={nb.id}>
                  <SidebarMenuButton 
                    onClick={() => setSelectedNotebookId(nb.id)}
                    isActive={selectedNotebookId === nb.id}
                    className="justify-start"
                    tooltip={nb.name}
                  >
                    <NotebookIcon name={nb.icon} style={{ color: nb.color }} className="h-5 w-5" />
                    <span className="group-data-[collapsible=icon]:hidden">{nb.name}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
               {notebooks.length === 0 && (
                <p className="p-2 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">No notebooks yet. Create one!</p>
              )}
            </SidebarMenu>
          </SidebarGroup>
          
          <SidebarGroup className="mt-4 group-data-[collapsible=icon]:hidden">
            <SidebarGroupLabel>Notes</SidebarGroupLabel>
             <SidebarMenu>
                {selectedNotebookId && (
                  <SidebarMenuItem>
                    <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={handleAddNote}>
                      <PlusCircle className="h-4 w-4"/> New Note
                    </Button>
                  </SidebarMenuItem>
                )}
                {notesInSelectedNotebook.map(note => (
                  <SidebarMenuItem key={note.id}>
                    <SidebarMenuButton 
                      onClick={() => setSelectedNoteId(note.id)} 
                      isActive={selectedNoteId === note.id}
                      className="justify-start text-sm"
                      tooltip={note.title}
                    >
                      <FileText className="h-4 w-4 opacity-70" />
                      <span className="truncate group-data-[collapsible=icon]:hidden">{note.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
                {selectedNotebookId && notesInSelectedNotebook.length === 0 && (
                    <p className="p-2 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">No notes in this notebook yet.</p>
                )}
                {!selectedNotebookId && notebooks.length > 0 && (
                     <p className="p-2 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">Select a notebook to see notes.</p>
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
                    <p className="p-2 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">No bookmarked notes.</p>
                )}
             </SidebarMenu>
          </SidebarGroup>

        </SidebarContent>

        <SidebarFooter className="p-4 border-t flex items-center justify-between group-data-[collapsible=icon]:justify-center">
          <div className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
            <Settings className="h-5 w-5" />
            <span>Settings</span>
          </div>
          <ThemeSwitcher />
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="flex-1 flex flex-col bg-background">
        {selectedNote ? (
          <div className="flex-1 flex flex-col p-4 md:p-6 space-y-4 overflow-y-auto">
            <Card className="flex-1 flex flex-col shadow-lg rounded-xl overflow-hidden" style={{borderColor: notebooks.find(nb => nb.id === selectedNote.notebookId)?.color || 'var(--border)'}}>
              <CardHeader className="bg-card p-4 border-b flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-2 flex-grow min-w-0">
                  {isEditingTitle ? (
                     <Input 
                        value={currentNoteTitle} 
                        onChange={(e) => setCurrentNoteTitle(e.target.value)} 
                        onBlur={handleSaveNote}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveNote()}
                        className="text-2xl font-headline h-auto p-0 border-0 focus-visible:ring-0 flex-grow"
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
                  <Button variant="ghost" size="icon" onClick={handleToggleBookmark} aria-label={selectedNote.isBookmarked ? "Remove bookmark" : "Add bookmark"}>
                    <BookMarked className={`h-5 w-5 ${selectedNote.isBookmarked ? 'text-yellow-500 fill-yellow-400' : 'text-muted-foreground'}`} />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={handleSaveNote} aria-label="Save note">
                    <Save className="h-5 w-5 text-green-600" />
                  </Button>
                   <Button variant="ghost" size="icon" onClick={handleDeleteNote} aria-label="Delete note">
                    <Trash2 className="h-5 w-5 text-red-600" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 flex-1 flex flex-col">
                <div className="mb-2 flex space-x-1 border rounded-md p-1 bg-muted overflow-x-auto">
                  <Button variant="ghost" size="sm" className="text-muted-foreground" title="Bold"><Bold /></Button>
                  <Button variant="ghost" size="sm" className="text-muted-foreground" title="Italic"><Italic /></Button>
                  <Button variant="ghost" size="sm" className="text-muted-foreground" title="Underline"><Underline /></Button>
                  <Button variant="ghost" size="sm" className="text-muted-foreground" title="Bullet List"><List /></Button>
                  <Button variant="ghost" size="sm" className="text-muted-foreground" title="Numbered List"><ListOrdered /></Button>
                  <Button variant="ghost" size="sm" className="text-muted-foreground" title="Change Color"><Palette /></Button>
                  <Button variant="ghost" size="sm" className="text-muted-foreground" title="Sticky Note"><StickyNoteIcon /></Button>
                  <Button variant="ghost" size="sm" className="text-muted-foreground" title="Insert Table"><Table /></Button>
                  <Button variant="ghost" size="sm" className="text-muted-foreground" title="Insert Image"><Image /></Button>
                </div>
                <Textarea 
                  value={currentNoteContent}
                  onChange={(e) => setCurrentNoteContent(e.target.value)}
                  placeholder="Start writing your brilliant notes here..."
                  className="flex-1 w-full text-base resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-2 rounded-md bg-background"
                  aria-label="Note content"
                />
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
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <Book className="h-24 w-24 text-muted-foreground/50 mb-6" />
            <h2 className="text-2xl font-headline text-muted-foreground mb-2">
              {selectedNotebookId && notesInSelectedNotebook.length === 0 && notebooks.length > 0 ? 'This notebook is empty' : 
               !selectedNotebookId && notebooks.length > 0 ? 'Select a notebook' :
               notebooks.length === 0 ? 'No notebooks yet' : 'Select a note to view'}
            </h2>
            <p className="text-muted-foreground mb-4">
              {selectedNotebookId && notesInSelectedNotebook.length === 0 && notebooks.length > 0
                ? 'Create your first note in this notebook using the "New Note" button in the sidebar.' 
                : !selectedNotebookId && notebooks.length > 0 ? 'Select a notebook from the sidebar to see its notes.'
                : 'Create a new notebook to start your journey with QuillFlow!'}
            </p>
            {(selectedNotebookId && notesInSelectedNotebook.length === 0 && notebooks.length > 0) && (
              <Button onClick={handleAddNote}><PlusCircle className="mr-2 h-4 w-4" /> Create New Note</Button>
            )}
            {notebooks.length === 0 && (
               <Dialog open={isNewNotebookDialogOpen} onOpenChange={setIsNewNotebookDialogOpen}>
                <DialogTrigger asChild>
                  <Button><PlusCircle className="mr-2 h-4 w-4" /> Create New Notebook</Button>
                </DialogTrigger>
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
                        {colorOptions.map(color => (
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
                    <DialogClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button onClick={handleAddNotebook}>Create</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        )}
      </SidebarInset>
    </SidebarProvider>
  );
}


    