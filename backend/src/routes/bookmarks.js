const express = require('express');
const router = express.Router();
const storage = require('../utils/storage');
const validate = require('../utils/validation');
const { asyncHandler } = require('../utils/errors');
const auth = require('../middleware/auth');

// Get all bookmarks
router.get('/', auth.requireAuth, asyncHandler(async (req, res) => {
  const bookmarks = await storage.getBookmarks();
  res.json({ status: 'success', data: bookmarks });
}));

// Add a new bookmark
router.post('/', auth.requireAuth, asyncHandler(async (req, res) => {
  const bookmark = validate.bookmark(req.body);
  const bookmarks = await storage.getBookmarks();
  
  // Check for duplicates
  const exists = bookmarks.some(b => 
    b.name === bookmark.name || b.url === bookmark.url
  );
  
  if (exists) {
    res.status(400).json({
      status: 'error',
      message: 'Bookmark with this name or URL already exists'
    });
    return;
  }

  bookmarks.push(bookmark);
  await storage.saveBookmarks(bookmarks);
  
  res.status(201).json({
    status: 'success',
    message: 'Bookmark added successfully',
    data: bookmark
  });
}));

// Update a bookmark
router.put('/:name', auth.requireAuth, asyncHandler(async (req, res) => {
  const bookmarkName = validate.string(req.params.name);
  const updatedBookmark = validate.bookmark(req.body);
  const bookmarks = await storage.getBookmarks();
  
  const index = bookmarks.findIndex(b => b.name === bookmarkName);
  if (index === -1) {
    res.status(404).json({
      status: 'error',
      message: 'Bookmark not found'
    });
    return;
  }

  // Check for duplicates if name or URL changed
  const duplicate = bookmarks.some((b, i) => 
    i !== index && (b.name === updatedBookmark.name || b.url === updatedBookmark.url)
  );

  if (duplicate) {
    res.status(400).json({
      status: 'error',
      message: 'Another bookmark with this name or URL already exists'
    });
    return;
  }

  bookmarks[index] = updatedBookmark;
  await storage.saveBookmarks(bookmarks);
  
  res.json({
    status: 'success',
    message: 'Bookmark updated successfully',
    data: updatedBookmark
  });
}));

// Delete a bookmark
router.delete('/:name', auth.requireAuth, asyncHandler(async (req, res) => {
  const bookmarkName = validate.string(req.params.name);
  const bookmarks = await storage.getBookmarks();
  
  const index = bookmarks.findIndex(b => b.name === bookmarkName);
  if (index === -1) {
    res.status(404).json({
      status: 'error',
      message: 'Bookmark not found'
    });
    return;
  }

  bookmarks.splice(index, 1);
  await storage.saveBookmarks(bookmarks);
  
  res.json({
    status: 'success',
    message: 'Bookmark deleted successfully'
  });
}));

module.exports = router; 