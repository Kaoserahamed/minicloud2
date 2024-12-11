const port = 4000;
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const { type } = require("os");

//$env:PORT=3001; npm start
app.use(express.json());
app.use(cors());

mongoose.connect("mongodb+srv://kaoser614:01625130388@cluster0.xh0hrkh.mongodb.net/webproject");

//api creation
app.get("/", (req, res) => {
    res.send("Express app is running");
})

//image storage engine
const storage = multer.diskStorage({
    destination: './upload/images',
    filename: (req, file, cb) => {
        return cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`)
    }
})

//Schema for creating account
const Account = mongoose.model("Account", {
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,

    },
    phone: {
        type: String,
        required: true,
    },
    accountNo: {
        type: String,
        required: true,

    },
    secretKey: {
        type: String,
        required: true,
    }
    ,
    balance:{
        type:Number,
        default:10000,
    },
})

//Schema for creating products
const Product = mongoose.model("Product", {
    id: {
        type: Number,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    image: {
        type: String,
        required: true,

    },
    category: {
        type: String,
        required: true,
    },
    new_price: {
        type: Number,
        required: true,
    },
    old_price: {
        type: Number,
        required: true,
    },
    selectedSize:{
        type:String,
        default:'M',
    }
    ,
    date: {
        type: Date,
        default: Date.now,
    },
    available: {
        type: Boolean,
        default: true,
    },
})

app.post('/addproduct', async (req, res) => {
    let products = await Product.find({});
    let id;
    if (products.length > 0) {
        let last_product_array = products.slice(-1);
        let last_product = last_product_array[0];
        id = last_product.id + 1;
    }
    else id = 1;
    const product = new Product({
        id: id,
        name: req.body.name,
        image: req.body.image,
        category: req.body.category,
        new_price: req.body.new_price,
        old_price: req.body.old_price,
    });
    console.log(product);
    await product.save();
    console.log("saved");
    res.json({
        success: true,
        name: req.body.name,
    })
})

// api for delete
app.post('/removeproduct', async (req, res) => {
    await Product.findOneAndDelete({ id: req.body.id });
    console.log("removed");
    res.json({
        success: true,
        name: req.body.name
    })
})

// creating api for getting all product
app.get('/allproducts', async (req, res) => {
    let products = await Product.find({});
    console.log("all products fetched");
    res.send(products);
})

//schema for user
const Users = mongoose.model('Users', {
    name: {
        type: String,
    },
    email: {
        type: String,
        unique: true,
    },
    password: {
        type: String,
    },
    cartData: {
        type: Object,
    },
    date: {
        type: Date,
        default: Date.now,
    }
})

// creating endpoint for register
app.post('/signup', async (req, res) => {
    let check = await Users.findOne({ email: req.body.email });
    if (check) {
        return res.status(400).json({ success: false, errors: "existing user found with same email adress" })
    }
    let cart = {};
    for (let i = 0; i < 300; i++) {
        cart[i] = 0;

    }
    const user = new Users({
        name: req.body.username,
        email: req.body.email,
        password: req.body.password,
        cartData: cart,
    })
    await user.save();

    const data = {
        user: {
            id: user.id
        }
    }

    const token = jwt.sign(data, 'secret_ecom');
    res.json({ success: true, token })

})

//api for creating account in bank
app.post('/createaccount', async (req, res) => {
    
    const account = new Account({
        name: req.body.name,
        email: req.body.email,
        phone:req.body.phone,
        accountNo:req.body.accountNo,
        secretKey:req.body.secretKey,
    })
    await account.save();
    res.json({success:true});
})

// endpoint for login
app.post('/login', async (req, res) => {
    let user = await Users.findOne({ email: req.body.email });
    if (user) {
        const passCompare = req.body.password === user.password;
        if (passCompare) {
            const data = {
                user: {
                    id: user.id
                }
            }
            const token = jwt.sign(data, 'secret_ecom');
            res.json({ success: true, token });
        }
        else {
            res.json({ success: false, errors: "Wrong Password" });
        }
    }
    else {
        res.json({ success: false, errors: "Wrong Email Id" })
    }
})

//endpoint for new collection
app.get('/newcollections', async (req, res) => {
    let products = await Product.find({});
    let newcollection = products.slice(1).slice(-8);
    console.log("new collection added");
    res.send(newcollection);
})

//popular
app.get('/popularinphone', async (req, res) => {
    let products = await Product.find({ category: "phone" });
    let popular_in_phone = products.slice(0, 4);
    console.log("popular phone added");
    res.send(popular_in_phone);
})

//middleware to fetch user
const fetchUser = async (req, res, next) => {
    const token = req.header('auth-token');
    if (!token) {
        res.status(401).send({ errors: "Please authenticate using valid token" });
    }
    else {
        try {
            const data = jwt.verify(token, 'secret_ecom');
            req.user = data.user;
            next();

        } catch (error) {
            res.status(401).send({ errors: "please authenticate using a valid token" });
        }
    }
}

//add products to the cart
app.post('/addtocart', fetchUser, async (req, res) => {
    console.log("added", req.body.itemId);
    let userData = await Users.findOne({ _id: req.user.id });
    userData.cartData[req.body.itemId] += 1;
    await Users.findOneAndUpdate({ _id: req.user.id }, { cartData: userData.cartData });
    res.send("Added")
})

//endpoint to remove product form cart data
app.post('/removefromcart', fetchUser, async (req, res) => {
    console.log("removed", req.body.itemId);
    let userData = await Users.findOne({ _id: req.user.id });
    if (userData.cartData[req.body.itemId] > 0)
        userData.cartData[req.body.itemId] -= 1;
    await Users.findOneAndUpdate({ _id: req.user.id }, { cartData: userData.cartData });
    res.send("Added")
})

//get cart data
app.post('/getcart', fetchUser, async (req, res) => {
    console.log("getcart");
    let userData = await Users.findOne({ _id: req.user.id });
    res.json(userData.cartData);
})

app.listen(port, '0.0.0.0', (error) => {
    if (!error) {
        console.log("Server is running");
    }
    else console.log("Erro : " + error);
})

const upload = multer({ storage: storage })


// creating upload endpoint

app.use('/images', express.static('upload/images'))


app.post("/upload", upload.single('product'), (req, res) => {
    res.json({
        success: 1,
        image_url: `http://localhost:${port}/images/${req.file.filename}`
    })
})


// Transaction endpoint
app.post('/transaction', async (req, res) => {
    const { accountNo, secretKey, amount } = req.body;

    // Verify account
    const account = await Account.findOne({ accountNo, secretKey });
    if (!account) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Deduct amount from user's account
    if (account.balance < amount) {
        return res.status(400).json({ success: false, message: 'Insufficient balance' });
    }

    account.balance -= amount;

    // Assume admin accountNo is 'admin123'
    const adminAccount = await Account.findOne({ accountNo: 'admin123' });
    if (!adminAccount) {
        return res.status(500).json({ success: false, message: 'Admin account not found' });
    }

    adminAccount.balance += amount;

    await account.save();
    await adminAccount.save();

    res.json({ success: true, message: 'Transaction successful' });
});

// Define the Order schema
const orderSchema = new mongoose.Schema({
    deliveryInfo: {
        name: { type: String, required: true },
        address: { type: String, required: true },
        phone: { type: String, required: true },
        city: { type: String, required: true },
        zip: { type: String, required: true }
    },
    products: [{
        productId: { type: String, required: true },
        productName: { type: String, required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
        image: { type: String } ,
        selectedSize:{type:String, default:'M'},
        
    }],
    orderDate: { type: Date, default: Date.now },
    status: { type: String, default: 'pending' }
});

const Order = mongoose.model('Order', orderSchema);

// POST route to create an order
app.post('/orders', async (req, res) => {
    const orderData = req.body;

    // Validate orderData if necessary

    try {
        const newOrder = new Order(orderData);
        await newOrder.save();
        res.json({ success: true, message: 'Order placed successfully!' });
    } catch (error) {
        console.error('Error saving order:', error);
        res.status(500).json({ success: false, message: 'Failed to place order' });
    }
});

// GET route to fetch all orders or filter by status
app.get('/orders', async (req, res) => {
    try {
        // Optional query parameter to filter by status
        const status = req.query.status;

        let orders;
        if (status) {
            // If a status query parameter is provided, filter orders by status
            orders = await Order.find({ status });
        } else {
            // Otherwise, retrieve all orders
            orders = await Order.find();
        }

        res.json(orders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch orders' });
    }
});
// PATCH route to update order status
app.patch('/orders/:id', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'shipping', 'delivered'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    try {
        const updatedOrder = await Order.findByIdAndUpdate(
            id,
            { status },
            { new: true, runValidators: true } // Return the updated document and validate the status
        );

        if (!updatedOrder) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        res.json({ success: true, message: 'Order status updated successfully', order: updatedOrder });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ success: false, message: 'Failed to update order status' });
    }
});