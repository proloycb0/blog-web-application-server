const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

// middleware 
app.use(cors());
app.use(express.json());

// connect mongodb
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.1xlxnhx.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'unAuthorized Access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        next();
    });
}
async function run() {
    try {
        await client.connect();

        const blogsCollection = client.db('blogUser').collection('blogs');
        const usersCollection = client.db('blogUser').collection('users');
        const archiveCollection = client.db('blogUser').collection('archive');
        const trashCollection = client.db('blogUser').collection('trash');

        // user api

        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d' });
            res.send({ result, token });
        });

        // blogs api 

        app.get('/blog', verifyJWT, async (req, res) => {
            const userEmail = req.query.userEmail;
            const decodedEmail = req.decoded.email;
            if (userEmail === decodedEmail) {
                const query = { userEmail: userEmail };
                const blogs = await blogsCollection.find(query).toArray();
                res.send(blogs);
            }
        });
        app.get('/blogs', verifyJWT, async (req, res) => {
            const result = await blogsCollection.find().toArray();
            const blogs = result.reverse();
            res.send(blogs);
        });
        app.post('/blogs', async (req, res) => {
            const blogs = req.body;
            const trashDelete = await trashCollection.deleteOne(blogs)
            const result = await blogsCollection.insertOne(blogs);
            res.send(result);
        });

        app.put('/blog/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const blogs = req.body;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true }
            const updateDoc = {
                $set: blogs
            }
            const result = await blogsCollection.updateOne(filter, updateDoc, options);
            res.send(result);
        });

        app.delete('/blogs/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const blogTrash = req.body;
            const filter = { _id: ObjectId(id) };
            const trash = await trashCollection.insertOne(blogTrash)
            const result = await blogsCollection.deleteOne(filter);
            res.send(result);
        });

        // archive api
        app.get('/archive', verifyJWT, async (req, res) => {
            const result = await archiveCollection.find().toArray();
            res.send(result);
        });
        app.post('/archive', verifyJWT, async (req, res) => {
            const blog = req.body;
            const result = await archiveCollection.insertOne(blog);
            res.send(result);
        });

        app.delete('/archive/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await archiveCollection.deleteOne(filter);
            res.send(result);
        });

        // trash api
        app.get('/trash', verifyJWT, async (req, res) => {
            const result = await trashCollection.find().toArray();
            res.send(result);
        });

        app.delete('/trash/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await trashCollection.deleteOne(filter);
            res.send(result);
        });

    } finally {

    }
}

run().catch(console.dir);
app.get('/', (req, res) => {
    res.send('Hello from kep blogger application')
});

app.listen(port, () => {
    console.log(`Kep Blogger app listening on port ${port}`)
});