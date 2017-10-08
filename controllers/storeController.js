const mongoose = require("mongoose");
const Store = mongoose.model("Store");
const User = mongoose.model("User");
const multer = require('multer');
const jimp = require('jimp');
const uuid = require('uuid');

const multerOptions = {
  storage: multer.memoryStorage(),
  fileFilter(req, file, next) {
    const isPhoto = file.mimetype.startsWith('image/'); // What kind of file is it (image) not the extension
    if (isPhoto) {
      next(null, true); // All this means is it worked. next(value, false) would return it didn't work
    } else {
      next({ message: 'That filetype isn\'t allowed!' }, false);
    }
  }
};

exports.homePage = (req, res) => {
  res.render("index", {
    dog: "Lana"
  });
};

exports.addStore = (req, res) => {
  res.render("editStore", {
    title: "Add Store"
  })
};

exports.upload = multer(multerOptions).single('photo'); // reads the upload into memory - temporary so we can resize
exports.resize = async(req, res, next) => {
  // Check if there is no new file to resize
  if(!req.file) {
    next(); // will skip to the next middleware
    return;
  }
  const extension = req.file.mimetype.split('/')[1]; // photo file extension
  req.body.photo = `${uuid.v4()}.${extension}`;
  // now resize
  const photo = await jimp.read(req.file.buffer);
  await photo.resize(800, jimp.AUTO);
  await photo.write(`./public/uploads/${req.body.photo}`);
  // once we've have written the photo to our filesystem, keep going!
  next();
};

exports.createStore = async (req, res) => {
  req.body.author = req.user._id;
  const store = await (new Store(req.body)).save();
  req.flash("success", `Sweet, I mean delicious! You've added a new store, ${store.name}`);
  res.redirect(`/store/${store.slug}`);
};

exports.getStores = async (req, res) => {
  // in Store.js, adding hooks to .find && .findOne using an
  // autopopulate function to add 'reviews' to Store
  // pagination: updated routes to have /page/:page as well
  // mongodb .count() returns how many docs are in the db
  // but doesn't actually return the docs
  const page = req.params.page || 1; // 1 = homepage
  const limit = 6;
  const skip = (page * limit) - limit; // how many we skip when on x page
  // .sort 'desc' sorts by descending order
  const storesPromise = Store.find().skip(skip).limit(limit).sort({created: 'desc'});
  const countPromise = Store.count();
  const [ stores, count] = await Promise.all([storesPromise, countPromise]);
  const pages = Math.ceil(count / limit); // gives upperbound if remainder
  // stores.pug needs page, pages, count variables for _pagination.pug
  if (!stores.length && skip) {
    req.flash('info', `Yo, you asked for ${page}, but that doesn't exist. Instead, here is the last page, page ${pages}. You're welcome, 😎`);
    res.redirect(`/stores/page/${pages}`);
    return;
  }
  res.render("stores", { title: "Stores", stores, page, pages, count });
};

// confirm whether user is owner of store
const confirmOwner = (store, user) => {
  // must use .equals (method of ObjectId) to compare to normal string
  if (!store.author.equals(user._id)) {
    throw Error('You must own a store in order to edit it!');
  }
}

exports.editStore = async (req, res) => {
  // 1. Find the store given the ID
    // must await this becuase Store.findOne (a database request) returns a promise
  const store = await Store.findOne({ _id: req.params.id });
  // 2. Ensure the User is the owner of the store
  confirmOwner(store, req.user);
  // 3. Render out the edit form so the user can update their store
  res.render("editStore", { title: `Edit ${store.name}`, store });
};

exports.updateStore = async (req, res) => {
  // set the location data to be a point (Point isn't added when updating an existing store)
  req.body.location.type = 'Point';
  // Find and update the store
  const store = await Store.findOneAndUpdate({ _id: req.params.id}, req.body, {
    new: true, // returns the new store instead of old
    runValidators: true,
  }).exec();
  req.flash("success", `Successfully updated ${store.name}. <a href="/stores/${store.slug}">View Store</a>`);
  res.redirect(`/stores/${store._id}/edit`);
  // Redirect them to the store and tell them it worked
};

exports.getStoreBySlug = async (req, res, next) => {
  // res.json(req.params); Told me how to find the slug via res object
  // Query DB for this specific store via the store SLUG
  // .populate('author') would populate data about the author of the store (such as email)
  const store = await Store.findOne({ slug: req.params.slug }).populate('author reviews');
  // assumes getStoreBySlug is middleware and pass it along to the next step(s) in app.js (app.use)
  if (!store) return next();
  res.render('store', { store, title: store.name }) // 'store' is a template
};

exports.getStoresByTag = async (req, res) => {
  const tag = req.params.tag;
  const tagQuery = tag || { $exists: true }; // if no tag, give any store w/ a tag prop
  // to ensure our db queries are async (Fastest) we will change:
  // const tags = await Store.getTagsList(); to
  const tagsPromise = Store.getTagsList();
  const storesPromise = Store.find({ tags: tagQuery });
  // awaits multiple promises and "destructors" them into variables
  const [tags, stores] = await Promise.all([tagsPromise, storesPromise]);
  res.render('tag', { tags, title: 'Tags', tag, stores });
};


exports.searchStores = async (req, res) => {
  const stores = await Store
  // find stores that match
  .find({
    // $text searches mongoDB 'text' indexes | It has many defaults applied
    // https://docs.mongodb.com/manual/reference/operator/query/text/#op._S_text
    $text: {
      // mongoDB $text field
      $search: req.query.q
    }
  }, {
    // returns a 'textScore' metadata field for each matching document associated with query
    // https://docs.mongodb.com/manual/reference/operator/projection/meta/index.html
    score: { $meta: 'textScore' }
  })
  // sort the matches
  .sort({
    score: { $meta: 'textScore' }
  })
  // limit to only 5 results
  .limit(5);
  res.json(stores);
}

exports.mapStores = async (req, res) => {
  const coordinates = [req.query.lng, req. query.lat].map(parseFloat);
  const q = {
    // location is a mongoDB function
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates
        },
        $maxDistance: 10000 // 10km
      }
    }
  };
  // trim down what fiels we want returned - makes AJAX request faster
  const store = await Store.find(q).select('slug name description location photo').limit(10);
  res.json(store);
}

exports.mapPage = (req, res) => {
  res.render('map', { title: 'Mapsss' });
}

exports.heartStore = async (req, res) => {
  // mongoDB has overwritten the toString() method on each of the objects = list of pos. strings
  const hearts = req.user.hearts.map(obj => obj.toString());
  // if hearts includes store id, remove it ($pull - mongoDB), if not, keep it.
  // $addToSet adds, but also makes sure we don't add it if it already exists (mongoDB)
  const operator = hearts.includes(req.params.id) ? '$pull' : '$addToSet';
  const user = await User.findByIdAndUpdate(req.user._id,
    { [operator]: { hearts: req.params.id }},
    { new: true }); // new updated user
  res.json(user);
};

exports.heartsPage = async (req, res) => {
  const stores = await Store.find({
    // Where id prop of Store is in array of req.user.hearts
    _id: { $in: req.user.hearts }
  });
  res.render('stores', { title: 'Your hearts!', stores });
};

exports.getTopStores = async (req, res) => {
  const stores = await Store.getTopStores();
  res.render('topStores', { title: '💯 Top stores!', stores });
};
