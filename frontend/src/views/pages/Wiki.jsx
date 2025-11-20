import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Alert,
  Snackbar,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { fetchConfluencePages } from '../../models/AtlassianModel';

// Simple markdown to HTML converter (basic implementation)
const markdownToHtml = (markdown) => {
  if (!markdown) return '';
  
  let html = markdown
    // Headers
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    // Code blocks
    .replace(/```([\s\S]*?)```/gim, '<pre><code>$1</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/gim, '<code>$1</code>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    // Lists
    .replace(/^\- (.*$)/gim, '<li>$1</li>')
    .replace(/^(\d+)\. (.*$)/gim, '<li>$2</li>')
    // Line breaks
    .replace(/\n\n/gim, '</p><p>')
    .replace(/\n/gim, '<br>');
  
  // Wrap list items
  html = html.replace(/(<li>.*<\/li>)/gim, '<ul>$1</ul>');
  
  // Wrap in paragraph if not already wrapped
  if (!html.startsWith('<')) {
    html = '<p>' + html + '</p>';
  }
  
  return html;
};

const Wiki = () => {
  const [pages, setPages] = useState([]);
  const [filteredPages, setFilteredPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pageToDelete, setPageToDelete] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [editForm, setEditForm] = useState({
    id: '',
    title: '',
    content: '',
    category: 'General',
    tags: '',
  });
  const [isConfluenceMode, setIsConfluenceMode] = useState(false);

  // Load pages
  const loadPages = async () => {
    setLoading(true);
    try {
      const fetchedPages = await fetchConfluencePages('PENTEST');
      setPages(fetchedPages);
      setFilteredPages(fetchedPages);
      
      // Check if we're in Confluence mode (API configured)
      const hasApiConfig = import.meta.env.VITE_ATLASSIAN_BASE_URL && 
                          import.meta.env.VITE_ATLASSIAN_EMAIL && 
                          import.meta.env.VITE_ATLASSIAN_API_TOKEN;
      setIsConfluenceMode(hasApiConfig);
      
      // Load from localStorage if not in Confluence mode
      if (!hasApiConfig) {
        try {
          const stored = localStorage.getItem('wiki-pages');
          if (stored) {
            const localPages = JSON.parse(stored);
            if (localPages.length > 0) {
              setPages(localPages);
              setFilteredPages(localPages);
            }
          }
        } catch (err) {
          console.error('Error loading local pages:', err);
        }
      }
    } catch (err) {
      console.error('Error loading pages:', err);
      setSnackbar({ open: true, message: 'Failed to load pages', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Save pages to localStorage
  const savePages = (pagesToSave) => {
    try {
      localStorage.setItem('wiki-pages', JSON.stringify(pagesToSave));
    } catch (err) {
      console.error('Error saving pages:', err);
    }
  };

  // Initial load
  useEffect(() => {
    loadPages();
  }, []);

  // Filter pages based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredPages(pages);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = pages.filter((page) => {
      return (
        page.title?.toLowerCase().includes(term) ||
        page.content?.toLowerCase().includes(term) ||
        page.category?.toLowerCase().includes(term) ||
        page.tags?.some((tag) => tag.toLowerCase().includes(term)) ||
        (typeof page.tags === 'string' && page.tags.toLowerCase().includes(term))
      );
    });
    setFilteredPages(filtered);
  }, [searchTerm, pages]);

  // Handle page selection
  const handlePageSelect = (page) => {
    setSelectedPage(page);
  };

  // Handle create new page
  const handleCreate = () => {
    setEditForm({
      id: '',
      title: '',
      content: '',
      category: 'General',
      tags: '',
    });
    setEditDialogOpen(true);
  };

  // Handle edit page
  const handleEdit = (page) => {
    setEditForm({
      id: page.id,
      title: page.title,
      content: page.content,
      category: page.category || 'General',
      tags: Array.isArray(page.tags) ? page.tags.join(', ') : (page.tags || ''),
    });
    setEditDialogOpen(true);
  };

  // Handle save page
  const handleSave = () => {
    if (!editForm.title.trim()) {
      setSnackbar({ open: true, message: 'Title is required', severity: 'error' });
      return;
    }

    const tagsArray = editForm.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    if (editForm.id) {
      // Update existing page
      const updated = pages.map((page) =>
        page.id === editForm.id
          ? {
              ...page,
              title: editForm.title,
              content: editForm.content,
              category: editForm.category,
              tags: tagsArray,
              updatedAt: new Date().toISOString(),
            }
          : page
      );
      setPages(updated);
      setFilteredPages(updated);
      savePages(updated);
      setSnackbar({ open: true, message: 'Page updated', severity: 'success' });
    } else {
      // Create new page
      const newPage = {
        id: `page-${Date.now()}`,
        title: editForm.title,
        content: editForm.content,
        category: editForm.category,
        tags: tagsArray,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: 'User',
        space: 'PENTEST',
      };
      const updated = [...pages, newPage];
      setPages(updated);
      setFilteredPages(updated);
      savePages(updated);
      setSnackbar({ open: true, message: 'Page created', severity: 'success' });
    }

    setEditDialogOpen(false);
    if (selectedPage?.id === editForm.id || !editForm.id) {
      setSelectedPage(editForm.id ? pages.find((p) => p.id === editForm.id) : null);
    }
  };

  // Handle delete page
  const handleDelete = () => {
    if (!pageToDelete) return;

    const updated = pages.filter((page) => page.id !== pageToDelete.id);
    setPages(updated);
    setFilteredPages(updated);
    savePages(updated);
    
    if (selectedPage?.id === pageToDelete.id) {
      setSelectedPage(null);
    }
    
    setDeleteDialogOpen(false);
    setPageToDelete(null);
    setSnackbar({ open: true, message: 'Page deleted', severity: 'success' });
  };

  const categories = ['General', 'Infrastructure', 'Pentesting', 'Tools', 'Procedures', 'References'];

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 100px)', gap: 2 }}>
      {/* Sidebar */}
      <Paper
        elevation={2}
        sx={{
          width: 300,
          minWidth: 300,
          display: 'flex',
          flexDirection: 'column',
          p: 2,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Pages</Typography>
          <Box>
            {!isConfluenceMode && (
              <IconButton size="small" onClick={handleCreate} color="primary">
                <AddIcon />
              </IconButton>
            )}
            <IconButton size="small" onClick={loadPages} color="primary">
              <RefreshIcon />
            </IconButton>
          </Box>
        </Box>

        <TextField
          fullWidth
          size="small"
          placeholder="Search pages..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
          }}
          sx={{ mb: 2 }}
        />

        <List sx={{ flex: 1, overflow: 'auto' }}>
          {filteredPages.map((page) => (
            <ListItem key={page.id} disablePadding>
              <ListItemButton
                selected={selectedPage?.id === page.id}
                onClick={() => handlePageSelect(page)}
              >
                <ListItemText
                  primary={page.title}
                  secondary={
                    <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                      <Chip label={page.category || 'General'} size="small" variant="outlined" />
                      {page.tags && Array.isArray(page.tags) && page.tags.slice(0, 2).map((tag, idx) => (
                        <Chip key={idx} label={tag} size="small" variant="outlined" />
                      ))}
                    </Box>
                  }
                />
              </ListItemButton>
              {!isConfluenceMode && (
                <Box>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(page);
                    }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPageToDelete(page);
                      setDeleteDialogOpen(true);
                    }}
                    color="error"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              )}
            </ListItem>
          ))}
          {filteredPages.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
              {searchTerm ? 'No pages match your search' : 'No pages available'}
            </Typography>
          )}
        </List>
      </Paper>

      {/* Main Content */}
      <Paper elevation={2} sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 3, overflow: 'auto' }}>
        {selectedPage ? (
          <>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h4" gutterBottom>
                {selectedPage.title}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                <Chip label={selectedPage.category || 'General'} />
                {selectedPage.tags && Array.isArray(selectedPage.tags) && selectedPage.tags.map((tag, idx) => (
                  <Chip key={idx} label={tag} size="small" />
                ))}
                {selectedPage.author && (
                  <Typography variant="caption" color="text.secondary">
                    By {selectedPage.author}
                  </Typography>
                )}
                {selectedPage.updatedAt && (
                  <Typography variant="caption" color="text.secondary">
                    Updated: {new Date(selectedPage.updatedAt).toLocaleDateString()}
                  </Typography>
                )}
              </Box>
              <Divider sx={{ mb: 2 }} />
            </Box>
            <Box
              sx={{
                '& h1': { fontSize: '2rem', fontWeight: 'bold', mb: 2, mt: 3 },
                '& h2': { fontSize: '1.5rem', fontWeight: 'bold', mb: 1.5, mt: 2 },
                '& h3': { fontSize: '1.25rem', fontWeight: 'bold', mb: 1, mt: 1.5 },
                '& p': { mb: 1.5, lineHeight: 1.6 },
                '& ul, & ol': { mb: 1.5, pl: 3 },
                '& li': { mb: 0.5 },
                '& code': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  fontFamily: 'monospace',
                },
                '& pre': {
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  padding: '12px',
                  borderRadius: '4px',
                  overflow: 'auto',
                  mb: 2,
                },
                '& pre code': {
                  backgroundColor: 'transparent',
                  padding: 0,
                },
                '& a': {
                  color: 'primary.main',
                  textDecoration: 'underline',
                },
              }}
              dangerouslySetInnerHTML={{ __html: markdownToHtml(selectedPage.content) }}
            />
          </>
        ) : (
          <Box sx={{ textAlign: 'center', mt: 8 }}>
            <Typography variant="h6" color="text.secondary">
              Select a page from the sidebar to view its content
            </Typography>
            {isConfluenceMode && (
              <Alert severity="info" sx={{ mt: 2, maxWidth: 600, mx: 'auto' }}>
                Connected to Confluence. Pages are read-only. Edit pages in Confluence.
              </Alert>
            )}
          </Box>
        )}
      </Paper>

      {/* Edit/Create Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editForm.id ? 'Edit Page' : 'Create New Page'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              fullWidth
              label="Title"
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              required
            />
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={editForm.category}
                onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                label="Category"
              >
                {categories.map((cat) => (
                  <MenuItem key={cat} value={cat}>
                    {cat}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Tags (comma-separated)"
              value={editForm.tags}
              onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
              placeholder="e.g., pentesting, methodology, tools"
            />
            <TextField
              fullWidth
              label="Content (Markdown)"
              value={editForm.content}
              onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
              multiline
              rows={15}
              placeholder="Enter markdown content here..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Page</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{pageToDelete?.title}</strong>? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} variant="contained" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Wiki;
