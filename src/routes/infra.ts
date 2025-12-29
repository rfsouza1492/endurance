import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    message: 'Infra overview endpoint',
  });
});

router.post('/infra-alerts', (req: Request, res: Response) => {
  const alert = req.body;
  
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    type: 'engine_room_alert_received',
    alert,
  }, null, 2));
  
  res.status(200).json({
    status: 'received',
    timestamp: new Date().toISOString(),
  });
});

export default router;

