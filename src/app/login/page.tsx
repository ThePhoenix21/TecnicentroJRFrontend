'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Lock } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validación básica
    if (!email || !password) {
      setError('Por favor ingresa tu correo y contraseña');
      return;
    }
    
    // Validación de formato de correo
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Por favor ingresa un correo electrónico válido');
      return;
    }
    
    setIsLoading(true);
    
    try {
      console.log('Iniciando proceso de login...');
      console.log('Email:', email);
      console.log('Password:', password ? '***' : '(vacío)');
      
      const success = await login(email, password);
      console.log('Login result:', success);
      
      if (success) {
        console.log('Login exitoso, redirigiendo a /dashboard');
        // Redirigir al dashboard después de un inicio de sesión exitoso
        window.location.href = '/dashboard';
      }
    } catch (error) {
      console.error('Error en el login:', error);
      
      // Mostrar el error completo en la consola
      interface AxiosErrorDetails {
        message?: string;
        code?: string;
        response?: {
          status?: number;
          statusText?: string;
          data?: {
            message?: string;
            error?: string;
            statusCode?: number;
          };
        };
        config?: {
          url?: string;
          method?: string;
          headers?: Record<string, string>;
          data?: string;
        };
      }
      
      const axiosError = error as AxiosErrorDetails;
      console.error('Error details:', {
        message: axiosError?.message,
        code: axiosError?.code,
        status: axiosError?.response?.status,
        statusText: axiosError?.response?.statusText,
        data: axiosError?.response?.data,
        config: {
          url: axiosError?.config?.url,
          method: axiosError?.config?.method,
          headers: axiosError?.config?.headers,
          data: axiosError?.config?.data,
        },
      });
      
      // Manejo de errores específicos
      if (axiosError?.response?.status === 401) {
        const errorMessage = axiosError.response?.data?.message || 'Correo o contraseña incorrectos';
        setError(`Error de autenticación: ${errorMessage}`);
      } else if (axiosError?.response?.status === 500) {
        setError('Error en el servidor. Por favor, inténtalo de nuevo más tarde.');
      } else if (axiosError?.code === 'ECONNABORTED') {
        setError('La solicitud está tardando demasiado. Verifica tu conexión a internet.');
      } else if (axiosError?.message?.includes('Network Error')) {
        setError('No se pudo conectar al servidor. Verifica tu conexión a internet.');
      } else if (axiosError?.response?.data?.message) {
        setError(`Error del servidor: ${axiosError.response.data.message}`);
      } else {
        setError(`Error al iniciar sesión: ${axiosError?.message || 'Error desconocido'}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Tecnicentro JR
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Inicia sesión para acceder al panel de control
          </p>
        </div>

        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="test@example.com"
                  className="pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Contraseña</Label>
                
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="password123"
                  className="pl-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {error && (
              <div className="text-sm text-destructive text-center">
                {error}
              </div>
            )}
            <Button 
              type="submit" 
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </Button>
            
            
          </form>

          
        </div>

        
      </div>
    </div>
  );
}
