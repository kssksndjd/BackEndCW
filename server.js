const express = require('express');
const app = express();
app.use(express.json());
const cors = require("cors");
app.use(cors());
const path = require('path');
//anythingg
let propertiesReader = require("properties-reader");
let propertiesPath = path.resolve(__dirname, "conf/db.properties");
let properties = propertiesReader(propertiesPath);
let dbPprefix = properties.get("db.prefix");
//URL-Encoding of User and PWD
//for potential special characters
let dbUsername = encodeURIComponent(properties.get("db.user"));
let dbPwd = encodeURIComponent(properties.get("db.pwd"));
let dbName = properties.get("db.dbName");
let dbUrl = properties.get("db.dbUrl");
let dbParams = properties.get("db.params");
const uri = dbPprefix + dbUsername + ":" + dbPwd + dbUrl + dbParams;

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });
let db = client.db(dbName);

app.param('collectionName', function(req, res, next, collectionName) {
    req.collection = db.collection(collectionName);
    return next();
});

// GET /search route to handle search queries
app.get('/search', async (req, res) => {
    try {
        const { query } = req.query; // Extract the search query from the request parameters

        // Check if a query is provided
        if (!query) {
            return res.status(400).json({ error: 'No search query provided' });
        }

        // Perform a case-insensitive search on multiple fields
        const results = await db.collection('lessons').find({
            $or: [
                { subject: { $regex: query, $options: 'i' } },
                { location: { $regex: query, $options: 'i' } },
                { price: { $regex: query, $options: 'i' } },
                { spaces: { $regex: query, $options: 'i' } }
            ]
        }).toArray();

        // Return the search results
        res.json(results);
    } catch (error) {
        console.error('Error handling search request:', error);
        res.status(500).json({ error: 'Failed to perform search' });
    }
});


// Logger middleware
app.use((req, res, next) => {
    const currentTime = new Date().toISOString(); // Get the current timestamp
    console.log(`[${currentTime}] ${req.method} ${req.url}`); // Log the method and URL

    // Log the request body if it exists (for POST/PUT requests)
    if (req.method === 'POST' || req.method === 'PUT') {
        console.log('Request Body:', req.body);
    }

    next(); // Pass control to the next middleware or route
});


app.get('/collections/:collectionName', function(req, res, next) {
    req.collection.find({}).toArray(function(err, results) {
        if (err) {
            return next(err);
        }
        res.send(results);
    });
});

app.post('/collections/:collectionName'
    , function(req, res, next) {
        // TODO: Validate req.body
        req.collection.insertOne(req.body, function(err, results) {
            if (err) {
                return next(err);
            }
            res.send(results);
        });
    });


app.put('/collections/:collectionName/:id'
    , function(req, res, next) {
        // TODO: Validate req.body
        req.collection.updateOne({_id: new ObjectId(req.params.id)},
            {$set: req.body},
            {safe: true, multi: false}, function(err, result) {
                if (err) {
                    return next(err);
                } else {
                    res.send((result.matchedCount === 1) ? {msg: "success"} : {msg: "error"});
                }
            }
        );
    });



// Handle all other routes with a 404 error
app.use((req, res) => res.status(404).send('Operation not available'));

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, function() {
    console.log("App started on port: " + port);
});