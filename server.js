const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const path = require('path');
const cookieParser = require('cookie-parser');
const cors = require('cors');


// Initialize Express app
const app = express();
const PORT = 5001;

// Use a secret key for JWT
const secretKey = process.env.JWT_SECRET || 'h3lLo@2024!SecureKey$987';

// Middleware
app.use(cors({ origin: 'http://localhost:5001' }));
// app.use(cors()); // Enable CORS for all routes
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser()); // For handling cookies
app.use(express.static(path.join(__dirname))); // Serve static files from 'public' directory

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/admin')
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.log(err));

// User Schema and Model
const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});

const User = mongoose.model('User', userSchema);

// Serve the login page as the first route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Serve the registration page
// Serve the registration page
app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'signup.html')); // Ensure signup.html is served on /signup
});

// Handle user registration
app.post('/register', async(req, res) => {
    const { name, email, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            name,
            email,
            password: hashedPassword
        });
        await newUser.save();
        res.status(201).json({ message: 'User registered successfully!' });
    } catch (error) {
        res.status(500).json({ message: 'Error registering user', error });
    }
});


// Handle user login
app.post('/login', async(req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid password' });
        }
        // Generate a token and set it as a cookie
        const token = jwt.sign({ id: user._id }, secretKey, { expiresIn: '1h' });
        res.cookie('token', token, { httpOnly: true }); // Store the token in a cookie
        return res.redirect('/index'); // Redirect to the index page after successful login
    } catch (error) {
        res.status(500).json({ message: 'Error logging in', error });
    }
});

app.get('/index', (req, res) => {
    const token = req.cookies.token; // Use cookies if you've set a token
    if (!token) {
        return res.redirect('/'); // Redirect to login if token is not present
    }
    try {
        jwt.verify(token, secretKey); // Verify the token
        res.sendFile(path.join(__dirname, 'public/index.html')); // Send index.html if valid
    } catch (error) {
        return res.redirect('/'); // Redirect to login if token is invalid
    }
});

// Memory schema
const memorySchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    tags: [String],
    createdAt: {
        type: Date,
        default: new Date(),
    },
    likes: {
        type: Number,
        default: 0,
    }
});

const Memory = mongoose.model('Memory', memorySchema);


// Routes

// Get all memories
app.get('/memories', async(req, res) => {
    try {
        const memories = await Memory.find();
        res.json(memories);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create a new memory
// POST endpoint to handle memory creation
app.post('/memories', (req, res) => {
    const { title, message, tags } = req.body;

    const newMemory = new Memory({
        title,
        message,
        tags,
        createdAt: new Date(),
    });

    newMemory.save()
        .then(memory => res.json(memory))
        .catch(error => res.status(500).json({ message: 'An error occurred while creating the memory' }));
});


// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});