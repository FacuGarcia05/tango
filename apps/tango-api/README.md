# TANGO API
 
## Requisitos
- Node 18/20
- PostgreSQL local (usuario: tango / pass: tango123) o ajustar `DATABASE_URL`

## Setup
```bash
git clone <repo>
cd tango-api
cp .env.example .env
npm install

# crea la base y aplica el esquema
npx prisma migrate deploy

# seed
npx prisma db seed             


# levantar
npm run start:dev
# docs: http://localhost:3001/docs
