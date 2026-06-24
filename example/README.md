# NocoDB Middleware Example - Books Application

A **practical, production-ready example** demonstrating how to use the NocoDB Middleware with a complete Books, Authors, and Users management system.

## 🚀 Features

- **Complete Backend**: NestJS application with RESTful API endpoints
- **Frontend**: Vue.js 3 application with Pinia state management
- **Authentication**: JWT-based authentication with role-based access control (RBAC)
- **Database**: NocoDB integration with SQLite
- **Permissions**: Fine-grained permissions for different user roles
- **Example Data**: Pre-configured with sample books, authors, and users

## 📋 Table of Contents

- [Features](#-features)
- [Quick Start](#-quick-start)
- [Project Structure](#-project-structure)
- [API Documentation](#-api-documentation)
- [Authentication](#-authentication)
- [Permissions](#-permissions)
- [Database Schema](#-database-schema)
- [Frontend](#-frontend)
- [Configuration](#-configuration)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)

## 🏃 Quick Start

### Prerequisites

- Node.js 18+ 
- NocoDB (running locally or remote instance)
- npm or yarn

### 1. Clone and Setup

```bash
# Clone the repository (if not already done)
git clone https://github.com/stritti/nocodb-middleware.git
cd nocodb-middleware/example

# Install dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 2. Configure Environment

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

### 3. Setup Database

Run the setup script to create tables and insert sample data:

```bash
npm run example:setup
```

This will:
- Create the required tables (authors, books, users, favorites)
- Insert sample data
- Display the permissions that need to be configured in NocoDB

**Note**: You need to manually configure the permissions in the NocoDB UI or via API as shown in the setup output.

### 4. Start the Application

In one terminal, start the backend:

```bash
npm run start:dev
```

In another terminal, start the frontend:

```bash
npm run frontend:dev
```

### 5. Access the Application

- **Backend API**: http://localhost:3001/api
- **Frontend**: http://localhost:5173
- **API Documentation**: http://localhost:3001/api/docs (if Swagger is configured)

## 📁 Project Structure

```
example/
├── README.md                          # This documentation
├── .env.example                       # Environment variables template
├── package.json                       # Backend dependencies
├── tsconfig.json                      # TypeScript configuration
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

## 📚 API Documentation

### Base URL

```
http://localhost:3001/api
```

### Authentication Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/users/register` | Register a new user | Public |
| POST | `/users/login` | Login and get JWT token | Public |
| GET | `/users/me` | Get current user profile | Private |
| PUT | `/users/me` | Update current user profile | Private |
| PUT | `/users/me/password` | Update password | Private |

### Books Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/books` | Get all books (paginated) | Private |
| GET | `/books/:id` | Get a single book | Private |
| POST | `/books` | Create a new book | Admin |
| PUT | `/books/:id` | Update a book | Admin |
| DELETE | `/books/:id` | Delete a book | Admin |
| GET | `/books/search` | Search books | Private |
| GET | `/books/author/:authorId` | Get books by author | Private |
| GET | `/books/price-range` | Get books by price range | Private |

### Authors Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/authors` | Get all authors (paginated) | Private |
| GET | `/authors/:id` | Get a single author | Private |
| POST | `/authors` | Create a new author | Admin |
| PUT | `/authors/:id` | Update an author | Admin |
| DELETE | `/authors/:id` | Delete an author | Admin |
| GET | `/authors/:id/books` | Get books by author | Private |
| GET | `/authors/search` | Search authors | Private |

### Favorites Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/users/me/favorites` | Get user's favorite books | Private |
| POST | `/users/me/favorites/:bookId` | Add book to favorites | Private |
| DELETE | `/users/me/favorites/:bookId` | Remove book from favorites | Private |

## 🔐 Authentication

The application uses JWT (JSON Web Token) for authentication. After successful login, you receive a token that must be included in the `Authorization` header for protected endpoints.

### Login Request

```bash
curl -X POST http://localhost:3001/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "password"
  }'
```

### Login Response

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

### Using the Token

Include the token in the `Authorization` header for protected requests:

```bash
curl -X GET http://localhost:3001/api/books \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## 🛡️ Permissions

The application implements a role-based permission system with three roles:

### Roles

| Role | Description | Access Level |
|------|-------------|--------------|
| **admin** | System administrator | Full access to all resources |
| **user** | Regular user | Read access, limited write access |
| **guest** | Guest user | Read-only access with restrictions |

### Permission Matrix

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

## 🗃️ Database Schema

### Tables

#### authors

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER (PK) | Auto-incrementing ID |
| name | TEXT | Author name |
| bio | TEXT | Author biography |
| birth_date | TEXT | Date of birth |
| created_at | TEXT | Creation timestamp |
| updated_at | TEXT | Last update timestamp |

#### books

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

#### users

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER (PK) | Auto-incrementing ID |
| username | TEXT | Username (unique) |
| email | TEXT | Email address (unique) |
| password_hash | TEXT | Hashed password |
| role | TEXT | User role (admin, user, guest) |
| created_at | TEXT | Creation timestamp |
| updated_at | TEXT | Last update timestamp |

#### favorites

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER (PK) | Auto-incrementing ID |
| user_id | INTEGER (FK) | Reference to user |
| book_id | INTEGER (FK) | Reference to book |
| created_at | TEXT | Creation timestamp |

## 🎨 Frontend

The frontend is built with Vue.js 3 and includes:

- **Pinia** for state management
- **Vue Router** for navigation
- **Axios** for HTTP requests
- **Responsive design** with custom CSS

### Key Features

- User authentication and registration
- Role-based UI (different views for admin, user, guest)
- Books and authors browsing
- Search and filtering
- Favorites management
- Admin panel for user management

### Running the Frontend

```bash
# From the /example/frontend directory
npm run dev
```

The frontend will be available at http://localhost:5173 and will proxy API requests to http://localhost:3001.

## ⚙️ Configuration

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

## 🧪 Testing

### Test Accounts

The setup script creates the following test accounts:

| Username | Email | Password | Role |
|----------|-------|----------|------|
| admin | admin@example.com | password | admin |
| alice | alice@example.com | password | user |
| bob | bob@example.com | password | user |
| guest | guest@example.com | password | guest |

### Testing with cURL

```bash
# Login as admin
curl -X POST http://localhost:3001/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "password"}'

# Get all books (with token)
TOKEN="your_jwt_token_here"
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
```

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

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 📞 Support

For questions or issues, please open an issue on the [GitHub repository](https://github.com/stritti/nocodb-middleware).

## 🔗 Related Links

- [NocoDB Documentation](https://docs.nocodb.com/)
- [NestJS Documentation](https://docs.nestjs.com/)
- [Vue.js Documentation](https://vuejs.org/guide/)
- [Pinia Documentation](https://pinia.vuejs.org/)
