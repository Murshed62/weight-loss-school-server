require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// middleware

app.use(cors());
app.use(express.json());

//verify JWT

const verifyJWT=(req,res,next)=>{
  const authorization=req.headers.authorization;
  if(!authorization){
    return res.status(401).send({error:true,message:'unauthorized access'})
  }
  const token=authorization.split(' ')[1];
  jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,decoded)=>{
    if(err){
      return res.status(401).send({error:true, message:'unauthorized access'})
    }
    req.decoded=decoded;

    next();
  })
 }


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.cpvz2.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    //all collections
    const usersCollection = client.db('slimFitAcademy').collection('users');
    const addClassCollection = client.db('slimFitAcademy').collection('addClass');
    const selectedCollection = client.db('slimFitAcademy').collection('selected');
    const paymentCollection = client.db('slimFitAcademy').collection('payments');

    app.post('/jwt',(req,res)=>{
      const user=req.body;
      const jwtToken=jwt.sign(user,process.env.ACCESS_TOKEN_SECRET,{expiresIn:'6h'})
      res.send({jwtToken})
    })

    //verify admin
    const verifyAdmin = async(req, res, next)=>{
      const email = req.decoded.email;
      const query = {email: email}
      const user = await usersCollection.findOne(query);
      if(user?.role !== 'admin'){
        return res.status(403).send({error:true, message: 'forbidden message'});
      }
      next();
    }

    app.get('/users', async(req, res)=>{
      const result = await usersCollection.find().toArray();
      res.send(result);
    })

    app.post('/users', async(req,res)=>{
      const user = req.body;
      const query = {email: user.email}
      const existingUser = await usersCollection.findOne(query);
      if(existingUser){
        return res.send({message: 'user already exists'})
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    })

// =================================
// Admin get   db Section Part start
// =================================
    app.get('/users/admin/:email', async (req, res)=>{
      const email = req.params?.email;
      
      // if(req.decoded?.email !== email){
      //   res.send({admin:false})
      // }
      const query = {email: email}
      const user = await usersCollection.findOne(query);
      const result = {admin: user?.role === 'admin'}
      res.send(result);
    })

    app.patch('/users/admin/:id', async (req, res)=>{
      const id = req.params.id;
      
      const filter = {_id: new ObjectId(id)};
      const updateDocs = {
        $set: {
          role: 'admin'
        },
      };
      const result = await usersCollection.updateOne(filter, updateDocs);
      res.send(result);
    })

// ==============================================
// Instructor role update   db Section Part start
// ==============================================

app.get('/users/instructor/:email', async (req, res)=>{
  const email = req.params?.email;
  
  // console.log(req.decoded?.email);
  // if(req.decoded?.email !== email){
  //   res.send({instructor:false})
  // }
  const query = {email: email}
  const user = await usersCollection.findOne(query);
  const result = {instructor: user?.role === 'instructor'}
  res.send(result);
})

app.patch('/users/instructor/:id',async(req,res)=>{
  const id=req.params.id;
  const filter={_id:new ObjectId(id)}
  const updateDoc={
    $set:{
     role:'instructor'
    }
  }
  const result=await usersCollection.updateOne(filter,updateDoc)
  res.send(result);
})
// =================
// for student start
// =================
app.get('/users/student/:email', async (req, res)=>{
  const email = req.params?.email;
  
  // console.log(req.decoded?.email);
  // if(req.decoded?.email !== email){
  //   res.send({student:false})
  // }
  const query = {email: email}
  const user = await usersCollection.findOne(query);
  const result = {student: user?.role === 'student'}
  res.send(result);
})

app.patch('/users/student/:id',async(req,res)=>{
  const id=req.params.id;
  const filter={_id:new ObjectId(id)}
  const updateDoc={
    $set:{
     role:'student'
    }
  }
  const result=await usersCollection.updateOne(filter,updateDoc)
  res.send(result)
})
// =====================
// student section ended
// =====================




// ============================================
// Instructor role update   db Section Part end
// ============================================

    // =====================================
// Admin role update   db Section Part start
// =========================================

app.patch('/users/admin/:id',async(req,res)=>{
  const id=req.params.id;
  const filter={_id:new ObjectId(id)}
  const updateDoc={
    $set:{
     role:'admin'
    }
  }
  const result=await usersCollection.updateOne(filter,updateDoc)
  res.send(result)
})


// =======================================
// Admin role update   db Section Part end
// =======================================

// ===================================
// Add a class   db Section Part start
// ===================================
app.post('/addclass', async(req,res)=>{
  const addClass = req.body;
  const result = await addClassCollection.insertOne(addClass);
  res.send(result);
})

app.get('/addclass', async(req,res)=>{
  let query = {}
  if(req.query?.email){
    query = {email :req.query?.email}
  }
  const result = await addClassCollection.find(query).toArray();
 
  res.send(result);
})
// instructor single class update status section per start
app.patch('/addclass/:id', async(req,res)=>{
  const id=req.params.id;
  console.log(id);
  const filter={_id:new ObjectId(id)}
  const updateClasses = req.body;
  const updateDoc={
    $set:{
      status:updateClasses.status
    }
  }
  const result=await addClassCollection.updateOne(filter,updateDoc)
  res.send(result)
})

// enroll class
app.post('/selected',async(req,res)=>{
  const classItem=req.body;
  // console.log(classItem);
  const result=await selectedCollection.insertOne(classItem);
  // console.log(result);
  res.send(result)
})
app.get('/selectedClass/:id', async (req, res) => {
  const id = req.params.id;
  let query = {};
  if (id) {
    query = { _id: new ObjectId(id) };
  }

  const result = await selectedCollection.findOne(query);
  res.send(result);
});

// ===========================================
// Student Class Select get Section Part Start
// ===========================================

app.get('/selectedClass', async(req,res)=>{
  console.log(req.query.email);
  let query={}
  if(req.query?.email){
    query={ student:req.query.email}

  }

  const result=await selectedCollection.find(query).toArray()

  res.send(result)
})

app.delete('/selectedClass/:id',async(req,res)=>{
  try {
   const id=req?.params?.id;
   console.log(id);
   if(!id){
     throw new Error('Invalid Id')
   }
   const query={_id:new ObjectId(id)};
   const result=await selectedCollection.deleteOne(query)
   res.send(result)
  }catch(error){
  res.status(400).send({error:'invalid request'})
  }
 })

// ==========================================
//  Student Class Select get Section Part end
// ==========================================

// ==============================================
// Payment get check user   db Section Part start
// ==============================================


app.get('/payments', async(req,res)=>{
  const result= await paymentCollection.find().sort({date:-1}).toArray()
  res.send(result);
})

// ============================================
// Payment get check user   db Section Part end
// ============================================



// ======================================================
// Payment post check user confirm  db Section Part start
// ======================================================


    app.post('/create-payment-intent',async(req,res)=>{
       const {price}=req.body;
       const amount=price*100;
       const paymentIntent=await stripe.paymentIntents.create({
        amount:amount,
        currency:'usd',
        payment_method_types:['card']
       });
       res.send({
        clientSecret:paymentIntent.client_secret
       })
    })
// ===================================================
// Payment post check user confirm db Section Part end
// ===================================================


// ===================================
// Payment post  db Section Part start
// ===================================

    app.post('/payments',async(req,res)=>{
      const paymentsClass=req.body;
   
      const insetResult= await paymentCollection.insertOne(paymentsClass)
   

// ========================================================
// Payment post  db my class data delete Section Part start
// ========================================================

      const deleteSelectedClass={
        _id:new ObjectId(paymentsClass.payment?._id)
      }
      const deleteREsult=await selectedCollection.deleteOne(deleteSelectedClass)

// ======================================================
// Payment post  db my class data delete Section Part end
// ======================================================


// ======================================================================================
// Payment post  db my update add classCollection add enrolled Student Section Part start
// ======================================================================================

const updateQuery={
  _id:new ObjectId(paymentsClass.payment?.ClassId)
}
console.log(paymentsClass.payment?.ClassId);
const updateSeatRs=await addClassCollection.updateOne(updateQuery,{
  $inc:{enrolled:1}
})

// ====================================================================================
// Payment post  db my update add classCollection add enrolled Student Section Part end
// ====================================================================================


// ===============================================================================
// Payment post  db my update add classCollection AvailableSeat Section Part start
// ===============================================================================
const updateSelectQuery={
  _id:new ObjectId(paymentsClass.payment?.ClassId)
}
const updateSelectRs=await addClassCollection.updateOne(updateSelectQuery,{
  $inc:{AvailableSeat:-1}
})
// =============================================================================
// Payment post  db my update add classCollection AvailableSeat Section Part end
// =============================================================================

// =======================================================================================
// Payment post  db my update add userCollection student enroll db save Section Part start
// =======================================================================================
const classId=paymentsClass.payment?.ClassId;
const query={_id:new ObjectId(classId)}
const classData=await addClassCollection.findOne(query)
const InstructorEmail=classData?.email;
const updateInstructorQuery={email:InstructorEmail}
const updateInstructorResult=await usersCollection.updateOne(updateInstructorQuery,{
  $inc:{student:1}
})

// =====================================================================================
// Payment post  db my update add userCollection student enroll db save Section Part end
// =====================================================================================

   
      res.send({ insetResult,deleteREsult,updateSeatRs,updateSelectRs,updateInstructorResult})
    })
    

// =================================
// Payment post  db Section Part end
// =================================

// ==============
// popular class
// ============== 
app.get('/popularclass', async(req,res)=>{
  const result = await addClassCollection.find().sort({enrolled:-1}).limit(6).toArray();
  res.send(result)
})
app.get('/popularinstructor', async(req,res)=>{
  const result = await usersCollection.find({role:'instructor'}).sort({student:-1}).limit(6).toArray();
  res.send(result)
})


    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req,res)=>{
  res.send('slimfit academy running');
})

app.listen(port, ()=>{
  console.log(`slimfit is running on port: ${port}`);
})