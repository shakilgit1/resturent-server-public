const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require('jsonwebtoken');
const app = express();
const cookieParser = require('cookie-parser');
require("dotenv").config();
const port = process.env.PORT || 5000;

// middleware
app.use(cors({
  origin: ["http://localhost:5173"],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xvn4ffv.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});


const verifyToken = async(req, res, next) =>{
  const token = req?.cookies?.token;
  // console.log(req);
  if(!token){
    return res.status(401).send({message: 'not authorized'})
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) =>{
    if(err){
      return res.status(401).send({message: 'Unauthorized'})
    }

    req.user = decoded;
    next();
  })
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const foodCollections = client.db("pizzanDB").collection("allFoods");
    const myCartCollections = client.db("pizzanDB").collection("myCarts");
    const usersCollections = client.db("pizzanDB").collection("users");
    // const myFoodCollections = client.db("pizzanDB").collection("myFoods");


    // jwt related api
    app.post('/jwt', (req, res) => {
      const user = req.body;
      // console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1h'})
      // console.log(token);
      res
      .cookie('token', token, {
        httpOnly: true,
        secure: false
      })
      .send({success: true});
    })

    app.post('/logout', async(req, res) =>{
      // const user = req.body;
      res.clearCookie('token', {maxAge: 0}).send({success:true});
    })

    // get all foods
    
    app.get("/foods", async (req, res) => {
       const page = parseInt(req.query.page);
       const size = parseInt(req.query.size);
       let queryObj = {}
       let sortObj = {};
      //  const category = req.query.category;
       const email = req.query.email;
       const sortField = req.query.sortField;
       const sortOrder = req.query.sortOrder;
       if(email){
        queryObj.email = email
       }
       if(sortField && sortOrder){
         sortObj[sortField] = sortOrder;
       }
       const result = await foodCollections
         .find(queryObj).sort(sortObj)
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
    app.post('/foods', async(req, res) => {
      const food = req.body;
      const result = await foodCollections.insertOne(food);
      res.send(result)
    })
    //find food
    app.get("/foods/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await foodCollections.findOne(query);
      res.send(result);
    });
    // 
    app.patch("/foods/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedCount = req.body.order_count;
      const updatedQuantity = req.body.quantity;

      const updatedDoc = {
        $set: {
          order_count: updatedCount,
          quantity: updatedQuantity,
        },
      };
      const result = await foodCollections.updateOne(filter, updatedDoc);
      res.send(result);
    });
    app.put("/foods/:id", async (req, res) => {
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const options = { upsert: true };
      const updateProduct = req.body;
      
      const updateDoc = {
        $set: {
          name: updateProduct.name,
          made_by: updateProduct.made_by,
          description: updateProduct.description,
          origin: updateProduct.origin,
          image: updateProduct.image,
          price: updateProduct.price,
          category: updateProduct.category,
          email: updateProduct.email,
          order_count: updateProduct.order_count,
          quantity: updateProduct.quantity,
        },
      };
    const result = await foodCollections.updateOne(filter, updateDoc, options);
    res.send(result);
    });

    // purchase food
    app.post("/mycarts", async (req, res) => {
      const user = req.body;
      const result = await myCartCollections.insertOne(user);
      res.send(result);
    });
    app.get("/mycarts", verifyToken, async (req, res) => {

      if(req.query.email !== req.user.email){
        res.status(403).send({message: 'forbidden access'})
      }

      let query = {};
      if(req.query?.email){
          query = {email: req.query.email}
      }
      const result = await myCartCollections.find(query).toArray();
      res.send(result);
    });
    app.delete('/mycarts/:id', async(req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await myCartCollections.deleteOne(query);
      res.send(result);
    })

    // my added food 
    // app.post('/add-food', async(req, res) => {
    //   const food = req.body;
    //   const result = await myFoodCollections.insertOne(food);
    //   res.send(result)
    // })

    // post new users
    app.post('/users', async(req, res) =>{
      const user = req.body;
      const result = await usersCollections.insertOne(user);
      res.send(result)
    })

    app.get('/users', async(req, res) =>{
      const cursor = usersCollections.find()
      const result = await cursor.toArray();
      res.send(result)
    })
    app.get('/users/:admin_id', async(req, res) =>{
      const id = req.params.admin_id;
      // console.log(id);
      const query = {admin_id: id}
      const result =await usersCollections.findOne(query)
      res.send(result)
    })
    
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
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
