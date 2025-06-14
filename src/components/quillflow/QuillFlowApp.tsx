"use client";

import Image from 'next/image';
import bearIcon from '@/app/bear.png';
import React, { useState, useEffect, useMemo, useRef } from 'react';
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
// Textarea is replaced by contentEditable div
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from "@/hooks/use-toast";
import {
  PlusCircle, Save, Trash2, BookMarked, Book, FileText, Edit3, Sparkles, Settings, X,
  Bold, Italic, Underline, List, ListOrdered, Palette, Table, Image as ImageIcon, Type // ImageIcon to avoid conflict
} from 'lucide-react';
import NotebookIcon from './icons';
import { ThemeSwitcher } from './ThemeSwitcher';
import { DailyQuote } from './DailyQuote';
import type { Notebook, Note } from '@/types';
import { summarizeNotes, type SummarizeNotesInput, type SummarizeNotesOutput } from '@/ai/flows/summarize-notes';

const iconOptions = ['BookOpen', 'GraduationCap', 'Briefcase', 'Heart', 'Settings', 'Lightbulb', 'Smile', 'Star'];
const colorOptions = ['#352208', '#E1BB80', '#7B6B43', '#685634', '#806443', '#ffd93d', '#65B0E2', '#6C3F26'];
const textColors = ['#000000', '#FF0000', '#0000FF', '#008000', '#FFA500', '#800080']; // Black, Red, Blue, Green, Orange, Purple

const LOCAL_STORAGE_NOTEBOOKS_KEY = 'Notatie-notebooks';
const LOCAL_STORAGE_NOTES_KEY = 'Notatie-notes';

export default function QuillFlowApp() {
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNotebookId, setSelectedNotebookId] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  
  const [currentNoteTitle, setCurrentNoteTitle] = useState('');
  const [currentNoteContent, setCurrentNoteContent] = useState(''); // Will store HTML
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  const [newNotebookName, setNewNotebookName] = useState('');
  const [newNotebookColor, setNewNotebookColor] = useState(colorOptions[0]);
  const [newNotebookIcon, setNewNotebookIcon] = useState(iconOptions[0]);  const [isNewNotebookDialogOpen, setIsNewNotebookDialogOpen] = useState(false);
  const [notebookToDelete, setNotebookToDelete] = useState<Notebook | null>(null);

  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);

  const { toast } = useToast();
  const editorRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);


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
        setNotebooks([]); 
      }

      const rawNotes = localStorage.getItem(LOCAL_STORAGE_NOTES_KEY);
      if (rawNotes) {
        try {
          setNotes(JSON.parse(rawNotes));
        } catch { 
          setNotes([]); 
        }
      } else {
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
      if (!selectedNotebookId || !notebooks.find(nb => nb.id === selectedNotebookId)) {
        setSelectedNotebookId(notebooks[0].id);
      }
    } else if (notebooks.length === 0 && selectedNotebookId) {
      setSelectedNotebookId(null); 
    }
  }, [notebooks, selectedNotebookId]);

  useEffect(() => {
    if (selectedNotebookId) {
      const notesInCurrentNotebook = notes.filter(note => note.notebookId === selectedNotebookId);
      if (notesInCurrentNotebook.length > 0) {
        if (!selectedNoteId || !notesInCurrentNotebook.find(note => note.id === selectedNoteId)) {
          setSelectedNoteId(notesInCurrentNotebook[0].id);
        }
      } else {
        setSelectedNoteId(null); 
      }
    } else {
      setSelectedNoteId(null); 
    }
  }, [selectedNotebookId, notes, selectedNoteId]);


  const selectedNote = useMemo(() => {
    return notes.find(note => note.id === selectedNoteId);
  }, [notes, selectedNoteId]);

  useEffect(() => {
    if (selectedNote) {
      setCurrentNoteTitle(selectedNote.title);
      setCurrentNoteContent(selectedNote.content); // Content is HTML
      if (editorRef.current) {
        editorRef.current.innerHTML = selectedNote.content;
      }
      setAiSummary(null); 
    } else {
      setCurrentNoteTitle('');
      setCurrentNoteContent('');
      if (editorRef.current) {
        editorRef.current.innerHTML = '';
      }
      setAiSummary(null);
    }
  }, [selectedNote]);

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
    setSelectedNotebookId(newNotebook.id); 
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
      content: '', // Empty HTML content
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
    // Content is already updated via handleContentChange
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
    toast({ title: "Note Deleted", description: `"${noteTitle}" has been deleted.` });
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
    if (!selectedNote) return;
    
    const textContent = editorRef.current?.innerText || '';
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
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand(command, false, value);
      // After execCommand, the contentEditable div's innerHTML might have changed
      // So, we re-sync our React state with the DOM's current state.
      setCurrentNoteContent(editorRef.current.innerHTML);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        execFormatCommand('insertHTML', `<img src="${dataUrl}" alt="${file.name}" style="max-width: 100%; height: auto; border-radius: 0.25rem; margin: 0.5rem 0;" data-ai-hint="uploaded image" />`);
      };
      reader.readAsDataURL(file);
    }
    if(imageInputRef.current) imageInputRef.current.value = ""; // Reset file input
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
    return 'var(--border)';
  }, [selectedNote, notebooks]);


  const handleDeleteNotebook = (notebook: Notebook) => {
    // First delete all notes in this notebook
    const notesToDelete = notes.filter(note => note.notebookId === notebook.id);
    setNotes(prev => prev.filter(note => note.notebookId !== notebook.id));
    
    // Then delete the notebook
    setNotebooks(prev => prev.filter(nb => nb.id !== notebook.id));
    
    // Reset selected notebook if we just deleted it
    if (selectedNotebookId === notebook.id) {
      setSelectedNotebookId(null);
    }

    setNotebookToDelete(null);
    toast({ 
      title: "Notebook Deleted", 
      description: `"${notebook.name}" and its ${notesToDelete.length} note${notesToDelete.length === 1 ? '' : 's'} have been deleted.` 
    });
  };

  return (
    <SidebarProvider defaultOpen>
      <Sidebar variant="sidebar" collapsible="icon" className="border-r shadow-md">
        <SidebarHeader className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">               <Image src={bearIcon} alt="Bear Icon" className="h-7 w-7" width={28} height={28} />
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
              Notebooks              <Button variant="sidebarAction" size="icon" className="h-7 w-7" onClick={() => setIsNewNotebookDialogOpen(true)}>
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
                    <Button variant="outline" onClick={() => setIsNewNotebookDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleAddNotebook}>Create</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </SidebarGroupLabel>
            <SidebarMenu>
              {notebooks.map(nb => (
                <SidebarMenuItem key={nb.id}>                  <div className="flex items-center w-full gap-1">
                    <SidebarMenuButton 
                      onClick={() => setSelectedNotebookId(nb.id)}
                      isActive={selectedNotebookId === nb.id}
                      className="justify-start flex-grow"
                      tooltip={nb.name}
                    >
                      <NotebookIcon name={nb.icon} style={{ color: nb.color }} className="h-5 w-5" />
                      <span className="group-data-[collapsible=icon]:hidden">{nb.name}</span>
                    </SidebarMenuButton>                    <Button 
                      variant="sidebarAction" 
                      size="icon" 
                      className="h-7 w-7 opacity-40 hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
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
            <SidebarGroupLabel>Notes</SidebarGroupLabel>
             <SidebarMenu>
                {selectedNotebookId && (
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
                )}
                {notesInSelectedNotebook.map(note => (
                  <SidebarMenuItem key={note.id}>
                    <div className="flex items-center w-full gap-1">
                      <SidebarMenuButton 
                        onClick={() => setSelectedNoteId(note.id)} 
                        isActive={selectedNoteId === note.id}
                        className="justify-start text-sm flex-grow"
                        tooltip={note.title}
                      >
                        <FileText className="h-4 w-4 opacity-70" />
                        <span className="truncate group-data-[collapsible=icon]:hidden">{note.title}</span>
                      </SidebarMenuButton>
                      <Button 
                        variant="sidebarAction" 
                        size="icon" 
                        className="h-7 w-7 opacity-40 hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleBookmark(note.id);
                        }}
                      >
                        <BookMarked className={`h-4 w-4 ${note.isBookmarked ? 'text-yellow-500 fill-yellow-400' : ''}`} />
                      </Button>
                    </div>
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
            
          </div>
          <ThemeSwitcher />
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="flex-1 flex flex-col bg-background">
        {selectedNote ? (
          <div className="flex-1 flex flex-col p-4 md:p-6 space-y-4 overflow-y-auto">
            <Card 
              className="flex-1 flex flex-col shadow-lg rounded-xl overflow-hidden border-4" // Increased border thickness
              style={{borderColor: activeNotebookColor}}
            >
              <CardHeader 
                className="p-4 border-b flex flex-row items-center justify-between space-y-0"
                style={{backgroundColor: activeNotebookColor ? `${activeNotebookColor}33` : 'var(--card)' }} // Apply notebook color with alpha to header
              >
                <div className="flex items-center gap-2 flex-grow min-w-0">
                  {isEditingTitle ? (
                     <Input 
                        value={currentNoteTitle} 
                        onChange={(e) => setCurrentNoteTitle(e.target.value)} 
                        onBlur={handleSaveNote}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveNote()}
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
                  >
                    <BookMarked className={`h-4 w-4 ${selectedNote.isBookmarked ? 'text-yellow-500 fill-yellow-400' : ''}`} />
                  </Button>
                  <Button 
                    variant="sidebarAction" 
                    size="icon" 
                    className="h-7 w-7 opacity-40 hover:opacity-100 transition-opacity"
                    onClick={handleSaveNote} 
                    aria-label="Save note"
                  >
                    <Save className="h-4 w-4 text-green-600" />
                  </Button>
                   <Button 
                    variant="sidebarAction" 
                    size="icon" 
                    className="h-7 w-7 opacity-40 hover:opacity-100 transition-opacity"
                    onClick={handleDeleteNote} 
                    aria-label="Delete note"
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 flex-1 flex flex-col">
                <div className="mb-2 flex space-x-0.5 border rounded-md p-1 bg-muted overflow-x-auto">
                  <Button variant="ghost" size="sm" className="text-muted-foreground" title="Bold" onClick={() => execFormatCommand('bold')}><Bold /></Button>
                  <Button variant="ghost" size="sm" className="text-muted-foreground" title="Italic" onClick={() => execFormatCommand('italic')}><Italic /></Button>
                  <Button variant="ghost" size="sm" className="text-muted-foreground" title="Underline" onClick={() => execFormatCommand('underline')}><Underline /></Button>
                  <Button variant="ghost" size="sm" className="text-muted-foreground" title="Bullet List" onClick={() => execFormatCommand('insertUnorderedList')}><List /></Button>
                  <Button variant="ghost" size="sm" className="text-muted-foreground" title="Numbered List" onClick={() => execFormatCommand('insertOrderedList')}><ListOrdered /></Button>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-muted-foreground" title="Change Text Color"><Palette /></Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-2">
                      <div className="flex gap-1">
                        {textColors.map(color => (
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
                    title="Upload image"
                  />
                </div>
                <div 
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning // To allow React to manage contentEditable content
                  onInput={handleContentChange}
                  data-placeholder="Start writing your brilliant notes here..."
                  className="flex-1 w-full text-base p-2 rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring prose dark:prose-invert max-w-none prose-img:rounded-md prose-img:my-2"
                  aria-label="Note content"
                  style={{minHeight: '200px'}} // Ensure a minimum height for the editor
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
                : 'Create a new notebook to start your journey with Notatie!'}
            </p>
            {(selectedNotebookId && notesInSelectedNotebook.length === 0 && notebooks.length > 0) && (
              <Button onClick={handleAddNote}><PlusCircle className="mr-2 h-4 w-4" /> Create New Note</Button>
            )}            {notebooks.length === 0 && (
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
                    <Button variant="outline" onClick={() => setIsNewNotebookDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleAddNotebook}>Create</Button>
                  </DialogFooter>
                </DialogContent>              </Dialog>
              </div>
            )}
          </div>
        )}
      </SidebarInset>

      <Dialog open={notebookToDelete !== null} onOpenChange={(open) => !open && setNotebookToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Notebook</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p>Are you sure you want to delete "{notebookToDelete?.name}"?</p>
            <p className="mt-2 text-sm text-muted-foreground">
              This will permanently delete this notebook and all {notes.filter(note => note.notebookId === notebookToDelete?.id).length} notes inside it. 
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
