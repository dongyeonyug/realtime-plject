const express = require('express');

const { createUser, getUser, updateUser, deleteUser } = require('../controllers/userController');

const router = express.Router();

// POST /api/save-temp 요청을 처리
router.post('/user', createUser);

router.get('/users/:userid', getUser);

router.put('/update_user/:userid', updateUser);

router.delete('/delete_user/:userid', deleteUser);

module.exports = {
  routes: router
};