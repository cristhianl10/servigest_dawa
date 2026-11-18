import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app';

const port = process.env.PORT || 3000;
const app = createApp();

app.listen(port, () => {
  console.log(`[ServiGest API] Servidor ejecutándose en http://localhost:${port}`);
  console.log(`[ServiGest API] Entorno: ${process.env.NODE_ENV || 'development'}`);
});
