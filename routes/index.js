const express = require('express');
const router = express.Router();
const storeController = require('../controllers/storeController');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const reviewController = require('../controllers/reviewController');
const { catchErrors } = require('../handlers/errorHandlers');

// API
router.get('/api/v1/search', catchErrors(storeController.searchStores)); // API endpoint
router.get('/api/v1/stores/near', catchErrors(storeController.mapStores));
router.post('/api/v1/stores/:id/heart', catchErrors(storeController.heartStore));

// STORES
router.get('/', catchErrors(storeController.getStores));
router.get('/stores', catchErrors(storeController.getStores));
router.get('/stores/page/:page', catchErrors(storeController.getStores));
// Ensure user is logged in before being able to add store
router.get('/add',
  authController.isLoggedIn,
  storeController.addStore
);
router.post('/add',
    storeController.upload,
    catchErrors(storeController.resize),
    catchErrors(storeController.createStore)
);
router.post('/add/:id',
    storeController.upload,
    catchErrors(storeController.resize),
    catchErrors(storeController.updateStore)
);
router.get('/stores/:id/edit', catchErrors(storeController.editStore));
router.get('/store/:slug', catchErrors(storeController.getStoreBySlug));
router.post('/reviews/:id',
  authController.isLoggedIn,
  catchErrors(reviewController.addReview)
);
router.get('/top', catchErrors(storeController.getTopStores));

// TAGS
router.get('/tags', catchErrors(storeController.getStoresByTag));
// /tags/:tag is for when a user selects a tag (changes URL)
router.get('/tags/:tag', catchErrors(storeController.getStoresByTag));

// REGISTER
router.get('/register', userController.registerForm);
// 1. validate registration data
// 2. register the user
// 3. log them in
router.post('/register',
  userController.validateRegister,
  userController.register,
  authController.login
);

// LOGIN
router.get('/login', userController.loginForm);
router.post('/login', authController.login);

// LOGOUT
router.get('/logout', authController.logout);

// ACCOUNT
router.get('/account',
  authController.isLoggedIn,
  userController.account
);
router.post('/account', catchErrors(userController.updateAccount)); // must wrap in catchErrors since it uses Async/Await (DB)
router.post('/account/forgot', catchErrors(authController.forgot));
router.get('/account/reset/:token', catchErrors(authController.reset));
router.post('/account/reset/:token',
  authController.confirmPasswords,
  catchErrors(authController.update)
);
router.get('/hearts',
  authController.isLoggedIn,
  storeController.heartsPage
);

// MAP
router.get('/map', storeController.mapPage);

module.exports = router;
