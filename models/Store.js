const mongoose = require("mongoose");
mongoose.Promise = global.Promise;
const slug = require("slugs");

const storeSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: "Please enter a store name!"
  },
  slug: String,
  description: {
    type: String,
    trim: true
  },
  tags: [String],
  created: {
    type: Date,
    default: Date.now
  },
  location: {
    type: {
      type: String,
      default: "Point"
    },
    coordinates: [
      {
        type: Number,
        requied: "You must supply coordinates!"
      }
    ],
    address: {
      type: String,
      required: "You must supply an address!"
    }
  },
  photo: String,
  author: {
    type: mongoose.Schema.ObjectId,
    ref: 'User', // ref tells mongoDB objectId is going to be referenced to 'User'
    required: 'You must supply an author'
  }
}, {
  toJSON: { virtuals: true }, // will display virtuals in json
  toObject: { virtuals: true } // will display virtuals in objs
});

// Define indexes - name/description will be searched often
// creates a compound index
// 'text' allows us to search indexes as 'text' super fast
storeSchema.index({
  name: 'text',
  description: 'text'
});

// create a 'geospatial' index
// https://docs.mongodb.com/manual/geospatial-queries/#geospatial-indexes
storeSchema.index({
  location: '2dsphere'
});

storeSchema.pre("save", async function(next) {
  if (!this.isModified("name")) {
    return next(); // stops this function from running if name hasn't changed
  }
  this.slug = slug(this.name);
  // find other stores that hav e a slug of wes, wes-1, wes-2
  const slugRegEx = new RegExp(`^(${this.slug})((-[0-9]*$)?)$`, 'i');
  // this.constructor.find is equal to Store.find by the time it runs
  // Store doesn't exist yet
  const storesWithSlug = await this.constructor.find({ slug: slugRegEx });
  // adds 1 to the this.slug-x to create a unique slug
  if (storesWithSlug.length) {
    this.slug = `${this.slug}-${storesWithSlug.length + 1}`;
  }
  next();

  // TODO: make more resilient so slugs are unique
});

// add a db method to our schema
storeSchema.statics.getTagsList = function() {
  return this.aggregate([
    // takes a bunch of operators to help us look...
    // https://docs.mongodb.com/manual/reference/operator/aggregation/
    // unwind separates each store into multiple 'stores'(objects) by there tags tag
    { $unwind: '$tags' }, // $ means a field on my document
    /* 1. creates groups by $tags
     * 2. create new field (key) in each group called count
     * 3. each time a store item is put into a tag group that group's
     * count key value is increased by 1.
     */
    { $group: { _id: '$tags', count: { $sum: 1 } } },
    // sorts the groups from by highest count to lowest
    { $sort: { count: -1 } }
  ]);
};

storeSchema.statics.getTopStores = function() {
  // query function (more complex than .find) | returns promise |
  // low-level mongo function | can't access virtual fields
  return this.aggregate([
    // lookup stores and populate reviews
    {
      $lookup: {
        from: 'reviews', // like ref (lowercases Review and adds an 's')
        localField: '_id',
        foreignField: 'store',
        as: 'reviews' // returns a field named 'reviews' w/ data
      }
    },
    // filter for only items that have 2+ reviews
    {
      $match: {
        'reviews.1': { // (in mongeDB) where 2nd item in reviews = true
          $exists: true
        }
      }
    },
    // add the average reviews field
    /*
    * NOTE:
    * mongoDB 3.2 (mLab):
    * $project will add a new field,
    * but "detele" your existing fields from your aggregate.
    *
    * mongoDB 3.4:
    * $addField will add a new field
    * your existing document while retaining your existing fields.
    */
    {
      $project: { // add a field
        photo: '$$ROOT.photo',
        name: '$$ROOT.name',
        reviews: '$$ROOT.reviews',
        slug: '$$ROOT.slug',
        averageRating: {
          // $reviews = field from the data being piped in ||
          $avg: '$reviews.rating' // average of reviews rating field
        }
      }
    },
    // sort it by our new field, highest reviews first
    {
      $sort: {
        averageRating: -1
      }
    },
    // limit to at most 10
    {
      $limit: 5
    }
  ]);
}

// find reviews where stores _id prop === reviews store prop (not saving any realationship between the two)
// virtuals don't show up in data, but they are there if explicitly asked for (ie. store.reviews)
storeSchema.virtual('reviews', {
  ref: 'Review', // what model to link
  localField: '_id', // which field on the store
  foreignField: 'store' // matches up with which field on review
});

function autopopulate(next) {
  this.populate('reviews');
  next();
}

// adds HOOKS to whenever doing .find or .findOne
storeSchema.pre('find', autopopulate);
storeSchema.pre('findOne', autopopulate);

module.exports = mongoose.model("Store", storeSchema);
