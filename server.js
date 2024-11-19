const express = require('express');
const app = express();
app.use(express.json());
const cors = require("cors");
app.use(cors());
const path = require('path');

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

app.get('/collections/:collectionName', function(req, res, next) {
    req.collection.find({}).toArray(function(err, results) {
        if (err) {
            return next(err);
        }
        res.send(results);
    });
});

app.post('/orders', async (req, res) => {
  const order = req.body;

  // Validate the incoming data
  if (!order.name || !order.phone || !Array.isArray(order.items)) {
    return res.status(400).json({ error: 'Invalid order data' });
  }

  // Save the order in the 'orders' collection
  await db.collection('orders').insertOne(order);
  res.json({ status: 'Order created' });
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
app.listen(3000, () => console.log('Server running on port 3000'));
