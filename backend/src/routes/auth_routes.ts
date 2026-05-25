import { Router } from 'express';
// Update the import to include login
import { signup, login } from '../controllers/auth_controller'; 

const router = Router();

router.post('/signup', signup);
// Add the new login route
router.post('/login', login); 

export default router;