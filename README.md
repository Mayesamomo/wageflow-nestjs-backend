# WageFlow Backend

A NestJS-based backend for a healthcare time-tracking and invoicing platform. This backend allows healthcare workers to track their shifts, calculate earnings, mileage reimbursements, generate invoices for clients, and export data.

## Features

- User authentication (registration, login, refresh token)
- Profile management (hourly rate, HST percentage, mileage rate)
- Client management with geolocation support
- Shift tracking and earnings calculation
- Mileage tracking and reimbursement calculation
- Invoice generation and management
- Dashboard with statistics and visualizations
- Data exports to PDF and Excel
- Development database seeding

## Tech Stack

- **Backend Framework**: NestJS (TypeScript)
- **Architecture**: Modular Monolith
- **Database**: PostgreSQL (production), SQLite (local development/testing)
- **Authentication**: JWT-based (access + refresh tokens)
- **API Documentation**: Swagger
- **Deployment**: Docker + Docker Compose
- **CI/CD**: GitHub Actions

## Getting Started

### Prerequisites

- Node.js (v14+)
- npm or yarn
- Docker and Docker Compose (for production)

### Local Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/wageflow-backend.git
   cd wageflow-backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. Start the development server:
   ```bash
   npm run start:dev
   ```

5. The API will be available at http://localhost:3000/api, and Swagger documentation at http://localhost:3000/api/docs

### Docker Setup

1. Build and start the Docker containers:
   ```bash
   docker-compose up -d
   ```

2. The API will be available at http://localhost:3000/api

## Project Structure

```
src/
  ├── auth/                # Authentication module
  ├── users/               # User profile management
  ├── clients/             # Client management
  ├── shifts/              # Shift tracking
  ├── mileages/            # Mileage tracking
  ├── invoices/            # Invoice generation
  ├── dashboard/           # Statistics and summaries
  ├── exports/             # PDF and Excel exports
  ├── seeds/               # Database seeding
  ├── common/              # Shared code
  └── main.ts              # Application entry point
```

## API Endpoints

The API is organized into the following modules:

- `/api/auth` - Authentication endpoints
- `/api/users` - User profile management
- `/api/clients` - Client management
- `/api/shifts` - Shift tracking
- `/api/mileages` - Mileage tracking
- `/api/invoices` - Invoice management
- `/api/dashboard` - Statistics and summaries
- `/api/exports` - Data export functionality

See the Swagger documentation at `/api/docs` for detailed API information.

## Development

### Running tests

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

### Database Seeding

The application automatically seeds the database in development mode with test data:
- 2 test users
- 5 clients per user
- 10 shifts per client
- 5 mileage entries per user
- 1-2 invoices per client

To access the test accounts:
- Email: john@example.com / Password: password123
- Email: jane@example.com / Password: password123

## Deployment

### CI/CD Pipeline

This project uses GitHub Actions for CI/CD, which:
1. Runs linting and tests
2. Builds the application
3. Builds and publishes the Docker image

### Deploying to Production

1. Set up environment variables on your server
2. Pull the Docker image and run:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

