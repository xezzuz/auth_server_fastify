// package.json dependencies needed:
// npm install fastify @fastify/jwt @fastify/cors @fastify/helmet @fastify/rate-limit
// npm install bcrypt joi mongoose jsonwebtoken dotenv
// npm install --save-dev @types/bcrypt @types/jsonwebtoken

// .env file template:
/*
NODE_ENV=development
PORT=3000
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars
FRONTEND_URL=http://localhost:3000
MONGODB_URI=mongodb://localhost:27017/your-app
REDIS_URL=redis://localhost:6379
*/

// For production with MongoDB (replace in-memory storage):
/*
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  role: { type: String, enum: Object.values(ROLES), default: ROLES.USER },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date },
  refreshTokens: [{ token: String, createdAt: { type: Date, default: Date.now } }],
  failedLoginAttempts: { type: Number, default: 0 },
  lockUntil: Date,
  emailVerified: { type: Boolean, default: false },
  emailVerificationToken: String,
  passwordResetToken: String,
  passwordResetExpires: Date
}, {
  timestamps: true
});

userSchema.index({ email: 1 });
userSchema.index({ refreshTokens: 1 });

const User = mongoose.model('User', userSchema);
*/

require('dotenv').config();
const fastify = require('fastify')({ logger: true });
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Joi = require('joi');

// Environment variables validation
const requiredEnvVars = ['JWT_SECRET', 'JWT_REFRESH_SECRET'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const SALT_ROUNDS = 12;

// In-memory storage (replace with database in production)
const users = new Map();
const blacklistedTokens = new Set();
const refreshTokens = new Map(); // userId -> refreshToken

// User roles and permissions
const ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  MODERATOR: 'moderator'
};

const PERMISSIONS = {
  READ_USERS: 'read:users',
  WRITE_USERS: 'write:users',
  DELETE_USERS: 'delete:users',
  READ_ADMIN: 'read:admin'
};

const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: [PERMISSIONS.READ_USERS, PERMISSIONS.WRITE_USERS, PERMISSIONS.DELETE_USERS, PERMISSIONS.READ_ADMIN],
  [ROLES.MODERATOR]: [PERMISSIONS.READ_USERS, PERMISSIONS.WRITE_USERS],
  [ROLES.USER]: []
};

// Register plugins
async function registerPlugins() {
  // Security plugins
  await fastify.register(require('@fastify/helmet'), {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"]
      }
    }
  });

  await fastify.register(require('@fastify/cors'), {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
  });

  await fastify.register(require('@fastify/rate-limit'), {
    max: 100,
    timeWindow: '1 minute'
  });

  // JWT plugin
  await fastify.register(require('@fastify/jwt'), {
    secret: JWT_SECRET,
    sign: {
      expiresIn: '15m' // Short-lived access tokens
    }
  });
}

// Validation schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    }),
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required(),
  role: Joi.string().valid(...Object.values(ROLES)).default(ROLES.USER)
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

// Utility functions
function generateTokens(userId) {
  const accessToken = jwt.sign(
    { userId, type: 'access' },
    JWT_SECRET,
    { expiresIn: '15m' }
  );
  
  const refreshToken = jwt.sign(
    { userId, type: 'refresh' },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
  
  return { accessToken, refreshToken };
}

function getUserPermissions(role) {
  return ROLE_PERMISSIONS[role] || [];
}

// Authentication middleware
async function authenticate(request, reply) {
  try {
    const token = request.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return reply.status(401).send({ error: 'No token provided' });
    }
    
    if (blacklistedTokens.has(token)) {
      return reply.status(401).send({ error: 'Token has been revoked' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (decoded.type !== 'access') {
      return reply.status(401).send({ error: 'Invalid token type' });
    }
    
    const user = users.get(decoded.userId);
    if (!user) {
      return reply.status(401).send({ error: 'User not found' });
    }
    
    request.user = {
      id: decoded.userId,
      ...user,
      permissions: getUserPermissions(user.role)
    };
  } catch (error) {
    return reply.status(401).send({ error: 'Invalid token' });
  }
}

// Authorization middleware factory
function authorize(requiredPermissions = []) {
  return async function(request, reply) {
    if (!request.user) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }
    
    const userPermissions = request.user.permissions || [];
    const hasPermission = requiredPermissions.every(permission => 
      userPermissions.includes(permission)
    );
    
    if (!hasPermission) {
      return reply.status(403).send({ 
        error: 'Insufficient permissions',
        required: requiredPermissions,
        granted: userPermissions
      });
    }
  };
}

// Rate limiting for auth endpoints
const authRateLimit = {
  max: 5,
  timeWindow: '1 minute',
  errorResponseBuilder: function(request, context) {
    return {
      code: 429,
      error: 'Too many authentication attempts',
      message: `Rate limit exceeded, retry in ${Math.round(context.ttl / 1000)} seconds`
    };
  }
};

// Routes
async function setupRoutes() {
  // Register route
  fastify.post('/api/auth/register', {
    config: { rateLimit: authRateLimit },
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password', 'firstName', 'lastName'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          firstName: { type: 'string', minLength: 2, maxLength: 50 },
          lastName: { type: 'string', minLength: 2, maxLength: 50 },
          role: { type: 'string', enum: Object.values(ROLES) }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { error, value } = registerSchema.validate(request.body);
      if (error) {
        return reply.status(400).send({ error: error.details[0].message });
      }
      
      const { email, password, firstName, lastName, role } = value;
      
      // Check if user already exists
      for (const [id, user] of users) {
        if (user.email === email) {
          return reply.status(409).send({ error: 'User already exists' });
        }
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      
      // Create user
      const userId = Date.now().toString();
      const user = {
        id: userId,
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: role || ROLES.USER,
        isActive: true,
        createdAt: new Date().toISOString(),
        lastLogin: null
      };
      
      users.set(userId, user);
      
      // Generate tokens
      const { accessToken, refreshToken } = generateTokens(userId);
      refreshTokens.set(userId, refreshToken);
      
      // Return user data (without password)
      const { password: _, ...userResponse } = user;
      
      reply.status(201).send({
        message: 'User registered successfully',
        user: userResponse,
        tokens: {
          accessToken,
          refreshToken
        }
      });
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Login route
  fastify.post('/api/auth/login', {
    config: { rateLimit: authRateLimit }
  }, async (request, reply) => {
    try {
      const { error, value } = loginSchema.validate(request.body);
      if (error) {
        return reply.status(400).send({ error: error.details[0].message });
      }
      
      const { email, password } = value;
      
      // Find user
      let user = null;
      let userId = null;
      for (const [id, u] of users) {
        if (u.email === email) {
          user = u;
          userId = id;
          break;
        }
      }
      
      if (!user || !user.isActive) {
        return reply.status(401).send({ error: 'Invalid credentials' });
      }
      
      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return reply.status(401).send({ error: 'Invalid credentials' });
      }
      
      // Update last login
      user.lastLogin = new Date().toISOString();
      users.set(userId, user);
      
      // Generate tokens
      const { accessToken, refreshToken } = generateTokens(userId);
      refreshTokens.set(userId, refreshToken);
      
      const { password: _, ...userResponse } = user;
      
      reply.send({
        message: 'Login successful',
        user: userResponse,
        tokens: {
          accessToken,
          refreshToken
        }
      });
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Refresh token route
  fastify.post('/api/auth/refresh', async (request, reply) => {
    try {
      const { refreshToken } = request.body;
      
      if (!refreshToken) {
        return reply.status(400).send({ error: 'Refresh token required' });
      }
      
      const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
      
      if (decoded.type !== 'refresh') {
        return reply.status(401).send({ error: 'Invalid token type' });
      }
      
      const storedRefreshToken = refreshTokens.get(decoded.userId);
      if (storedRefreshToken !== refreshToken) {
        return reply.status(401).send({ error: 'Invalid refresh token' });
      }
      
      const user = users.get(decoded.userId);
      if (!user || !user.isActive) {
        return reply.status(401).send({ error: 'User not found or inactive' });
      }
      
      // Generate new tokens
      const tokens = generateTokens(decoded.userId);
      refreshTokens.set(decoded.userId, tokens.refreshToken);
      
      reply.send({
        message: 'Token refreshed successfully',
        tokens
      });
    } catch (error) {
      reply.status(401).send({ error: 'Invalid refresh token' });
    }
  });

  // Logout route
  fastify.post('/api/auth/logout', {
    preHandler: authenticate
  }, async (request, reply) => {
    try {
      const token = request.headers.authorization?.replace('Bearer ', '');
      if (token) {
        blacklistedTokens.add(token);
      }
      
      // Remove refresh token
      refreshTokens.delete(request.user.id);
      
      reply.send({ message: 'Logged out successfully' });
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Get current user profile
  fastify.get('/api/auth/me', {
    preHandler: authenticate
  }, async (request, reply) => {
    const { password, ...userResponse } = request.user;
    reply.send({ user: userResponse });
  });

  // Update user profile
  fastify.put('/api/auth/me', {
    preHandler: authenticate
  }, async (request, reply) => {
    try {
      const { firstName, lastName, email } = request.body;
      const userId = request.user.id;
      const user = users.get(userId);
      
      if (email && email !== user.email) {
        // Check if email is already taken
        for (const [id, u] of users) {
          if (id !== userId && u.email === email) {
            return reply.status(409).send({ error: 'Email already taken' });
          }
        }
      }
      
      // Update user
      const updatedUser = {
        ...user,
        firstName: firstName || user.firstName,
        lastName: lastName || user.lastName,
        email: email || user.email,
        updatedAt: new Date().toISOString()
      };
      
      users.set(userId, updatedUser);
      
      const { password, ...userResponse } = updatedUser;
      reply.send({
        message: 'Profile updated successfully',
        user: userResponse
      });
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Change password
  fastify.put('/api/auth/change-password', {
    preHandler: authenticate
  }, async (request, reply) => {
    try {
      const { currentPassword, newPassword } = request.body;
      const userId = request.user.id;
      const user = users.get(userId);
      
      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return reply.status(400).send({ error: 'Current password is incorrect' });
      }
      
      // Validate new password
      const { error } = Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).validate(newPassword);
      if (error) {
        return reply.status(400).send({ error: 'New password does not meet requirements' });
      }
      
      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
      
      // Update user
      const updatedUser = {
        ...user,
        password: hashedPassword,
        updatedAt: new Date().toISOString()
      };
      
      users.set(userId, updatedUser);
      
      reply.send({ message: 'Password changed successfully' });
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Admin routes - Get all users
  fastify.get('/api/admin/users', {
    preHandler: [authenticate, authorize([PERMISSIONS.READ_USERS])]
  }, async (request, reply) => {
    const allUsers = Array.from(users.values()).map(({ password, ...user }) => user);
    reply.send({ users: allUsers });
  });

  // Admin routes - Update user role
  fastify.put('/api/admin/users/:userId/role', {
    preHandler: [authenticate, authorize([PERMISSIONS.WRITE_USERS])]
  }, async (request, reply) => {
    try {
      const { userId } = request.params;
      const { role } = request.body;
      
      if (!Object.values(ROLES).includes(role)) {
        return reply.status(400).send({ error: 'Invalid role' });
      }
      
      const user = users.get(userId);
      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }
      
      const updatedUser = {
        ...user,
        role,
        updatedAt: new Date().toISOString()
      };
      
      users.set(userId, updatedUser);
      
      const { password, ...userResponse } = updatedUser;
      reply.send({
        message: 'User role updated successfully',
        user: userResponse
      });
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Admin routes - Deactivate user
  fastify.put('/api/admin/users/:userId/deactivate', {
    preHandler: [authenticate, authorize([PERMISSIONS.WRITE_USERS])]
  }, async (request, reply) => {
    try {
      const { userId } = request.params;
      const user = users.get(userId);
      
      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }
      
      const updatedUser = {
        ...user,
        isActive: false,
        updatedAt: new Date().toISOString()
      };
      
      users.set(userId, updatedUser);
      
      // Revoke refresh token
      refreshTokens.delete(userId);
      
      reply.send({ message: 'User deactivated successfully' });
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Health check
  fastify.get('/api/health', async (request, reply) => {
    reply.send({ status: 'healthy', timestamp: new Date().toISOString() });
  });
}

// Initialize server
async function start() {
  try {
    await registerPlugins();
    await setupRoutes();
    
    // Create default admin user if none exists
    if (users.size === 0) {
      const adminPassword = await bcrypt.hash('Admin123!', SALT_ROUNDS);
      users.set('admin', {
        id: 'admin',
        email: 'admin@example.com',
        password: adminPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: ROLES.ADMIN,
        isActive: true,
        createdAt: new Date().toISOString(),
        lastLogin: null
      });
      
      fastify.log.info('Default admin user created: admin@example.com / Admin123!');
    }
    
    const port = process.env.PORT || 3000;
    await fastify.listen({ port, host: '0.0.0.0' });
    fastify.log.info(`Server running on port ${port}`);
  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
}

start();