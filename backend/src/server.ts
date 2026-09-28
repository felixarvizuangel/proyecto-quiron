import { config } from './config';
import { app } from './app';

app.listen(config.port, () => {
  console.log(`API de Quirón escuchando en http://localhost:${config.port}`);
});