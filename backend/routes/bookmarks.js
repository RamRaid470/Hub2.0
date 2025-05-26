const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const router = express.Router();
const BOOKMARKS_FILE = path.join(__dirname, '..', 'data', 'bookmarks.json');

// Initialize bookmarks file if it doesn't exist
async function initBookmarks() {
  try {
    await fs.access(BOOKMARKS_FILE);
  } catch {
    await fs.mkdir(path.dirname(BOOKMARKS_FILE), { recursive: true });
    await fs.writeFile(BOOKMARKS_FILE, JSON.stringify([], null, 2));
  }
}

// Authentication middleware
function isAuthenticated(req, res, next) {
  if (req.session && (req.session.loggedIn || req.session.authenticated)) {
    next();
  } else {
    res.status(401).json({ error: "Not authenticated" });
  }
}

// Get all bookmarks
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const data = await fs.readFile(BOOKMARKS_FILE, 'utf8');
    res.json({
      status: 'success',
      data: JSON.parse(data)
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to load bookmarks'
    });
  }
});

// Save all bookmarks
router.put('/', isAuthenticated, async (req, res) => {
  try {
    const bookmarks = req.body;
    
    if (!Array.isArray(bookmarks)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid bookmarks data'
      });
    }

    // Validate each bookmark
    for (const bookmark of bookmarks) {
      if (!bookmark.name?.trim() || !bookmark.url?.trim() || !bookmark.icon?.trim()) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid bookmark data'
        });
      }
    }

    await fs.writeFile(BOOKMARKS_FILE, JSON.stringify(bookmarks, null, 2));

    res.json({
      status: 'success',
      data: bookmarks
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to save bookmarks'
    });
  }
});

// Add new bookmark
router.post('/', isAuthenticated, async (req, res) => {
  try {
    const bookmark = req.body;
    
    if (!bookmark.name?.trim() || !bookmark.url?.trim() || !bookmark.icon?.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid bookmark data'
      });
    }

    const data = await fs.readFile(BOOKMARKS_FILE, 'utf8');
    const bookmarks = JSON.parse(data);
    
    if (bookmarks.some(b => b.name === bookmark.name)) {
      return res.status(400).json({
        status: 'error',
        message: 'Bookmark already exists'
      });
    }

    bookmarks.push(bookmark);
    await fs.writeFile(BOOKMARKS_FILE, JSON.stringify(bookmarks, null, 2));

    res.json({
      status: 'success',
      data: bookmark
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to add bookmark'
    });
  }
});

// Update a bookmark
router.put('/:bookmarkName', isAuthenticated, async (req, res) => {
  try {
    const { bookmarkName } = req.params;
    const updatedBookmark = req.body;

    if (!updatedBookmark.name?.trim() || !updatedBookmark.url?.trim() || !updatedBookmark.icon?.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid bookmark data'
      });
    }

    const data = await fs.readFile(BOOKMARKS_FILE, 'utf8');
    const bookmarks = JSON.parse(data);
    
    const index = bookmarks.findIndex(b => b.name === bookmarkName);
    if (index === -1) {
      return res.status(404).json({
        status: 'error',
        message: 'Bookmark not found'
      });
    }

    // Check for duplicates if name changed
    if (bookmarkName !== updatedBookmark.name && 
        bookmarks.some(b => b.name === updatedBookmark.name)) {
      return res.status(400).json({
        status: 'error',
        message: 'Another bookmark with this name already exists'
      });
    }

    bookmarks[index] = updatedBookmark;
    await fs.writeFile(BOOKMARKS_FILE, JSON.stringify(bookmarks, null, 2));

    res.json({
      status: 'success',
      data: updatedBookmark
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to update bookmark'
    });
  }
});

// Delete bookmark
router.delete('/:bookmarkName', isAuthenticated, async (req, res) => {
  try {
    const { bookmarkName } = req.params;

    const data = await fs.readFile(BOOKMARKS_FILE, 'utf8');
    const bookmarks = JSON.parse(data);
    
    const index = bookmarks.findIndex(b => b.name === bookmarkName);
    if (index === -1) {
      return res.status(404).json({
        status: 'error',
        message: 'Bookmark not found'
      });
    }

    bookmarks.splice(index, 1);
    await fs.writeFile(BOOKMARKS_FILE, JSON.stringify(bookmarks, null, 2));

    res.json({
      status: 'success',
      message: 'Bookmark deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete bookmark'
    });
  }
});

// Initialize on module load
initBookmarks().catch(console.error);

module.exports = router; 