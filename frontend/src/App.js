import AppRoutes from './routes/AppRoutes';
import { ToastProvider } from './components/Toast';

function App() {
  return (
    <ToastProvider>
      <AppRoutes />
    </ToastProvider>
  );
}

export default App;
