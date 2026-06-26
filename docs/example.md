# Example: Books Application

A **practical, production-ready example** demonstrating how to use the NocoDB Middleware with a complete Books, Authors, and Users management system.

## 🚀 Quick Start

The example application provides a complete implementation that you can run locally to see the NocoDB Middleware in action.

### Prerequisites

- Node.js 18+
- NocoDB (running locally or remote instance)
- npm or yarn

### Installation

```bash
# Navigate to the example directory
cd example

# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### Configuration

Create a `.env` file in the `/example` directory:

```bash
cp .env.example .env
```

Edit the `.env` file with your NocoDB configuration:

```env
# NocoDB Configuration
NOCODB_BASE_URL=http://localhost:8080
NOCODB_API_KEY=your_nocodb_api_key_here

# JWT Configuration
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=1h

# Example Database
EXAMPLE_DB_NAME=example_books_db

# Server Configuration
PORT=3001
NODE_ENV=development
```

### Setup Database

Run the setup script to create tables and insert sample data:

```bash
npm run example:setup
```

This will:
- Create the required tables (authors, books, users, favorites)
- Insert sample data (5 authors, 10 books, 4 users)
- Display the permissions that need to be configured in NocoDB

**Important**: You need to manually configure the permissions in the NocoDB UI or via API as shown in the setup output.

### Run the Application

In one terminal, start the backend:

```bash
npm run start:dev
```

In another terminal, start the frontend:

```bash
npm run frontend:dev
```

### Access the Application

- **Backend API**: http://localhost:3001/api
- **Frontend**: http://localhost:5173

## 📋 Test Accounts

The setup script creates the following test accounts:

| Username | Email | Password | Role | Access Level |
|----------|-------|----------|------|--------------|
| admin | admin@example.com | password | admin | Full access |
| alice | alice@example.com | password | user | Read + own data |
| bob | bob@example.com | password | user | Read + own data |
| guest | guest@example.com | password | guest | Read-only (books < $10) |

## 🎯 Features Demonstrated

### Backend Features

1. **JWT Authentication**
   - Secure login/logout
   - Token-based authentication
   - Password hashing with bcrypt

2. **Role-Based Access Control (RBAC)**
   - Three user roles: admin, user, guest
   - Fine-grained permissions for each resource
   - Automatic permission checking with guards

3. **NocoDB Integration**
   - Complete CRUD operations
   - Pagination and filtering
   - Relationships between tables
   - Custom queries

4. **RESTful API Design**
   - Consistent endpoint structure
   - Proper HTTP methods and status codes
   - Request validation with DTOs

5. **Error Handling**
   - Consistent error responses
   - Proper HTTP status codes
   - Error logging

### Frontend Features

1. **Vue.js 3 Composition API**
   - Modern Vue.js syntax
   - TypeScript support
   - Reactive state management

2. **Pinia State Management**
   - Centralized state for auth and books
   - Actions for API calls
   - Getters for computed properties

3. **Vue Router**
   - Route-based navigation
   - Authentication guards
   - Role-based route access

4. **Responsive Design**
   - Mobile-friendly layout
   - Custom CSS with variables
   - Modern UI components

5. **Axios Integration**
   - HTTP client with interceptors
   - Automatic token injection
   - Error handling

## 🗃️ Database Schema

The example uses four main tables:

### Authors

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER (PK) | Auto-incrementing ID |
| name | TEXT | Author name |
| bio | TEXT | Author biography |
| birth_date | TEXT | Date of birth |
| created_at | TEXT | Creation timestamp |
| updated_at | TEXT | Last update timestamp |

### Books

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER (PK) | Auto-incrementing ID |
| title | TEXT | Book title |
| description | TEXT | Book description |
| published_year | INTEGER | Year of publication |
| isbn | TEXT | ISBN number (unique) |
| price | REAL | Book price |
| author_id | INTEGER (FK) | Reference to author |
| created_at | TEXT | Creation timestamp |
| updated_at | TEXT | Last update timestamp |

### Users

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER (PK) | Auto-incrementing ID |
| username | TEXT | Username (unique) |
| email | TEXT | Email address (unique) |
| password_hash | TEXT | Hashed password |
| role | TEXT | User role (admin, user, guest) |
| created_at | TEXT | Creation timestamp |
| updated_at | TEXT | Last update timestamp |

### Favorites

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER (PK) | Auto-incrementing ID |
| user_id | INTEGER (FK) | Reference to user |
| book_id | INTEGER (FK) | Reference to book |
| created_at | TEXT | Creation timestamp |

## 🔐 Permissions Matrix

| Resource | admin | user | guest |
|----------|-------|------|-------|
| **Authors** | CRUD | Read | Read |
| **Books** | CRUD | Read | Read (price < $10) |
| **Users** | CRUD | Read (own) | No access |
| **Favorites** | CRUD | CRUD (own) | No access |

### Permission Details

- **Admin**: Can perform all operations on all resources
- **User**: Can read all books and authors, manage their own profile and favorites
- **Guest**: Can only read books with price less than $10, can read all authors

## 📚 API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/users/register` | Register a new user |
| POST | `/api/users/login` | Login and get JWT token |
| GET | `/api/users/me` | Get current user profile |
| PUT | `/api/users/me` | Update current user profile |
| PUT | `/api/users/me/password` | Update password |

### Books

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/books` | Get all books (paginated) |
| GET | `/api/books/:id` | Get a single book |
| POST | `/api/books` | Create a new book (admin) |
| PUT | `/api/books/:id` | Update a book (admin) |
| DELETE | `/api/books/:id` | Delete a book (admin) |
| GET | `/api/books/search` | Search books |
| GET | `/api/books/author/:authorId` | Get books by author |
| GET | `/api/books/price-range` | Get books by price range |

### Authors

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/authors` | Get all authors (paginated) |
| GET | `/api/authors/:id` | Get a single author |
| POST | `/api/authors` | Create a new author (admin) |
| PUT | `/api/authors/:id` | Update an author (admin) |
| DELETE | `/api/authors/:id` | Delete an author (admin) |
| GET | `/api/authors/:id/books` | Get books by author |
| GET | `/api/authors/search` | Search authors |

### Favorites

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/me/favorites` | Get user's favorite books |
| POST | `/api/users/me/favorites/:bookId` | Add book to favorites |
| DELETE | `/api/users/me/favorites/:bookId` | Remove book from favorites |

## 🎨 Frontend Pages

### Public Pages

- **Home** (`/`) - Welcome page with featured books (for authenticated users)
- **Login** (`/login`) - User login with quick login buttons
- **Register** (`/register`) - New user registration

### Authenticated Pages

- **Books** (`/books`) - Browse all books with filters
- **Authors** (`/authors`) - View all authors
- **Profile** (`/profile`) - User profile management
- **Favorites** (`/favorites`) - User's favorite books

### Admin Pages

- **Admin Panel** (`/admin`) - User management (admin only)

## 📄 Project Structure

```
example/
├── README.md                          # Main documentation
├── .env.example                       # Environment variables template
├── package.json                       # Backend dependencies
├── tsconfig.json                      # TypeScript configuration
├── openapi-example.yaml               # OpenAPI specification
├── setup/                             # Database setup scripts
│   ├── 01-create-tables.sql            # SQL for table creation
│   ├── 02-import-data.sql             # Sample data
│   ├── 03-configure-permissions.sh    # Permission configuration
│   └── setup.ts                       # TypeScript setup script
├── src/                               # Backend source code
│   ├── app.module.ts                  # Main NestJS module
│   ├── main.ts                        # Application entry point
│   ├── books/                         # Books module
│   │   ├── books.controller.ts        # Books API endpoints
│   │   ├── books.service.ts           # Books business logic
│   │   ├── books.module.ts            # Books module definition
│   │   └── dto/                       # Data Transfer Objects
│   │       ├── create-book.dto.ts
│   │       └── update-book.dto.ts
│   ├── authors/                       # Authors module
│   │   ├── authors.controller.ts
│   │   ├── authors.service.ts
│   │   └── authors.module.ts
│   ├── users/                         # Users module
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   └── users.module.ts
│   └── shared/                         # Shared components
│       ├── auth.module.ts             # Authentication module
│       ├── interfaces/                # TypeScript interfaces
│       │   ├── book.interface.ts
│       │   └── user.interface.ts
│       ├── guards/                    # Authentication guards
│       │   ├── roles.guard.ts
│       │   └── permissions.guard.ts
│       ├── decorators/                # Custom decorators
│       │   └── roles.decorator.ts
│       ├── services/                  # Shared services
│       │   ├── auth.service.ts
│       │   ├── nocodb.service.ts
│       │   └── jwt.strategy.ts
│       └── strategies/                # Passport strategies
│           └── jwt.strategy.ts
└── frontend/                          # Frontend application
    ├── package.json                   # Frontend dependencies
    ├── vite.config.ts                 # Vite configuration
    ├── tsconfig.json                  # TypeScript configuration
    ├── index.html                     # HTML entry point
    └── src/                           # Frontend source code
        ├── main.ts                    # Frontend entry point
        ├── App.vue                    # Root Vue component
        ├── router/                    # Vue Router configuration
        │   └── index.ts
        ├── stores/                    # Pinia stores
        │   ├── auth.ts
        │   └── books.ts
        ├── components/                # Vue components
        │   ├── Navbar.vue
        │   └── Sidebar.vue
        └── views/                      # Page views
            ├── HomeView.vue
            ├── LoginView.vue
            ├── RegisterView.vue
            ├── BooksView.vue
            ├── AuthorsView.vue
            ├── ProfileView.vue
            ├── FavoritesView.vue
            └── AdminView.vue
```

## 🔧 Configuration Options

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NOCODB_BASE_URL` | NocoDB server URL | http://localhost:8080 |
| `NOCODB_API_KEY` | NocoDB API key | - |
| `JWT_SECRET` | JWT signing secret | - |
| `JWT_EXPIRES_IN` | JWT expiration time | 1h |
| `EXAMPLE_DB_NAME` | Database name | example_books_db |
| `PORT` | Server port | 3001 |
| `NODE_ENV` | Environment | development |

### NocoDB Configuration

1. **Create a new project** in NocoDB
2. **Import the SQL** from `setup/01-create-tables.sql` and `setup/02-import-data.sql`
3. **Configure permissions** as shown in the permission matrix above

## 🧪 Testing the API

### Using cURL

```bash
# Login as admin
curl -X POST http://localhost:3001/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "password"}'

# Get the token from the response and use it in subsequent requests
TOKEN="your_jwt_token_here"

# Get all books
curl -X GET http://localhost:3001/api/books \
  -H "Authorization: Bearer $TOKEN"

# Create a new book (admin only)
curl -X POST http://localhost:3001/api/books \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "New Book",
    "description": "A new book description",
    "price": 15.99,
    "author_id": 1
  }'

# Search books
curl -X GET "http://localhost:3001/api/books/search?q=Harry" \
  -H "Authorization: Bearer $TOKEN"
```

### Using Postman

1. Import the OpenAPI specification (`openapi-example.yaml`) into Postman
2. Set the environment variables (base URL, token)
3. Test the endpoints

## 🚀 Deployment

### Docker (Recommended)

Create a `Dockerfile` and `docker-compose.yml` for production deployment.

### Manual Deployment

1. Build the backend:
   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm run start:prod
   ```

3. Build the frontend:
   ```bash
   cd frontend
   npm run build
   ```

4. Serve the frontend with a static file server or integrate with your backend.

## 📖 OpenAPI Specification

The complete OpenAPI specification is available in [`openapi-example.yaml`](openapi-example.yaml). This can be used to:

- Generate API documentation
- Create SDKs for various programming languages
- Import into API testing tools like Postman
- Integrate with API gateways

## 🤝 Contributing to the Example

If you want to extend or improve the example:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/example-improvement`)
3. Make your changes in the `/example` directory
4. Update the documentation
5. Push to the branch (`git push origin feature/example-improvement`)
6. Open a Pull Request

## 🔗 Related Documentation

- [Main Documentation](/)
- [Developer Guide](/developer-guide)
- [Security](/security)
- [API Reference](/api)
- [OpenAPI Specification](/openapi-spec)

## 📞 Support

For questions or issues with the example, please open an issue on the [GitHub repository](https://github.com/stritti/nocodb-middleware).
