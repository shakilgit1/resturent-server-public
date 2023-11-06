const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
require("dotenv").config();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

// console.log(process.env.DB_USER, process.env.DB_PASS);

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xvn4ffv.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const foodCollections = client.db("pizzanDB").collection("allFoods");
    const myCartCollections = client.db("pizzanDB").collection("myCarts");

    // get all foods
    app.get("/foods", async (req, res) => {
       const page = parseInt(req.query.page);
       const size = parseInt(req.query.size);
       const result = await foodCollections
         .find()
         .skip(page * size)
         .limit(size)
         .toArray();
      res.send(result);
    });
    //find foods count
    app.get("/foodsCount", async (req, res) => {
      const count = await foodCollections.estimatedDocumentCount();
      res.send({ count });
    });

    app.get("/foods/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await foodCollections.findOne(query);
      res.send(result);
    });

    app.patch("/foods/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedCount = req.body.order_count;
      const updatedQuantity = req.body.order_count;

      const updatedDoc = {
        $set: {
          order_count: updatedCount,
          quantity: updatedQuantity,
        },
      };
      const result = await foodCollections.updateOne(filter, updatedDoc);
      res.send(result);
    });

    // purchase food
    app.post("/mycarts", async (req, res) => {
      const user = req.body;
      const result = await myCartCollections.insertOne(user);
      res.send(result);
    });
    app.get("/mycarts", async (req, res) => {

      let query = {};
      if(req.query?.email){
          query = {email: req.query.email}
      }
      const result = await myCartCollections.find(query).toArray();
      res.send(result);
    });

    

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Pizzan website");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
