# Render Deployment

1. Create a MongoDB Atlas database and copy the connection string.
2. Create a new Render Web Service and point it at this repo.
3. Set the service root directory to `backend` or deploy via [`render.yaml`](./render.yaml).
4. Add these environment variables in Render:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `HEAD_PASSWORD`
   - `PORT` (Render usually injects this automatically)
5. Deploy and confirm the health endpoint returns `200` at `/health`.
6. Copy the final HTTPS URL and use it as the Android `TASKFLOW_BASE_URL`.

Notes:
- Render hosts the Node backend, but MongoDB still needs to live in Atlas or another hosted Mongo service.
- The head account is seeded once with the temporary `HEAD_USERNAME` and `HEAD_PASSWORD`, then the head can choose a preferred username and password on first login.
