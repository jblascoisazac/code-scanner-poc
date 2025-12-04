import express from 'express';
const app = express();

app.use(express.json());

let receivedEvents = [];

app.get('/', (req, res) => {
  res.send(`
    <h1>Eventos Recibidos: ${receivedEvents.length}</h1>
    <pre>${JSON.stringify(receivedEvents, null, 2)}</pre>
    <script>setTimeout(() => location.reload(), 2000)</script>
  `);
});

app.post('/events', (req, res) => {
  console.log('POST recibido:', req.body);
  receivedEvents.push({
    timestamp: new Date().toISOString(),
    data: req.body,
  });

  // Mantener solo los últimos 50 eventos
  if (receivedEvents.length > 50) {
    receivedEvents = receivedEvents.slice(-50);
  }

  res.status(200).json({ received: true });
});

app.listen(3000, () => {
  console.log('Servidor de prueba escuchando en http://localhost:3000');
});
