import axios from 'axios';

// Trello API configuration
const TRELLO_API_KEY = import.meta.env.VITE_TRELLO_API_KEY || '';
const TRELLO_API_TOKEN = import.meta.env.VITE_TRELLO_API_TOKEN || '';
const TRELLO_BOARD_ID = import.meta.env.VITE_TRELLO_BOARD_ID || '';

// Create axios instance for Trello API
const trelloApi = axios.create({
  baseURL: 'https://api.trello.com/1',
  params: {
    key: TRELLO_API_KEY,
    token: TRELLO_API_TOKEN,
  },
});

// Mock data for when API is not configured
const mockBoards = [
  {
    id: 'board-1',
    name: 'Internal Development Projects',
    lists: [
      {
        id: 'list-todo',
        name: 'To Do',
        cards: [
          {
            id: 'card-1',
            name: 'Implement user authentication system',
            desc: 'Add OAuth2 support and JWT token management for the new API gateway',
            due: '2024-02-15T00:00:00Z',
            labels: [
              { id: 'label-1', name: 'Backend', color: 'blue' },
              { id: 'label-2', name: 'High Priority', color: 'red' },
            ],
            members: ['John Doe', 'Jane Smith'],
            attachments: 2,
            checklists: 1,
          },
          {
            id: 'card-2',
            name: 'Database migration to PostgreSQL',
            desc: 'Migrate from MySQL to PostgreSQL for better performance and JSON support',
            due: '2024-02-20T00:00:00Z',
            labels: [
              { id: 'label-3', name: 'Database', color: 'green' },
            ],
            members: ['Bob Johnson'],
            attachments: 0,
            checklists: 0,
          },
          {
            id: 'card-3',
            name: 'Design new dashboard UI',
            desc: 'Create mockups and wireframes for the analytics dashboard',
            due: '2024-02-10T00:00:00Z',
            labels: [
              { id: 'label-4', name: 'Frontend', color: 'purple' },
              { id: 'label-5', name: 'Design', color: 'orange' },
            ],
            members: ['Alice Williams'],
            attachments: 5,
            checklists: 0,
          },
        ],
      },
      {
        id: 'list-in-progress',
        name: 'In Progress',
        cards: [
          {
            id: 'card-4',
            name: 'API rate limiting implementation',
            desc: 'Implement rate limiting middleware using Redis to prevent API abuse',
            due: '2024-02-05T00:00:00Z',
            labels: [
              { id: 'label-1', name: 'Backend', color: 'blue' },
              { id: 'label-6', name: 'Infrastructure', color: 'yellow' },
            ],
            members: ['John Doe', 'Charlie Brown'],
            attachments: 1,
            checklists: 2,
          },
          {
            id: 'card-5',
            name: 'Mobile app responsive design',
            desc: 'Optimize mobile app layout for tablets and smaller screens',
            due: '2024-02-12T00:00:00Z',
            labels: [
              { id: 'label-4', name: 'Frontend', color: 'purple' },
              { id: 'label-7', name: 'Mobile', color: 'pink' },
            ],
            members: ['Jane Smith', 'Alice Williams'],
            attachments: 3,
            checklists: 1,
          },
        ],
      },
      {
        id: 'list-review',
        name: 'Review',
        cards: [
          {
            id: 'card-6',
            name: 'Code review: Payment integration',
            desc: 'Review the Stripe payment integration code for security and best practices',
            due: '2024-02-03T00:00:00Z',
            labels: [
              { id: 'label-1', name: 'Backend', color: 'blue' },
              { id: 'label-2', name: 'High Priority', color: 'red' },
              { id: 'label-8', name: 'Security', color: 'black' },
            ],
            members: ['Bob Johnson', 'John Doe'],
            attachments: 0,
            checklists: 0,
          },
          {
            id: 'card-7',
            name: 'Documentation update',
            desc: 'Update API documentation with new endpoints and authentication methods',
            due: '2024-02-08T00:00:00Z',
            labels: [
              { id: 'label-9', name: 'Documentation', color: 'sky' },
            ],
            members: ['Charlie Brown'],
            attachments: 2,
            checklists: 0,
          },
        ],
      },
      {
        id: 'list-done',
        name: 'Done',
        cards: [
          {
            id: 'card-8',
            name: 'Deploy monitoring dashboard',
            desc: 'Deployed Grafana dashboard for system monitoring and alerting',
            due: '2024-01-28T00:00:00Z',
            labels: [
              { id: 'label-6', name: 'Infrastructure', color: 'yellow' },
            ],
            members: ['Bob Johnson'],
            attachments: 0,
            checklists: 0,
          },
          {
            id: 'card-9',
            name: 'Implement CI/CD pipeline',
            desc: 'Set up GitHub Actions for automated testing and deployment',
            due: '2024-01-25T00:00:00Z',
            labels: [
              { id: 'label-6', name: 'Infrastructure', color: 'yellow' },
            ],
            members: ['John Doe', 'Charlie Brown'],
            attachments: 4,
            checklists: 0,
          },
        ],
      },
    ],
  },
];

// Fetch boards from Trello API
export async function fetchTrelloBoards() {
  // If API is not configured, return mock data
  if (!TRELLO_API_KEY || !TRELLO_API_TOKEN) {
    console.log('Trello API not configured, using mock data');
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockBoards;
  }

  try {
    // If board ID is specified, fetch that board
    if (TRELLO_BOARD_ID) {
      const boardResponse = await trelloApi.get(`/boards/${TRELLO_BOARD_ID}`);
      const listsResponse = await trelloApi.get(`/boards/${TRELLO_BOARD_ID}/lists`);
      const cardsResponse = await trelloApi.get(`/boards/${TRELLO_BOARD_ID}/cards`);
      
      const board = boardResponse.data;
      const lists = listsResponse.data;
      const cards = cardsResponse.data;
      
      // Organize cards by list
      const listsWithCards = lists.map((list) => ({
        id: list.id,
        name: list.name,
        cards: cards
          .filter((card) => card.idList === list.id)
          .map((card) => ({
            id: card.id,
            name: card.name,
            desc: card.desc || '',
            due: card.due || undefined,
            labels: card.labels || [],
            members: card.members || [],
            attachments: card.badges?.attachments || 0,
            checklists: card.badges?.checkItemsChecked || 0,
          })),
      }));
      
      return [{
        id: board.id,
        name: board.name,
        lists: listsWithCards,
      }];
    }
    
    // Otherwise, fetch all boards
    const response = await trelloApi.get('/members/me/boards');
    const boards = response.data;
    
    // For each board, fetch lists and cards
    const boardsWithData = await Promise.all(
      boards.map(async (board) => {
        const listsResponse = await trelloApi.get(`/boards/${board.id}/lists`);
        const cardsResponse = await trelloApi.get(`/boards/${board.id}/cards`);
        
        const lists = listsResponse.data;
        const cards = cardsResponse.data;
        
        const listsWithCards = lists.map((list) => ({
          id: list.id,
          name: list.name,
          cards: cards
            .filter((card) => card.idList === list.id)
            .map((card) => ({
              id: card.id,
              name: card.name,
              desc: card.desc || '',
              due: card.due || undefined,
              labels: card.labels || [],
              members: card.members || [],
              attachments: card.badges?.attachments || 0,
              checklists: card.badges?.checkItemsChecked || 0,
            })),
        }));
        
        return {
          id: board.id,
          name: board.name,
          lists: listsWithCards,
        };
      })
    );
    
    return boardsWithData;
  } catch (error) {
    console.error('Error fetching Trello boards:', error);
    // Fallback to mock data on error
    return mockBoards;
  }
}

// Update a card
export async function updateTrelloCard(cardId, updates) {
  if (!TRELLO_API_KEY || !TRELLO_API_TOKEN) {
    console.log('Trello API not configured, cannot update card');
    return null;
  }

  try {
    const data = {};
    if (updates.name !== undefined) data.name = updates.name;
    if (updates.desc !== undefined) data.desc = updates.desc;
    if (updates.due !== undefined) data.due = updates.due || null;

    const response = await trelloApi.put(`/cards/${cardId}`, data);
    return {
      id: response.data.id,
      name: response.data.name,
      desc: response.data.desc || '',
      due: response.data.due || undefined,
      labels: response.data.labels || [],
      members: response.data.members || [],
      attachments: response.data.badges?.attachments || 0,
      checklists: response.data.badges?.checkItemsChecked || 0,
    };
  } catch (error) {
    console.error('Error updating Trello card:', error);
    throw error;
  }
}

// Move a card to a different list
export async function moveTrelloCard(cardId, listId) {
  if (!TRELLO_API_KEY || !TRELLO_API_TOKEN) {
    console.log('Trello API not configured, cannot move card');
    return false;
  }

  try {
    await trelloApi.put(`/cards/${cardId}`, { idList: listId });
    return true;
  } catch (error) {
    console.error('Error moving Trello card:', error);
    throw error;
  }
}

// Create a new card
export async function createTrelloCard(listId, name, desc) {
  if (!TRELLO_API_KEY || !TRELLO_API_TOKEN) {
    console.log('Trello API not configured, cannot create card');
    return null;
  }

  try {
    const response = await trelloApi.post('/cards', {
      idList: listId,
      name,
      desc: desc || '',
    });
    return {
      id: response.data.id,
      name: response.data.name,
      desc: response.data.desc || '',
      due: response.data.due || undefined,
      labels: response.data.labels || [],
      members: response.data.members || [],
      attachments: response.data.badges?.attachments || 0,
      checklists: response.data.badges?.checkItemsChecked || 0,
    };
  } catch (error) {
    console.error('Error creating Trello card:', error);
    throw error;
  }
}

// Delete a card
export async function deleteTrelloCard(cardId) {
  if (!TRELLO_API_KEY || !TRELLO_API_TOKEN) {
    console.log('Trello API not configured, cannot delete card');
    return false;
  }

  try {
    await trelloApi.delete(`/cards/${cardId}`);
    return true;
  } catch (error) {
    console.error('Error deleting Trello card:', error);
    throw error;
  }
}

// Add a label to a card
export async function addLabelToCard(cardId, labelId) {
  if (!TRELLO_API_KEY || !TRELLO_API_TOKEN) {
    return false;
  }

  try {
    await trelloApi.post(`/cards/${cardId}/idLabels`, { value: labelId });
    return true;
  } catch (error) {
    console.error('Error adding label to card:', error);
    throw error;
  }
}

// Remove a label from a card
export async function removeLabelFromCard(cardId, labelId) {
  if (!TRELLO_API_KEY || !TRELLO_API_TOKEN) {
    return false;
  }

  try {
    await trelloApi.delete(`/cards/${cardId}/idLabels/${labelId}`);
    return true;
  } catch (error) {
    console.error('Error removing label from card:', error);
    throw error;
  }
}

