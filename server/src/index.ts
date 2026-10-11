import 'dotenv/config';
import { createApp } from './app.js';
const port = Number(process.env.PORT || 5000);
createApp().listen(port, () => console.info(`GardenBuddy API listening on :${port}`));
