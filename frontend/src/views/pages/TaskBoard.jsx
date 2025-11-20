import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Avatar,
  AvatarGroup,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Snackbar,
  CircularProgress,
  Divider,
  Autocomplete,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  CalendarToday as CalendarIcon,
  AttachFile as AttachIcon,
  Checklist as ChecklistIcon,
  Label as LabelIcon,
  DragIndicator as DragIcon,
} from '@mui/icons-material';
import {
  fetchTrelloBoards,
  createTrelloCard,
  updateTrelloCard,
  moveTrelloCard,
  deleteTrelloCard,
} from '../../models/TrelloModel';

// Label color mapping
const labelColorMap = {
  red: '#f44336',
  orange: '#ff9800',
  yellow: '#ffc107',
  green: '#4caf50',
  blue: '#2196f3',
  purple: '#9c27b0',
  pink: '#e91e63',
  black: '#424242',
  sky: '#03a9f4',
};

const AVAILABLE_LABEL_COLORS = Object.keys(labelColorMap);

const TaskBoard = () => {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [cardForm, setCardForm] = useState({
    id: '',
    name: '',
    desc: '',
    due: '',
    listId: '',
    originalListId: '',
    boardId: '',
    labels: [],
  });
  const [isTrelloMode, setIsTrelloMode] = useState(false);
  const [localStorageKey] = useState('task-board-data');
  const [draggedCard, setDraggedCard] = useState(null);
  const [dragOverList, setDragOverList] = useState(null);
  const [availableLabels, setAvailableLabels] = useState([]);

  // Load boards
  const loadBoards = async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedBoards = await fetchTrelloBoards();
      setBoards(fetchedBoards);
      
      // Extract all labels from boards for tag management
      const allLabels = new Set();
      fetchedBoards.forEach((board) => {
        board.lists?.forEach((list) => {
          list.cards?.forEach((card) => {
            card.labels?.forEach((label) => {
              if (typeof label === 'string') {
                allLabels.add(label);
              } else {
                allLabels.add(label.name || label);
              }
            });
          });
        });
      });
      setAvailableLabels(Array.from(allLabels));
      
      // Check if we're in Trello mode
      const hasApiConfig = import.meta.env.VITE_TRELLO_API_KEY && 
                          import.meta.env.VITE_TRELLO_API_TOKEN;
      setIsTrelloMode(hasApiConfig);
      
      // Load from localStorage if not in Trello mode
      if (!hasApiConfig) {
        try {
          const stored = localStorage.getItem(localStorageKey);
          if (stored) {
            const localBoards = JSON.parse(stored);
            if (localBoards.length > 0) {
              setBoards(localBoards);
              // Extract labels from local boards too
              const localLabels = new Set();
              localBoards.forEach((board) => {
                board.lists?.forEach((list) => {
                  list.cards?.forEach((card) => {
                    card.labels?.forEach((label) => {
                      if (typeof label === 'string') {
                        localLabels.add(label);
                      } else {
                        localLabels.add(label.name || label);
                      }
                    });
                  });
                });
              });
              setAvailableLabels(Array.from(localLabels));
            }
          }
        } catch (err) {
          console.error('Error loading local boards:', err);
        }
      }
    } catch (err) {
      console.error('Error loading boards:', err);
      setError('Failed to load task boards');
      setSnackbar({ open: true, message: 'Failed to load task boards', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Save boards to localStorage
  const saveBoards = (boardsToSave) => {
    try {
      localStorage.setItem(localStorageKey, JSON.stringify(boardsToSave));
    } catch (err) {
      console.error('Error saving boards:', err);
    }
  };

  // Initial load
  useEffect(() => {
    loadBoards();
  }, []);

  // Handle drag start
  const handleDragStart = (e, card, listId, boardId) => {
    setDraggedCard({ card, listId, boardId });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target);
    e.currentTarget.style.opacity = '0.5';
  };

  // Handle drag end
  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1';
    setDraggedCard(null);
    setDragOverList(null);
  };

  // Handle drag over
  const handleDragOver = (e, listId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverList(listId);
  };

  // Handle drag leave
  const handleDragLeave = () => {
    setDragOverList(null);
  };

  // Handle drop
  const handleDrop = async (e, targetListId, targetBoardId) => {
    e.preventDefault();
    setDragOverList(null);

    if (!draggedCard || draggedCard.listId === targetListId) {
      setDraggedCard(null);
      return;
    }

    const { card, listId: sourceListId, boardId: sourceBoardId } = draggedCard;

    try {
      if (isTrelloMode) {
        // Trello mode - use API
        await moveTrelloCard(card.id, targetListId);
        setSnackbar({ open: true, message: 'Card moved', severity: 'success' });
        await loadBoards();
      } else {
        // Local storage mode
        let cardToMove = null;
        let sourceBoard = null;
        
        // First pass: find and remove card from source
        const boardsAfterRemove = boards.map((board) => {
          if (board.id !== sourceBoardId) return board;
          
          sourceBoard = board;
          const updatedLists = board.lists.map((list) => {
            if (list.id === sourceListId) {
              const cardIndex = list.cards.findIndex((c) => c.id === card.id);
              if (cardIndex !== -1) {
                cardToMove = list.cards[cardIndex];
                return {
                  ...list,
                  cards: list.cards.filter((c) => c.id !== card.id),
                };
              }
            }
            return list;
          });
          
          return { ...board, lists: updatedLists };
        });
        
        // Second pass: add card to target
        const updatedBoards = boardsAfterRemove.map((board) => {
          if (board.id !== targetBoardId || !cardToMove) return board;
          
          const updatedLists = board.lists.map((list) => {
            if (list.id === targetListId) {
              return {
                ...list,
                cards: [...list.cards, cardToMove],
              };
            }
            return list;
          });
          
          return { ...board, lists: updatedLists };
        });

        setBoards(updatedBoards);
        saveBoards(updatedBoards);
        setSnackbar({ open: true, message: 'Card moved', severity: 'success' });
      }
    } catch (err) {
      console.error('Error moving card:', err);
      setSnackbar({ open: true, message: 'Failed to move card', severity: 'error' });
    } finally {
      setDraggedCard(null);
    }
  };

  // Handle create card
  const handleCreateCard = (listId, boardId) => {
    setCardForm({
      id: '',
      name: '',
      desc: '',
      due: '',
      listId,
      originalListId: '',
      boardId,
      labels: [],
    });
    setCardDialogOpen(true);
  };

  // Handle edit card
  const handleEditCard = (card, listId, boardId) => {
    setCardForm({
      id: card.id,
      name: card.name,
      desc: card.desc || '',
      due: card.due ? new Date(card.due).toISOString().split('T')[0] : '',
      listId,
      originalListId: listId,
      boardId,
      labels: card.labels || [],
    });
    setCardDialogOpen(true);
  };

  // Handle save card
  const handleSaveCard = async () => {
    if (!cardForm.name.trim()) {
      setSnackbar({ open: true, message: 'Card name is required', severity: 'error' });
      return;
    }

    try {
      if (isTrelloMode) {
        // Trello mode
        if (cardForm.id) {
          // Update existing card
          await updateTrelloCard(cardForm.id, {
            name: cardForm.name,
            desc: cardForm.desc,
            due: cardForm.due ? new Date(cardForm.due).toISOString() : null,
          });
          
          // Move card if list changed
          if (cardForm.listId !== cardForm.originalListId) {
            await moveTrelloCard(cardForm.id, cardForm.listId);
          }
          
          setSnackbar({ open: true, message: 'Card updated', severity: 'success' });
        } else {
          // Create new card
          await createTrelloCard(cardForm.listId, cardForm.name, cardForm.desc);
          setSnackbar({ open: true, message: 'Card created', severity: 'success' });
        }
        await loadBoards();
      } else {
        // Local storage mode
        const updatedBoards = boards.map((board) => {
          if (board.id !== cardForm.boardId) return board;
          
          let cardToMove = null;
          const sourceListId = cardForm.originalListId;
          
          // Find the card if updating
          if (cardForm.id && sourceListId) {
            const sourceList = board.lists.find((l) => l.id === sourceListId);
            if (sourceList) {
              cardToMove = sourceList.cards.find((c) => c.id === cardForm.id);
            }
          }
          
          const updatedLists = board.lists.map((list) => {
            if (cardForm.id) {
              // Update existing card
              if (sourceListId && list.id === sourceListId && list.id !== cardForm.listId) {
                // Remove from old list
                return {
                  ...list,
                  cards: list.cards.filter((card) => card.id !== cardForm.id),
                };
              } else if (list.id === cardForm.listId) {
                // Add to new list or update in same list
                if (sourceListId && sourceListId !== cardForm.listId && cardToMove) {
                  // Moving to this list
                  return {
                    ...list,
                    cards: [
                      ...list.cards,
                      {
                        ...cardToMove,
                        name: cardForm.name,
                        desc: cardForm.desc,
                        due: cardForm.due ? new Date(cardForm.due).toISOString() : undefined,
                        labels: cardForm.labels,
                      },
                    ],
                  };
                } else {
                  // Updating in same list
                  return {
                    ...list,
                    cards: list.cards.map((card) =>
                      card.id === cardForm.id
                        ? {
                            ...card,
                            name: cardForm.name,
                            desc: cardForm.desc,
                            due: cardForm.due ? new Date(cardForm.due).toISOString() : undefined,
                            labels: cardForm.labels,
                          }
                        : card
                    ),
                  };
                }
              }
            } else {
              // Create new card
              if (list.id === cardForm.listId) {
                return {
                  ...list,
                  cards: [
                    ...list.cards,
                    {
                      id: `card-${Date.now()}`,
                      name: cardForm.name,
                      desc: cardForm.desc,
                      due: cardForm.due ? new Date(cardForm.due).toISOString() : undefined,
                      labels: cardForm.labels || [],
                      members: [],
                      attachments: 0,
                      checklists: 0,
                    },
                  ],
                };
              }
            }
            return list;
          });
          
          return { ...board, lists: updatedLists };
        });
        
        setBoards(updatedBoards);
        saveBoards(updatedBoards);
        setSnackbar({ open: true, message: cardForm.id ? 'Card updated' : 'Card created', severity: 'success' });
      }
      
      setCardDialogOpen(false);
    } catch (err) {
      console.error('Error saving card:', err);
      setSnackbar({ open: true, message: 'Failed to save card', severity: 'error' });
    }
  };

  // Handle delete card
  const handleDeleteCard = async () => {
    if (!cardToDelete) return;

    try {
      if (isTrelloMode) {
        await deleteTrelloCard(cardToDelete.cardId);
        setSnackbar({ open: true, message: 'Card deleted', severity: 'success' });
        await loadBoards();
      } else {
        const updatedBoards = boards.map((board) => {
          if (board.id !== cardToDelete.boardId) return board;
          
          return {
            ...board,
            lists: board.lists.map((list) => ({
              ...list,
              cards: list.cards.filter((card) => card.id !== cardToDelete.cardId),
            })),
          };
        });
        
        setBoards(updatedBoards);
        saveBoards(updatedBoards);
        setSnackbar({ open: true, message: 'Card deleted', severity: 'success' });
      }
      
      setDeleteDialogOpen(false);
      setCardToDelete(null);
    } catch (err) {
      console.error('Error deleting card:', err);
      setSnackbar({ open: true, message: 'Failed to delete card', severity: 'error' });
    }
  };

  // Handle label toggle
  const handleLabelToggle = (labelName, labelColor) => {
    const currentLabels = cardForm.labels || [];
    const labelObj = { name: labelName, color: labelColor };
    const labelExists = currentLabels.some(
      (l) => (typeof l === 'string' ? l : l.name) === labelName
    );

    if (labelExists) {
      setCardForm({
        ...cardForm,
        labels: currentLabels.filter(
          (l) => (typeof l === 'string' ? l : l.name) !== labelName
        ),
      });
    } else {
      setCardForm({
        ...cardForm,
        labels: [...currentLabels, labelObj],
      });
    }
  };

  // Check if date is overdue
  const isOverdue = (dueDate) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString();
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 100px)' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', maxWidth: '100%', p: { xs: 1, sm: 2, md: 3 }, boxSizing: 'border-box' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Task Board</Typography>
        <Button startIcon={<RefreshIcon />} onClick={loadBoards} variant="outlined">
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {isTrelloMode && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Connected to Trello. Changes will sync with Trello.
        </Alert>
      )}

      {boards.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            No task boards available
          </Typography>
        </Paper>
      ) : (
        boards.map((board) => (
          <Box key={board.id} sx={{ mb: 4 }}>
            <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
              {board.name}
            </Typography>
            <Box
              sx={{
                display: 'flex',
                gap: 2,
                overflowX: 'auto',
                pb: 2,
                '&::-webkit-scrollbar': {
                  height: 8,
                },
                '&::-webkit-scrollbar-track': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                },
                '&::-webkit-scrollbar-thumb': {
                  backgroundColor: 'rgba(255, 255, 255, 0.3)',
                  borderRadius: 4,
                },
              }}
            >
              {board.lists?.map((list) => (
                <Paper
                  key={list.id}
                  elevation={dragOverList === list.id ? 8 : 2}
                  onDragOver={(e) => handleDragOver(e, list.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, list.id, board.id)}
                  sx={{
                    minWidth: 300,
                    maxWidth: 300,
                    display: 'flex',
                    flexDirection: 'column',
                    p: 2,
                    transition: 'all 0.2s ease-in-out',
                    backgroundColor: dragOverList === list.id ? 'rgba(255, 23, 68, 0.1)' : undefined,
                    border: dragOverList === list.id ? '2px dashed rgba(255, 23, 68, 0.5)' : '2px solid transparent',
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">{list.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {list.cards?.length || 0}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ flex: 1, overflowY: 'auto', mb: 2, minHeight: 100 }}>
                    {list.cards?.map((card, index) => (
                      <Card
                        key={card.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, card, list.id, board.id)}
                        onDragEnd={handleDragEnd}
                        sx={{
                          mb: 1.5,
                          cursor: 'grab',
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                          '&:hover': {
                            boxShadow: 6,
                            transform: 'translateY(-2px)',
                          },
                          '&:active': {
                            cursor: 'grabbing',
                          },
                          animation: draggedCard?.card.id === card.id ? 'none' : 'fadeIn 0.3s ease-in',
                          '@keyframes fadeIn': {
                            from: {
                              opacity: 0,
                              transform: 'translateY(-10px)',
                            },
                            to: {
                              opacity: 1,
                              transform: 'translateY(0)',
                            },
                          },
                        }}
                        onClick={() => handleEditCard(card, list.id, board.id)}
                      >
                        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 }, position: 'relative' }}>
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                            <DragIcon
                              sx={{
                                color: 'text.secondary',
                                fontSize: 18,
                                mt: 0.5,
                                cursor: 'grab',
                                opacity: 0.5,
                                '&:hover': { opacity: 1 },
                              }}
                            />
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 500 }}>
                                {card.name}
                              </Typography>
                              
                              {card.desc && (
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                  sx={{
                                    mb: 1,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                  }}
                                >
                                  {card.desc}
                                </Typography>
                              )}

                              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                                {card.labels?.map((label, idx) => {
                                  const labelName = typeof label === 'string' ? label : label.name;
                                  const labelColor = typeof label === 'string' ? 'blue' : (label.color || 'blue');
                                  return (
                                    <Chip
                                      key={idx}
                                      label={labelName}
                                      size="small"
                                      sx={{
                                        backgroundColor: labelColorMap[labelColor] || labelColor || 'primary.main',
                                        color: 'white',
                                        height: 20,
                                        fontSize: '0.7rem',
                                        fontWeight: 500,
                                        '&:hover': {
                                          opacity: 0.8,
                                        },
                                      }}
                                    />
                                  );
                                })}
                              </Box>

                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                                  {card.due && (
                                    <Chip
                                      icon={<CalendarIcon sx={{ fontSize: 14 }} />}
                                      label={formatDate(card.due)}
                                      size="small"
                                      color={isOverdue(card.due) ? 'error' : 'default'}
                                      sx={{ height: 24, fontSize: '0.7rem' }}
                                    />
                                  )}
                                  {card.attachments > 0 && (
                                    <Tooltip title={`${card.attachments} attachment(s)`}>
                                      <Chip
                                        icon={<AttachIcon sx={{ fontSize: 14 }} />}
                                        label={card.attachments}
                                        size="small"
                                        sx={{ height: 24, fontSize: '0.7rem' }}
                                      />
                                    </Tooltip>
                                  )}
                                  {card.checklists > 0 && (
                                    <Tooltip title={`${card.checklists} checklist(s)`}>
                                      <Chip
                                        icon={<ChecklistIcon sx={{ fontSize: 14 }} />}
                                        label={card.checklists}
                                        size="small"
                                        sx={{ height: 24, fontSize: '0.7rem' }}
                                      />
                                    </Tooltip>
                                  )}
                                </Box>
                                {card.members && card.members.length > 0 && (
                                  <AvatarGroup max={3} sx={{ '& .MuiAvatar-root': { width: 24, height: 24, fontSize: '0.7rem' } }}>
                                    {card.members.map((member, idx) => (
                                      <Avatar key={idx} sx={{ width: 24, height: 24, fontSize: '0.7rem' }}>
                                        {typeof member === 'string' ? member.charAt(0).toUpperCase() : (member.initials || '?')}
                                      </Avatar>
                                    ))}
                                  </AvatarGroup>
                                )}
                              </Box>
                            </Box>
                          </Box>

                          <Box
                            sx={{
                              display: 'flex',
                              justifyContent: 'flex-end',
                              gap: 0.5,
                              mt: 1,
                              pt: 1,
                              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Tooltip title="Edit">
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditCard(card, list.id, board.id);
                                }}
                                sx={{ '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' } }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCardToDelete({ cardId: card.id, cardName: card.name, boardId: board.id });
                                  setDeleteDialogOpen(true);
                                }}
                                color="error"
                                sx={{ '&:hover': { backgroundColor: 'rgba(244, 67, 54, 0.1)' } }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
                    {list.cards?.length === 0 && (
                      <Box
                        sx={{
                          p: 3,
                          textAlign: 'center',
                          border: '2px dashed rgba(255, 255, 255, 0.1)',
                          borderRadius: 1,
                          color: 'text.secondary',
                        }}
                      >
                        <Typography variant="caption">Drop cards here</Typography>
                      </Box>
                    )}
                  </Box>

                  <Button
                    fullWidth
                    startIcon={<AddIcon />}
                    onClick={() => handleCreateCard(list.id, board.id)}
                    variant="outlined"
                    size="small"
                    sx={{
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: 2,
                      },
                    }}
                  >
                    Add Card
                  </Button>
                </Paper>
              ))}
            </Box>
          </Box>
        ))
      )}

      {/* Card Edit/Create Dialog */}
      <Dialog open={cardDialogOpen} onClose={() => setCardDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{cardForm.id ? 'Edit Card' : 'Create New Card'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              fullWidth
              label="Card Name"
              value={cardForm.name}
              onChange={(e) => setCardForm({ ...cardForm, name: e.target.value })}
              required
              autoFocus
            />
            <TextField
              fullWidth
              label="Description"
              value={cardForm.desc}
              onChange={(e) => setCardForm({ ...cardForm, desc: e.target.value })}
              multiline
              rows={4}
            />
            <TextField
              fullWidth
              label="Due Date"
              type="date"
              value={cardForm.due}
              onChange={(e) => setCardForm({ ...cardForm, due: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
            
            {/* Label Management */}
            <Box>
              <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LabelIcon fontSize="small" />
                Labels
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                {AVAILABLE_LABEL_COLORS.map((color) => (
                  <Tooltip key={color} title={`Add ${color} label`}>
                    <Chip
                      label={color}
                      size="small"
                      onClick={() => {
                        const labelName = prompt('Enter label name:', '');
                        if (labelName) {
                          handleLabelToggle(labelName, color);
                        }
                      }}
                      sx={{
                        backgroundColor: labelColorMap[color],
                        color: 'white',
                        cursor: 'pointer',
                        '&:hover': {
                          opacity: 0.8,
                          transform: 'scale(1.05)',
                        },
                        transition: 'all 0.2s ease-in-out',
                      }}
                    />
                  </Tooltip>
                ))}
              </Box>
              
              {/* Selected Labels */}
              {cardForm.labels && cardForm.labels.length > 0 && (
                <Box>
                  <Typography variant="caption" color="text.secondary" gutterBottom>
                    Selected Labels:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                    {cardForm.labels.map((label, idx) => {
                      const labelName = typeof label === 'string' ? label : label.name;
                      const labelColor = typeof label === 'string' ? 'blue' : (label.color || 'blue');
                      return (
                        <Chip
                          key={idx}
                          label={labelName}
                          size="small"
                          onDelete={() => handleLabelToggle(labelName, labelColor)}
                          sx={{
                            backgroundColor: labelColorMap[labelColor] || labelColor || 'primary.main',
                            color: 'white',
                            '& .MuiChip-deleteIcon': {
                              color: 'white',
                            },
                          }}
                        />
                      );
                    })}
                  </Box>
                </Box>
              )}
            </Box>

            {cardForm.id && (
              <FormControl fullWidth>
                <InputLabel>Move to List</InputLabel>
                <Select
                  value={cardForm.listId}
                  onChange={(e) => setCardForm({ ...cardForm, listId: e.target.value })}
                  label="Move to List"
                >
                  {boards
                    .find((b) => b.id === cardForm.boardId)
                    ?.lists?.map((list) => (
                      <MenuItem key={list.id} value={list.id}>
                        {list.name}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCardDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveCard} variant="contained">
            {cardForm.id ? 'Save' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Card</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{cardToDelete?.cardName}</strong>? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteCard} variant="contained" color="error">
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

export default TaskBoard;
