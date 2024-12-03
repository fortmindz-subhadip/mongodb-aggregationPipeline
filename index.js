const express = require("express");
const mongoose = require("mongoose"); 
const userSchema = require('../aggregation_pipeline/models/userModel');
const orderSchema = require('../aggregation_pipeline/models/orderModel');
const productSchema = require('../aggregation_pipeline/models/productModel');

require('dotenv').config()
const app = express();
const PORT = 4000;



app.use(express.json());

// Mongoose connection logic
async function connectToDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000,
    });
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    process.exit(1); // Exit the process if MongoDB connection fails
  }
}

//user routes

app.post('/user', async function (req, res) {
    
    const user=await userSchema.create({...req.body})
    await user.save() //
    return res.status(200).json({success:'success', message: 'success',data:user});
})
app.post('/product',async function(req,res){
const product =await productSchema.create({
    ...req.body
})
return res.status(200).send({success:true,data:product});

})

app.post('/order', async function (req, res) {
    try {
        const { items, userId } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).send({ success: false, message: 'No items provided in the order.' });
        }

        const orderItems = [];

        for (const item of items) {
            const { productId, quantity } = item;

            if (!productId || !quantity) {
                return res.status(400).send({ success: false, message: 'Product ID and quantity are required for each item.' });
            }

            // Check product stock
            const product = await productSchema.findById(productId);
            if (!product) {
                return res.status(404).send({ success: false, message: `Product with ID ${productId} not found.` });
            }

            if (product.stock < quantity) {
                return res.status(400).send({ success: false, message: `Not enough stock for product with ID ${productId}.` });
            }

            product.stock -= quantity;
            await product.save();

            orderItems.push({ productId, quantity });
        }

        // Create the order
        const order = await orderSchema.create({ items: orderItems, userId });

        return res.status(200).send({ success: true, data: order });
    } catch (error) {
        console.error(error);
        return res.status(500).send({ success: false, message: 'Internal server error.' });
    }
});

app.get('/orders/:userId', async function (req, res) {
    try {
        const userId = req.params.userId;

        // Validate userId
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).send({ success: false, message: 'Invalid userId' });
        }

        const orders = await orderSchema.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(userId) } }, // Match orders for the user
            {
                $lookup: {
                    from: 'products', // Match the products collection
                    localField: 'items.productId', // Field in orders
                    foreignField: '_id', // Field in products
                    as: 'productDetails' // Embedding matching product data
                }
            },
            {
                $project: {
                    _id:0,
                    orderId:'$_id', 
                 
                  userId: 1,
                  totalAmount: 1,
                  status: 1,
                  productDetails: { name: 1, category: 1, price: 1 }, 
                },
              },
        ]);

        return res.status(200).send({ success: true, data: orders });
    } catch (error) {
        console.error(error);
        return res.status(500).send({ success: false, message: 'Internal server error' });
    }
});













// Connect to the database and start the server
connectToDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});
