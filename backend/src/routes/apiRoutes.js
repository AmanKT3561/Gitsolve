'use strict';
const express = require('express');
const auth = require('../middlewares/authMiddleware');
const ctrl = require('../controllers/submissionController');

const router = express.Router();

router.use(auth); // everything under /api requires a valid JWT

router.get('/me', ctrl.getMe);
router.post('/submissions', ctrl.createSubmission);
router.get('/submissions', ctrl.listSubmissions);
router.get('/submissions/:id', ctrl.getSubmission);
router.get('/statistics', ctrl.getStatistics);

module.exports = router;
