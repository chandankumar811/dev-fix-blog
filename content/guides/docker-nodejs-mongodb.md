# Docker Setup for Node.js & MongoDB Applications

## Project Structure

```
my-app/
├── src/
│   ├── config/
│   │   └── database.js          # MongoDB connection
│   ├── models/
│   │   └── User.js              # Mongoose models
│   ├── routes/
│   │   └── users.js             # API routes
│   ├── middleware/
│   │   └── auth.js              # Middleware
│   └── server.js                # Express app entry
├── .dockerignore                # Docker ignore file
├── Dockerfile                   # Node.js container config
├── docker-compose.yml           # Multi-container setup
├── .env                         # Environment variables
├── .env.example                 # Example env file
├── package.json                 # Dependencies
└── README.md                    # Documentation
```

## Step-by-Step Setup

### Step 1: Initialize Node.js Project

```bash
npm init -y
npm install express mongoose dotenv cors
npm install -D nodemon
```

### Step 2: Create `.env` File

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://mongo:27017/myapp
DB_NAME=myapp
```

### Step 3: Create `.env.example`

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://mongo:27017/myapp
DB_NAME=myapp
```

### Step 4: Update `package.json` Scripts

```json
{
  "name": "my-app",
  "version": "1.0.0",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "docker:dev": "docker-compose up",
    "docker:prod": "docker-compose -f docker-compose.prod.yml up"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^8.0.0",
    "dotenv": "^16.3.1",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

### Step 5: Create Database Config (`src/config/database.js`)

```javascript
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.DB_NAME,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
```

### Step 6: Create User Model (`src/models/User.js`)

```javascript
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('User', userSchema);
```

### Step 7: Create Routes (`src/routes/users.js`)

```javascript
const express = require('express');
const User = require('../models/User');
const router = express.Router();

// Get all users
router.get('/', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create user
router.post('/', async (req, res) => {
  const user = new User({
    name: req.body.name,
    email: req.body.email,
  });

  try {
    const newUser = await user.save();
    res.status(201).json(newUser);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get user by ID
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete user
router.delete('/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
```

### Step 8: Create Server (`src/server.js`)

```javascript
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/users', require('./routes/users'));

app.get('/', (req, res) => {
  res.json({ message: 'API is running...' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### Step 9: Create `.dockerignore`

```
node_modules
npm-debug.log
.env
.git
.gitignore
README.md
.dockerignore
Dockerfile
docker-compose.yml
```

### Step 10: Create `Dockerfile`

```dockerfile
# Use official Node.js image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Expose port
EXPOSE 5000

# Start application
CMD ["npm", "start"]
```

### Step 11: Create `Dockerfile.dev` (Development)

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 5000

CMD ["npm", "run", "dev"]
```

### Step 12: Create `docker-compose.yml` (Development)

```yaml
version: '3.8'

services:
  # Node.js Application
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    container_name: nodejs-app
    restart: unless-stopped
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=development
      - PORT=5000
      - MONGODB_URI=mongodb://mongo:27017/myapp
      - DB_NAME=myapp
    volumes:
      - .:/app
      - /app/node_modules
    depends_on:
      - mongo
    networks:
      - app-network

  # MongoDB Database
  mongo:
    image: mongo:7.0
    container_name: mongodb
    restart: unless-stopped
    ports:
      - "27017:27017"
    environment:
      - MONGO_INITDB_DATABASE=myapp
    volumes:
      - mongo-data:/data/db
      - mongo-config:/data/configdb
    networks:
      - app-network

  # Mongo Express (Web UI for MongoDB)
  mongo-express:
    image: mongo-express:latest
    container_name: mongo-express
    restart: unless-stopped
    ports:
      - "8081:8081"
    environment:
      - ME_CONFIG_MONGODB_SERVER=mongo
      - ME_CONFIG_MONGODB_PORT=27017
      - ME_CONFIG_BASICAUTH_USERNAME=admin
      - ME_CONFIG_BASICAUTH_PASSWORD=admin123
    depends_on:
      - mongo
    networks:
      - app-network

networks:
  app-network:
    driver: bridge

volumes:
  mongo-data:
    driver: local
  mongo-config:
    driver: local
```

### Step 13: Create `docker-compose.prod.yml` (Production)

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: nodejs-app-prod
    restart: always
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - PORT=5000
      - MONGODB_URI=mongodb://mongo:27017/myapp
      - DB_NAME=myapp
    depends_on:
      - mongo
    networks:
      - app-network

  mongo:
    image: mongo:7.0
    container_name: mongodb-prod
    restart: always
    ports:
      - "27017:27017"
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=securepassword123
      - MONGO_INITDB_DATABASE=myapp
    volumes:
      - mongo-data-prod:/data/db
    networks:
      - app-network

networks:
  app-network:
    driver: bridge

volumes:
  mongo-data-prod:
    driver: local
```

## Docker Commands

### Development Environment

```bash
# Build and start containers
docker-compose up

# Build and start in detached mode
docker-compose up -d

# Stop containers
docker-compose down

# Stop and remove volumes
docker-compose down -v

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f app
```

### Production Environment

```bash
# Build and start production containers
docker-compose -f docker-compose.prod.yml up -d

# Stop production containers
docker-compose -f docker-compose.prod.yml down

# View production logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Individual Container Commands

```bash
# Build image
docker build -t my-app .

# Run container
docker run -p 5000:5000 --name my-app my-app

# Execute commands in running container
docker exec -it nodejs-app sh

# Access MongoDB shell
docker exec -it mongodb mongosh
```

### Useful Commands

```bash
# List running containers
docker ps

# List all containers
docker ps -a

# List images
docker images

# Remove container
docker rm container_name

# Remove image
docker rmi image_name

# Remove unused containers, images, networks
docker system prune -a

# View container logs
docker logs nodejs-app

# Follow logs in real-time
docker logs -f nodejs-app
```

## Testing the Application

### Access Services

- **API**: http://localhost:5000
- **Mongo Express**: http://localhost:8081 (username: admin, password: admin123)

### Test API Endpoints

```bash
# Health check
curl http://localhost:5000

# Create user
curl -X POST http://localhost:5000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com"}'

# Get all users
curl http://localhost:5000/api/users

# Get user by ID
curl http://localhost:5000/api/users/{user_id}

# Delete user
curl -X DELETE http://localhost:5000/api/users/{user_id}
```

## Best Practices

1. **Use .dockerignore** to exclude unnecessary files
2. **Multi-stage builds** for smaller production images
3. **Use alpine images** for smaller size
4. **Don't run as root** in production
5. **Use environment variables** for configuration
6. **Persist data** using Docker volumes
7. **Use docker-compose** for multi-container apps
8. **Separate dev and prod** configurations
9. **Health checks** for container monitoring
10. **Use .env files** for sensitive data (never commit)

## Troubleshooting

### Container won't start
```bash
docker-compose logs app
```

### Cannot connect to MongoDB
- Check if mongo container is running: `docker ps`
- Verify connection string in .env
- Ensure containers are on same network

### Port already in use
```bash
# Find process using port
lsof -i :5000

# Kill process
kill -9 PID
```

### Reset everything
```bash
docker-compose down -v
docker system prune -a
docker-compose up --build
```

## Production Deployment

### With Authentication (Recommended)

Update `docker-compose.prod.yml` MongoDB URI:

```yaml
- MONGODB_URI=mongodb://admin:securepassword123@mongo:27017/myapp?authSource=admin
```

### Using Docker Secrets (Most Secure)

Create secrets:
```bash
echo "securepassword123" | docker secret create mongo_password -
```

Update compose file to use secrets.

## Additional Resources

- **Docker Documentation**: https://docs.docker.com
- **Mongoose Documentation**: https://mongoosejs.com
- **Express Documentation**: https://expressjs.com
- **MongoDB Documentation**: https://docs.mongodb.com