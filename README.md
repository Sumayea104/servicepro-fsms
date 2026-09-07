# ServicePro - Field Service Management System

A comprehensive backend API for managing field service operations, connecting customers with technicians through a streamlined workflow.

## Features

- ✅ Authentication (Email/Password + Google OAuth)
- ✅ Role-based Access Control (Customer, Technician, Dispatcher, Admin, Finance)
- ✅ Smart Technician Assignment
- ✅ Schedule Conflict Detection
- ✅ Work Order Management
- ✅ Stripe Payment Integration
- ✅ File Uploads (Cloudinary)
- ✅ Real-time Notifications
- ✅ Audit Logging
- ✅ Analytics & Reports
- ✅ Rate Limiting
- ✅ Redis Caching

## Tech Stack

- Node.js + TypeScript
- Express.js
- PostgreSQL + Prisma
- Redis
- Stripe
- Cloudinary
- Resend (Email)

## Quick Start

\`\`\`bash

# Clone repository

git clone https://github.com/yourusername/servicepro-fsms.git

# Install dependencies
cd servicepro-fsms
npm install

# Set up environment
cp .env.example .env

# Run migrations

npx prisma migrate dev

# Seed database

npx prisma db seed

# Start server

npm run dev
\`\`\`

## API Documentation

- Base URL: `http://localhost:3000/api/v1`
- Postman Collection: `docs/postman-collection.json`
- Swagger Docs: `http://localhost:3000/api-docs`

## Demo Credentials

\`\`\`
Admin: <admin@servicepro.com> / Admin@123456
Customer: <customer@demo.com> / Customer@123456
Technician: <tech@demo.com> / Tech@123456
\`\`\`

## Deployment

- Production: <https://servicepro-fsms.vercel.app>
- Database: PostgreSQL (Neon/Supabase)
- Redis: Upstash
- File Storage: Cloudinary

## License

MIT
